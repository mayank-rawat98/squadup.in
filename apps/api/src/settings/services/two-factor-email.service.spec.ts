import { Test, TestingModule } from '@nestjs/testing';
import { TwoFactorEmailService } from './two-factor-email.service';
import { SettingsRepository } from '../settings.repository';
import { TwoFactorOtpService } from './two-factor-otp.service';
import { UsersService } from '../../users/users.service';
import { MailerService } from '../../mailer/mailer.service';
import { BadRequestException } from '@nestjs/common';
import { TwoFactorChannel } from '../constants/two-factor.constants';
import {
  TwoFactorPreference,
  UserSettings,
} from '../entities/user-settings.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationService } from '../../notifications/services/notification.service';

describe('TwoFactorEmailService', () => {
  let service: TwoFactorEmailService;
  let settingsRepo: jest.Mocked<SettingsRepository>;
  let otpService: jest.Mocked<TwoFactorOtpService>;
  let usersService: jest.Mocked<UsersService>;
  let mailerService: jest.Mocked<MailerService>;

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
    const mockMailerService = {
      notifyUserByEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorEmailService,
        { provide: SettingsRepository, useValue: mockSettingsRepo },
        { provide: TwoFactorOtpService, useValue: mockOtpService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: MailerService, useValue: mockMailerService },
        {
          provide: NotificationService,
          useValue: { emit: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<TwoFactorEmailService>(TwoFactorEmailService);
    settingsRepo = module.get(SettingsRepository);
    otpService = module.get(TwoFactorOtpService);
    usersService = module.get(UsersService);
    mailerService = module.get(MailerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendOtp', () => {
    const userId = 'user-1';
    const email = 'test@example.com';
    const otp = '123456';
    const user = { id: userId, email };

    it('should send OTP successfully', async () => {
      usersService.getUser.mockResolvedValue(user as User);
      settingsRepo.findByUserId.mockResolvedValue(null);
      otpService.generateAndStoreOtp.mockResolvedValue(otp);
      mailerService.notifyUserByEmail.mockResolvedValue(true);

      await service.sendOtp(userId, email);

      expect(otpService.generateAndStoreOtp).toHaveBeenCalledWith(
        userId,
        TwoFactorChannel.EMAIL,
      );
      expect(mailerService.notifyUserByEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: email,
          emailData: expect.objectContaining({ otp }),
        }),
      );
    });

    it('should throw BadRequestException if email mismatch', async () => {
      usersService.getUser.mockResolvedValue({
        ...user,
        email: 'other@example.com',
      } as User);

      await expect(service.sendOtp(userId, email)).rejects.toThrow(
        new BadRequestException('Email does not match your registered email.'),
      );
    });

    it('should throw BadRequestException if already enabled', async () => {
      usersService.getUser.mockResolvedValue(user as User);
      settingsRepo.findByUserId.mockResolvedValue({
        twoFactor: { email: { enabled: true } },
      } as UserSettings);

      await expect(service.sendOtp(userId, email)).rejects.toThrow(
        new BadRequestException('Email 2FA is already enabled.'),
      );
    });

    it('should throw BadRequestException if the mailer fails', async () => {
      usersService.getUser.mockResolvedValue(user as User);
      settingsRepo.findByUserId.mockResolvedValue(null);
      otpService.generateAndStoreOtp.mockResolvedValue(otp);
      mailerService.notifyUserByEmail.mockResolvedValue(false);

      await expect(service.sendOtp(userId, email)).rejects.toThrow(
        new BadRequestException('Unable to send OTP email. Try again.'),
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
        TwoFactorChannel.EMAIL,
        code,
      );
      expect(settingsRepo.upsert).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          twoFactor: expect.objectContaining({
            email: expect.objectContaining({
              enabled: true,
              preference: TwoFactorPreference.EMAIL,
            }),
          }),
        }),
      );
    });
  });

  describe('sendDisableOtp', () => {
    const userId = 'user-1';
    const email = 'test@example.com';
    const otp = '123456';
    const user = { id: userId, email };

    it('should send disable OTP successfully', async () => {
      usersService.getUser.mockResolvedValue(user as User);
      settingsRepo.findByUserId.mockResolvedValue({
        twoFactor: { email: { enabled: true } },
      } as UserSettings);
      otpService.generateAndStoreOtp.mockResolvedValue(otp);
      mailerService.notifyUserByEmail.mockResolvedValue(true);

      await service.sendDisableOtp(userId, email);

      expect(otpService.generateAndStoreOtp).toHaveBeenCalledWith(
        userId,
        TwoFactorChannel.EMAIL,
      );
      expect(mailerService.notifyUserByEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: email,
          emailData: expect.objectContaining({ otp }),
        }),
      );
    });

    it('should throw BadRequestException if 2FA not enabled', async () => {
      usersService.getUser.mockResolvedValue(user as User);
      settingsRepo.findByUserId.mockResolvedValue({
        twoFactor: { email: { enabled: false } },
      } as UserSettings);

      await expect(service.sendDisableOtp(userId, email)).rejects.toThrow(
        new BadRequestException('Email 2FA is not enabled.'),
      );
    });
  });

  describe('disable', () => {
    const userId = 'user-1';
    const code = '123456';

    it('should disable 2FA successfully', async () => {
      settingsRepo.findByUserId.mockResolvedValue({
        twoFactor: { email: { enabled: true } },
      } as UserSettings);
      otpService.verifyOtp.mockResolvedValue(undefined);

      await service.disable(userId, code);

      expect(otpService.verifyOtp).toHaveBeenCalledWith(
        userId,
        TwoFactorChannel.EMAIL,
        code,
      );
      expect(settingsRepo.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          twoFactor: expect.objectContaining({
            email: expect.objectContaining({
              enabled: false,
              verifiedAt: null,
            }),
          }),
        }),
      );
    });

    it('should throw BadRequestException if 2FA not enabled', async () => {
      settingsRepo.findByUserId.mockResolvedValue({
        twoFactor: { email: { enabled: false } },
      } as UserSettings);

      await expect(service.disable(userId, code)).rejects.toThrow(
        new BadRequestException('Email 2FA is not enabled.'),
      );
    });
  });
});
