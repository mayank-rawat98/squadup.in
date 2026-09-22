import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as crypto from 'crypto';
import * as OTPAuth from 'otpauth';
import { ConfigService } from '@nestjs/config';
import { clientUrl } from '../../config';
import { UsersService } from '../../users/users.service';
import { UsersRepository } from '../../users/users.repository';
import { MailerService } from '../../mailer/mailer.service';
import { RedisService } from '../../redis/redis.service';
import { AuditsService } from '../../audits/audits.service';
import {
  AUDIT_ACTIONS,
  AUDIT_RESOURCE,
  AUDIT_SEVERITY,
  AUDIT_CATEGORY,
} from '../../audits/constants';
import { EMAIL_TYPE_ENUM } from '../../mailer/constants/mailer.constants';
import { sha256, decrypt } from '../../utils/crypto.util';
import { OtpTokenService } from '../../utils/generateOtp';
import { SettingsRepository } from '../../settings/settings.repository';

const OTP_TTL_SEC = 10 * 60;
const REVERT_TTL_SEC = 24 * 60 * 60;
const PREAUTH_TTL_SEC = 10 * 60;
const MAX_OTP_ATTEMPTS = 5;

const KEY_REQUEST = (uid: string) => `ec:req:${uid}`;
const KEY_ATTEMPTS = (uid: string) => `ec:req:attempts:${uid}`;
const KEY_PREAUTH = (uid: string) => `ec:preauth:${uid}`;
const KEY_REVERT = (tokenHash: string) => `ec:rev:${tokenHash}`;

interface PendingRequestPayload {
  oldEmail: string;
  newEmail: string;
  otpHash: string;
  expiresAt: number; // epoch ms
  ip: string | null;
  userAgent: string | null;
  createdAt: number;
}

interface RevertPayload {
  userId: string;
  oldEmail: string;
  newEmail: string;
  changedAt: number;
  ip: string | null;
}

/**
 * Self-service primary-email change, in three steps:
 *
 *   1. `request` — re-authenticate the caller, then mail a 10-minute OTP to the
 *      NEW address. Holding the new address is what proves ownership.
 *   2. `confirm` — verify that OTP, swap the address, and mail the OLD address
 *      a 24-hour single-use revert link.
 *   3. `revert` — public, reached from that link, undoing a change the real
 *      owner did not make.
 *
 * Every step lives in Redis, never Postgres: each key carries its own TTL, so an
 * abandoned request expires on its own with nothing to clean up.
 */
@Injectable()
export class EmailChangeService {
  private readonly logger = new Logger(EmailChangeService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly usersRepo: UsersRepository,
    private readonly mailer: MailerService,
    private readonly redis: RedisService,
    private readonly audits: AuditsService,
    private readonly settingsRepo: SettingsRepository,
    private readonly otpToken: OtpTokenService,
    private readonly config: ConfigService,
  ) {}

  // ── Preauth OTP (for users with no password — e.g. Google OAuth) ─────
  async sendPreauthOtp(userId: string) {
    const user = await this.usersService.getUser(userId);
    const otp = this.otpToken.generateSecureOtp().toString();
    await this.redis.setRecordEx(
      KEY_PREAUTH(userId),
      sha256(otp),
      PREAUTH_TTL_SEC,
    );
    await this.mailer.notifyUserByEmail({
      recipient: user.email,
      emailType: EMAIL_TYPE_ENUM.EMAIL_CHANGE_OTP,
      emailData: {
        newEmail: user.email,
        otp,
        year: String(new Date().getFullYear()),
      },
    });
  }

  // ── Resume helpers ───────────────────────────────────────────────────
  async getPending(userId: string) {
    const row = await this.redis.getRecord<PendingRequestPayload>(
      KEY_REQUEST(userId),
    );
    if (!row) return null;
    if (row.expiresAt < Date.now()) {
      await this.redis.deleteRecord(KEY_REQUEST(userId));
      await this.redis.deleteRecord(KEY_ATTEMPTS(userId));
      return null;
    }
    const attempts = Number(
      (await this.redis.getRecord<number | string>(KEY_ATTEMPTS(userId))) ?? 0,
    );
    if (attempts >= MAX_OTP_ATTEMPTS) return null;
    return {
      newEmail: row.newEmail,
      expiresAt: new Date(row.expiresAt).toISOString(),
      attemptsRemaining: MAX_OTP_ATTEMPTS - attempts,
    };
  }

  async cancelPending(userId: string) {
    await this.redis.deleteRecord(KEY_REQUEST(userId));
    await this.redis.deleteRecord(KEY_ATTEMPTS(userId));
  }

  // ── Step 1: request the change ────────────────────────────────────────
  async request(
    userId: string,
    ip: string,
    userAgent: string,
    body: {
      newEmail: string;
      password?: string;
      totp?: string;
      preauthOtp?: string;
    },
  ) {
    const newEmail = body.newEmail.trim().toLowerCase();

    const user = await this.usersService.findByEmailWithPassword(
      (await this.usersService.getUser(userId)).email,
    );

    if (newEmail === user.email.toLowerCase()) {
      throw new BadRequestException(
        'New email must differ from your current email',
      );
    }

    const existingUser = await this.usersService
      .doesUserExist(newEmail)
      .catch(() => false);
    if (existingUser) {
      throw new ConflictException('This email is already in use');
    }

    await this.assertReauth(user, body);

    await this.audits.logUserAction(
      userId,
      AUDIT_ACTIONS.AUTH.EMAIL_CHANGE_REQUESTED,
      AUDIT_RESOURCE.USER,
      userId,
      {
        description: `Email change requested: ${user.email} → ${newEmail}`,
        severity: AUDIT_SEVERITY.CRITICAL,
        category: AUDIT_CATEGORY.SECURITY,
        tags: ['auth', 'email-change', 'request'],
        changesBefore: { email: user.email },
        changesAfter: { email: newEmail },
        ipAddress: ip,
        userAgent,
      },
    );

    // Drop any prior unfinished request so attempt counters reset.
    await this.cancelPending(userId);

    const otp = this.otpToken.generateSecureOtp().toString();
    const expiresAt = Date.now() + OTP_TTL_SEC * 1000;

    const payload: PendingRequestPayload = {
      oldEmail: user.email,
      newEmail,
      otpHash: sha256(otp),
      expiresAt,
      ip: ip || null,
      userAgent: userAgent?.slice(0, 256) ?? null,
      createdAt: Date.now(),
    };
    await this.redis.setRecordEx(KEY_REQUEST(userId), payload, OTP_TTL_SEC);

    await this.mailer.notifyUserByEmail({
      recipient: newEmail,
      emailType: EMAIL_TYPE_ENUM.EMAIL_CHANGE_OTP,
      emailData: {
        newEmail,
        otp,
        year: String(new Date().getFullYear()),
      },
    });

    return { expiresAt: new Date(expiresAt).toISOString() };
  }

  // ── Step 2: confirm with the new-email OTP ───────────────────────────
  async confirm(
    userId: string,
    ip: string,
    userAgent: string,
    currentDeviceId: string | undefined,
    otp: string,
  ) {
    const row = await this.redis.getRecord<PendingRequestPayload>(
      KEY_REQUEST(userId),
    );

    if (!row) throw new NotFoundException('No pending email change found');
    if (row.expiresAt < Date.now()) {
      await this.cancelPending(userId);
      throw new BadRequestException('OTP expired — please request a new code');
    }

    const attemptsBefore = Number(
      (await this.redis.getRecord<number | string>(KEY_ATTEMPTS(userId))) ?? 0,
    );
    if (attemptsBefore >= MAX_OTP_ATTEMPTS) {
      throw new ForbiddenException('Too many invalid attempts');
    }

    const expected = Buffer.from(row.otpHash, 'hex');
    const actual = Buffer.from(sha256(otp), 'hex');
    const ok =
      expected.length === actual.length &&
      crypto.timingSafeEqual(expected, actual);

    if (!ok) {
      const attempts = await this.redis.incrWithExpiry(
        KEY_ATTEMPTS(userId),
        OTP_TTL_SEC,
      );
      await this.audits.logUserAction(
        userId,
        AUDIT_ACTIONS.AUTH.EMAIL_CHANGE_FAILED,
        AUDIT_RESOURCE.USER,
        userId,
        {
          description: `Invalid OTP for email change (attempt ${attempts})`,
          severity: AUDIT_SEVERITY.HIGH,
          category: AUDIT_CATEGORY.SECURITY,
          tags: ['auth', 'email-change', 'invalid-otp'],
          ipAddress: ip,
          userAgent,
        },
      );
      throw new BadRequestException('Invalid OTP');
    }

    // ── Apply the change ──────────────────────────────────────────────
    await this.applyEmailChange(userId, row.newEmail);

    // ── Issue a single-use revert token, valid 24h ────────────────────
    const revertToken = randomBytes(32).toString('hex');
    const revertPayload: RevertPayload = {
      userId,
      oldEmail: row.oldEmail,
      newEmail: row.newEmail,
      changedAt: Date.now(),
      ip: ip || null,
    };
    await this.redis.setRecordEx(
      KEY_REVERT(sha256(revertToken)),
      revertPayload,
      REVERT_TTL_SEC,
    );

    // Pending OTP is now consumed.
    await this.cancelPending(userId);

    // ── Notify the OLD email with a revert link ───────────────────────
    const revertUrl = `${clientUrl}/email-change/revert?token=${revertToken}`;
    await this.mailer
      .notifyUserByEmail({
        recipient: row.oldEmail,
        emailType: EMAIL_TYPE_ENUM.EMAIL_CHANGE_NOTICE,
        emailData: {
          oldEmail: row.oldEmail,
          newEmail: row.newEmail,
          revertUrl,
          changedAt: new Date().toISOString(),
          ip: ip || 'unknown',
          year: String(new Date().getFullYear()),
        },
      })
      .catch((err) => this.logger.error('Failed to send change notice', err));

    if (currentDeviceId) {
      await this.redis
        .removeOtherDevices(userId, currentDeviceId)
        .catch((err) => this.logger.error('removeOtherDevices failed', err));
    }

    await this.audits.logUserAction(
      userId,
      AUDIT_ACTIONS.AUTH.PRIMARY_EMAIL_CHANGED,
      AUDIT_RESOURCE.USER,
      userId,
      {
        description: `Primary email changed: ${row.oldEmail} → ${row.newEmail}`,
        severity: AUDIT_SEVERITY.CRITICAL,
        category: AUDIT_CATEGORY.SECURITY,
        tags: ['auth', 'email-change', 'success'],
        changesBefore: { email: row.oldEmail },
        changesAfter: { email: row.newEmail },
        ipAddress: ip,
        userAgent,
      },
    );

    return { email: row.newEmail };
  }

  // ── Step 3 (public): revert via the link in the notification email ───
  async revert(token: string, ip: string, userAgent: string) {
    if (!token || token.length < 32) {
      throw new BadRequestException('Invalid revert token');
    }
    const key = KEY_REVERT(sha256(token));
    const row = await this.redis.getRecord<RevertPayload>(key);
    if (!row) {
      throw new NotFoundException('Revert link expired or already used');
    }

    const taken = await this.usersService
      .doesUserExist(row.oldEmail)
      .catch(() => false);
    if (taken) {
      throw new ConflictException(
        'Original email is now in use — cannot revert',
      );
    }

    await this.applyEmailChange(row.userId, row.oldEmail);
    // Single-use: burn the token.
    await this.redis.deleteRecord(key);
    // Force re-login on every device — legitimate owner is back in control.
    await this.redis
      .removeAllDevices(row.userId)
      .catch((err) => this.logger.error('removeAllDevices failed', err));

    await this.audits.logUserAction(
      row.userId,
      AUDIT_ACTIONS.AUTH.PRIMARY_EMAIL_REVERTED,
      AUDIT_RESOURCE.USER,
      row.userId,
      {
        description: `Primary email reverted: ${row.newEmail} → ${row.oldEmail}`,
        severity: AUDIT_SEVERITY.CRITICAL,
        category: AUDIT_CATEGORY.SECURITY,
        tags: ['auth', 'email-change', 'revert'],
        changesBefore: { email: row.newEmail },
        changesAfter: { email: row.oldEmail },
        ipAddress: ip,
        userAgent,
      },
    );

    return { email: row.oldEmail };
  }

  // ── Internals ────────────────────────────────────────────────────────

  /**
   * Move the account onto `toEmail`. Reaching either call site means ownership
   * of that address was just proven — by the OTP on confirm, or by the revert
   * token on revert — so the address is marked verified in the same write.
   */
  private async applyEmailChange(userId: string, toEmail: string) {
    await this.usersRepo.updateUser(userId, {
      email: toEmail,
      emailVerified: true,
    });
  }

  private async assertReauth(
    user: {
      id: string;
      isPasswordSet: boolean;
      comparePassword: (p: string) => Promise<boolean>;
    },
    body: { password?: string; totp?: string; preauthOtp?: string },
  ) {
    if (user.isPasswordSet) {
      if (!body.password) {
        throw new UnauthorizedException('Password is required');
      }
      const ok = await user.comparePassword(body.password);
      if (!ok) throw new UnauthorizedException('Incorrect password');

      const settings = await this.settingsRepo.findByUserIdWithSecrets(user.id);
      if (
        settings?.twoFactor?.authenticator?.enabled &&
        settings.twoFactor.authenticator.secret
      ) {
        if (!body.totp) {
          throw new UnauthorizedException(
            'A 2FA authenticator code is required',
          );
        }
        const valid = await this.verifyTotp(
          settings.twoFactor.authenticator.secret,
          body.totp,
        );
        if (!valid) {
          throw new UnauthorizedException('Invalid authenticator code');
        }
      }
      return;
    }

    if (!body.preauthOtp) {
      throw new UnauthorizedException(
        'An OTP from your current email is required',
      );
    }
    const stored = await this.redis.getRecord<string>(KEY_PREAUTH(user.id));
    if (!stored) {
      throw new UnauthorizedException(
        'Preauth OTP expired — request a new one',
      );
    }
    const expected = Buffer.from(stored, 'hex');
    const actual = Buffer.from(sha256(body.preauthOtp), 'hex');
    const ok =
      expected.length === actual.length &&
      crypto.timingSafeEqual(expected, actual);
    if (!ok) throw new UnauthorizedException('Invalid preauth OTP');
    await this.redis.deleteRecord(KEY_PREAUTH(user.id));
  }

  private async verifyTotp(
    encryptedSecret: string,
    code: string,
  ): Promise<boolean> {
    const key = this.config.get<string>('TWO_FACTOR_ENCRYPTION_KEY');
    const secret = key ? decrypt(encryptedSecret, key) : encryptedSecret;
    const totp = new OTPAuth.TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    return totp.validate({ token: code, window: 1 }) !== null;
  }
}
