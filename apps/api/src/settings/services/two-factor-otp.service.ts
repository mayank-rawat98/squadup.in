import { BadRequestException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { RedisService } from '../../redis/redis.service';
import { OtpTokenService } from '../../utils/generateOtp';
import {
  OTP_RATE_LIMIT_MAX,
  OTP_RATE_LIMIT_WINDOW_SECONDS,
  OTP_TTL_SECONDS,
  TWO_FACTOR_REDIS_KEYS,
} from '../constants/two-factor.constants';
import { sha256 } from '../../utils/crypto.util';

/**
 * Shared helpers for OTP-based 2FA channels (email / phone).
 * Handles Redis storage, rate limiting, and verification.
 */
@Injectable()
export class TwoFactorOtpService {
  constructor(
    private readonly redisService: RedisService,
    private readonly otpTokenService: OtpTokenService,
  ) {}

  /**
   * Generate, rate-limit, and store a 6-digit OTP in Redis.
   * Returns the plain OTP (caller is responsible for delivering it).
   */
  async generateAndStoreOtp(userId: string, channel: string): Promise<string> {
    await this.enforceRateLimit(userId, channel);

    const otp = this.otpTokenService.generateSecureOtp().toString();
    const hashedOtp = sha256(otp);
    const key = TWO_FACTOR_REDIS_KEYS.OTP(userId, channel);

    // Overwrite any existing OTP (allows resend within TTL)
    await this.redisService.setRecordEx(key, hashedOtp, OTP_TTL_SECONDS);

    return otp;
  }

  /**
   * Verify a 6-digit OTP against the value stored in Redis.
   * On success the key is deleted (one-time use).
   */
  async verifyOtp(
    userId: string,
    channel: string,
    code: string,
  ): Promise<void> {
    const key = TWO_FACTOR_REDIS_KEYS.OTP(userId, channel);
    const stored = await this.redisService.getRecord<string>(key);

    if (!stored) {
      throw new BadRequestException('OTP expired or not found.');
    }

    const inputHash = sha256(code);

    // Constant-time comparison
    const storedBuf = Buffer.from(stored, 'hex');
    const inputBuf = Buffer.from(inputHash, 'hex');

    if (
      storedBuf.length !== inputBuf.length ||
      !crypto.timingSafeEqual(storedBuf, inputBuf)
    ) {
      throw new BadRequestException('Invalid OTP.');
    }

    // Delete the OTP after successful verification (one-time use)
    await this.redisService.deleteRecord(key);
  }

  /**
   * Enforce per-user per-channel rate limit using atomic INCR.
   * Max OTP_RATE_LIMIT_MAX sends within OTP_RATE_LIMIT_WINDOW_SECONDS.
   */
  private async enforceRateLimit(
    userId: string,
    channel: string,
  ): Promise<void> {
    const rlKey = TWO_FACTOR_REDIS_KEYS.OTP_RATE_LIMIT(userId, channel);

    const count = await this.redisService.incrWithExpiry(
      rlKey,
      OTP_RATE_LIMIT_WINDOW_SECONDS,
    );

    if (count > OTP_RATE_LIMIT_MAX) {
      throw new BadRequestException(
        'Too many OTP requests. Please wait before trying again.',
      );
    }
  }
}
