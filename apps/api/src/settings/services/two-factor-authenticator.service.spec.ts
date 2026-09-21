import { Test, TestingModule } from '@nestjs/testing';
import { TwoFactorAuthenticatorService } from './two-factor-authenticator.service';
import { SettingsRepository } from '../settings.repository';
import { UsersService } from '../../users/users.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import * as OTPAuth from 'otpauth';
import { User } from '../../users/entities/user.entity';
import { UserSettings } from '../entities/user-settings.entity';
import { encrypt, sha256 } from '../../utils/crypto.util';
import { NotificationService } from '../../notifications/services/notification.service';
import { TwoFactorOtpService } from './two-factor-otp.service';
import { MailerService } from '../../mailer/mailer.service';
import { TwoFactorChannel } from '../constants/two-factor.constants';

const TEST_ENCRYPTION_KEY = 'test-encryption-key-32-chars!!';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('qr-code-url'),
}));

describe('TwoFactorAuthenticatorService', () => {
  let service: TwoFactorAuthenticatorService;
  let settingsRepo: jest.Mocked<SettingsRepository>;
  let usersService: jest.Mocked<UsersService>;
  let otpService: jest.Mocked<TwoFactorOtpService>;
  let mailerService: jest.Mocked<MailerService>;

  beforeEach(async () => {
    const mockSettingsRepo = {
      findByUserId: jest.fn(),
      findByUserIdWithSecrets: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      saveBackupCodes: jest.fn(),
      getBackupCodes: jest.fn(),
    };

    const mockUsersService = {
      getUser: jest.fn(),
    };

    const mockOtpService = {
      generateAndStoreOtp: jest.fn(),
      verifyOtp: jest.fn(),
    };

    const mockMailerService = {
      notifyUserByEmail: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'TWO_FACTOR_ENCRYPTION_KEY') return TEST_ENCRYPTION_KEY;
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorAuthenticatorService,
        { provide: SettingsRepository, useValue: mockSettingsRepo },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: NotificationService,
          useValue: { emit: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: TwoFactorOtpService, useValue: mockOtpService },
        { provide: MailerService, useValue: mockMailerService },
      ],
    }).compile();

    service = module.get<TwoFactorAuthenticatorService>(
      TwoFactorAuthenticatorService,
    );
    settingsRepo = module.get(SettingsRepository);
    usersService = module.get(UsersService);
    otpService = module.get(TwoFactorOtpService);
    mailerService = module.get(MailerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setup', () => {
    const userId = 'user123';
    const user = { id: userId, email: 'test@example.com' };

    it('should initiate authenticator setup', async () => {
      usersService.getUser.mockResolvedValue(user as User);
      settingsRepo.findByUserId.mockResolvedValue(null);

      const result = await service.setup(userId);

      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('secret');
      expect(settingsRepo.upsert).toHaveBeenCalled();
    });

    it('should throw BadRequestException if authenticator is already enabled', async () => {
      settingsRepo.findByUserId.mockResolvedValue({
        twoFactor: { authenticator: { enabled: true } },
      } as UserSettings);

      await expect(service.setup(userId)).rejects.toThrow(
        new BadRequestException(
          'Authenticator 2FA is already enabled. Disable it first to re-setup.',
        ),
      );
    });
  });

  describe('verify', () => {
    const userId = 'user123';
    const secret = new OTPAuth.Secret().base32;
    const encryptedSecret = encrypt(secret, TEST_ENCRYPTION_KEY);

    it('should verify authenticator code and enable 2FA', async () => {
      settingsRepo.findByUserIdWithSecrets.mockResolvedValue({
        twoFactor: {
          authenticator: { secret: encryptedSecret, enabled: false },
        },
      } as UserSettings);

      // We need a valid code for the secret. For testing, we can mock TOTP.validate or just generate one.
      const totp = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(secret),
      });
      const code = totp.generate();

      const result = await service.verify(userId, code);

      expect(result).toHaveProperty('backupCodes');
      expect(settingsRepo.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          twoFactor: {
            authenticator: expect.objectContaining({ enabled: true }),
          },
        }),
      );
    });

    it('should throw BadRequestException if secret not found', async () => {
      settingsRepo.findByUserIdWithSecrets.mockResolvedValue(null);

      await expect(service.verify(userId, '123456')).rejects.toThrow(
        new BadRequestException(
          'Authenticator not set up. Call /2fa/authenticator/setup first.',
        ),
      );
    });
  });

  describe('disable', () => {
    const userId = 'user123';
    const secret = new OTPAuth.Secret().base32;
    const encryptedSecret = encrypt(secret, TEST_ENCRYPTION_KEY);

    it('should disable authenticator if valid code is provided', async () => {
      settingsRepo.findByUserIdWithSecrets.mockResolvedValue({
        twoFactor: {
          authenticator: { secret: encryptedSecret, enabled: true },
        },
      } as UserSettings);

      const totp = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(secret),
      });
      const code = totp.generate();

      await service.disable(userId, code);

      expect(settingsRepo.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          twoFactor: {
            authenticator: expect.objectContaining({
              enabled: false,
              secret: null,
            }),
          },
        }),
      );
    });

    it('should disable authenticator when a valid backup code is provided and TOTP is invalid', async () => {
      const backupCode = 'ABCD1234';
      settingsRepo.findByUserIdWithSecrets.mockResolvedValue({
        twoFactor: {
          authenticator: { secret: encryptedSecret, enabled: true },
        },
      } as UserSettings);
      settingsRepo.getBackupCodes.mockResolvedValue([sha256(backupCode)]);

      await service.disable(userId, backupCode);

      // the consumed backup code should be removed
      expect(settingsRepo.saveBackupCodes).toHaveBeenCalledWith(userId, []);
      // authenticator should be cleared
      expect(settingsRepo.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          twoFactor: {
            authenticator: expect.objectContaining({
              enabled: false,
              secret: null,
            }),
          },
        }),
      );
    });

    it('should throw BadRequestException if neither TOTP nor backup code is valid', async () => {
      settingsRepo.findByUserIdWithSecrets.mockResolvedValue({
        twoFactor: {
          authenticator: { secret: encryptedSecret, enabled: true },
        },
      } as UserSettings);
      settingsRepo.getBackupCodes.mockResolvedValue([sha256('ABCD1234')]);

      await expect(service.disable(userId, '000000')).rejects.toThrow(
        new BadRequestException(
          'Invalid authenticator code. Cannot disable 2FA.',
        ),
      );
    });
  });

  describe('sendRecoveryOtp', () => {
    const userId = 'user123';
    const user = { id: userId, email: 'test@example.com' };

    it('should generate an OTP and email it when authenticator is enabled', async () => {
      usersService.getUser.mockResolvedValue(user as User);
      settingsRepo.findByUserId.mockResolvedValue({
        twoFactor: { authenticator: { enabled: true } },
      } as UserSettings);
      otpService.generateAndStoreOtp.mockResolvedValue('123456');
      mailerService.notifyUserByEmail.mockResolvedValue(true);

      await service.sendRecoveryOtp(userId);

      expect(otpService.generateAndStoreOtp).toHaveBeenCalledWith(
        userId,
        TwoFactorChannel.AUTHENTICATOR_RECOVERY,
      );
      expect(mailerService.notifyUserByEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: user.email,
          emailData: expect.objectContaining({ otp: '123456' }),
        }),
      );
    });

    it('should throw BadRequestException if authenticator is not enabled', async () => {
      usersService.getUser.mockResolvedValue(user as User);
      settingsRepo.findByUserId.mockResolvedValue({
        twoFactor: { authenticator: { enabled: false } },
      } as UserSettings);

      await expect(service.sendRecoveryOtp(userId)).rejects.toThrow(
        new BadRequestException('Authenticator 2FA is not enabled.'),
      );
      expect(otpService.generateAndStoreOtp).not.toHaveBeenCalled();
    });
  });

  describe('disableWithEmailOtp', () => {
    const userId = 'user123';

    it('should disable authenticator when a valid recovery OTP is provided', async () => {
      settingsRepo.findByUserId.mockResolvedValue({
        twoFactor: { authenticator: { enabled: true } },
      } as UserSettings);
      otpService.verifyOtp.mockResolvedValue(undefined);

      await service.disableWithEmailOtp(userId, '123456');

      expect(otpService.verifyOtp).toHaveBeenCalledWith(
        userId,
        TwoFactorChannel.AUTHENTICATOR_RECOVERY,
        '123456',
      );
      expect(settingsRepo.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          twoFactor: {
            authenticator: expect.objectContaining({
              enabled: false,
              secret: null,
            }),
          },
        }),
      );
    });

    it('should throw BadRequestException if authenticator is not enabled', async () => {
      settingsRepo.findByUserId.mockResolvedValue({
        twoFactor: { authenticator: { enabled: false } },
      } as UserSettings);

      await expect(
        service.disableWithEmailOtp(userId, '123456'),
      ).rejects.toThrow(
        new BadRequestException('Authenticator 2FA is not enabled.'),
      );
      expect(otpService.verifyOtp).not.toHaveBeenCalled();
    });

    it('should propagate an error when the OTP is invalid', async () => {
      settingsRepo.findByUserId.mockResolvedValue({
        twoFactor: { authenticator: { enabled: true } },
      } as UserSettings);
      otpService.verifyOtp.mockRejectedValue(
        new BadRequestException('Invalid OTP.'),
      );

      await expect(
        service.disableWithEmailOtp(userId, '000000'),
      ).rejects.toThrow(new BadRequestException('Invalid OTP.'));
      expect(settingsRepo.update).not.toHaveBeenCalled();
    });
  });
});
