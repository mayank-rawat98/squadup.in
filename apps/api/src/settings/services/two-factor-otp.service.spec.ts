import { Test, TestingModule } from '@nestjs/testing';
import { TwoFactorOtpService } from './two-factor-otp.service';
import { RedisService } from '../../redis/redis.service';
import { OtpTokenService } from '../../utils/generateOtp';
import { BadRequestException } from '@nestjs/common';
import {
  TWO_FACTOR_REDIS_KEYS,
  OTP_RATE_LIMIT_MAX,
} from '../constants/two-factor.constants';
import { sha256 } from '../../utils/crypto.util';

describe('TwoFactorOtpService', () => {
  let service: TwoFactorOtpService;
  let redisService: jest.Mocked<RedisService>;
  let otpTokenService: jest.Mocked<OtpTokenService>;

  beforeEach(async () => {
    const mockRedisService = {
      setRecordEx: jest.fn(),
      getRecord: jest.fn(),
      deleteRecord: jest.fn(),
      incrWithExpiry: jest.fn(),
    };

    const mockOtpTokenService = {
      generateSecureOtp: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorOtpService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: OtpTokenService, useValue: mockOtpTokenService },
      ],
    }).compile();

    service = module.get<TwoFactorOtpService>(TwoFactorOtpService);
    redisService = module.get(RedisService);
    otpTokenService = module.get(OtpTokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAndStoreOtp', () => {
    const userId = 'user123';
    const channel = 'email';
    const otp = '123456';

    it('should generate and store OTP if rate limit is not exceeded', async () => {
      redisService.incrWithExpiry.mockResolvedValue(1);
      otpTokenService.generateSecureOtp.mockReturnValue(otp as any);

      const result = await service.generateAndStoreOtp(userId, channel);

      expect(result).toBe(otp);
      expect(redisService.setRecordEx).toHaveBeenCalledWith(
        TWO_FACTOR_REDIS_KEYS.OTP(userId, channel),
        sha256(otp),
        expect.any(Number),
      );
    });

    it('should throw BadRequestException if rate limit is exceeded', async () => {
      redisService.incrWithExpiry.mockResolvedValue(OTP_RATE_LIMIT_MAX + 1);

      await expect(
        service.generateAndStoreOtp(userId, channel),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyOtp', () => {
    const userId = 'user123';
    const channel = 'email';
    const code = '123456';
    const hashedCode = sha256(code);

    it('should verify OTP successfully and delete record', async () => {
      redisService.getRecord.mockResolvedValue(hashedCode);

      await service.verifyOtp(userId, channel, code);

      expect(redisService.deleteRecord).toHaveBeenCalledWith(
        TWO_FACTOR_REDIS_KEYS.OTP(userId, channel),
      );
    });

    it('should throw BadRequestException if OTP is not found', async () => {
      redisService.getRecord.mockResolvedValue(null);

      await expect(service.verifyOtp(userId, channel, code)).rejects.toThrow(
        new BadRequestException('OTP expired or not found.'),
      );
    });

    it('should throw BadRequestException if OTP is invalid', async () => {
      redisService.getRecord.mockResolvedValue(sha256('wrongcode'));

      await expect(service.verifyOtp(userId, channel, code)).rejects.toThrow(
        new BadRequestException('Invalid OTP.'),
      );
    });
  });
});
