import { Test, TestingModule } from '@nestjs/testing';
import { SmsService } from './sms.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InternalServerErrorException, Logger } from '@nestjs/common';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SmsService', () => {
  let service: SmsService;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'TWO_FACTOR_SMS_API_KEY') return 'test-api-key';
        if (key === 'TWO_FACTOR_SMS_TEMPLATE') return 'test-template';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
    loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {
      // noop
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendOtp', () => {
    const phone = '+1234567890';
    const otp = '123456';

    it('should return true if SMS API returns success', async () => {
      mockedAxios.get.mockResolvedValue({ data: { Status: 'Success' } });

      const result = await service.sendOtp(phone, otp);

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(
          'https://2factor.in/API/V1/test-api-key/SMS/+1234567890/123456/test-template',
        ),
        expect.any(Object),
      );
    });

    it('should return false if SMS API returns failure', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { Status: 'Error', Details: 'Invalid Key' },
      });

      const result = await service.sendOtp(phone, otp);

      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('2factor.in API returned non-success'),
      );
    });

    it('should return false if axios throws an error', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));

      const result = await service.sendOtp(phone, otp);

      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(
        '2factor.in SMS API error',
        expect.any(Error),
      );
    });

    it('should throw InternalServerErrorException when API key is missing', async () => {
      const mockConfigServiceMissingKey = {
        get: jest.fn().mockReturnValue(null),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            SmsService,
            { provide: ConfigService, useValue: mockConfigServiceMissingKey },
          ],
        }).compile(),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
