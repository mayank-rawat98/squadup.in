import {
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import * as OTPAuth from 'otpauth';
import { RedisService } from '../../redis/redis.service';
import { SmsService } from '../../settings/services/sms.service';
import { EMAIL_FINGERPRINT_PURPOSE } from '../../mailer/constants/mailer.constants';
import { MailerService } from '../../mailer/mailer.service';
import { AccountStatus, User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { JwtRefreshClaims } from '../common/types/types';
import { FingerprintUtilService } from '../common/utils/fingerprint.util';
import { IpLocationService } from '../common/utils/ip.fetchLocation';
import { AuthService } from './auth.service';
import { JwtAppService } from './jwt.service';
import { OtpTokenService } from '../../utils/generateOtp';
import { sha256 } from '../../utils/crypto.util';
import { AuditsService } from '../../audits/audits.service';
import { NotificationService } from '../../notifications/services/notification.service';
import { SettingsRepository } from '../../settings/settings.repository';
import { TwoFactorOtpService } from '../../settings/services/two-factor-otp.service';
import { TwoFactorAuthenticatorService } from '../../settings/services/two-factor-authenticator.service';
import { TwoFactorPasskeyService } from '../../settings/services/two-factor-passkey.service';
import { TwoFactorRecoveryService } from '../../settings/services/two-factor-recovery.service';
import { TwoFactorMethod } from '../../settings/entities/user-settings.entity';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthService } from '../google-auth/google-auth.service';
import { AUDIT_ACTIONS } from '../../audits/constants';

// Mock otpauth
jest.mock('otpauth', () => {
  return {
    __esModule: true,
    TOTP: jest.fn().mockImplementation(() => ({
      validate: jest.fn(),
    })),
    Secret: {
      fromBase32: jest.fn().mockReturnValue('mock-secret-object'),
    },
  };
});

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtAppService>;
  let redisService: jest.Mocked<RedisService>;
  let ipLocationService: jest.Mocked<IpLocationService>;
  let fingerprintUtil: jest.Mocked<FingerprintUtilService>;
  let mailerService: jest.Mocked<MailerService>;
  let smsService: jest.Mocked<SmsService>;
  let otpTokenService: jest.Mocked<OtpTokenService>;
  let auditsService: jest.Mocked<AuditsService>;
  let settingsRepo: jest.Mocked<SettingsRepository>;
  let twoFactorOtpService: jest.Mocked<TwoFactorOtpService>;
  let twoFactorAuthenticatorService: jest.Mocked<TwoFactorAuthenticatorService>;
  let configService: jest.Mocked<ConfigService>;
  let googleAuthService: jest.Mocked<GoogleAuthService>;

  beforeEach(async () => {
    usersService = {
      registerUser: jest.fn(),
      doesUserExist: jest.fn(),
      getUserByEmail: jest.fn(),
      updateUser: jest.fn(),
      completeProfile: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      getUser: jest.fn(),
      getUserWithSecret: jest.fn(),
      deleteUser: jest.fn(),
      getPopulatedUser: jest.fn(),
      isPhoneTaken: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    jwtService = {
      signAccessToken: jest.fn(),
      signRefreshToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
      // Remembered sessions get 30 days, others 7 — mirror the real resolver so
      // callers of createDeviceSession/refresh get a numeric TTL.
      refreshTtlSeconds: jest.fn((rememberMe: boolean) =>
        rememberMe ? 43200 * 60 : 10080 * 60,
      ),
    } as unknown as jest.Mocked<JwtAppService>;

    redisService = {
      storeDeviceMeta: jest.fn(),
      storeRefreshRecord: jest.fn(),
      store2FASession: jest.fn(),
      get2FASession: jest.fn(),
      delete2FASession: jest.fn(),
      update2FASession: jest.fn(),
      getRefreshRecord: jest.fn(),
      deleteRefreshRecord: jest.fn(),
      updateDeviceLastSeen: jest.fn(),
      blacklistDevice: jest.fn(),
      removeSingleDevice: jest.fn(),
      removeAllDevices: jest.fn(),
      getUserDevices: jest.fn(),
      setRecordEx: jest.fn(),
      getRecord: jest.fn(),
      deleteRecord: jest.fn(),
      incrWithExpiry: jest.fn().mockResolvedValue(1),
    } as unknown as jest.Mocked<RedisService>;

    ipLocationService = {
      getIpLocation: jest.fn(),
    } as unknown as jest.Mocked<IpLocationService>;

    fingerprintUtil = {
      hmacHex: jest.fn(),
      nowMs: jest.fn(),
      nowSec: jest.fn(),
      generateEmailFingerprint: jest.fn(),
      validateEmailFingerprint: jest.fn(),
      rollBackEmailFingerprint: jest.fn(),
    } as unknown as jest.Mocked<FingerprintUtilService>;

    mailerService = {
      notifyUserByEmail: jest.fn(),
    } as unknown as jest.Mocked<MailerService>;

    smsService = {
      sendOtp: jest.fn(),
    } as unknown as jest.Mocked<SmsService>;

    otpTokenService = {
      generateSecureToken: jest.fn(),
      generateSecureOtp: jest.fn(),
    } as unknown as jest.Mocked<OtpTokenService>;

    auditsService = {
      logUserAction: jest.fn().mockResolvedValue(undefined),
      logAuthEvent: jest.fn().mockResolvedValue(undefined),
      logSecurityEvent: jest.fn().mockResolvedValue(undefined),
      logFailedAction: jest.fn().mockResolvedValue(undefined),
      log: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditsService>;

    settingsRepo = {
      findByUserId: jest.fn(),
      findByUserIdWithSecrets: jest.fn(),
    } as unknown as jest.Mocked<SettingsRepository>;

    twoFactorOtpService = {
      sendOtp: jest.fn(),
      verifyOtp: jest.fn(),
    } as unknown as jest.Mocked<TwoFactorOtpService>;

    twoFactorAuthenticatorService = {
      verifyBackupCode: jest.fn(),
    } as unknown as jest.Mocked<TwoFactorAuthenticatorService>;

    configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as jest.Mocked<ConfigService>;

    googleAuthService = {
      verifyAuthCode: jest.fn(),
    } as unknown as jest.Mocked<GoogleAuthService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtAppService, useValue: jwtService },
        { provide: RedisService, useValue: redisService },
        { provide: IpLocationService, useValue: ipLocationService },
        { provide: FingerprintUtilService, useValue: fingerprintUtil },
        { provide: MailerService, useValue: mailerService },
        { provide: SmsService, useValue: smsService },
        { provide: OtpTokenService, useValue: otpTokenService },
        { provide: AuditsService, useValue: auditsService },
        {
          provide: NotificationService,
          useValue: { emit: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: SettingsRepository, useValue: settingsRepo },
        { provide: TwoFactorOtpService, useValue: twoFactorOtpService },
        {
          provide: TwoFactorAuthenticatorService,
          useValue: twoFactorAuthenticatorService,
        },
        {
          provide: TwoFactorPasskeyService,
          useValue: {
            getAuthenticationOptions: jest.fn(),
            verifyAuthentication: jest.fn(),
          },
        },
        {
          provide: TwoFactorRecoveryService,
          useValue: {
            hasCodes: jest.fn().mockResolvedValue(false),
            verifyAndConsume: jest.fn(),
            provisionIfAbsent: jest.fn(),
          },
        },
        { provide: ConfigService, useValue: configService },
        { provide: GoogleAuthService, useValue: googleAuthService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerUser', () => {
    it('should register a user and send verification email', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password',
        fullName: 'Test User',
        acceptedTerms: true,
      };
      const user = { id: '1', email: 'test@example.com' } as unknown as User;
      usersService.registerUser.mockResolvedValue(user);
      fingerprintUtil.generateEmailFingerprint.mockResolvedValue('token');
      mailerService.notifyUserByEmail.mockResolvedValue(true);

      await service.registerUser(registerDto);

      expect(usersService.registerUser).toHaveBeenCalledWith(registerDto);
      expect(fingerprintUtil.generateEmailFingerprint).toHaveBeenCalledWith(
        EMAIL_FINGERPRINT_PURPOSE.EMAIL_VERIFICATION,
        user.email,
      );
      expect(mailerService.notifyUserByEmail).toHaveBeenCalled();
    });

    it('should throw BadRequestException if email sending fails', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password',
        fullName: 'Test User',
        acceptedTerms: true,
      };
      const user = { id: '1', email: 'test@example.com' } as unknown as User;
      usersService.registerUser.mockResolvedValue(user);
      fingerprintUtil.generateEmailFingerprint.mockResolvedValue('token');
      mailerService.notifyUserByEmail.mockResolvedValue(false);
      usersService.deleteUser = jest.fn();

      await expect(service.registerUser(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(fingerprintUtil.rollBackEmailFingerprint).toHaveBeenCalled();
      expect(usersService.deleteUser).toHaveBeenCalledWith(user.id);
    });
  });

  describe('loginService', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password',
      rememberMe: true,
    };
    const ua = 'user-agent';
    const ip = '127.0.0.1';
    // Fixed: Ensure res has cookie method
    const res = { cookie: jest.fn() } as unknown as Response;

    it('should login user successfully', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        password: 'hashed-password',
        isTwoFactorEnabled: false,
        comparePassword: jest.fn().mockResolvedValue(true),
        removePassword: jest.fn().mockReturnValue({
          id: 'user-id',
          email: 'test@example.com',
        }),
      } as unknown as jest.Mocked<User>);
      fingerprintUtil.nowMs.mockReturnValue(Date.now());
      jwtService.signAccessToken.mockResolvedValue({
        token: 'access-token',
        jti: 'test-jti',
        exp: 3600,
      });
      jwtService.signRefreshToken.mockResolvedValue({
        token: 'refresh-token',
        jti: 'refresh-jti',
        exp: 7200,
      });
      ipLocationService.getIpLocation.mockResolvedValue({
        country: 'US',
        city: 'New York',
        region: 'NY',
        countryCode: 'US',
        countryFlag: '🇺🇸',
      });

      const result = await service.loginService(loginDto, ua, ip, res);

      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('user');
      expect(redisService.storeDeviceMeta).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid credentials', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        password: 'hashed-password',
        isTwoFactorEnabled: false,
        comparePassword: jest.fn().mockResolvedValue(false),
      } as unknown as jest.Mocked<User>);

      await expect(service.loginService(loginDto, ua, ip, res)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return 2FA requirement if enabled', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        password: 'hashed-password',
        isTwoFactorEnabled: true,
        comparePassword: jest.fn().mockResolvedValue(true),
      } as unknown as jest.Mocked<User>);

      settingsRepo.findByUserId.mockResolvedValue({
        twoFactor: {
          authenticator: { enabled: true, preference: 1 },
          email: { enabled: false },
          phone: { enabled: false },
        },
      } as any);

      fingerprintUtil.nowMs.mockReturnValue(Date.now());

      const result = await service.loginService(loginDto, ua, ip, res);

      expect(result).toHaveProperty('requiresTwoFactor', true);
      expect(redisService.store2FASession).toHaveBeenCalled();
      // Verify cookie was set
      expect(res.cookie).toHaveBeenCalled();
    });
  });

  describe('verifyTwoFactorCode', () => {
    const sessionId = 'session-id';
    const code = '123456';
    const res = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as Response;
    const sessionData = {
      userId: 'user-id',
      ua: 'user-agent',
      ip: '127.0.0.1',
      rememberMe: true,
      attempts: 0,
      selectedMethod: TwoFactorMethod.AUTHENTICATOR,
    };

    it('should verify 2FA code and login user', async () => {
      redisService.get2FASession.mockResolvedValue(sessionData);
      settingsRepo.findByUserIdWithSecrets.mockResolvedValue({
        twoFactor: {
          authenticator: { enabled: true, secret: 'BASE32SECRET' },
        },
      } as any);
      usersService.getUser.mockResolvedValue({
        id: 'user-id',
        removePassword: jest.fn().mockReturnValue({ id: 'user-id' }),
      } as unknown as jest.Mocked<User>);

      // Mock OTPAuth behavior for success
      const validateMock = jest.fn().mockReturnValue(0); // 0 means valid delta
      (OTPAuth.TOTP as unknown as jest.Mock).mockImplementation(() => ({
        validate: validateMock,
      }));

      ipLocationService.getIpLocation.mockResolvedValue({
        country: 'US',
        city: 'New York',
        region: 'NY',
        countryCode: 'US',
        countryFlag: '🇺🇸',
      });
      jwtService.signAccessToken.mockResolvedValue({
        token: 'access-token',
        jti: 'jti',
        exp: 3600,
      });
      jwtService.signRefreshToken.mockResolvedValue({
        token: 'refresh-token',
        jti: 'jti',
        exp: 7200,
      });
      fingerprintUtil.hmacHex.mockReturnValue('hash');
      fingerprintUtil.nowMs.mockReturnValue(Date.now());

      const result = await service.verifyTwoFactorCode(
        sessionId,
        code,
        TwoFactorMethod.AUTHENTICATOR,
        res,
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('deviceId');
      expect(redisService.delete2FASession).toHaveBeenCalledWith(sessionId);
    });

    it('should throw UnauthorizedException if session expired', async () => {
      redisService.get2FASession.mockResolvedValue(null);

      await expect(
        service.verifyTwoFactorCode(
          sessionId,
          code,
          TwoFactorMethod.AUTHENTICATOR,
          res,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if method does not match selected method', async () => {
      redisService.get2FASession.mockResolvedValue({
        ...sessionData,
        selectedMethod: TwoFactorMethod.EMAIL,
      });

      await expect(
        service.verifyTwoFactorCode(
          sessionId,
          code,
          TwoFactorMethod.AUTHENTICATOR,
          res,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if too many attempts', async () => {
      redisService.get2FASession.mockResolvedValue({
        ...sessionData,
        attempts: 5,
      });

      await expect(
        service.verifyTwoFactorCode(
          sessionId,
          code,
          TwoFactorMethod.AUTHENTICATOR,
          res,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(redisService.delete2FASession).toHaveBeenCalledWith(sessionId);
    });

    it('should throw BadRequestException if invalid code', async () => {
      redisService.get2FASession.mockResolvedValue(sessionData);
      settingsRepo.findByUserIdWithSecrets.mockResolvedValue({
        twoFactor: {
          authenticator: { enabled: true, secret: 'BASE32SECRET' },
        },
      } as any);

      // Mock OTPAuth behavior for failure
      const validateMock = jest.fn().mockReturnValue(null); // null means invalid
      (OTPAuth.TOTP as unknown as jest.Mock).mockImplementation(() => ({
        validate: validateMock,
      }));

      await expect(
        service.verifyTwoFactorCode(
          sessionId,
          code,
          TwoFactorMethod.AUTHENTICATOR,
          res,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(redisService.update2FASession).toHaveBeenCalled();
    });
  });

  describe('refreshAccessTokenService', () => {
    const refreshToken = 'refresh-token';
    const res = { cookie: jest.fn() } as unknown as Response;
    const claims: JwtRefreshClaims = {
      jti: 'jti',
      sub: '1',
      did: 'device-id',
      exp: 9999999999,
      typ: 'refresh',
      iat: 1234567890,
    };
    const rec = { userId: '1', deviceId: 'device-id', rememberMe: true };

    beforeEach(() => {
      jwtService.verifyRefreshToken.mockResolvedValue(claims);
      fingerprintUtil.nowSec.mockReturnValue(1000);
      redisService.getRefreshRecord.mockResolvedValue(rec);
      // Refresh now rejects disabled/closed accounts, so it loads the user.
      usersService.getUser.mockResolvedValue({
        accountStatus: AccountStatus.ACTIVE,
      } as User);
      jwtService.signAccessToken.mockResolvedValue({
        token: 'new-access-token',
        jti: 'new-jti',
        exp: 3600,
      });
      jwtService.signRefreshToken.mockResolvedValue({
        token: 'new-refresh-token',
        jti: 'new-jti',
        exp: 9999999999,
      });
    });

    it('should refresh access token', async () => {
      const result = await service.refreshAccessTokenService(refreshToken, res);

      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(redisService.deleteRefreshRecord).toHaveBeenCalledWith(
        claims.jti,
        claims.did,
      );
      expect(redisService.storeRefreshRecord).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if refresh expired', async () => {
      claims.exp = 0;
      fingerprintUtil.nowSec.mockReturnValue(1000);

      await expect(
        service.refreshAccessTokenService(refreshToken, res),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh revoked', async () => {
      redisService.getRefreshRecord.mockResolvedValue(null);

      await expect(
        service.refreshAccessTokenService(refreshToken, res),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── resendVerificationEmail ───────────────────────────────────────────

  describe('resendVerificationEmail', () => {
    it('should resend verification email successfully', async () => {
      usersService.doesUserExist.mockResolvedValue(true as any);
      fingerprintUtil.generateEmailFingerprint.mockResolvedValue('token');
      mailerService.notifyUserByEmail.mockResolvedValue(true);

      await service.resendVerificationEmail('test@example.com');

      expect(fingerprintUtil.generateEmailFingerprint).toHaveBeenCalledWith(
        EMAIL_FINGERPRINT_PURPOSE.EMAIL_VERIFICATION,
        'test@example.com',
      );
      expect(mailerService.notifyUserByEmail).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user does not exist', async () => {
      usersService.doesUserExist.mockResolvedValue(false as any);

      await expect(
        service.resendVerificationEmail('unknown@example.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException and rollback if email fails', async () => {
      usersService.doesUserExist.mockResolvedValue(true as any);
      fingerprintUtil.generateEmailFingerprint.mockResolvedValue('token');
      mailerService.notifyUserByEmail.mockResolvedValue(false);

      await expect(
        service.resendVerificationEmail('test@example.com'),
      ).rejects.toThrow(BadRequestException);
      expect(fingerprintUtil.rollBackEmailFingerprint).toHaveBeenCalled();
    });
  });

  // ── verifyEmailToken ──────────────────────────────────────────────────

  describe('verifyEmailToken', () => {
    it('should verify a valid email token', async () => {
      fingerprintUtil.validateEmailFingerprint.mockResolvedValue(true as any);
      usersService.getUserByEmail.mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        emailVerified: false,
      } as any);
      usersService.updateUser.mockResolvedValue({} as any);

      await service.verifyEmailToken(
        encodeURIComponent('test@example.com'),
        'valid-token',
      );

      expect(usersService.updateUser).toHaveBeenCalledWith('user-id', {
        emailVerified: true,
      });
    });

    it('should return early if email already verified', async () => {
      fingerprintUtil.validateEmailFingerprint.mockResolvedValue(true as any);
      usersService.getUserByEmail.mockResolvedValue({
        id: 'user-id',
        emailVerified: true,
      } as any);

      await service.verifyEmailToken(
        encodeURIComponent('test@example.com'),
        'token',
      );

      expect(usersService.updateUser).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid token', async () => {
      fingerprintUtil.validateEmailFingerprint.mockResolvedValue(false as any);

      await expect(
        service.verifyEmailToken(
          encodeURIComponent('test@example.com'),
          'bad-token',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user not found', async () => {
      fingerprintUtil.validateEmailFingerprint.mockResolvedValue(true as any);
      usersService.getUserByEmail.mockResolvedValue(null as any);

      await expect(
        service.verifyEmailToken(
          encodeURIComponent('notfound@example.com'),
          'token',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── createUser ────────────────────────────────────────────────────────

  describe('createUser', () => {
    it('should delegate to userService.completeProfile', async () => {
      const dto = { fullName: 'Test User' } as any;
      usersService.completeProfile.mockResolvedValue({ id: 'user-id' } as any);

      await service.createUser('user-id', dto);

      expect(usersService.completeProfile).toHaveBeenCalledWith('user-id', dto);
    });
  });

  // ── logoutService ─────────────────────────────────────────────────────

  describe('logoutService', () => {
    const res = {
      clearCookie: jest.fn(),
      cookie: jest.fn(),
    } as unknown as Response;

    it('should blacklist device and remove session', async () => {
      const auth = { userId: 'user-id', deviceId: 'device-id' } as any;
      redisService.blacklistDevice.mockResolvedValue(undefined);
      redisService.removeSingleDevice.mockResolvedValue({ refreshDeleted: 0 });

      await service.logoutService(auth, res);

      expect(redisService.blacklistDevice).toHaveBeenCalledWith(
        'device-id',
        expect.any(Number),
      );
      expect(redisService.removeSingleDevice).toHaveBeenCalledWith(
        'user-id',
        'device-id',
      );
    });

    it('should throw UnauthorizedException when deviceId is missing', async () => {
      const auth = { userId: 'user-id' } as any;

      await expect(service.logoutService(auth, res)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── logoutAllService ──────────────────────────────────────────────────

  describe('logoutAllService', () => {
    it('should remove all device sessions', async () => {
      const res = {
        clearCookie: jest.fn(),
        cookie: jest.fn(),
      } as unknown as Response;
      redisService.removeAllDevices.mockResolvedValue({
        devicesBlacklisted: 0,
        refreshDeleted: 0,
      });

      await service.logoutAllService(res, 'user-id');

      expect(redisService.removeAllDevices).toHaveBeenCalledWith('user-id');
    });
  });

  // ── getUserDevicesService ─────────────────────────────────────────────

  describe('getUserDevicesService', () => {
    it('should return user devices from redis', async () => {
      const devices = [{ deviceId: 'dev-1' }];
      redisService.getUserDevices.mockResolvedValue(devices as any);

      const result = await service.getUserDevicesService('user-id');

      expect(result).toEqual(devices);
      expect(redisService.getUserDevices).toHaveBeenCalledWith('user-id');
    });
  });

  // ── revokeDeviceService ───────────────────────────────────────────────

  describe('revokeDeviceService', () => {
    it('should remove a single device', async () => {
      redisService.removeSingleDevice.mockResolvedValue({ refreshDeleted: 0 });

      await service.revokeDeviceService('user-id', 'device-id', {
        blacklist: true,
      });

      expect(redisService.removeSingleDevice).toHaveBeenCalledWith(
        'user-id',
        'device-id',
        { blacklist: true },
      );
    });
  });

  // ── sendMobileOtp ─────────────────────────────────────────────────────

  describe('sendMobileOtp', () => {
    it('should store OTP and send SMS successfully', async () => {
      usersService.getUser.mockResolvedValue({ phoneVerified: false } as any);
      usersService.isPhoneTaken.mockResolvedValue(false);
      otpTokenService.generateSecureOtp.mockReturnValue(123456 as any);
      redisService.setRecordEx.mockResolvedValue(undefined);
      smsService.sendOtp.mockResolvedValue(true as any);

      await service.sendMobileOtp('user-id', '+1234567890');

      expect(redisService.setRecordEx).toHaveBeenCalledWith(
        'mobile_otp:user-id',
        expect.any(String),
        900,
      );
      expect(smsService.sendOtp).toHaveBeenCalledWith(
        '+1234567890',
        expect.any(String),
      );
    });

    it('should throw BadRequestException when phone is already registered', async () => {
      usersService.getUser.mockResolvedValue({ phoneVerified: false } as any);
      usersService.isPhoneTaken.mockResolvedValue(true);

      await expect(
        service.sendMobileOtp('user-id', '+1234567890'),
      ).rejects.toThrow(BadRequestException);

      expect(smsService.sendOtp).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when SMS sending fails', async () => {
      usersService.getUser.mockResolvedValue({ phoneVerified: false } as any);
      usersService.isPhoneTaken.mockResolvedValue(false);
      otpTokenService.generateSecureOtp.mockReturnValue(123456 as any);
      redisService.setRecordEx.mockResolvedValue(undefined);
      smsService.sendOtp.mockResolvedValue(false as any);

      await expect(
        service.sendMobileOtp('user-id', '+1234567890'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw and not send SMS when the send rate limit is exceeded', async () => {
      usersService.getUser.mockResolvedValue({ phoneVerified: false } as any);
      usersService.isPhoneTaken.mockResolvedValue(false);
      (redisService.incrWithExpiry as jest.Mock).mockResolvedValue(6);

      await expect(
        service.sendMobileOtp('user-id', '+1234567890'),
      ).rejects.toThrow(BadRequestException);

      expect(smsService.sendOtp).not.toHaveBeenCalled();
    });
  });

  // ── verifyMobileOtp ───────────────────────────────────────────────────

  describe('verifyMobileOtp', () => {
    it('should verify OTP, consume it, and mark phone verified', async () => {
      redisService.getRecord.mockResolvedValue(sha256('123456') as any);
      redisService.deleteRecord.mockResolvedValue(1);
      usersService.updateUser.mockResolvedValue({} as any);

      await service.verifyMobileOtp('user-id', '123456');

      expect(redisService.deleteRecord).toHaveBeenCalledWith(
        'mobile_otp:user-id',
      );
      expect(usersService.updateUser).toHaveBeenCalledWith('user-id', {
        phoneVerified: true,
      });
    });

    it('should throw BadRequestException when OTP has expired', async () => {
      redisService.getRecord.mockResolvedValue(null as any);

      await expect(
        service.verifyMobileOtp('user-id', '123456'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when OTP does not match', async () => {
      redisService.getRecord.mockResolvedValue(sha256('999999') as any);

      await expect(
        service.verifyMobileOtp('user-id', '123456'),
      ).rejects.toThrow('Invalid OTP.');

      expect(usersService.updateUser).not.toHaveBeenCalled();
    });

    it('should burn the OTP after too many incorrect attempts', async () => {
      redisService.getRecord.mockResolvedValue(sha256('999999') as any);
      (redisService.incrWithExpiry as jest.Mock).mockResolvedValue(5);
      redisService.deleteRecord.mockResolvedValue(1);

      await expect(
        service.verifyMobileOtp('user-id', '123456'),
      ).rejects.toThrow(
        'Too many incorrect attempts. Please request a new OTP.',
      );

      expect(redisService.deleteRecord).toHaveBeenCalledWith(
        'mobile_otp:user-id',
      );
      expect(redisService.deleteRecord).toHaveBeenCalledWith(
        'mobile_otp:attempts:user-id',
      );
    });
  });

  // ── getProfileService ─────────────────────────────────────────────────

  describe('getProfileService', () => {
    it('should return populated user from usersService', async () => {
      const user = { id: 'user-id', email: 'test@example.com' };
      usersService.getPopulatedUser.mockResolvedValue(user as any);

      const result = await service.getProfileService('user-id');

      expect(result).toEqual(user);
      expect(usersService.getPopulatedUser).toHaveBeenCalledWith('user-id');
    });
  });

  // ── authenticateWithGoogle ────────────────────────────────────────────

  describe('authenticateWithGoogle', () => {
    const ua = 'test-user-agent';
    const ip = '127.0.0.1';
    const googleIdentity = {
      email: 'google@example.com',
      name: 'Google User',
      picture: 'https://lh3.googleusercontent.com/photo.jpg',
      sub: 'google-sub-123',
    };

    let res: Response;

    const makeUser = (overrides: Record<string, unknown> = {}) => ({
      id: 'user-id',
      email: 'google@example.com',
      fullName: 'Google User',
      avatarUrl: 'https://lh3.googleusercontent.com/photo.jpg',
      emailVerified: true,
      removePassword: jest
        .fn()
        .mockReturnValue({ id: 'user-id', email: 'google@example.com' }),
      ...overrides,
    });

    beforeEach(() => {
      res = {
        cookie: jest.fn(),
        clearCookie: jest.fn(),
      } as unknown as Response;

      // Default: no 2FA
      settingsRepo.findByUserId.mockResolvedValue(null);

      // Default device-session mocks (shared by createDeviceSession)
      ipLocationService.getIpLocation.mockResolvedValue({
        country: 'US',
        city: 'New York',
        region: 'NY',
        countryCode: 'US',
        countryFlag: '🇺🇸',
      });
      jwtService.signAccessToken.mockResolvedValue({
        token: 'access-token',
        jti: 'jti',
        exp: 3600,
      });
      jwtService.signRefreshToken.mockResolvedValue({
        token: 'refresh-token',
        jti: 'jti',
        exp: 7200,
      });
      fingerprintUtil.hmacHex.mockReturnValue('hash');
      fingerprintUtil.nowMs.mockReturnValue(Date.now());
      redisService.storeDeviceMeta.mockResolvedValue(undefined);
      redisService.storeRefreshRecord.mockResolvedValue(undefined);
    });

    // ── Existing user (login) ──────────────────────────────────────────

    describe('existing user', () => {
      beforeEach(() => {
        googleAuthService.verifyAuthCode.mockResolvedValue(googleIdentity);
        usersService.doesUserExist.mockResolvedValue(true);
        usersService.getUserByEmail.mockResolvedValue(makeUser() as any);
      });

      it('should return tokens when all user fields are already populated', async () => {
        const result = await service.authenticateWithGoogle(
          { code: 'auth-code', rememberMe: false },
          ua,
          ip,
          res,
        );

        expect(result).toHaveProperty('accessToken', 'access-token');
        expect(result).toHaveProperty('user');
        expect(usersService.updateUser).not.toHaveBeenCalled();
      });

      it('should NOT flip a HOLD account to ACTIVE so pending onboarding is preserved', async () => {
        usersService.getUserByEmail.mockResolvedValue(
          makeUser({ accountStatus: AccountStatus.HOLD }) as any,
        );

        await service.authenticateWithGoogle(
          { code: 'auth-code', rememberMe: false },
          ua,
          ip,
          res,
        );

        const accountStatusUpdated = usersService.updateUser.mock.calls.some(
          (call: any) => call[1]?.accountStatus !== undefined,
        );
        expect(accountStatusUpdated).toBe(false);
      });

      it('should patch emailVerified when it is false', async () => {
        usersService.getUserByEmail.mockResolvedValue(
          makeUser({ emailVerified: false }) as any,
        );
        usersService.updateUser.mockResolvedValue(makeUser() as any);

        await service.authenticateWithGoogle(
          { code: 'auth-code', rememberMe: false },
          ua,
          ip,
          res,
        );

        expect(usersService.updateUser).toHaveBeenCalledWith(
          'user-id',
          expect.objectContaining({ emailVerified: true }),
        );
      });

      it('should patch missing avatarUrl from google identity', async () => {
        usersService.getUserByEmail.mockResolvedValue(
          makeUser({ avatarUrl: undefined }) as any,
        );
        usersService.updateUser.mockResolvedValue(makeUser() as any);

        await service.authenticateWithGoogle(
          { code: 'auth-code', rememberMe: false },
          ua,
          ip,
          res,
        );

        expect(usersService.updateUser).toHaveBeenCalledWith(
          'user-id',
          expect.objectContaining({ avatarUrl: googleIdentity.picture }),
        );
      });

      it('should patch missing fullName from google identity', async () => {
        usersService.getUserByEmail.mockResolvedValue(
          makeUser({ fullName: undefined }) as any,
        );
        usersService.updateUser.mockResolvedValue(makeUser() as any);

        await service.authenticateWithGoogle(
          { code: 'auth-code', rememberMe: false },
          ua,
          ip,
          res,
        );

        expect(usersService.updateUser).toHaveBeenCalledWith(
          'user-id',
          expect.objectContaining({ fullName: googleIdentity.name }),
        );
      });

      it('should NOT overwrite an existing avatarUrl', async () => {
        usersService.getUserByEmail.mockResolvedValue(
          makeUser({ avatarUrl: 'https://existing.com/avatar.jpg' }) as any,
        );

        await service.authenticateWithGoogle(
          { code: 'auth-code', rememberMe: false },
          ua,
          ip,
          res,
        );

        expect(usersService.updateUser).not.toHaveBeenCalled();
      });

      it('should set a dated refresh cookie when rememberMe is true', async () => {
        await service.authenticateWithGoogle(
          { code: 'auth-code', rememberMe: true },
          ua,
          ip,
          res,
        );

        expect(jwtService.signRefreshToken).toHaveBeenCalled();
        expect(res.cookie).toHaveBeenCalledWith(
          'refresh',
          expect.any(String),
          expect.objectContaining({ maxAge: expect.any(Number) }),
        );
      });

      it('should still set a dated refresh cookie when rememberMe is false', async () => {
        await service.authenticateWithGoogle(
          { code: 'auth-code', rememberMe: false },
          ua,
          ip,
          res,
        );

        // The refresh cookie is now always persistent — a plain login still
        // survives browser restart, just for the shorter (7-day) window instead
        // of the remembered 30-day one.
        expect(jwtService.signRefreshToken).toHaveBeenCalled();
        expect(res.cookie).toHaveBeenCalledWith(
          'refresh',
          expect.any(String),
          expect.objectContaining({ maxAge: expect.any(Number) }),
        );
      });
    });

    // ── New user (signup) ──────────────────────────────────────────────

    describe('new user', () => {
      const createdUser = {
        id: 'new-user-id',
        email: 'google@example.com',
      };

      beforeEach(() => {
        googleAuthService.verifyAuthCode.mockResolvedValue(googleIdentity);
        usersService.doesUserExist.mockResolvedValue(false);
        usersService.registerUser.mockResolvedValue(createdUser as any);
        usersService.updateUser.mockResolvedValue(
          makeUser({ id: 'new-user-id' }) as any,
        );
      });

      it('should register user, update fields, and return tokens', async () => {
        const result = await service.authenticateWithGoogle(
          { code: 'auth-code', rememberMe: false },
          ua,
          ip,
          res,
        );

        expect(usersService.registerUser).toHaveBeenCalledWith({
          email: googleIdentity.email,
          password: expect.any(String),
          acceptedTerms: true,
        });
        expect(usersService.updateUser).toHaveBeenCalledWith(
          'new-user-id',
          expect.objectContaining({
            emailVerified: true,
            isPasswordSet: false,
          }),
        );
        expect(result).toHaveProperty('accessToken', 'access-token');
      });

      it('should NOT activate the account on signup so onboarding still runs', async () => {
        await service.authenticateWithGoogle(
          { code: 'auth-code', rememberMe: false },
          ua,
          ip,
          res,
        );

        const updatePayload = (usersService.updateUser.mock.calls[0] as any)[1];
        expect(updatePayload).not.toHaveProperty('accountStatus');
      });

      it('should set fullName from google identity', async () => {
        await service.authenticateWithGoogle(
          { code: 'auth-code', rememberMe: false },
          ua,
          ip,
          res,
        );

        expect(usersService.updateUser).toHaveBeenCalledWith(
          'new-user-id',
          expect.objectContaining({ fullName: 'Google User' }),
        );
      });

      it('should fall back to email prefix when google name is absent', async () => {
        googleAuthService.verifyAuthCode.mockResolvedValue({
          ...googleIdentity,
          name: undefined,
        });

        await service.authenticateWithGoogle(
          { code: 'auth-code', rememberMe: false },
          ua,
          ip,
          res,
        );

        expect(usersService.updateUser).toHaveBeenCalledWith(
          'new-user-id',
          expect.objectContaining({ fullName: 'google' }),
        );
      });

      it('should include avatarUrl in updateUser when google provides a picture', async () => {
        await service.authenticateWithGoogle(
          { code: 'auth-code', rememberMe: false },
          ua,
          ip,
          res,
        );

        expect(usersService.updateUser).toHaveBeenCalledWith(
          'new-user-id',
          expect.objectContaining({ avatarUrl: googleIdentity.picture }),
        );
      });

      it('should fall back to a generated ui-avatars URL when google provides no picture', async () => {
        googleAuthService.verifyAuthCode.mockResolvedValue({
          ...googleIdentity,
          picture: undefined,
        });

        await service.authenticateWithGoogle(
          { code: 'auth-code', rememberMe: false },
          ua,
          ip,
          res,
        );

        const updatePayload = (usersService.updateUser.mock.calls[0] as any)[1];
        expect(updatePayload.avatarUrl).toMatch(
          /^https:\/\/ui-avatars\.com\/api\/\?name=/,
        );
      });

      it('should log USER_REGISTERED audit event on successful signup', async () => {
        await service.authenticateWithGoogle(
          { code: 'auth-code', rememberMe: false },
          ua,
          ip,
          res,
        );

        expect(auditsService.logAuthEvent).toHaveBeenCalledWith(
          AUDIT_ACTIONS.AUTH.USER_REGISTERED,
          expect.objectContaining({ userEmail: googleIdentity.email }),
        );
      });
    });

    // ── 2FA gate ───────────────────────────────────────────────────────

    describe('2FA gate', () => {
      beforeEach(() => {
        googleAuthService.verifyAuthCode.mockResolvedValue(googleIdentity);
        usersService.doesUserExist.mockResolvedValue(true);
        usersService.getUserByEmail.mockResolvedValue(makeUser() as any);
        settingsRepo.findByUserId.mockResolvedValue({
          twoFactor: {
            authenticator: { enabled: true, preference: 1 },
            email: { enabled: false },
            phone: { enabled: false },
          },
        } as any);
        redisService.store2FASession.mockResolvedValue(undefined);
      });

      it('should return requiresTwoFactor and store a 2FA session', async () => {
        const result = await service.authenticateWithGoogle(
          { code: 'auth-code', rememberMe: false },
          ua,
          ip,
          res,
        );

        expect(result).toHaveProperty('requiresTwoFactor', true);
        expect(result).toHaveProperty('availableMethods');
        expect(redisService.store2FASession).toHaveBeenCalled();
      });

      it('should NOT issue tokens when 2FA is pending', async () => {
        await service.authenticateWithGoogle(
          { code: 'auth-code', rememberMe: false },
          ua,
          ip,
          res,
        );

        expect(jwtService.signAccessToken).not.toHaveBeenCalled();
        expect(redisService.storeDeviceMeta).not.toHaveBeenCalled();
      });

      it('should include all enabled methods sorted by preference', async () => {
        settingsRepo.findByUserId.mockResolvedValue({
          twoFactor: {
            authenticator: { enabled: true, preference: 1 },
            email: { enabled: true, preference: 2 },
            phone: { enabled: false },
          },
        } as any);

        const result = await service.authenticateWithGoogle(
          { code: 'auth-code', rememberMe: false },
          ua,
          ip,
          res,
        );

        const methods = (result as any).availableMethods;
        expect(methods[0].preference).toBeLessThanOrEqual(
          methods[1].preference,
        );
      });
    });

    // ── Token verification failures ────────────────────────────────────

    describe('token verification failures', () => {
      it('should propagate UnauthorizedException from verifyAuthCode', async () => {
        googleAuthService.verifyAuthCode.mockRejectedValue(
          new UnauthorizedException('Invalid token'),
        );

        await expect(
          service.authenticateWithGoogle(
            { code: 'bad-code', rememberMe: false },
            ua,
            ip,
            res,
          ),
        ).rejects.toThrow(UnauthorizedException);

        expect(usersService.doesUserExist).not.toHaveBeenCalled();
      });

      it('should propagate InternalServerErrorException when GOOGLE_CLIENT_ID is not configured', async () => {
        googleAuthService.verifyAuthCode.mockRejectedValue(
          new InternalServerErrorException(
            'Google authentication is not configured',
          ),
        );

        await expect(
          service.authenticateWithGoogle(
            { code: 'auth-code', rememberMe: false },
            ua,
            ip,
            res,
          ),
        ).rejects.toThrow(InternalServerErrorException);
      });
    });
  });
});
