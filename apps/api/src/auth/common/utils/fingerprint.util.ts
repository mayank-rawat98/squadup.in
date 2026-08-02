import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto, { createHmac } from 'crypto';
import {
  EMAIL_FINGERPRINT_PURPOSE,
  FINGERPRINT_KEY_MAP,
} from '../../../mailer/constants/mailer.constants';
import { RedisService } from '../../../redis/redis.service';

@Injectable()
export class FingerprintUtilService implements OnModuleInit {
  private hmacSecret!: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}
  onModuleInit(): void {
    const secret = this.configService.get<string>('FINGERPRINT_HMAC_SECRET');
    if (!secret) {
      throw new InternalServerErrorException(
        'Missing FINGERPRINT_HMAC_SECRET in configuration',
      );
    }
    this.hmacSecret = secret;
  }
  hmacHex(value: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(
        'hmacHex: value must be a non-empty string',
      );
    }

    return createHmac('sha256', this.hmacSecret).update(value).digest('hex');
  }

  nowSec(): number {
    return Math.floor(Date.now() / 1000);
  }

  nowMs(): number {
    return Date.now();
  }
  async generateEmailFingerprint(
    fingerPrintType: EMAIL_FINGERPRINT_PURPOSE,
    email: string,
  ): Promise<string> {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    const ttlSec = 15 * 60; // 15 minutes
    const keyFn = FINGERPRINT_KEY_MAP[fingerPrintType];
    if (!keyFn) {
      throw new BadRequestException('Invalid fingerprint type');
    }
    const isTokenPresent = await this.redisService.storeRecord(
      keyFn(email),
      emailVerificationToken,
      ttlSec,
    );
    if (!isTokenPresent) {
      throw new BadRequestException(
        'Email already sent. Please check your inbox.',
      );
    }
    return verificationToken;
  }
  async rollBackEmailFingerprint(
    email: string,
    fingerPrintType: EMAIL_FINGERPRINT_PURPOSE,
  ): Promise<void> {
    const keyFn = FINGERPRINT_KEY_MAP[fingerPrintType];
    if (!keyFn) {
      throw new BadRequestException('Invalid fingerprint type');
    }

    await this.redisService.deleteRecord(keyFn(email));
  }
  async validateEmailFingerprint(
    email: string,
    token: string,
    fingerPrintType: EMAIL_FINGERPRINT_PURPOSE,
  ): Promise<boolean> {
    const emailVerificationToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const keyFn = FINGERPRINT_KEY_MAP[fingerPrintType];
    if (!keyFn) {
      throw new BadRequestException('Invalid fingerprint type');
    }
    const storedToken = await this.redisService.getRecord<string>(keyFn(email));

    if (storedToken && storedToken === emailVerificationToken) {
      // Optionally delete the token after successful validation
      await this.redisService.deleteRecord(keyFn(email));
      return true;
    }
    return false;
  }
}

export default FingerprintUtilService;
