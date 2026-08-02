import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { TwoFactorChannel } from '../constants/two-factor.constants';
import {
  TwoFactorPreference,
  type UserSettings,
} from '../entities/user-settings.entity';
import { SettingsRepository } from '../settings.repository';
import { SmsService } from './sms.service';
import { TwoFactorOtpService } from './two-factor-otp.service';
import { NotificationService } from '../../notifications/services/notification.service';
import { NOTIFICATION_EVENTS } from '../../notifications/constants/notification-events';

@Injectable()
export class TwoFactorPhoneService {
  private readonly logger = new Logger(TwoFactorPhoneService.name);

  constructor(
    private readonly settingsRepo: SettingsRepository,
    private readonly otpService: TwoFactorOtpService,
    private readonly smsService: SmsService,
    private readonly notificationService: NotificationService,
  ) {}

  // ──────────────────────────────────────────────
  //  POST /2fa/phone/send-otp
  // ──────────────────────────────────────────────

  async sendOtp(userId: string, phone: string): Promise<void> {
    // Check if already enabled
    const settings = await this.settingsRepo.findByUserId(userId);
    if (settings?.twoFactor?.phone?.enabled) {
      throw new BadRequestException('Phone 2FA is already enabled.');
    }

    // Generate & store OTP
    const otp = await this.otpService.generateAndStoreOtp(
      userId,
      TwoFactorChannel.PHONE,
    );

    // Send OTP via SMS
    const sent = await this.smsService.sendOtp(phone, otp);
    if (!sent) {
      this.logger.error(`Failed to send 2FA OTP SMS to user ${userId}`);
      throw new BadRequestException('Unable to send OTP SMS. Try again.');
    }
  }

  // ──────────────────────────────────────────────
  //  POST /2fa/phone/verify-otp
  // ──────────────────────────────────────────────

  async verifyOtp(userId: string, code: string): Promise<void> {
    // Verify OTP from Redis
    await this.otpService.verifyOtp(userId, TwoFactorChannel.PHONE, code);

    // Enable phone 2FA
    const updatedSettings = await this.settingsRepo.upsert(userId, {
      twoFactor: {
        phone: {
          enabled: true,
          verifiedAt: new Date(),
          preference: TwoFactorPreference.PHONE,
        },
      },
    });

    // Notify user that phone 2FA has been enabled
    this.notificationService
      .emit({
        ...NOTIFICATION_EVENTS.SECURITY.TWO_FACTOR_ENABLED('Phone (SMS)'),
        actorId: userId,
        recipientIds: [userId],
        idempotencyKey: `2fa:phone:enabled:${userId}:${updatedSettings.updatedAt.getTime()}`,
      })
      .catch(() => {
        /* fire-and-forget */
      });
  }

  // ──────────────────────────────────────────────
  //  POST /2fa/phone/send-disable-otp
  // ──────────────────────────────────────────────

  async sendDisableOtp(userId: string, phone: string): Promise<void> {
    const settings = await this.settingsRepo.findByUserId(userId);
    if (!settings?.twoFactor?.phone?.enabled) {
      throw new BadRequestException('Phone 2FA is not enabled.');
    }

    const otp = await this.otpService.generateAndStoreOtp(
      userId,
      TwoFactorChannel.PHONE,
    );

    const sent = await this.smsService.sendOtp(phone, otp);
    if (!sent) {
      this.logger.error(`Failed to send 2FA disable OTP SMS to user ${userId}`);
      throw new BadRequestException('Unable to send OTP SMS. Try again.');
    }
  }

  // ──────────────────────────────────────────────
  //  POST /2fa/phone/disable
  // ──────────────────────────────────────────────

  async disable(userId: string, code: string): Promise<void> {
    const settings = await this.settingsRepo.findByUserId(userId);
    if (!settings?.twoFactor?.phone?.enabled) {
      throw new BadRequestException('Phone 2FA is not enabled.');
    }

    // Verify OTP from Redis
    await this.otpService.verifyOtp(userId, TwoFactorChannel.PHONE, code);

    // Clear phone 2FA fields
    await this.settingsRepo.update(userId, {
      twoFactor: {
        phone: {
          enabled: false,
          verifiedAt: null,
          preference: TwoFactorPreference.PHONE,
        },
      },
    } as QueryDeepPartialEntity<UserSettings>);

    // Notify user that phone 2FA has been disabled
    this.notificationService
      .emit({
        ...NOTIFICATION_EVENTS.SECURITY.TWO_FACTOR_DISABLED('Phone (SMS)'),
        actorId: userId,
        recipientIds: [userId],
      })
      .catch(() => {
        /* fire-and-forget */
      });
  }
}
