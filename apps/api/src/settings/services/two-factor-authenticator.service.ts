import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as OTPAuth from 'otpauth';
import { toDataURL } from 'qrcode';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { UsersService } from '../../users/users.service';
import {
  BACKUP_CODE_COUNT,
  BACKUP_CODE_LENGTH,
  TwoFactorChannel,
} from '../constants/two-factor.constants';
import {
  TwoFactorPreference,
  type UserSettings,
} from '../entities/user-settings.entity';
import { SettingsRepository } from '../settings.repository';
import {
  decrypt,
  encrypt,
  generateRandomCode,
  sha256,
  timingSafeCompare,
} from '../../utils/crypto.util';
import { NotificationService } from '../../notifications/services/notification.service';
import { NOTIFICATION_EVENTS } from '../../notifications/constants/notification-events';
import { TwoFactorOtpService } from './two-factor-otp.service';
import { MailerService } from '../../mailer/mailer.service';
import { EMAIL_TYPE_ENUM } from '../../mailer/constants/mailer.constants';

@Injectable()
export class TwoFactorAuthenticatorService {
  private readonly logger = new Logger(TwoFactorAuthenticatorService.name);
  private readonly encryptionKey: string;

  constructor(
    private readonly settingsRepo: SettingsRepository,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly otpService: TwoFactorOtpService,
    private readonly mailerService: MailerService,
  ) {
    const key = this.configService.get<string>('TWO_FACTOR_ENCRYPTION_KEY');
    if (!key) {
      this.logger.warn(
        'TWO_FACTOR_ENCRYPTION_KEY is not set – authenticator secrets will not be encrypted at rest',
      );
      throw new InternalServerErrorException(
        'TWO_FACTOR_ENCRYPTION_KEY must be set in production for security. Set it to a strong random value.',
      );
    }
    this.encryptionKey = key;
  }

  // ──────────────────────────────────────────────
  //  POST /2fa/authenticator/setup
  // ──────────────────────────────────────────────

  async setup(userId: string): Promise<{ qrCode: string; secret: string }> {
    const user = await this.usersService.getUser(userId);

    // Check if authenticator is already enabled via settings
    const existing = await this.settingsRepo.findByUserId(userId);
    if (existing?.twoFactor?.authenticator?.enabled) {
      throw new BadRequestException(
        'Authenticator 2FA is already enabled. Disable it first to re-setup.',
      );
    }

    const secret = new OTPAuth.Secret({ size: 20 });

    const totp = new OTPAuth.TOTP({
      issuer: 'Squadup',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    const otpauthUrl = totp.toString();

    // Encrypt the secret before storing
    const secretBase32 = secret.base32;
    const storedSecret = this.encryptionKey
      ? encrypt(secretBase32, this.encryptionKey)
      : secretBase32;

    // Upsert the settings row
    await this.settingsRepo.upsert(userId, {
      twoFactor: {
        authenticator: {
          secret: storedSecret,
          enabled: false, // not yet verified
          preference: TwoFactorPreference.AUTHENTICATOR,
        },
      },
    });

    const qrCode = await toDataURL(otpauthUrl);

    return { qrCode, secret: secretBase32 };
  }

  // ──────────────────────────────────────────────
  //  POST /2fa/authenticator/verify
  // ──────────────────────────────────────────────

  async verify(
    userId: string,
    code: string,
  ): Promise<{ backupCodes: string[] }> {
    const settings = await this.settingsRepo.findByUserIdWithSecrets(userId);

    if (!settings?.twoFactor?.authenticator?.secret) {
      throw new BadRequestException(
        'Authenticator not set up. Call /2fa/authenticator/setup first.',
      );
    }
    if (settings.twoFactor.authenticator.enabled) {
      throw new BadRequestException('Authenticator 2FA is already enabled.');
    }

    // Decrypt if encrypted
    const secretBase32 = this.encryptionKey
      ? decrypt(settings.twoFactor.authenticator.secret, this.encryptionKey)
      : settings.twoFactor.authenticator.secret;

    const totp = new OTPAuth.TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      throw new BadRequestException('Invalid authenticator code.');
    }

    // Generate backup codes
    const plainCodes = this.generateBackupCodes();
    const hashedCodes = plainCodes.map((c) => sha256(c));

    // Enable authenticator and store hashed backup codes
    await this.settingsRepo.update(userId, {
      twoFactor: {
        authenticator: {
          enabled: true,
          preference: TwoFactorPreference.AUTHENTICATOR,
        },
      },
    } as QueryDeepPartialEntity<UserSettings>);
    await this.settingsRepo.saveBackupCodes(userId, hashedCodes);

    // Notify user that authenticator 2FA has been enabled
    this.notificationService
      .emit({
        ...NOTIFICATION_EVENTS.SECURITY.TWO_FACTOR_ENABLED('Authenticator App'),
        actorId: userId,
        recipientIds: [userId],
      })
      .catch(() => {
        /* fire-and-forget */
      });

    return { backupCodes: plainCodes };
  }

  // ──────────────────────────────────────────────
  //  POST /2fa/authenticator/disable
  // ──────────────────────────────────────────────

  async disable(userId: string, code: string): Promise<void> {
    const settings = await this.settingsRepo.findByUserIdWithSecrets(userId);

    if (!settings?.twoFactor?.authenticator?.enabled) {
      throw new BadRequestException('Authenticator 2FA is not enabled.');
    }

    if (!settings.twoFactor.authenticator.secret) {
      throw new BadRequestException(
        'Authenticator secret not found. Cannot disable 2FA.',
      );
    }

    // Verify the TOTP code before disabling
    const secretBase32 = this.encryptionKey
      ? decrypt(settings.twoFactor.authenticator.secret, this.encryptionKey)
      : settings.twoFactor.authenticator.secret;

    const totp = new OTPAuth.TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });

    // Accept either a valid TOTP token or a one-time backup code so a user who
    // lost their authenticator device can still disable 2FA.
    const isValidTotp = totp.validate({ token: code, window: 1 }) !== null;
    const isValidBackupCode =
      !isValidTotp && (await this.verifyBackupCode(userId, code));

    if (!isValidTotp && !isValidBackupCode) {
      throw new BadRequestException(
        'Invalid authenticator code. Cannot disable 2FA.',
      );
    }

    await this.clearAuthenticator(userId);
  }

  // ──────────────────────────────────────────────
  //  POST /2fa/authenticator/send-recovery-otp
  //  Email an OTP so a user who lost their device can disable 2FA.
  // ──────────────────────────────────────────────

  async sendRecoveryOtp(userId: string): Promise<void> {
    const user = await this.usersService.getUser(userId);

    const settings = await this.settingsRepo.findByUserId(userId);
    if (!settings?.twoFactor?.authenticator?.enabled) {
      throw new BadRequestException('Authenticator 2FA is not enabled.');
    }

    const otp = await this.otpService.generateAndStoreOtp(
      userId,
      TwoFactorChannel.AUTHENTICATOR_RECOVERY,
    );

    const sent = await this.mailerService.notifyUserByEmail({
      recipient: user.email,
      emailType: EMAIL_TYPE_ENUM.AUTHENTICATOR_DISABLE_OTP,
      emailData: { otp, year: String(new Date().getFullYear()) },
    });

    if (!sent) {
      this.logger.error(
        `Failed to send authenticator recovery OTP email to user ${userId}`,
      );
      throw new BadRequestException('Unable to send OTP email. Try again.');
    }
  }

  // ──────────────────────────────────────────────
  //  POST /2fa/authenticator/disable-with-email
  //  Disable authenticator 2FA using the recovery email OTP.
  // ──────────────────────────────────────────────

  async disableWithEmailOtp(userId: string, code: string): Promise<void> {
    const settings = await this.settingsRepo.findByUserId(userId);
    if (!settings?.twoFactor?.authenticator?.enabled) {
      throw new BadRequestException('Authenticator 2FA is not enabled.');
    }

    // Verify the recovery OTP (throws on invalid/expired)
    await this.otpService.verifyOtp(
      userId,
      TwoFactorChannel.AUTHENTICATOR_RECOVERY,
      code,
    );

    await this.clearAuthenticator(userId);
  }

  /**
   * Clear all authenticator fields and notify the user that 2FA was disabled.
   */
  private async clearAuthenticator(userId: string): Promise<void> {
    await this.settingsRepo.update(userId, {
      twoFactor: {
        authenticator: {
          enabled: false,
          secret: null,
          backupCodes: null,
          preference: TwoFactorPreference.AUTHENTICATOR,
        },
      },
    } as QueryDeepPartialEntity<UserSettings>);

    // Notify user that authenticator 2FA has been disabled
    this.notificationService
      .emit({
        ...NOTIFICATION_EVENTS.SECURITY.TWO_FACTOR_DISABLED(
          'Authenticator App',
        ),
        actorId: userId,
        recipientIds: [userId],
      })
      .catch(() => {
        /* fire-and-forget */
      });
  }

  // ──────────────────────────────────────────────
  //  POST /2fa/authenticator/regenerate-backup-codes
  // ──────────────────────────────────────────────

  async regenerateBackupCodes(
    userId: string,
  ): Promise<{ backupCodes: string[] }> {
    const settings = await this.settingsRepo.findByUserId(userId);
    if (!settings?.twoFactor?.authenticator?.enabled) {
      throw new BadRequestException(
        'Authenticator 2FA must be enabled before regenerating backup codes.',
      );
    }

    const plainCodes = this.generateBackupCodes();
    const hashedCodes = plainCodes.map((c) => sha256(c));

    await this.settingsRepo.saveBackupCodes(userId, hashedCodes);

    // Notify user of backup code regeneration
    this.notificationService
      .emit({
        ...NOTIFICATION_EVENTS.SECURITY.BACKUP_CODES_REGENERATED(),
        actorId: userId,
        recipientIds: [userId],
      })
      .catch(() => {
        /* fire-and-forget */
      });

    return { backupCodes: plainCodes };
  }

  // ──────────────────────────────────────────────
  //  Helpers
  // ──────────────────────────────────────────────

  /**
   * Verify a single backup code (one-time use).
   * Returns true if valid and consumed, false otherwise.
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const hashedCodes = await this.settingsRepo.getBackupCodes(userId);
    if (!hashedCodes || hashedCodes.length === 0) return false;

    const inputHash = sha256(code);
    const matchIdx = hashedCodes.findIndex((h) =>
      timingSafeCompare(h, inputHash),
    );
    if (matchIdx === -1) return false;

    // Remove the used code
    const remaining = hashedCodes.filter((_, i) => i !== matchIdx);
    await this.settingsRepo.saveBackupCodes(userId, remaining);
    return true;
  }

  private generateBackupCodes(): string[] {
    return Array.from({ length: BACKUP_CODE_COUNT }, () =>
      generateRandomCode(BACKUP_CODE_LENGTH),
    );
  }
}
