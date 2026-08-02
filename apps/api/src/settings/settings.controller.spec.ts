import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { PermissionsGuard } from '../common/guards/auth.guard';
import { TwoFactorAuthenticatorService } from './services/two-factor-authenticator.service';
import { TwoFactorEmailService } from './services/two-factor-email.service';
import { TwoFactorPhoneService } from './services/two-factor-phone.service';
import { TwoFactorPasskeyService } from './services/two-factor-passkey.service';
import { SettingsController } from './settings.controller';
import {
  VerifyAuthenticatorDto,
  VerifyEmailCodeDto,
  VerifyPhoneOtpDto,
} from './dto';
import { AuditsService } from '../audits/audits.service';

const USER_ID = 'user-uuid';
const USER_EMAIL = 'user@example.com';
const USER_PHONE = '+919999999999';

const mockReq = {
  user: { id: USER_ID, email: USER_EMAIL, phone: USER_PHONE },
} as unknown as Request;

const auditsServiceMock = {
  logUserAction: jest.fn().mockResolvedValue(undefined),
  logAuthEvent: jest.fn().mockResolvedValue(undefined),
  logSecurityEvent: jest.fn().mockResolvedValue(undefined),
  logFailedAction: jest.fn().mockResolvedValue(undefined),
  log: jest.fn().mockResolvedValue(undefined),
};

describe('SettingsController', () => {
  let controller: SettingsController;
  let authenticatorService: jest.Mocked<TwoFactorAuthenticatorService>;
  let emailService: jest.Mocked<TwoFactorEmailService>;
  let phoneService: jest.Mocked<TwoFactorPhoneService>;

  beforeEach(async () => {
    authenticatorService = {
      setup: jest.fn(),
      verify: jest.fn(),
      regenerateBackupCodes: jest.fn(),
      disable: jest.fn(),
    } as unknown as jest.Mocked<TwoFactorAuthenticatorService>;

    emailService = {
      sendOtp: jest.fn(),
      verifyOtp: jest.fn(),
      sendDisableOtp: jest.fn(),
      disable: jest.fn(),
    } as unknown as jest.Mocked<TwoFactorEmailService>;

    phoneService = {
      sendOtp: jest.fn(),
      verifyOtp: jest.fn(),
      sendDisableOtp: jest.fn(),
      disable: jest.fn(),
    } as unknown as jest.Mocked<TwoFactorPhoneService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        {
          provide: TwoFactorAuthenticatorService,
          useValue: authenticatorService,
        },
        { provide: TwoFactorEmailService, useValue: emailService },
        { provide: TwoFactorPhoneService, useValue: phoneService },
        {
          provide: TwoFactorPasskeyService,
          useValue: {
            getRegistrationOptions: jest.fn(),
            verifyRegistration: jest.fn(),
            listCredentials: jest.fn(),
            rename: jest.fn(),
            remove: jest.fn(),
          },
        },
        { provide: AuditsService, useValue: auditsServiceMock },
      ],
    })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SettingsController>(SettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── Authenticator ──────────────────────────────────────────────────────────

  describe('authenticatorSetup', () => {
    it('should return setup data from the authenticator service', async () => {
      const setupData = { secret: 'otpauth://...', qrCode: 'data:image/...' };
      authenticatorService.setup.mockResolvedValue(setupData);

      const result = await controller.authenticatorSetup(mockReq);

      expect(authenticatorService.setup).toHaveBeenCalledWith(USER_ID);
      expect(result).toEqual({
        success: true,
        message: 'Authenticator setup initiated',
        data: { authenticatorData: setupData },
      });
    });
  });

  describe('authenticatorVerify', () => {
    it('should return verification data after verifying TOTP code', async () => {
      const dto: VerifyAuthenticatorDto = { code: '123456' };
      const backupCodes = ['code1', 'code2'];
      authenticatorService.verify.mockResolvedValue({ backupCodes });

      const result = await controller.authenticatorVerify(mockReq, dto);

      expect(authenticatorService.verify).toHaveBeenCalledWith(
        USER_ID,
        dto.code,
      );
      expect(result).toEqual({
        success: true,
        message: 'Authenticator 2FA enabled. Save your backup codes.',
        data: { backupCodes },
      });
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should return new backup codes', async () => {
      const codes = ['a1', 'b2', 'c3'];
      authenticatorService.regenerateBackupCodes.mockResolvedValue({
        backupCodes: codes,
      });

      const result = await controller.regenerateBackupCodes(mockReq);

      expect(authenticatorService.regenerateBackupCodes).toHaveBeenCalledWith(
        USER_ID,
      );
      expect(result).toEqual({
        success: true,
        message: 'Backup codes regenerated. Previous codes are now invalid.',
        data: { backupCodes: codes },
      });
    });
  });

  describe('authenticatorDisable', () => {
    it('should disable authenticator 2FA and return success', async () => {
      const dto: VerifyAuthenticatorDto = { code: '654321' };
      authenticatorService.disable.mockResolvedValue(undefined);

      const result = await controller.authenticatorDisable(mockReq, dto);

      expect(authenticatorService.disable).toHaveBeenCalledWith(
        USER_ID,
        dto.code,
      );
      expect(result).toEqual({
        success: true,
        message: 'Authenticator 2FA disabled successfully',
        data: null,
      });
    });
  });

  // ── Email 2FA ──────────────────────────────────────────────────────────────

  describe('emailSendOtp', () => {
    it('should send OTP to email and return success', async () => {
      emailService.sendOtp.mockResolvedValue(undefined);

      const result = await controller.emailSendOtp(mockReq);

      expect(emailService.sendOtp).toHaveBeenCalledWith(USER_ID, USER_EMAIL);
      expect(result).toEqual({
        success: true,
        message: 'OTP sent to your email',
        data: null,
      });
    });
  });

  describe('emailVerifyOtp', () => {
    it('should verify email OTP and return success', async () => {
      const dto: VerifyEmailCodeDto = { code: '112233' };
      emailService.verifyOtp.mockResolvedValue(undefined);

      const result = await controller.emailVerifyOtp(mockReq, dto);

      expect(emailService.verifyOtp).toHaveBeenCalledWith(USER_ID, dto.code);
      expect(result).toEqual({
        success: true,
        message: 'Email 2FA enabled successfully',
        data: null,
      });
    });
  });

  describe('emailSendDisableOtp', () => {
    it('should send disable OTP to email and return success', async () => {
      emailService.sendDisableOtp.mockResolvedValue(undefined);

      const result = await controller.emailSendDisableOtp(mockReq);

      expect(emailService.sendDisableOtp).toHaveBeenCalledWith(
        USER_ID,
        USER_EMAIL,
      );
      expect(result).toEqual({
        success: true,
        message: 'OTP sent to your email to confirm disabling 2FA',
        data: null,
      });
    });
  });

  describe('emailDisable', () => {
    it('should disable email 2FA and return success', async () => {
      const dto: VerifyEmailCodeDto = { code: '445566' };
      emailService.disable.mockResolvedValue(undefined);

      const result = await controller.emailDisable(mockReq, dto);

      expect(emailService.disable).toHaveBeenCalledWith(USER_ID, dto.code);
      expect(result).toEqual({
        success: true,
        message: 'Email 2FA disabled successfully',
        data: null,
      });
    });
  });

  // ── Phone 2FA ──────────────────────────────────────────────────────────────

  describe('phoneSendOtp', () => {
    it('should send OTP to phone and return success', async () => {
      phoneService.sendOtp.mockResolvedValue(undefined);

      const result = await controller.phoneSendOtp(mockReq);

      expect(phoneService.sendOtp).toHaveBeenCalledWith(USER_ID, USER_PHONE);
      expect(result).toEqual({
        success: true,
        message: 'OTP sent to your phone',
        data: null,
      });
    });
  });

  describe('phoneVerifyOtp', () => {
    it('should verify phone OTP and return success', async () => {
      const dto: VerifyPhoneOtpDto = { code: '778899' };
      phoneService.verifyOtp.mockResolvedValue(undefined);

      const result = await controller.phoneVerifyOtp(mockReq, dto);

      expect(phoneService.verifyOtp).toHaveBeenCalledWith(USER_ID, dto.code);
      expect(result).toEqual({
        success: true,
        message: 'Phone 2FA enabled successfully',
        data: null,
      });
    });
  });

  describe('phoneSendDisableOtp', () => {
    it('should send disable OTP to phone and return success', async () => {
      phoneService.sendDisableOtp.mockResolvedValue(undefined);

      const result = await controller.phoneSendDisableOtp(mockReq);

      expect(phoneService.sendDisableOtp).toHaveBeenCalledWith(
        USER_ID,
        USER_PHONE,
      );
      expect(result).toEqual({
        success: true,
        message: 'OTP sent to your phone to confirm disabling 2FA',
        data: null,
      });
    });
  });

  describe('phoneDisable', () => {
    it('should disable phone 2FA and return success', async () => {
      const dto: VerifyPhoneOtpDto = { code: '001122' };
      phoneService.disable.mockResolvedValue(undefined);

      const result = await controller.phoneDisable(mockReq, dto);

      expect(phoneService.disable).toHaveBeenCalledWith(USER_ID, dto.code);
      expect(result).toEqual({
        success: true,
        message: 'Phone 2FA disabled successfully',
        data: null,
      });
    });
  });
});
