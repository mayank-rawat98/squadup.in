import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { EMAIL_TYPE_ENUM } from '../../mailer/constants/mailer.constants';
import { MailerService } from '../../mailer/mailer.service';
import { UsersService } from '../../users/users.service';
import { TwoFactorChannel } from '../constants/two-factor.constants';
import {
  TwoFactorPreference,
  type UserSettings,
} from '../entities/user-settings.entity';
import { SettingsRepository } from '../settings.repository';
import { TwoFactorOtpService } from './two-factor-otp.service';
import { NotificationService } from '../../notifications/services/notification.service';
import { NOTIFICATION_EVENTS } from '../../notifications/constants/notification-events';

@Injectable()
export class TwoFactorEmailService {
  private readonly logger = new Logger(TwoFactorEmailService.name);

  constructor(
    private readonly settingsRepo: SettingsRepository,
    private readonly otpService: TwoFactorOtpService,
    private readonly usersService: UsersService,
    private readonly mailerService: MailerService,
    private readonly notificationService: NotificationService,
  ) {}

  // ──────────────────────────────────────────────
  //  POST /2fa/email/send-otp
  // ──────────────────────────────────────────────

  async sendOtp(userId: string, email: string): Promise<void> {
    const user = await this.usersService.getUser(userId);

    // Email must match the user's registered email
    if (user.email.toLowerCase() !== email.toLowerCase()) {
      throw new BadRequestException(
        'Email does not match your registered email.',
      );
    }

    // Check if already enabled
    const settings = await this.settingsRepo.findByUserId(userId);
    if (settings?.twoFactor?.email?.enabled) {
      throw new BadRequestException('Email 2FA is already enabled.');
    }

    // Generate & store OTP
    const otp = await this.otpService.generateAndStoreOtp(
      userId,
      TwoFactorChannel.EMAIL,
    );

    // Send OTP via email service
    const sent = await this.mailerService.notifyUserByEmail({
      recipient: user.email,
      emailType: EMAIL_TYPE_ENUM.TWO_FACTOR_OTP,
      emailData: { otp, year: String(new Date().getFullYear()) },
    });

    if (!sent) {
      this.logger.error(`Failed to send 2FA OTP email to user ${userId}`);
      throw new BadRequestException('Unable to send OTP email. Try again.');
    }
  }

  // ──────────────────────────────────────────────
  //  POST /2fa/email/verify-otp
  // ──────────────────────────────────────────────

  async verifyOtp(userId: string, code: string): Promise<void> {
    // Verify OTP from Redis
    await this.otpService.verifyOtp(userId, TwoFactorChannel.EMAIL, code);

    // Enable email 2FA
    const updatedSettings = await this.settingsRepo.upsert(userId, {
      twoFactor: {
        email: {
          enabled: true,
          verifiedAt: new Date(),
          preference: TwoFactorPreference.EMAIL,
        },
      },
    });

    // Notify user that email 2FA has been enabled
    this.notificationService
      .emit({
        ...NOTIFICATION_EVENTS.SECURITY.TWO_FACTOR_ENABLED('Email'),
        actorId: userId,
        recipientIds: [userId],
        idempotencyKey: `2fa:email:enabled:${userId}:${updatedSettings.updatedAt.getTime()}`,
      })
      .catch(() => {
        /* fire-and-forget */
      });
  }

  // ──────────────────────────────────────────────
  //  POST /2fa/email/send-disable-otp
  // ──────────────────────────────────────────────

  async sendDisableOtp(userId: string, email: string): Promise<void> {
    const settings = await this.settingsRepo.findByUserId(userId);
    if (!settings?.twoFactor?.email?.enabled) {
      throw new BadRequestException('Email 2FA is not enabled.');
    }

    const otp = await this.otpService.generateAndStoreOtp(
      userId,
      TwoFactorChannel.EMAIL,
    );

    const sent = await this.mailerService.notifyUserByEmail({
      recipient: email,
      emailType: EMAIL_TYPE_ENUM.TWO_FACTOR_OTP,
      emailData: { otp, year: String(new Date().getFullYear()) },
    });

    if (!sent) {
      this.logger.error(
        `Failed to send 2FA disable OTP email to user ${userId}`,
      );
      throw new BadRequestException('Unable to send OTP email. Try again.');
    }
  }

  // ──────────────────────────────────────────────
  //  POST /2fa/email/disable
  // ──────────────────────────────────────────────

  async disable(userId: string, code: string): Promise<void> {
    const settings = await this.settingsRepo.findByUserId(userId);
    if (!settings?.twoFactor?.email?.enabled) {
      throw new BadRequestException('Email 2FA is not enabled.');
    }

    // Verify OTP from Redis
    await this.otpService.verifyOtp(userId, TwoFactorChannel.EMAIL, code);

    // Clear email 2FA fields
    await this.settingsRepo.update(userId, {
      twoFactor: {
        email: {
          enabled: false,
          verifiedAt: null,
          preference: TwoFactorPreference.EMAIL,
        },
      },
    } as QueryDeepPartialEntity<UserSettings>);

    // Notify user that email 2FA has been disabled
    this.notificationService
      .emit({
        ...NOTIFICATION_EVENTS.SECURITY.TWO_FACTOR_DISABLED('Email'),
        actorId: userId,
        recipientIds: [userId],
      })
      .catch(() => {
        /* fire-and-forget */
      });
  }
}
