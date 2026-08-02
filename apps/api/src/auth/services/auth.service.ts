import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as OTPAuth from 'otpauth';
import type { Response as ExpressResponse } from 'express';
import { ConfigService } from '@nestjs/config';
import { clientUrl } from '../../config';
import {
  EMAIL_FINGERPRINT_PURPOSE,
  EMAIL_TYPE_ENUM,
} from '../../mailer/constants/mailer.constants';
import { MailerService } from '../../mailer/mailer.service';
import { RedisService } from '../../redis/redis.service';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { RegisterUserDto } from '../../users/dto/register-user.dto';
import { UsersService } from '../../users/users.service';
import { getDeviceDetails } from '../../utils/deviceDetector';
import { normalizeUrl } from '../../utils/utils';
import {
  ACCESS_TOKEN_TTL,
  MAX_TWO_FACTOR_ATTEMPTS,
} from '../common/constants/constant';
import { AuthData } from '../common/types/types';
import {
  clear2FASessionId,
  clearRefreshCookie,
  maskIp,
  set2FASessionId,
  setRefreshCookie,
} from '../common/utils/auth.util';
import { FingerprintUtilService } from '../common/utils/fingerprint.util';
import { generateDeviceId } from '../common/utils/ids.util';
import { IpLocationService } from '../common/utils/ip.fetchLocation';
import { JwtAppService } from './jwt.service';
import { LoginDto } from '../dto/login.dto';
import {
  MOBILE_OTP_REDIS_KEY,
  MOBILE_OTP_TTL_SECONDS,
  MOBILE_OTP_RL_REDIS_KEY,
  MOBILE_OTP_RATE_LIMIT_MAX,
  MOBILE_OTP_RATE_LIMIT_WINDOW_SECONDS,
  MOBILE_OTP_ATTEMPTS_REDIS_KEY,
  MOBILE_OTP_MAX_ATTEMPTS,
  X_APP_ORIGIN_HEADER_OPS,
} from '../constants/auth.constants';
import { SmsService } from '../../settings/services/sms.service';
import { OtpTokenService } from '../../utils/generateOtp';
import { sha256, decrypt } from '../../utils/crypto.util';
import { AuditsService } from '../../audits/audits.service';
import { AUDIT_ACTIONS, AUDIT_SEVERITY } from '../../audits/constants';
import { NotificationService } from '../../notifications/services/notification.service';
import { NOTIFICATION_EVENTS } from '../../notifications/constants/notification-events';
import { SettingsRepository } from '../../settings/settings.repository';
import {
  TwoFactorMethod,
  TwoFactorPreference,
  type UserSettings,
} from '../../settings/entities/user-settings.entity';
import { TwoFactorOtpService } from '../../settings/services/two-factor-otp.service';
import { TwoFactorPasskeyService } from '../../settings/services/two-factor-passkey.service';
import { TwoFactorRecoveryService } from '../../settings/services/two-factor-recovery.service';
import { TwoFactorChannel } from '../../settings/constants/two-factor.constants';
import { GoogleAuthService } from '../google-auth/google-auth.service';
import { GoogleAuthDto } from '../dto/google-auth.dto';
import { AccountStatus } from '../../users/entities/user.entity';
import { randomUUID } from 'crypto';
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtAppService,
    private readonly redisService: RedisService,
    private readonly ipLocationService: IpLocationService,
    private readonly fingerprintUtil: FingerprintUtilService,
    private readonly mailerService: MailerService,
    private readonly smsService: SmsService,
    private readonly otpTokenService: OtpTokenService,
    private readonly auditsService: AuditsService,
    private readonly notificationService: NotificationService,
    private readonly settingsRepo: SettingsRepository,
    private readonly twoFactorOtpService: TwoFactorOtpService,
    private readonly twoFactorPasskeyService: TwoFactorPasskeyService,
    private readonly twoFactorRecoveryService: TwoFactorRecoveryService,
    private readonly configService: ConfigService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  /**
   * Build the list of 2FA methods available to a user at login, ordered by
   * preference. Backup codes are offered whenever ANY factor is enrolled and
   * account-level recovery codes exist (decoupled from the authenticator).
   */
  private async buildEnabledMethods(
    settings: UserSettings | null,
    userId: string,
  ): Promise<{ method: TwoFactorMethod; preference: number }[]> {
    const enabledMethods: { method: TwoFactorMethod; preference: number }[] =
      [];

    if (settings?.twoFactor?.authenticator?.enabled) {
      enabledMethods.push({
        method: TwoFactorMethod.AUTHENTICATOR,
        preference: settings.twoFactor.authenticator.preference,
      });
    }
    if (settings?.twoFactor?.email?.enabled) {
      enabledMethods.push({
        method: TwoFactorMethod.EMAIL,
        preference: settings.twoFactor.email.preference,
      });
    }
    if (settings?.twoFactor?.phone?.enabled) {
      enabledMethods.push({
        method: TwoFactorMethod.PHONE,
        preference: settings.twoFactor.phone.preference,
      });
    }
    if (settings?.twoFactor?.passkey?.enabled) {
      enabledMethods.push({
        method: TwoFactorMethod.PASSKEY,
        preference: settings.twoFactor.passkey.preference,
      });
    }

    const anyFactor =
      settings?.twoFactor?.authenticator?.enabled ||
      settings?.twoFactor?.email?.enabled ||
      settings?.twoFactor?.phone?.enabled ||
      settings?.twoFactor?.passkey?.enabled;
    if (anyFactor && (await this.twoFactorRecoveryService.hasCodes(userId))) {
      enabledMethods.push({
        method: TwoFactorMethod.BACKUP_CODE,
        preference: TwoFactorPreference.BACKUP_CODE,
      });
    }

    // Sort by preference (lower number = higher priority)
    enabledMethods.sort((a, b) => a.preference - b.preference);
    return enabledMethods;
  }

  private async createDeviceSession(
    userId: string,
    ua: string,
    ip: string,
    rememberMe: boolean,
  ) {
    const deviceData = getDeviceDetails(ua);
    const location = await this.ipLocationService.getIpLocation(ip);
    // Every session now carries a refresh token, so device meta must outlive a
    // single access token either way. "Remember me" (and social sign-in) picks
    // the longer refresh window; the same value drives the refresh JWT, its
    // Redis record and the cookie so device meta must live at least that long.
    const refreshTtl = this.jwtService.refreshTtlSeconds(rememberMe);
    const deviceTtl = refreshTtl;
    const deviceId = generateDeviceId();
    const accessToken = await this.jwtService.signAccessToken(userId, deviceId);

    await this.redisService.storeDeviceMeta(
      deviceId,
      {
        userId,
        uaHash: this.fingerprintUtil.hmacHex(ua.toLowerCase()),
        ipHash: this.fingerprintUtil.hmacHex(ip),
        ipMask: maskIp(ip),
        createdAt: this.fingerprintUtil.nowMs(),
        lastSeen: this.fingerprintUtil.nowMs(),
        country: location.country,
        city: location.city,
        region: location.region,
        countryCode: location.countryCode,
        countryFlag: location.countryFlag,
        deviceName: deviceData.deviceName,
        deviceType: deviceData.deviceType,
        deviceOs: deviceData.deviceOs,
      },
      deviceTtl,
    );

    const refresh = await this.jwtService.signRefreshToken(
      userId,
      deviceId,
      rememberMe,
    );
    await this.redisService.storeRefreshRecord(
      refresh.jti,
      userId,
      deviceId,
      refreshTtl,
      rememberMe,
    );

    return { deviceId, accessToken, refresh };
  }

  async registerUser(registerUserDto: RegisterUserDto) {
    const user = await this.userService.registerUser(registerUserDto);
    const verificationToken =
      await this.fingerprintUtil.generateEmailFingerprint(
        EMAIL_FINGERPRINT_PURPOSE.EMAIL_VERIFICATION,
        user.email,
      );

    const url = `${normalizeUrl(clientUrl)}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
    const isMailSent = await this.mailerService.notifyUserByEmail({
      recipient: user.email,
      emailType: EMAIL_TYPE_ENUM.WELCOME,
      emailData: { url },
    });
    if (!isMailSent) {
      await this.fingerprintUtil.rollBackEmailFingerprint(
        user.email,
        EMAIL_FINGERPRINT_PURPOSE.EMAIL_VERIFICATION,
      );
      await this.userService.deleteUser(user.id);
      this.logger.error(
        'Failed to send verification email or add account email. Registration rolled back.',
      );
      throw new BadRequestException('Unable to create user at this time');
    }

    this.auditsService.logAuthEvent(AUDIT_ACTIONS.AUTH.USER_REGISTERED, {
      userId: user.id,
      userEmail: registerUserDto.email,
      description: 'New user registered',
      severity: AUDIT_SEVERITY.HIGH,
      tags: ['auth', 'registration'],
    });
  }

  async resendVerificationEmail(email: string) {
    const userExists = await this.userService.doesUserExist(email);
    if (!userExists) {
      throw new BadRequestException('User with this email does not exist');
    }
    const verificationToken =
      await this.fingerprintUtil.generateEmailFingerprint(
        EMAIL_FINGERPRINT_PURPOSE.EMAIL_VERIFICATION,
        email,
      );

    const url = `${normalizeUrl(clientUrl)}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    const isMailSent = await this.mailerService.notifyUserByEmail({
      recipient: email,
      emailType: EMAIL_TYPE_ENUM.EMAIL_VERIFICATION,
      emailData: { url },
    });
    if (!isMailSent) {
      await this.fingerprintUtil.rollBackEmailFingerprint(
        email,
        EMAIL_FINGERPRINT_PURPOSE.EMAIL_VERIFICATION,
      );
      throw new BadRequestException(
        'Unable to resend verification email at this time',
      );
    }
  }

  async verifyEmailToken(encodedEmail: string, token: string): Promise<void> {
    const decodedEmail = decodeURIComponent(encodedEmail);
    if (!decodedEmail || !token) {
      throw new BadRequestException('Email and token are required');
    }
    const isValid = await this.fingerprintUtil.validateEmailFingerprint(
      decodedEmail,
      token,
      EMAIL_FINGERPRINT_PURPOSE.EMAIL_VERIFICATION,
    );
    if (!isValid) {
      throw new BadRequestException(
        'Invalid or expired email verification token',
      );
    }
    // Mark user's email as verified
    const user = await this.userService.getUserByEmail(decodedEmail);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (user.emailVerified) {
      return; // Already verified
    }

    this.auditsService.logAuthEvent(AUDIT_ACTIONS.AUTH.EMAIL_VERIFIED, {
      userId: user.id,
      userEmail: decodedEmail,
      description: 'User email verified',
      severity: AUDIT_SEVERITY.MEDIUM,
      tags: ['auth', 'email-verification'],
    });

    const userUpdated = await this.userService
      .updateUser(user.id, { emailVerified: true })
      .catch((err) => {
        this.logger.error('Failed to update user verification status', err);
        return null;
      });

    if (!userUpdated) {
      if (userUpdated) {
        await this.userService.updateUser(user.id, { emailVerified: false });
      }
      this.logger.error(
        'Failed to verify email in all records. Rolling back user update.',
      );
      throw new BadRequestException('Unable to verify email at this time');
    }

    // Notify user of successful email verification
    this.notificationService
      .emit({
        ...NOTIFICATION_EVENTS.SECURITY.EMAIL_VERIFIED(),
        actorId: user.id,
        recipientIds: [user.id],
        idempotencyKey: `auth:email-verified:${user.id}`,
      })
      .catch(() => {
        /* fire-and-forget */
      });
  }

  async createUser(id: string, createUserDto: CreateUserDto) {
    return await this.userService.completeProfile(id, createUserDto);
  }

  // Deactivated/suspended accounts must never obtain a session — block them at
  // every auth entry point.
  private assertAccountLoginAllowed(status: AccountStatus): void {
    if (status === AccountStatus.SUSPENDED) {
      // Suspended users are told why (and the violation detail is emailed).
      throw new ForbiddenException(
        'Your account has been suspended due to a policy violation. Please check your email for details.',
      );
    }
    if (status === AccountStatus.CLOSED) {
      // Deactivated (closed) accounts are indistinguishable from a wrong
      // password — surface the same generic error.
      throw new BadRequestException('Invalid credentials');
    }
  }

  async loginService(
    credentials: LoginDto,
    ua: string,
    ip: string,
    res: ExpressResponse,
    origin?: string | string[],
  ) {
    const user = await this.userService.findByEmailWithPassword(
      credentials.email,
    );
    if (origin === X_APP_ORIGIN_HEADER_OPS) {
      throw new ForbiddenException(
        "You're not authorized to access this resource",
      );
    }
    const isValidPassword = await user.comparePassword(credentials.password);
    if (!isValidPassword) {
      throw new BadRequestException('Invalid credentials');
    }
    this.assertAccountLoginAllowed(user.accountStatus);

    // ── Check all 2FA methods from settings ──────────────────────────────
    const settings = await this.settingsRepo.findByUserId(user.id.toString());

    const enabledMethods = await this.buildEnabledMethods(
      settings,
      user.id.toString(),
    );

    if (enabledMethods.length > 0) {
      const sessionId = generateDeviceId();
      await this.redisService.store2FASession(sessionId, {
        userId: user.id.toString(),
        ua,
        ip,
        rememberMe: credentials.rememberMe,
        attempts: 0,
      });
      set2FASessionId(res, sessionId);

      this.auditsService.logAuthEvent(AUDIT_ACTIONS.AUTH.USER_LOGIN, {
        userId: user.id.toString(),
        userEmail: credentials.email,
        ipAddress: ip,
        userAgent: ua,
        description: 'User login – 2FA required',
        tags: ['auth', 'login', '2fa-pending'],
      });

      return {
        requiresTwoFactor: true,
        availableMethods: enabledMethods,
      };
    }

    const { deviceId, accessToken, refresh } = await this.createDeviceSession(
      user.id.toString(),
      ua,
      ip,
      credentials.rememberMe,
    );

    setRefreshCookie(res, refresh.token, refresh.exp);

    this.auditsService.logAuthEvent(AUDIT_ACTIONS.AUTH.USER_LOGIN, {
      userId: user.id.toString(),
      userEmail: credentials.email,
      ipAddress: ip,
      userAgent: ua,
      description: 'User login successful',
      tags: ['auth', 'login'],
    });

    const userWithoutPassword = user.removePassword();
    return {
      user: userWithoutPassword,
      deviceId,
      accessToken: accessToken.token,
      expiresIn: ACCESS_TOKEN_TTL,
    };
  }

  // ── Magic login (provisioned accounts) ───────────────────────────────
  // Consumes a one-time email link token, opens a session, and signals the FE
  // whether the user must immediately change their temporary password.
  async magicLogin(
    token: string,
    ua: string,
    ip: string,
    res: ExpressResponse,
  ) {
    const user = await this.userService.findByMagicLoginToken(token);
    if (
      !user ||
      !user.magicLoginTokenExpiresAt ||
      user.magicLoginTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'This login link is invalid or has expired',
      );
    }
    this.assertAccountLoginAllowed(user.accountStatus);

    // Single-use: invalidate before issuing the session.
    await this.userService.clearMagicLoginToken(user.id);
    user.magicLoginToken = null;
    user.magicLoginTokenExpiresAt = null;

    const session = await this.createUserSession(user.id, ua, ip, res);

    this.auditsService.logAuthEvent(AUDIT_ACTIONS.AUTH.USER_LOGIN, {
      userId: user.id.toString(),
      userEmail: user.email,
      ipAddress: ip,
      userAgent: ua,
      description: 'User login via magic link',
      tags: ['auth', 'login', 'magic-link'],
    });

    return {
      user: user.removePassword(),
      ...session,
      mustChangePassword: user.mustChangePassword,
    };
  }

  // ── Select 2FA method & trigger OTP delivery ─────────────────────────

  async selectTwoFactorMethod(
    sessionId: string,
    method: TwoFactorMethod,
  ): Promise<{ message: string }> {
    const session = await this.redisService.get2FASession(sessionId);
    if (!session) {
      throw new UnauthorizedException(
        'Your two-factor authentication session has expired. Please log in again.',
      );
    }

    const settings = await this.settingsRepo.findByUserId(session.userId);

    // Validate the chosen method is actually enabled
    if (
      method === TwoFactorMethod.AUTHENTICATOR &&
      !settings?.twoFactor?.authenticator?.enabled
    ) {
      throw new BadRequestException(
        'Authenticator 2FA is not enabled for this account.',
      );
    }
    if (
      method === TwoFactorMethod.EMAIL &&
      !settings?.twoFactor?.email?.enabled
    ) {
      throw new BadRequestException(
        'Email 2FA is not enabled for this account.',
      );
    }
    if (
      method === TwoFactorMethod.PHONE &&
      !settings?.twoFactor?.phone?.enabled
    ) {
      throw new BadRequestException(
        'Phone 2FA is not enabled for this account.',
      );
    }
    if (
      method === TwoFactorMethod.PASSKEY &&
      !settings?.twoFactor?.passkey?.enabled
    ) {
      throw new BadRequestException(
        'Passkey 2FA is not enabled for this account.',
      );
    }
    if (
      method === TwoFactorMethod.BACKUP_CODE &&
      !(await this.twoFactorRecoveryService.hasCodes(session.userId))
    ) {
      throw new BadRequestException(
        'Backup codes are not available for this account.',
      );
    }

    // Persist chosen method in the session
    session.selectedMethod = method;
    await this.redisService.update2FASession(sessionId, session);

    // Send OTP for email / phone; authenticator is self-service
    if (method === TwoFactorMethod.EMAIL) {
      const user = await this.userService.getUser(session.userId);
      const otp = await this.twoFactorOtpService.generateAndStoreOtp(
        session.userId,
        TwoFactorChannel.EMAIL,
      );
      const sent = await this.mailerService.notifyUserByEmail({
        recipient: user.email,
        emailType: EMAIL_TYPE_ENUM.TWO_FACTOR_OTP,
        emailData: { otp, year: String(new Date().getFullYear()) },
      });
      if (!sent) {
        this.logger.error(
          `Failed to send 2FA login OTP email for user ${session.userId}`,
        );
        throw new BadRequestException(
          'Unable to send OTP email. Please try again.',
        );
      }
      return { message: 'OTP sent to your registered email address.' };
    }

    if (method === TwoFactorMethod.PHONE) {
      const user = await this.userService.getUser(session.userId);
      if (!user.phone) {
        throw new BadRequestException(
          'No phone number on file. Cannot send SMS OTP.',
        );
      }
      const otp = await this.twoFactorOtpService.generateAndStoreOtp(
        session.userId,
        TwoFactorChannel.PHONE,
      );
      const sent = await this.smsService.sendOtp(user.phone, otp);
      if (!sent) {
        this.logger.error(
          `Failed to send 2FA login OTP SMS for user ${session.userId}`,
        );
        throw new BadRequestException(
          'Unable to send OTP SMS. Please try again.',
        );
      }
      return { message: 'OTP sent to your registered phone number.' };
    }

    // Authenticator — no action needed, user has the app
    // Backup code — no action needed, user has the codes
    if (method === TwoFactorMethod.BACKUP_CODE) {
      return { message: 'Enter one of your backup codes.' };
    }

    return { message: 'Enter the code from your authenticator app.' };
  }

  // ── Verify 2FA code (multi-method) ─────────────────────────────────

  async verifyTwoFactorCode(
    sessionId: string,
    code: string,
    method: TwoFactorMethod,
    res: ExpressResponse,
  ) {
    const session = await this.redisService.get2FASession(sessionId);
    if (!session) {
      throw new UnauthorizedException(
        'Your two-factor authentication session has expired. Please log in again to receive a new verification code.',
      );
    }
    if (!session.selectedMethod || session.selectedMethod !== method) {
      throw new BadRequestException(
        'Selected 2FA method does not match the method chosen during verification. Please select the correct method.',
      );
    }

    if ((session.attempts ?? 0) >= MAX_TWO_FACTOR_ATTEMPTS) {
      await this.redisService.delete2FASession(sessionId);

      this.auditsService.logAuthEvent(AUDIT_ACTIONS.AUTH.TWO_FACTOR_FAILED, {
        userId: session.userId,
        ipAddress: session.ip,
        userAgent: session.ua,
        description: 'Max 2FA attempts exceeded – session invalidated',
        severity: AUDIT_SEVERITY.HIGH,
        status: 'FAILURE',
        tags: ['auth', '2fa', 'max-attempts'],
      });

      throw new BadRequestException(
        'Too many failed attempts. Please log in again.',
      );
    }

    // Verify based on selected method
    let isValid = false;

    try {
      if (method === TwoFactorMethod.AUTHENTICATOR) {
        isValid = await this.verifyAuthenticatorCode(session.userId, code);
      } else if (method === TwoFactorMethod.EMAIL) {
        await this.twoFactorOtpService.verifyOtp(
          session.userId,
          TwoFactorChannel.EMAIL,
          code,
        );
        isValid = true;
      } else if (method === TwoFactorMethod.PHONE) {
        await this.twoFactorOtpService.verifyOtp(
          session.userId,
          TwoFactorChannel.PHONE,
          code,
        );
        isValid = true;
      } else if (method === TwoFactorMethod.BACKUP_CODE) {
        isValid = await this.twoFactorRecoveryService.verifyAndConsume(
          session.userId,
          code,
        );
      }
    } catch {
      // Verification failed — fall through to increment attempts
      isValid = false;
    }

    // Constant-time delay to prevent timing attacks
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (!isValid) {
      session.attempts = (session.attempts ?? 0) + 1;
      await this.redisService.update2FASession(sessionId, session);
      throw new BadRequestException('Invalid 2FA code');
    }

    clear2FASessionId(res);
    const { deviceId, accessToken, refresh } = await this.createDeviceSession(
      session.userId,
      session.ua,
      session.ip,
      session.rememberMe,
    );

    setRefreshCookie(res, refresh.token, refresh.exp);

    await this.redisService.delete2FASession(sessionId);

    this.auditsService.logAuthEvent(AUDIT_ACTIONS.AUTH.TWO_FACTOR_VERIFIED, {
      userId: session.userId,
      ipAddress: session.ip,
      userAgent: session.ua,
      description: `2FA verification successful via ${method} – login completed`,
      severity: AUDIT_SEVERITY.HIGH,
      tags: ['auth', '2fa', 'login', method],
    });

    const user = await this.userService.getUser(session.userId);
    const userWithoutPassword = user.removePassword();
    return {
      user: userWithoutPassword,
      deviceId,
      accessToken: accessToken.token,
      expiresIn: ACCESS_TOKEN_TTL,
    };
  }

  // ── Passkey login (WebAuthn) ────────────────────────────────────────

  async getPasskeyLoginOptions(sessionId: string) {
    const session = await this.redisService.get2FASession(sessionId);
    if (!session) {
      throw new UnauthorizedException(
        'Your two-factor authentication session has expired. Please log in again.',
      );
    }
    const settings = await this.settingsRepo.findByUserId(session.userId);
    if (!settings?.twoFactor?.passkey?.enabled) {
      throw new BadRequestException(
        'Passkey 2FA is not enabled for this account.',
      );
    }
    session.selectedMethod = TwoFactorMethod.PASSKEY;
    await this.redisService.update2FASession(sessionId, session);
    return this.twoFactorPasskeyService.getAuthenticationOptions(
      session.userId,
    );
  }

  async verifyPasskeyLogin(
    sessionId: string,
    response: unknown,
    res: ExpressResponse,
  ) {
    const session = await this.redisService.get2FASession(sessionId);
    if (!session) {
      throw new UnauthorizedException(
        'Your two-factor authentication session has expired. Please log in again.',
      );
    }
    if ((session.attempts ?? 0) >= MAX_TWO_FACTOR_ATTEMPTS) {
      await this.redisService.delete2FASession(sessionId);
      throw new BadRequestException(
        'Too many failed attempts. Please log in again.',
      );
    }

    let isValid = false;
    try {
      isValid = await this.twoFactorPasskeyService.verifyAuthentication(
        session.userId,
        response as never,
      );
    } catch {
      isValid = false;
    }

    // Constant-time delay to blunt timing analysis, mirroring code-based verify.
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (!isValid) {
      session.attempts = (session.attempts ?? 0) + 1;
      await this.redisService.update2FASession(sessionId, session);
      throw new BadRequestException('Passkey verification failed');
    }

    clear2FASessionId(res);
    const { deviceId, accessToken, refresh } = await this.createDeviceSession(
      session.userId,
      session.ua,
      session.ip,
      session.rememberMe,
    );

    setRefreshCookie(res, refresh.token, refresh.exp);
    await this.redisService.delete2FASession(sessionId);

    this.auditsService.logAuthEvent(AUDIT_ACTIONS.AUTH.TWO_FACTOR_VERIFIED, {
      userId: session.userId,
      ipAddress: session.ip,
      userAgent: session.ua,
      description: '2FA verification successful via passkey – login completed',
      severity: AUDIT_SEVERITY.HIGH,
      tags: ['auth', '2fa', 'login', 'passkey'],
    });

    const user = await this.userService.getUser(session.userId);
    return {
      user: user.removePassword(),
      deviceId,
      accessToken: accessToken.token,
      expiresIn: ACCESS_TOKEN_TTL,
    };
  }

  // ── Authenticator TOTP verification helper ──────────────────────────

  private async verifyAuthenticatorCode(
    userId: string,
    code: string,
  ): Promise<boolean> {
    const settings = await this.settingsRepo.findByUserIdWithSecrets(userId);

    if (
      !settings?.twoFactor?.authenticator?.enabled ||
      !settings.twoFactor.authenticator.secret
    ) {
      return false;
    }

    const encryptionKey = this.configService.get<string>(
      'TWO_FACTOR_ENCRYPTION_KEY',
    );

    const secretBase32 = encryptionKey
      ? decrypt(settings.twoFactor.authenticator.secret, encryptionKey)
      : settings.twoFactor.authenticator.secret;

    const totp = new OTPAuth.TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });

    const delta = totp.validate({ token: code, window: 1 });
    return delta !== null;
  }

  async refreshAccessTokenService(refreshToken: string, res: ExpressResponse) {
    const claims = await this.jwtService.verifyRefreshToken(refreshToken);
    if (claims.exp <= this.fingerprintUtil.nowSec()) {
      throw new UnauthorizedException('Refresh expired');
    }
    const rec = await this.redisService.getRefreshRecord(claims.jti);
    if (!rec || rec.userId !== claims.sub || rec.deviceId !== claims.did) {
      throw new UnauthorizedException('Refresh revoked');
    }

    // A disabled/closed account must not be able to mint fresh access tokens,
    // even if a valid refresh token survived session revocation.
    const user = await this.userService.getUser(claims.sub);
    this.assertAccountLoginAllowed(user.accountStatus);

    // Rotation preserves the session's remember-me choice, so the sliding
    // window keeps its original length (30 days for remembered, 7 otherwise).
    const refreshTtl = this.jwtService.refreshTtlSeconds(rec.rememberMe);
    await this.redisService.deleteRefreshRecord(claims.jti, claims.did);
    const access = await this.jwtService.signAccessToken(
      claims.sub,
      claims.did,
    );
    const nextRefresh = await this.jwtService.signRefreshToken(
      claims.sub,
      claims.did,
      rec.rememberMe,
    );
    await this.redisService.storeRefreshRecord(
      nextRefresh.jti,
      claims.sub,
      claims.did,
      refreshTtl,
      rec.rememberMe,
    );
    await this.redisService.updateDeviceLastSeen(claims.did);
    setRefreshCookie(res, nextRefresh.token, refreshTtl);
    return {
      accessToken: access.token,
      deviceId: claims.did,
      expiresIn: ACCESS_TOKEN_TTL,
      rememberMe: rec.rememberMe,
    };
  }
  async logoutService(auth: AuthData, res: ExpressResponse) {
    if (!auth?.deviceId) {
      throw new UnauthorizedException('Missing deviceId');
    }
    await this.redisService.blacklistDevice(auth?.deviceId, ACCESS_TOKEN_TTL);
    await this.redisService.removeSingleDevice(auth?.userId, auth?.deviceId);

    this.auditsService.logAuthEvent(AUDIT_ACTIONS.AUTH.USER_LOGOUT, {
      userId: auth.userId,
      description: `User logged out from device ${auth.deviceId}`,
      tags: ['auth', 'logout'],
    });

    clearRefreshCookie(res);
  }
  async logoutAllService(res: ExpressResponse, userId: string) {
    await this.redisService.removeAllDevices(userId);

    this.auditsService.logAuthEvent(AUDIT_ACTIONS.AUTH.USER_LOGOUT_ALL, {
      userId,
      description: 'User logged out from all devices',
      severity: AUDIT_SEVERITY.HIGH,
      tags: ['auth', 'logout-all'],
    });

    clearRefreshCookie(res);

    // Notify user of logout from all devices
    this.notificationService
      .emit({
        ...NOTIFICATION_EVENTS.SECURITY.LOGOUT_ALL_DEVICES(),
        actorId: userId,
        recipientIds: [userId],
      })
      .catch(() => {
        /* fire-and-forget */
      });
  }
  async getUserDevicesService(userId: string) {
    return await this.redisService.getUserDevices(userId);
  }
  async revokeDeviceService(
    userId: string,
    deviceId: string,
    opts: { blacklist: boolean },
  ) {
    await this.redisService.removeSingleDevice(userId, deviceId, opts);

    this.auditsService.logAuthEvent(AUDIT_ACTIONS.AUTH.DEVICE_REVOKED, {
      userId,
      deviceId,
      description: `Device ${deviceId} revoked`,
      severity: AUDIT_SEVERITY.HIGH,
      tags: ['auth', 'device-revoke'],
    });

    // Notify user of device revocation
    this.notificationService
      .emit({
        ...NOTIFICATION_EVENTS.SECURITY.DEVICE_REVOKED(deviceId),
        actorId: userId,
        recipientIds: [userId],
        idempotencyKey: `auth:device-revoked:${deviceId}`,
      })
      .catch(() => {
        /* fire-and-forget */
      });
  }

  // ── Mobile OTP ──────────────────────────────────────────────────────────

  async sendMobileOtp(userId: string, phone: string): Promise<void> {
    const user = await this.userService.getUser(userId);
    if (user.phoneVerified) {
      throw new BadRequestException('Phone already verified');
    }

    const taken = await this.userService.isPhoneTaken(phone, userId);
    if (taken) {
      throw new BadRequestException(
        'This phone number is already registered to another account.',
      );
    }

    // Cap OTP sends per user/window (atomic INCR) so this can't spam SMS.
    const sendCount = await this.redisService.incrWithExpiry(
      MOBILE_OTP_RL_REDIS_KEY(userId),
      MOBILE_OTP_RATE_LIMIT_WINDOW_SECONDS,
    );
    if (sendCount > MOBILE_OTP_RATE_LIMIT_MAX) {
      throw new BadRequestException(
        'Too many OTP requests. Please wait before trying again.',
      );
    }

    const otp = this.otpTokenService.generateSecureOtp().toString();
    const hashedOtp = sha256(otp);
    // Overwrite any existing OTP and reset TTL. A fresh code resets the wrong-
    // guess counter so a legitimate resend isn't penalised by earlier misses.
    await this.redisService.setRecordEx(
      MOBILE_OTP_REDIS_KEY(userId),
      hashedOtp,
      MOBILE_OTP_TTL_SECONDS,
    );
    await this.redisService.deleteRecord(MOBILE_OTP_ATTEMPTS_REDIS_KEY(userId));
    const sent = await this.smsService.sendOtp(phone, otp);
    if (!sent) {
      this.logger.error('Failed to send OTP SMS');
      throw new BadRequestException('Unable to send OTP SMS. Try again.');
    }
  }

  async verifyMobileOtp(userId: string, otp: string): Promise<void> {
    const storedOtp = await this.redisService.getRecord<string>(
      MOBILE_OTP_REDIS_KEY(userId),
    );

    if (!storedOtp) {
      throw new BadRequestException(
        'OTP has expired or was never requested. Please request a new OTP.',
      );
    }
    const inputHash = sha256(otp);

    const storedBuf = Buffer.from(storedOtp, 'hex');
    const inputBuf = Buffer.from(inputHash, 'hex');
    if (
      storedBuf.length !== inputBuf.length ||
      !crypto.timingSafeEqual(storedBuf, inputBuf)
    ) {
      // Count wrong guesses and burn the code once the cap is hit, so a 6-digit
      // OTP can't be brute-forced within its TTL. The counter shares the OTP's
      // lifetime and is cleared on success or resend.
      const attempts = await this.redisService.incrWithExpiry(
        MOBILE_OTP_ATTEMPTS_REDIS_KEY(userId),
        MOBILE_OTP_TTL_SECONDS,
      );
      if (attempts >= MOBILE_OTP_MAX_ATTEMPTS) {
        await this.redisService.deleteRecord(MOBILE_OTP_REDIS_KEY(userId));
        await this.redisService.deleteRecord(
          MOBILE_OTP_ATTEMPTS_REDIS_KEY(userId),
        );
        throw new BadRequestException(
          'Too many incorrect attempts. Please request a new OTP.',
        );
      }
      throw new BadRequestException('Invalid OTP.');
    }

    // Consume the OTP immediately (prevent replay)
    await this.redisService.deleteRecord(MOBILE_OTP_REDIS_KEY(userId));
    await this.redisService.deleteRecord(MOBILE_OTP_ATTEMPTS_REDIS_KEY(userId));

    await this.userService.updateUser(userId, { phoneVerified: true });

    this.auditsService.logAuthEvent(AUDIT_ACTIONS.AUTH.MOBILE_OTP_VERIFIED, {
      userId,
      description: 'Mobile OTP verified – phone number confirmed',
      severity: AUDIT_SEVERITY.MEDIUM,
      tags: ['auth', 'mobile-verification'],
    });

    // Notify user of phone verification
    this.notificationService
      .emit({
        ...NOTIFICATION_EVENTS.SECURITY.PHONE_VERIFIED(),
        actorId: userId,
        recipientIds: [userId],
        idempotencyKey: `auth:phone-verified:${userId}`,
      })
      .catch(() => {
        /* fire-and-forget */
      });
  }
  async getProfileService(userId: string) {
    return await this.userService.getPopulatedUser(userId);
  }

  async authenticateWithGoogle(
    payload: GoogleAuthDto,
    ua: string,
    ip: string,
    res: ExpressResponse,
  ) {
    const googleIdentity = await this.googleAuthService.verifyAuthCode(
      payload.code,
    );

    const isNewUser = !(await this.userService.doesUserExist(
      googleIdentity.email,
    ));
    let user = isNewUser
      ? null
      : await this.userService.getUserByEmail(googleIdentity.email);

    if (!isNewUser && user) {
      const updates: {
        emailVerified?: boolean;
        avatarUrl?: string;
        fullName?: string;
        accountStatus?: AccountStatus;
      } = {};
      if (!user.emailVerified) updates.emailVerified = true;
      if (!user.avatarUrl && googleIdentity.picture)
        updates.avatarUrl = googleIdentity.picture;
      if (!user.fullName && googleIdentity.name)
        updates.fullName = googleIdentity.name;
      // Note: do NOT flip HOLD → ACTIVE here. HOLD means the user still needs
      // to complete onboarding; activation happens only via completeProfile.

      if (Object.keys(updates).length > 0) {
        user = await this.userService.updateUser(user.id, updates);
      }
    } else {
      const created = await this.userService.registerUser({
        email: googleIdentity.email,
        password: randomUUID(),
        // Completing Google sign-up from our signup screen constitutes
        // acceptance of the Terms & Privacy Policy shown there.
        acceptedTerms: true,
      });

      this.auditsService.logAuthEvent(AUDIT_ACTIONS.AUTH.USER_REGISTERED, {
        userId: created.id,
        userEmail: created.email,
        description: 'New user registered via Google',
        severity: AUDIT_SEVERITY.HIGH,
        tags: ['auth', 'registration', 'google'],
      });

      const fullName =
        googleIdentity.name ||
        googleIdentity.email.split('@')[0] ||
        'Google User';
      const avatarUrl =
        googleIdentity.picture ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`;
      // Leave accountStatus at its default (HOLD) so the new user is routed
      // through onboarding, matching the email/password signup flow.
      user = await this.userService.updateUser(created.id, {
        fullName,
        emailVerified: true,
        isPasswordSet: false,
        avatarUrl,
      });
    }

    // user is guaranteed non-null at this point
    const resolvedUser = user;

    // Block disabled/closed accounts (HOLD is allowed — new users onboarding).
    this.assertAccountLoginAllowed(resolvedUser.accountStatus);

    // ── 2FA check ────────────────────────────────────────────────────────
    const settings = await this.settingsRepo.findByUserId(
      resolvedUser.id.toString(),
    );

    const enabledMethods = await this.buildEnabledMethods(
      settings,
      resolvedUser.id.toString(),
    );

    if (enabledMethods.length > 0) {
      const sessionId = generateDeviceId();
      await this.redisService.store2FASession(sessionId, {
        userId: resolvedUser.id.toString(),
        ua,
        ip,
        // Social sign-in is treated as remembered by default (industry norm):
        // clicking "Continue with Google" is itself an intentional persistent
        // login, so it gets the longer session window unless told otherwise.
        rememberMe: payload.rememberMe ?? true,
        attempts: 0,
      });
      set2FASessionId(res, sessionId);

      this.auditsService.logAuthEvent(AUDIT_ACTIONS.AUTH.USER_LOGIN, {
        userId: resolvedUser.id.toString(),
        userEmail: googleIdentity.email,
        ipAddress: ip,
        userAgent: ua,
        description: isNewUser
          ? 'Google signup – 2FA required'
          : 'Google login – 2FA required',
        tags: ['auth', 'login', 'google', '2fa-pending'],
      });

      return { requiresTwoFactor: true, availableMethods: enabledMethods };
    }

    const { deviceId, accessToken, refresh } = await this.createDeviceSession(
      resolvedUser.id.toString(),
      ua,
      ip,
      // Social sign-in defaults to the longer, remembered session window.
      payload.rememberMe ?? true,
    );

    setRefreshCookie(res, refresh.token, refresh.exp);

    this.auditsService.logAuthEvent(AUDIT_ACTIONS.AUTH.USER_LOGIN, {
      userId: resolvedUser.id.toString(),
      userEmail: googleIdentity.email,
      ipAddress: ip,
      userAgent: ua,
      description: isNewUser
        ? 'User signup successful with Google'
        : 'User login successful with Google',
      tags: ['auth', 'login', 'google'],
    });

    return {
      user: resolvedUser.removePassword(),
      deviceId,
      accessToken: accessToken.token,
      expiresIn: ACCESS_TOKEN_TTL,
    };
  }

  async createUserSession(
    userId: string,
    ua: string,
    ip: string,
    res: ExpressResponse,
  ) {
    const { deviceId, accessToken, refresh } = await this.createDeviceSession(
      userId,
      ua,
      ip,
      false,
    );
    setRefreshCookie(res, refresh.token, refresh.exp);
    return {
      deviceId,
      accessToken: accessToken.token,
      expiresIn: ACCESS_TOKEN_TTL,
    };
  }
}
