import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { MinioService } from '../minio/minio.service';
import { RedisService } from '../redis/redis.service';
import { AuditsService } from '../audits/audits.service';
import {
  AUDIT_ACTIONS,
  AUDIT_CATEGORY,
  AUDIT_RESOURCE,
  AUDIT_SEVERITY,
} from '../audits/constants';
import FingerprintUtilService from '../auth/common/utils/fingerprint.util';
import { clientUrl } from '../config';
import {
  EMAIL_FINGERPRINT_PURPOSE,
  EMAIL_TYPE_ENUM,
} from '../mailer/constants/mailer.constants';
import { MailerService } from '../mailer/mailer.service';
import { normalizeUrl } from '../utils/utils';
import { OtpTokenService } from '../utils/generateOtp';
import { sha256, timingSafeCompare } from '../utils/crypto.util';
import {
  PASSWORD_RESET_OTP_TTL_SECONDS,
  PASSWORD_RESET_RATE_LIMIT_MAX,
  PASSWORD_RESET_RATE_LIMIT_WINDOW_SECONDS,
  PASSWORD_RESET_REDIS_KEYS,
  PASSWORD_RESET_TICKET_TTL_SECONDS,
} from './constants/password-reset.constants';
import { CreateUserDto } from './dto/create-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { QueryParamDto } from './dto/query-param-dto';
import { QueryUserDto } from './dto/query-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AccountStatus, User } from './entities/user.entity';
import { UsersRepository } from './users.repository';
export const USER_AVATARS_BUCKET = 'user-avatars';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly userRepository: UsersRepository,
    private readonly mailerService: MailerService,
    private readonly fingerprintUtil: FingerprintUtilService,
    private readonly auditsService: AuditsService,
    private readonly minioService: MinioService,
    private readonly redisService: RedisService,
    private readonly otpTokenService: OtpTokenService,
  ) {}

  private buildAvatarKey(userId: string, mimetype: string): string {
    const ext =
      mimetype === 'image/png'
        ? 'png'
        : mimetype === 'image/jpeg'
          ? 'jpg'
          : 'webp';
    const hash = crypto.randomBytes(6).toString('hex');
    return `${userId}/${hash}.${ext}`;
  }

  private isSelfHostedAvatar(url: string | undefined | null): boolean {
    if (!url) return false;
    return url.includes(`/${USER_AVATARS_BUCKET}/`);
  }

  private extractAvatarObjectKey(url: string): string | null {
    const marker = `/${USER_AVATARS_BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length);
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');

    const user = await this.getUser(userId);

    await this.minioService.ensureBucketExists(USER_AVATARS_BUCKET);

    const objectKey = this.buildAvatarKey(userId, file.mimetype);
    const { url } = await this.minioService.uploadFileAtPath(
      USER_AVATARS_BUCKET,
      objectKey,
      file.buffer,
      { 'Content-Type': file.mimetype },
    );

    const previousKey = this.isSelfHostedAvatar(user.avatarUrl)
      ? this.extractAvatarObjectKey(user.avatarUrl!)
      : null;

    const updated = await this.userRepository.updateUser(userId, {
      avatarUrl: url,
    });
    if (!updated) throw new BadRequestException('Unable to update avatar');

    if (previousKey) {
      try {
        await this.minioService.deleteFiles(
          { filenames: [previousKey] },
          USER_AVATARS_BUCKET,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to delete previous avatar ${previousKey} for user ${userId}`,
          error,
        );
      }
    }

    this.auditsService.logUserAction(
      userId,
      AUDIT_ACTIONS.USER.UPDATED,
      AUDIT_RESOURCE.USER,
      userId,
      {
        description: 'User avatar updated',
        category: AUDIT_CATEGORY.USER_MANAGEMENT,
        tags: ['user', 'avatar'],
      },
    );

    return { avatarUrl: url };
  }

  async deleteAvatar(userId: string) {
    const user = await this.getUser(userId);
    if (!user.avatarUrl) {
      return { avatarUrl: null };
    }

    const previousKey = this.isSelfHostedAvatar(user.avatarUrl)
      ? this.extractAvatarObjectKey(user.avatarUrl)
      : null;

    await this.userRepository.updateUser(userId, {
      avatarUrl: null as unknown as undefined,
    });

    if (previousKey) {
      try {
        await this.minioService.deleteFiles(
          { filenames: [previousKey] },
          USER_AVATARS_BUCKET,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to delete avatar object ${previousKey} for user ${userId}`,
          error,
        );
      }
    }

    this.auditsService.logUserAction(
      userId,
      AUDIT_ACTIONS.USER.UPDATED,
      AUDIT_RESOURCE.USER,
      userId,
      {
        description: 'User avatar removed',
        category: AUDIT_CATEGORY.USER_MANAGEMENT,
        tags: ['user', 'avatar'],
      },
    );

    return { avatarUrl: null };
  }

  async registerUser(registerUserDto: RegisterUserDto) {
    // `acceptedTerms` is a transient confirmation flag, not a stored column —
    // we persist the consent as a timestamp (acceptedTermsAt) for proof.
    const { acceptedTerms, ...userData } = registerUserDto;
    const user = this.userRepository.create({
      ...userData,
      acceptedTermsAt: acceptedTerms ? new Date() : null,
    });
    await this.userRepository.save(user);
    return user;
  }
  async completeProfile(id: string, createUserDto: CreateUserDto) {
    const user = await this.getUser(id);
    if (user.accountStatus === AccountStatus.ACTIVE) {
      throw new BadRequestException('Profile already completed');
    }
    return await this.userRepository.updateUser(id, {
      ...createUserDto,
      accountStatus: AccountStatus.ACTIVE,
    });
  }
  async getPopulatedUser(id: string) {
    const result = await this.userRepository.getPopulatedUser(id);
    if (!result) {
      throw new NotFoundException('Unable to fetch');
    }
    return result;
  }
  async findByEmailWithPassword(email: string) {
    const user = await this.userRepository.findByEmailWithPassword(email);
    if (!user) {
      throw new NotFoundException('Invalid credentials');
    }
    return user;
  }

  async findByMagicLoginToken(token: string) {
    return this.userRepository.findByMagicLoginToken(token);
  }

  async clearMagicLoginToken(userId: string) {
    await this.userRepository.updateUser(userId, {
      magicLoginToken: null,
      magicLoginTokenExpiresAt: null,
    });
  }

  async getUsers(filters: QueryUserDto, queryParam: QueryParamDto) {
    return await this.userRepository.findAll(filters, queryParam);
  }

  async getUser(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
  async getUserByEmail(email: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
  /**
   * Find user exists by email without throwing exception
   * @param email
   * @returns
   */
  async doesUserExist(email: string) {
    return await this.userRepository.exists({ where: { email } });
  }
  async doesUserExistById(id: string) {
    return await this.userRepository.exists({ where: { id } });
  }

  async isPhoneTaken(phone: string, excludeUserId?: string): Promise<boolean> {
    return this.userRepository.phoneExists(phone, excludeUserId);
  }

  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto & {
      isPasswordSet?: boolean;
      emailVerified?: boolean;
      phoneVerified?: boolean;
      accountStatus?: AccountStatus;
    },
  ) {
    const user = await this.userRepository.updateUser(id, updateUserDto);
    if (!user) {
      throw new BadRequestException('Unable to update user');
    }

    this.auditsService.logUserAction(
      id,
      AUDIT_ACTIONS.USER.UPDATED,
      AUDIT_RESOURCE.USER,
      id,
      {
        changesAfter: JSON.parse(JSON.stringify(updateUserDto)),
        description: 'User profile updated',
        category: AUDIT_CATEGORY.USER_MANAGEMENT,
        tags: ['user', 'update'],
      },
    );

    return user;
  }

  async softDeleteUser(id: string) {
    const user = await this.getUser(id);
    const result = await this.userRepository.softDelete(id);
    if (!result.affected || result.affected === 0) {
      throw new BadRequestException('Unable to delete user');
    }
    const updatedUser = await this.userRepository.updateUserForDeactivation(
      id,
      {
        email: `deleted_${user.id}_${user.email}`,
        accountStatus: AccountStatus.CLOSED,
      },
    );
    if (!updatedUser) {
      throw new BadRequestException('Unable to close this account');
    }

    this.auditsService.logUserAction(
      id,
      AUDIT_ACTIONS.USER.DELETED,
      AUDIT_RESOURCE.USER,
      id,
      {
        userEmail: user.email,
        description: `User account soft-deleted: ${user.email}`,
        severity: AUDIT_SEVERITY.HIGH,
        category: AUDIT_CATEGORY.USER_MANAGEMENT,
        tags: ['user', 'delete'],
      },
    );
  }
  async resetPassword(
    email: string,
    body: ResetPasswordDto,
    currentDeviceId?: string,
  ) {
    const user = await this.userRepository.findByEmailWithPassword(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.isPasswordSet) {
      throw new BadRequestException(
        'Your account has no password yet. Use Set Password instead.',
      );
    }
    if (!user.password) {
      throw new BadRequestException(
        'Password reset is not available for accounts using social login',
      );
    }
    const isValidCurrentPassword = await bcrypt.compare(
      body.currentPassword,
      user.password,
    );
    if (!isValidCurrentPassword) {
      throw new BadRequestException('Current password is incorrect');
    }
    await this.applyNewPassword(user, body.newPassword, currentDeviceId);
    return user;
  }

  /**
   * Hash and persist a new password, revoke other sessions, and audit-log.
   * Shared by current-password reset and reset-code completion.
   */
  private async applyNewPassword(
    user: User,
    newPassword: string,
    currentDeviceId?: string,
  ): Promise<void> {
    user.password = await bcrypt.hash(newPassword, 10);
    // Clear the forced-change flag: the user has now chosen their own password.
    user.mustChangePassword = false;
    await this.userRepository.save(user);

    if (currentDeviceId) {
      try {
        await this.redisService.removeOtherDevices(user.id, currentDeviceId);
      } catch (error) {
        this.logger.warn(
          `Failed to revoke other sessions for user ${user.id}`,
          error,
        );
      }
    }

    this.auditsService.logUserAction(
      user.id,
      AUDIT_ACTIONS.USER.PASSWORD_RESET,
      AUDIT_RESOURCE.USER,
      user.id,
      {
        description: 'User password reset',
        severity: AUDIT_SEVERITY.HIGH,
        category: AUDIT_CATEGORY.SECURITY,
        tags: ['user', 'password-reset'],
      },
    );
  }

  /**
   * Send a 6-digit reset code to the authenticated user's email.
   * Used when the user has forgotten their current password while in Settings.
   */
  async sendPasswordResetCode(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user.isPasswordSet) {
      throw new BadRequestException(
        'Your account has no password yet. Use Set Password instead.',
      );
    }

    // Rate limit code sends (atomic INCR with sliding window).
    const rlKey = PASSWORD_RESET_REDIS_KEYS.OTP_RATE_LIMIT(userId);
    const count = await this.redisService.incrWithExpiry(
      rlKey,
      PASSWORD_RESET_RATE_LIMIT_WINDOW_SECONDS,
    );
    if (count > PASSWORD_RESET_RATE_LIMIT_MAX) {
      throw new BadRequestException(
        'Too many reset code requests. Please wait before trying again.',
      );
    }

    const code = this.otpTokenService.generateSecureOtp().toString();
    await this.redisService.setRecordEx(
      PASSWORD_RESET_REDIS_KEYS.OTP(userId),
      sha256(code),
      PASSWORD_RESET_OTP_TTL_SECONDS,
    );

    const sent = await this.mailerService.notifyUserByEmail({
      recipient: user.email,
      emailType: EMAIL_TYPE_ENUM.TWO_FACTOR_OTP,
      emailData: { otp: code, year: String(new Date().getFullYear()) },
    });
    if (!sent) {
      await this.redisService.deleteRecord(
        PASSWORD_RESET_REDIS_KEYS.OTP(userId),
      );
      throw new BadRequestException(
        'Unable to send reset code email. Please try again.',
      );
    }
  }

  /**
   * Verify the 6-digit reset code. On success the code is consumed and a
   * one-time ticket is returned, authorizing the subsequent password change.
   */
  async verifyPasswordResetCode(userId: string, code: string): Promise<string> {
    const stored = await this.redisService.getRecord<string>(
      PASSWORD_RESET_REDIS_KEYS.OTP(userId),
    );
    if (!stored || !timingSafeCompare(stored, sha256(code))) {
      throw new BadRequestException('Invalid or expired reset code.');
    }

    // One-time use: drop the code now that it has been proven.
    await this.redisService.deleteRecord(PASSWORD_RESET_REDIS_KEYS.OTP(userId));

    const ticket = this.otpTokenService.generateSecureToken();
    await this.redisService.setRecordEx(
      PASSWORD_RESET_REDIS_KEYS.TICKET(userId),
      sha256(ticket),
      PASSWORD_RESET_TICKET_TTL_SECONDS,
    );

    return ticket;
  }

  /**
   * Complete a code-based password reset using a verified ticket.
   */
  async completePasswordReset(
    userId: string,
    ticket: string,
    newPassword: string,
    currentDeviceId?: string,
  ): Promise<void> {
    const storedTicket = await this.redisService.getRecord<string>(
      PASSWORD_RESET_REDIS_KEYS.TICKET(userId),
    );
    if (!storedTicket || !timingSafeCompare(storedTicket, sha256(ticket))) {
      throw new BadRequestException(
        'Your reset session has expired. Please request a new code.',
      );
    }
    await this.redisService.deleteRecord(
      PASSWORD_RESET_REDIS_KEYS.TICKET(userId),
    );

    const user = await this.userRepository.findByEmailWithPassword(
      (await this.getUser(userId)).email,
    );
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.applyNewPassword(user, newPassword, currentDeviceId);
  }

  async setPassword(
    userId: string,
    body: SetPasswordDto,
    currentDeviceId?: string,
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isPasswordSet) {
      throw new BadRequestException(
        'A password is already set. Use Change Password instead.',
      );
    }
    const hashedPassword = await bcrypt.hash(body.newPassword, 10);
    await this.userRepository.updateUser(userId, {
      password: hashedPassword,
      isPasswordSet: true,
      mustChangePassword: false,
    });

    if (currentDeviceId) {
      try {
        await this.redisService.removeOtherDevices(userId, currentDeviceId);
      } catch (error) {
        this.logger.warn(
          `Failed to revoke other sessions for user ${userId}`,
          error,
        );
      }
    }

    this.auditsService.logUserAction(
      userId,
      AUDIT_ACTIONS.USER.PASSWORD_RESET,
      AUDIT_RESOURCE.USER,
      userId,
      {
        description: 'User set initial password',
        severity: AUDIT_SEVERITY.HIGH,
        category: AUDIT_CATEGORY.SECURITY,
        tags: ['user', 'password-set'],
      },
    );

    return { isPasswordSet: true };
  }

  async sendEmailVerificationLink(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return;
    }
    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }
    const verificationToken =
      await this.fingerprintUtil.generateEmailFingerprint(
        EMAIL_FINGERPRINT_PURPOSE.EMAIL_VERIFICATION,
        user.email,
      );

    const url = `${normalizeUrl(clientUrl)}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;

    const isMailSent = await this.mailerService.notifyUserByEmail({
      recipient: user.email,
      emailType: EMAIL_TYPE_ENUM.EMAIL_VERIFICATION,
      emailData: { url },
    });
    if (!isMailSent) {
      await this.fingerprintUtil.rollBackEmailFingerprint(
        user.email,
        EMAIL_FINGERPRINT_PURPOSE.EMAIL_VERIFICATION,
      );
      throw new BadRequestException('Unable to send verification email');
    }
  }

  async verifyEmailLink(encodedEmail: string, token: string) {
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
    const user = await this.userRepository.findByEmail(decodedEmail);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (user.emailVerified) {
      return; // Already verified
    }

    await this.userRepository.updateUser(user.id, { emailVerified: true });
  }

  async sendForgotPasswordEmail(email: string): Promise<void> {
    const user = await this.getUserByEmail(email);
    const verificationToken =
      await this.fingerprintUtil.generateEmailFingerprint(
        EMAIL_FINGERPRINT_PURPOSE.RESET_PASSWORD,
        user.email,
      );

    const url = `${normalizeUrl(clientUrl)}/auth/forgot-password?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;

    const isMailSent = await this.mailerService.notifyUserByEmail({
      recipient: user.email,
      emailType: EMAIL_TYPE_ENUM.PASSWORD_RESET,
      emailData: { url },
    });
    if (!isMailSent) {
      await this.fingerprintUtil.rollBackEmailFingerprint(
        user.email,
        EMAIL_FINGERPRINT_PURPOSE.RESET_PASSWORD,
      );
      throw new BadRequestException('Unable to send reset password email');
    }
  }
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const decodedEmail = decodeURIComponent(forgotPasswordDto.encodedEmail);
    if (!decodedEmail || !forgotPasswordDto.token) {
      throw new BadRequestException('Email and token are required');
    }

    const isValid = await this.fingerprintUtil.validateEmailFingerprint(
      decodedEmail,
      forgotPasswordDto.token,
      EMAIL_FINGERPRINT_PURPOSE.RESET_PASSWORD,
    );
    if (!isValid) {
      throw new BadRequestException('Invalid or expired password reset token');
    }
    const hashPassword = await bcrypt.hash(forgotPasswordDto.newPassword, 10);
    const user = await this.userRepository.updatePassword(
      hashPassword,
      decodedEmail,
    );
    if (!user) {
      throw new BadRequestException('Unable to reset password');
    }

    this.auditsService.logUserAction(
      user.id,
      AUDIT_ACTIONS.USER.FORGOT_PASSWORD_RESET,
      AUDIT_RESOURCE.USER,
      user.id,
      {
        userEmail: decodedEmail,
        description: 'Password reset via forgot-password flow',
        severity: AUDIT_SEVERITY.HIGH,
        category: AUDIT_CATEGORY.SECURITY,
        tags: ['user', 'forgot-password'],
      },
    );
  }
  async deleteUser(id: string) {
    const result = await this.userRepository.delete(id);
    if (!result.affected || result.affected === 0) {
      throw new BadRequestException('Unable to delete user');
    }
  }
  /**
   * Return IDs of all admin users.
   * Used for routing admin-facing notifications (form submissions, etc.).
   */

  async findByIds(ids: string[]) {
    return this.userRepository.findByIds(ids);
  }
}
