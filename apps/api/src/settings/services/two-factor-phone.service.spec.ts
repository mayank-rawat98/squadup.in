import { Test, TestingModule } from '@nestjs/testing';
import { TwoFactorPhoneService } from './two-factor-phone.service';
import { SettingsRepository } from '../settings.repository';
import { TwoFactorOtpService } from './two-factor-otp.service';
import { UsersService } from '../../users/users.service';
import { SmsService } from './sms.service';
import { BadRequestException } from '@nestjs/common';
import { TwoFactorChannel } from '../constants/two-factor.constants';
import {
  TwoFactorPreference,
  UserSettings,
} from '../entities/user-settings.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationService } from '../../notifications/services/notification.service';

describe('TwoFactorPhoneService', () => {
  let service: TwoFactorPhoneService;
  let settingsRepo: jest.Mocked<SettingsRepository>;
  let otpService: jest.Mocked<TwoFactorOtpService>;
  let usersService: jest.Mocked<UsersService>;
  let smsService: jest.Mocked<SmsService>;

  beforeEach(async () => {
    const mockSettingsRepo = {
      findByUserId: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    };
    const mockOtpService = {
      generateAndStoreOtp: jest.fn(),
      verifyOtp: jest.fn(),
    };
    const mockUsersService = {
      getUser: jest.fn(),
    };
    const mockSmsService = {
      sendOtp: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorPhoneService,
        { provide: SettingsRepository, useValue: mockSettingsRepo },
        { provide: TwoFactorOtpService, useValue: mockOtpService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SmsService, useValue: mockSmsService },
        {
          provide: NotificationService,
          useValue: { emit: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<TwoFactorPhoneService>(TwoFactorPhoneService);
    settingsRepo = module.get(SettingsRepository);
    otpService = module.get(TwoFactorOtpService);
    usersService = module.get(UsersService);
    smsService = module.get(SmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendOtp', () => {
    const userId = 'user-1';
    const phone = '+1234567890';
    const otp = '123456';
    const user = { id: userId, phone };

    it('should send OTP successfully', async () => {
      usersService.getUser.mockResolvedValue(user as User);
      settingsRepo.findByUserId.mockResolvedValue(null);
      otpService.generateAndStoreOtp.mockResolvedValue(otp);
      smsService.sendOtp.mockResolvedValue(true);

      await service.sendOtp(userId, phone);

      expect(otpService.generateAndStoreOtp).toHaveBeenCalledWith(
        userId,
        TwoFactorChannel.PHONE,
      );
      expect(smsService.sendOtp).toHaveBeenCalledWith(phone, otp);
    });

    it('should throw BadRequestException if phone mismatch', async () => {
      usersService.getUser.mockResolvedValue({
        ...user,
        phone: '+0987654321',
      } as User);

      await expect(service.sendOtp(userId, phone)).rejects.toThrow(
        new BadRequestException('Unable to send OTP SMS. Try again.'),
      );
    });

    it('should throw BadRequestException if already enabled', async () => {
      usersService.getUser.mockResolvedValue(user as User);
      settingsRepo.findByUserId.mockResolvedValue({
        twoFactor: { phone: { enabled: true } },
      } as UserSettings);

      await expect(service.sendOtp(userId, phone)).rejects.toThrow(
        new BadRequestException('Phone 2FA is already enabled.'),
      );
    });

    it('should throw BadRequestException if SMS fails', async () => {
      usersService.getUser.mockResolvedValue(user as User);
      settingsRepo.findByUserId.mockResolvedValue(null);
      otpService.generateAndStoreOtp.mockResolvedValue(otp);
      smsService.sendOtp.mockResolvedValue(false);

      await expect(service.sendOtp(userId, phone)).rejects.toThrow(
        new BadRequestException('Unable to send OTP SMS. Try again.'),
      );
    });
  });

  describe('verifyOtp', () => {
    const userId = 'user-1';
    const code = '123456';

    it('should verify OTP successfully', async () => {
      otpService.verifyOtp.mockResolvedValue(undefined);
      settingsRepo.upsert.mockResolvedValue({
        updatedAt: new Date(),
      } as UserSettings);

      await service.verifyOtp(userId, code);

      expect(otpService.verifyOtp).toHaveBeenCalledWith(
        userId,
        TwoFactorChannel.PHONE,
        code,
      );
      expect(settingsRepo.upsert).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          twoFactor: expect.objectContaining({
            phone: expect.objectContaining({
              enabled: true,
              preference: TwoFactorPreference.PHONE,
            }),
          }),
        }),
      );
    });
  });

  describe('sendDisableOtp', () => {
    const userId = 'user-1';
    const phone = '+1234567890';
    const otp = '123456';
    const user = { id: userId, phone };

    it('should send disable OTP successfully', async () => {
      usersService.getUser.mockResolvedValue(user as User);
      settingsRepo.findByUserId.mockResolvedValue({
        twoFactor: { phone: { enabled: true } },
      } as UserSettings);
      otpService.generateAndStoreOtp.mockResolvedValue(otp);
      smsService.sendOtp.mockResolvedValue(true);

      await service.sendDisableOtp(userId, phone);

      expect(otpService.generateAndStoreOtp).toHaveBeenCalledWith(
        userId,
        TwoFactorChannel.PHONE,
      );
      expect(smsService.sendOtp).toHaveBeenCalledWith(phone, otp);
    });

    it('should throw BadRequestException if 2FA not enabled', async () => {
      usersService.getUser.mockResolvedValue(user as User);
      settingsRepo.findByUserId.mockResolvedValue({
        twoFactor: { phone: { enabled: false } },
      } as UserSettings);

      await expect(service.sendDisableOtp(userId, phone)).rejects.toThrow(
        new BadRequestException('Phone 2FA is not enabled.'),
      );
    });
  });

  describe('disable', () => {
    const userId = 'user-1';
    const code = '123456';

    it('should disable 2FA successfully', async () => {
      settingsRepo.findByUserId.mockResolvedValue({
        twoFactor: { phone: { enabled: true } },
      } as UserSettings);
      otpService.verifyOtp.mockResolvedValue(undefined);

      await service.disable(userId, code);

      expect(otpService.verifyOtp).toHaveBeenCalledWith(
        userId,
        TwoFactorChannel.PHONE,
        code,
      );
      expect(settingsRepo.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          twoFactor: expect.objectContaining({
            phone: expect.objectContaining({
              enabled: false,
              verifiedAt: null,
            }),
          }),
        }),
      );
    });

    it('should throw BadRequestException if 2FA not enabled', async () => {
      settingsRepo.findByUserId.mockResolvedValue({
        twoFactor: { phone: { enabled: false } },
      } as UserSettings);

      await expect(service.disable(userId, code)).rejects.toThrow(
        new BadRequestException('Phone 2FA is not enabled.'),
      );
    });
  });
});
