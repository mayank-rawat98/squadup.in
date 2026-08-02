import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { PermissionsGuard } from '../common/guards/auth.guard';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { RegisterUserDto } from '../users/dto/register-user.dto';
import { AuthController } from './auth.controller';
import {
  SendMobileOtpDto,
  VerifyMobileOtpDto,
} from './dto/mobile-verification.dto';
import { LoginDto } from './dto/login.dto';
import {
  VerifyTwoFactorDto,
  SelectTwoFactorMethodDto,
} from './dto/verify-2fa.dto';
import { AuthService } from './services/auth.service';
import { TwoFactorMethod } from '../settings/entities/user-settings.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockRes = () =>
    ({
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    }) as unknown as Response;

  beforeEach(async () => {
    authService = {
      registerUser: jest.fn(),
      verifyEmailToken: jest.fn(),
      resendVerificationEmail: jest.fn(),
      createUser: jest.fn(),
      loginService: jest.fn(),
      verifyTwoFactorCode: jest.fn(),
      selectTwoFactorMethod: jest.fn(),
      getProfileService: jest.fn(),
      logoutService: jest.fn(),
      logoutAllService: jest.fn(),
      refreshAccessTokenService: jest.fn(),
      getUserDevicesService: jest.fn(),
      revokeDeviceService: jest.fn(),
      sendMobileOtp: jest.fn(),
      verifyMobileOtp: jest.fn(),
      authenticateWithGoogle: jest.fn(),
      createUserSession: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
      ],
    })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── Register ──────────────────────────────────────────────────────────

  describe('createUser', () => {
    it('should register a user and respond with 201', async () => {
      const dto = new RegisterUserDto();
      const res = mockRes();

      authService.registerUser.mockResolvedValue(undefined);

      await controller.createUser(dto, res);

      expect(authService.registerUser).toHaveBeenCalledWith(dto);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: null }),
      );
    });
  });

  // ── Verify Email ──────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('should verify email token and respond with 200', async () => {
      const res = mockRes();
      authService.verifyEmailToken.mockResolvedValue(undefined);

      await controller.verifyEmail(
        { encodedEmail: 'test%40example.com', token: 'token123' },
        res,
      );

      expect(authService.verifyEmailToken).toHaveBeenCalledWith(
        'test%40example.com',
        'token123',
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });

  // ── Resend Verification Email ─────────────────────────────────────────

  describe('sendEmailVerificationLink', () => {
    it('should resend verification email and return success', async () => {
      authService.resendVerificationEmail.mockResolvedValue(undefined);

      const result = await controller.sendEmailVerificationLink({
        email: 'test@example.com',
      });

      expect(authService.resendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(result).toEqual(expect.objectContaining({ success: true }));
    });

    it('should throw BadRequestException for empty email', async () => {
      await expect(
        controller.sendEmailVerificationLink({ email: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-string email', async () => {
      await expect(
        controller.sendEmailVerificationLink({
          email: 123 as unknown as string,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── Send Mobile OTP ───────────────────────────────────────────────────

  describe('sendMobileOtp', () => {
    it('should send mobile OTP and return success', async () => {
      const req = { user: { id: 'user-id' } } as unknown as Request;
      const dto: SendMobileOtpDto = { phone: '+1234567890' };
      authService.sendMobileOtp.mockResolvedValue(undefined);

      const result = await controller.sendMobileOtp(req, dto);

      expect(authService.sendMobileOtp).toHaveBeenCalledWith(
        'user-id',
        '+1234567890',
      );
      expect(result).toEqual(expect.objectContaining({ success: true }));
    });
  });

  // ── Verify Mobile OTP ─────────────────────────────────────────────────

  describe('verifyMobileOtp', () => {
    it('should verify mobile OTP and return success', async () => {
      const req = { user: { id: 'user-id' } } as unknown as Request;
      const dto: VerifyMobileOtpDto = { otp: '123456' };
      authService.verifyMobileOtp.mockResolvedValue(undefined);

      const result = await controller.verifyMobileOtp(req, dto);

      expect(authService.verifyMobileOtp).toHaveBeenCalledWith(
        'user-id',
        '123456',
      );
      expect(result).toEqual(expect.objectContaining({ success: true }));
    });
  });

  // ── Complete Profile ──────────────────────────────────────────────────

  describe('completeRegistration', () => {
    it('should complete user profile and respond with 201', async () => {
      const req = { user: { id: 'user-id' } } as unknown as Request;
      const dto = new CreateUserDto();
      const res = mockRes();
      authService.createUser.mockResolvedValue(undefined as any);

      await controller.completeRegistration(req, dto, res);

      expect(authService.createUser).toHaveBeenCalledWith('user-id', dto);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────

  describe('loginUser', () => {
    const baseReq = {
      get: jest.fn().mockReturnValue(''),
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    it('should login user and return token data', async () => {
      const dto = new LoginDto();
      const res = mockRes();
      const userData = {
        user: { id: '1', email: 'test@example.com' },
        deviceId: 'device-id',
        accessToken: 'token',
        expiresIn: 3600,
      };
      authService.loginService.mockResolvedValue(userData);

      await controller.loginUser(baseReq, res, dto);

      expect(authService.loginService).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: userData }),
      );
    });

    it('should handle 2FA requirement and return available methods', async () => {
      const dto = new LoginDto();
      const res = mockRes();
      const availableMethods = [
        { method: TwoFactorMethod.AUTHENTICATOR, preference: 1 },
        { method: TwoFactorMethod.EMAIL, preference: 2 },
      ];
      const userData = { requiresTwoFactor: true, availableMethods };

      authService.loginService.mockImplementation(async (_d, _u, _i, r) => {
        (r as Response).cookie('2fa_session', 'session', {});
        return userData;
      });

      await controller.loginUser(baseReq, res, dto);

      expect(res.cookie).toHaveBeenCalledWith(
        '2fa_session',
        'session',
        expect.any(Object),
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            requiresTwoFactor: true,
            availableMethods,
          },
          message: expect.stringContaining(
            'Two-factor authentication required',
          ),
        }),
      );
    });
  });

  // ── Select 2FA Method ─────────────────────────────────────────────────

  describe('selectTwoFactorMethod', () => {
    it('should select a 2FA method and return success message', async () => {
      const dto = new SelectTwoFactorMethodDto();
      dto.method = TwoFactorMethod.EMAIL;
      const req = {
        cookies: { '2fa_session': 'session-id' },
      } as unknown as Request;
      const res = mockRes();
      authService.selectTwoFactorMethod.mockResolvedValue({
        message: 'OTP sent to your registered email address.',
      });

      await controller.selectTwoFactorMethod(dto, req, res);

      expect(authService.selectTwoFactorMethod).toHaveBeenCalledWith(
        'session-id',
        TwoFactorMethod.EMAIL,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: null,
          message: 'OTP sent to your registered email address.',
        }),
      );
    });

    it('should throw UnauthorizedException when 2fa_session cookie is absent', async () => {
      const dto = new SelectTwoFactorMethodDto();
      dto.method = TwoFactorMethod.AUTHENTICATOR;
      const req = { cookies: {} } as unknown as Request;
      const res = mockRes();

      await expect(
        controller.selectTwoFactorMethod(dto, req, res),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should select authenticator method without sending OTP', async () => {
      const dto = new SelectTwoFactorMethodDto();
      dto.method = TwoFactorMethod.AUTHENTICATOR;
      const req = {
        cookies: { '2fa_session': 'session-id' },
      } as unknown as Request;
      const res = mockRes();
      authService.selectTwoFactorMethod.mockResolvedValue({
        message: 'Enter the code from your authenticator app.',
      });

      await controller.selectTwoFactorMethod(dto, req, res);

      expect(authService.selectTwoFactorMethod).toHaveBeenCalledWith(
        'session-id',
        TwoFactorMethod.AUTHENTICATOR,
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Enter the code from your authenticator app.',
        }),
      );
    });

    it('should select phone method and send SMS OTP', async () => {
      const dto = new SelectTwoFactorMethodDto();
      dto.method = TwoFactorMethod.PHONE;
      const req = {
        cookies: { '2fa_session': 'session-id' },
      } as unknown as Request;
      const res = mockRes();
      authService.selectTwoFactorMethod.mockResolvedValue({
        message: 'OTP sent to your registered phone number.',
      });

      await controller.selectTwoFactorMethod(dto, req, res);

      expect(authService.selectTwoFactorMethod).toHaveBeenCalledWith(
        'session-id',
        TwoFactorMethod.PHONE,
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'OTP sent to your registered phone number.',
        }),
      );
    });

    it('should select backupCode method without sending OTP', async () => {
      const dto = new SelectTwoFactorMethodDto();
      dto.method = TwoFactorMethod.BACKUP_CODE;
      const req = {
        cookies: { '2fa_session': 'session-id' },
      } as unknown as Request;
      const res = mockRes();
      authService.selectTwoFactorMethod.mockResolvedValue({
        message: 'Enter one of your backup codes.',
      });

      await controller.selectTwoFactorMethod(dto, req, res);

      expect(authService.selectTwoFactorMethod).toHaveBeenCalledWith(
        'session-id',
        TwoFactorMethod.BACKUP_CODE,
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Enter one of your backup codes.',
        }),
      );
    });
  });

  // ── Verify 2FA ────────────────────────────────────────────────────────

  describe('verifyTwoFactor', () => {
    it('should verify authenticator 2FA code and return token data', async () => {
      const dto = new VerifyTwoFactorDto();
      dto.code = '123456';
      dto.method = TwoFactorMethod.AUTHENTICATOR;
      const req = {
        cookies: { '2fa_session': 'session' },
      } as unknown as Request;
      const res = mockRes();
      const userData = {
        user: { id: '1', email: 'test@example.com' },
        deviceId: 'device-id',
        accessToken: 'token',
        expiresIn: 3600,
      };
      authService.verifyTwoFactorCode.mockResolvedValue(userData);

      await controller.verifyTwoFactor(dto, res, req);

      expect(authService.verifyTwoFactorCode).toHaveBeenCalledWith(
        'session',
        dto.code,
        TwoFactorMethod.AUTHENTICATOR,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: userData }),
      );
    });

    it('should verify email 2FA code and return token data', async () => {
      const dto = new VerifyTwoFactorDto();
      dto.code = '654321';
      dto.method = TwoFactorMethod.EMAIL;
      const req = {
        cookies: { '2fa_session': 'session' },
      } as unknown as Request;
      const res = mockRes();
      const userData = {
        user: { id: '1', email: 'test@example.com' },
        deviceId: 'device-id',
        accessToken: 'token',
        expiresIn: 3600,
      };
      authService.verifyTwoFactorCode.mockResolvedValue(userData);

      await controller.verifyTwoFactor(dto, res, req);

      expect(authService.verifyTwoFactorCode).toHaveBeenCalledWith(
        'session',
        dto.code,
        TwoFactorMethod.EMAIL,
        res,
      );
    });

    it('should verify phone 2FA code and return token data', async () => {
      const dto = new VerifyTwoFactorDto();
      dto.code = '789012';
      dto.method = TwoFactorMethod.PHONE;
      const req = {
        cookies: { '2fa_session': 'session' },
      } as unknown as Request;
      const res = mockRes();
      const userData = {
        user: { id: '1', email: 'test@example.com' },
        deviceId: 'device-id',
        accessToken: 'token',
        expiresIn: 3600,
      };
      authService.verifyTwoFactorCode.mockResolvedValue(userData);

      await controller.verifyTwoFactor(dto, res, req);

      expect(authService.verifyTwoFactorCode).toHaveBeenCalledWith(
        'session',
        dto.code,
        TwoFactorMethod.PHONE,
        res,
      );
    });

    it('should verify backup code and return token data', async () => {
      const dto = new VerifyTwoFactorDto();
      dto.code = 'ABCD1234EFGH';
      dto.method = TwoFactorMethod.BACKUP_CODE;
      const req = {
        cookies: { '2fa_session': 'session' },
      } as unknown as Request;
      const res = mockRes();
      const userData = {
        user: { id: '1', email: 'test@example.com' },
        deviceId: 'device-id',
        accessToken: 'token',
        expiresIn: 3600,
      };
      authService.verifyTwoFactorCode.mockResolvedValue(userData);

      await controller.verifyTwoFactor(dto, res, req);

      expect(authService.verifyTwoFactorCode).toHaveBeenCalledWith(
        'session',
        'ABCD1234EFGH',
        TwoFactorMethod.BACKUP_CODE,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: userData }),
      );
    });

    it('should pass undefined session when cookie is absent', async () => {
      const dto = new VerifyTwoFactorDto();
      dto.code = '123456';
      dto.method = TwoFactorMethod.AUTHENTICATOR;
      const req = { cookies: {} } as unknown as Request;
      const res = mockRes();

      authService.verifyTwoFactorCode.mockRejectedValue(
        new UnauthorizedException(),
      );

      await expect(controller.verifyTwoFactor(dto, res, req)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authService.verifyTwoFactorCode).toHaveBeenCalledWith(
        undefined,
        dto.code,
        TwoFactorMethod.AUTHENTICATOR,
        res,
      );
    });
  });

  // ── Get Profile ───────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('should return the user profile with 200', async () => {
      const req = { auth: { userId: 'user-id' } } as unknown as Request;
      const res = mockRes();
      const user = { id: 'user-id', email: 'test@example.com' };
      authService.getProfileService.mockResolvedValue(user as any);

      await controller.getProfile(req, res);

      expect(authService.getProfileService).toHaveBeenCalledWith('user-id');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: user }),
      );
    });
  });

  // ── Logout ────────────────────────────────────────────────────────────

  describe('logoutUser', () => {
    it('should logout user and respond with 204', async () => {
      const req = {
        auth: { userId: '1', deviceId: 'device' },
      } as unknown as Request;
      const res = mockRes();

      await controller.logoutUser(req, res);

      expect(authService.logoutService).toHaveBeenCalledWith(req.auth, res);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      const req = {} as unknown as Request;
      const res = mockRes();

      await expect(controller.logoutUser(req, res)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── Logout All ────────────────────────────────────────────────────────

  describe('logoutAll', () => {
    it('should logout all sessions and respond with 204', async () => {
      const req = { auth: { userId: '1' } } as unknown as Request;
      const res = mockRes();

      await controller.logoutAll(req, res);

      expect(authService.logoutAllService).toHaveBeenCalledWith(res, '1');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      const req = {} as unknown as Request;
      const res = mockRes();

      await expect(controller.logoutAll(req, res)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── Refresh Token ─────────────────────────────────────────────────────

  describe('refreshAccessToken', () => {
    it('should refresh access token and respond with 200', async () => {
      const req = {
        cookies: { refresh: 'refresh-token' },
      } as unknown as Request;
      const res = mockRes();
      authService.refreshAccessTokenService.mockResolvedValue({
        accessToken: 'new-access-token',
        deviceId: 'device-id',
        expiresIn: 3600,
        rememberMe: true,
      });

      await controller.refreshAccessToken(req, res);

      expect(authService.refreshAccessTokenService).toHaveBeenCalledWith(
        'refresh-token',
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ accessToken: 'new-access-token' }),
        }),
      );
    });

    it('should reject when refresh token is invalid', async () => {
      const req = { cookies: {} } as unknown as Request;
      const res = mockRes();
      authService.refreshAccessTokenService.mockRejectedValue(
        new UnauthorizedException(),
      );

      await expect(controller.refreshAccessToken(req, res)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── User Devices ──────────────────────────────────────────────────────

  describe('getUserDevices', () => {
    it('should return user devices with 200', async () => {
      const req = { auth: { userId: '1' } } as unknown as Request;
      const res = mockRes();
      const devices = [{ deviceId: 'dev-1' }, { deviceId: 'dev-2' }];
      authService.getUserDevicesService.mockResolvedValue(devices as any);

      await controller.getUserDevices(req, res);

      expect(authService.getUserDevicesService).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: devices }),
      );
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      const req = {} as unknown as Request;
      const res = mockRes();

      await expect(controller.getUserDevices(req, res)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── Revoke Device ─────────────────────────────────────────────────────

  describe('revokeDevice', () => {
    it('should revoke a device and respond with 204', async () => {
      const req = { auth: { userId: '1' } } as unknown as Request;
      const res = mockRes();
      authService.revokeDeviceService.mockResolvedValue(undefined);

      await controller.revokeDevice(req, res, 'device-123');

      expect(authService.revokeDeviceService).toHaveBeenCalledWith(
        '1',
        'device-123',
        { blacklist: true },
      );
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when deviceId is missing', async () => {
      const req = { auth: { userId: '1' } } as unknown as Request;
      const res = mockRes();

      await expect(
        controller.revokeDevice(req, res, undefined as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      const req = {} as unknown as Request;
      const res = mockRes();

      await expect(
        controller.revokeDevice(req, res, 'device-123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
