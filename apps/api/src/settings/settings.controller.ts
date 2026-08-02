import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import {
  SensitiveRateLimit,
  UserRateLimit,
} from '../decorators/throttler.decorator';
import {
  DisableAuthenticatorDto,
  RenamePasskeyDto,
  VerifyAuthenticatorDto,
  VerifyEmailCodeDto,
  VerifyPasskeyRegistrationDto,
  VerifyPhoneOtpDto,
} from './dto';
import { TwoFactorAuthenticatorService } from './services/two-factor-authenticator.service';
import { TwoFactorEmailService } from './services/two-factor-email.service';
import { TwoFactorPhoneService } from './services/two-factor-phone.service';
import { TwoFactorPasskeyService } from './services/two-factor-passkey.service';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import {
  AuthenticatorDisableDocs,
  AuthenticatorDisableWithEmailDocs,
  AuthenticatorSendRecoveryOtpDocs,
  AuthenticatorSetupDocs,
  AuthenticatorVerifyDocs,
  EmailDisableDocs,
  EmailSendDisableOtpDocs,
  EmailSendOtpDocs,
  EmailVerifyOtpDocs,
  PhoneDisableDocs,
  PhoneSendDisableOtpDocs,
  PhoneSendOtpDocs,
  PhoneVerifyOtpDocs,
  RegenerateBackupCodesDocs,
} from './swagger/settings.swagger';
import { AuditsService } from '../audits/audits.service';
import {
  AUDIT_ACTIONS,
  AUDIT_RESOURCE,
  AUDIT_SEVERITY,
} from '../audits/constants';

@ApiTags('settings/2fa')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'settings/2fa', version: '1' })
export class SettingsController {
  constructor(
    private readonly authenticatorService: TwoFactorAuthenticatorService,
    private readonly emailService: TwoFactorEmailService,
    private readonly phoneService: TwoFactorPhoneService,
    private readonly passkeyService: TwoFactorPasskeyService,
    private readonly auditsService: AuditsService,
  ) {}

  // ── Authenticator ─────────────────────────────

  @Post('authenticator/setup')
  @SensitiveRateLimit()
  @AuthenticatorSetupDocs
  async authenticatorSetup(@Request() req: ExpressRequest) {
    const authenticatorData = await this.authenticatorService.setup(
      req.user.id,
    );

    this.auditsService
      .logUserAction(
        req.user.id,
        AUDIT_ACTIONS.SETTINGS.AUTHENTICATOR_SETUP,
        AUDIT_RESOURCE.SETTINGS,
        req.user.id,
        { severity: AUDIT_SEVERITY.HIGH },
      )
      .catch(() => {
        /* noop */
      });

    return {
      success: true,
      message: 'Authenticator setup initiated',
      data: { authenticatorData },
    };
  }

  @Post('authenticator/verify')
  @SensitiveRateLimit()
  @AuthenticatorVerifyDocs
  async authenticatorVerify(
    @Request() req: ExpressRequest,
    @Body() dto: VerifyAuthenticatorDto,
  ) {
    const { backupCodes } = await this.authenticatorService.verify(
      req.user.id,
      dto.code,
    );

    this.auditsService
      .logUserAction(
        req.user.id,
        AUDIT_ACTIONS.SETTINGS.AUTHENTICATOR_ENABLED,
        AUDIT_RESOURCE.SETTINGS,
        req.user.id,
        { severity: AUDIT_SEVERITY.CRITICAL },
      )
      .catch(() => {
        /* noop */
      });

    return {
      success: true,
      message: 'Authenticator 2FA enabled. Save your backup codes.',
      data: { backupCodes },
    };
  }

  @Post('authenticator/regenerate-backup-codes')
  @SensitiveRateLimit()
  @RegenerateBackupCodesDocs
  async regenerateBackupCodes(@Request() req: ExpressRequest) {
    const { backupCodes } =
      await this.authenticatorService.regenerateBackupCodes(req.user.id);

    this.auditsService
      .logUserAction(
        req.user.id,
        AUDIT_ACTIONS.SETTINGS.BACKUP_CODES_REGENERATED,
        AUDIT_RESOURCE.SETTINGS,
        req.user.id,
        { severity: AUDIT_SEVERITY.HIGH },
      )
      .catch(() => {
        /* noop */
      });

    return {
      success: true,
      message: 'Backup codes regenerated. Previous codes are now invalid.',
      data: { backupCodes },
    };
  }

  @Post('authenticator/disable')
  @SensitiveRateLimit()
  @AuthenticatorDisableDocs
  async authenticatorDisable(
    @Request() req: ExpressRequest,
    @Body() dto: DisableAuthenticatorDto,
  ) {
    await this.authenticatorService.disable(req.user.id, dto.code);

    this.auditsService
      .logUserAction(
        req.user.id,
        AUDIT_ACTIONS.SETTINGS.AUTHENTICATOR_DISABLED,
        AUDIT_RESOURCE.SETTINGS,
        req.user.id,
        { severity: AUDIT_SEVERITY.CRITICAL },
      )
      .catch(() => {
        /* noop */
      });

    return {
      success: true,
      message: 'Authenticator 2FA disabled successfully',
      data: null,
    };
  }

  @Post('authenticator/send-recovery-otp')
  @SensitiveRateLimit()
  @AuthenticatorSendRecoveryOtpDocs
  async authenticatorSendRecoveryOtp(@Request() req: ExpressRequest) {
    await this.authenticatorService.sendRecoveryOtp(req.user.id);
    return {
      success: true,
      message: 'Recovery OTP sent to your email',
      data: null,
    };
  }

  @Post('authenticator/disable-with-email')
  @SensitiveRateLimit()
  @AuthenticatorDisableWithEmailDocs
  async authenticatorDisableWithEmail(
    @Request() req: ExpressRequest,
    @Body() dto: VerifyEmailCodeDto,
  ) {
    await this.authenticatorService.disableWithEmailOtp(req.user.id, dto.code);

    this.auditsService
      .logUserAction(
        req.user.id,
        AUDIT_ACTIONS.SETTINGS.AUTHENTICATOR_DISABLED,
        AUDIT_RESOURCE.SETTINGS,
        req.user.id,
        { severity: AUDIT_SEVERITY.CRITICAL },
      )
      .catch(() => {
        /* noop */
      });

    return {
      success: true,
      message: 'Authenticator 2FA disabled successfully',
      data: null,
    };
  }

  // ── Email 2FA ─────────────────────────────────

  @Post('email/send-otp')
  @SensitiveRateLimit()
  @EmailSendOtpDocs
  async emailSendOtp(@Request() req: ExpressRequest) {
    await this.emailService.sendOtp(req.user.id, req.user.email);
    return { success: true, message: 'OTP sent to your email', data: null };
  }

  @Post('email/verify-otp')
  @SensitiveRateLimit()
  @EmailVerifyOtpDocs
  async emailVerifyOtp(
    @Request() req: ExpressRequest,
    @Body() dto: VerifyEmailCodeDto,
  ) {
    await this.emailService.verifyOtp(req.user.id, dto.code);

    this.auditsService
      .logUserAction(
        req.user.id,
        AUDIT_ACTIONS.SETTINGS.EMAIL_ENABLED,
        AUDIT_RESOURCE.SETTINGS,
        req.user.id,
        { severity: AUDIT_SEVERITY.CRITICAL },
      )
      .catch(() => {
        /* noop */
      });

    return {
      success: true,
      message: 'Email 2FA enabled successfully',
      data: null,
    };
  }

  @Post('email/send-disable-otp')
  @SensitiveRateLimit()
  @EmailSendDisableOtpDocs
  async emailSendDisableOtp(@Request() req: ExpressRequest) {
    await this.emailService.sendDisableOtp(req.user.id, req.user.email);
    return {
      success: true,
      message: 'OTP sent to your email to confirm disabling 2FA',
      data: null,
    };
  }

  @Post('email/disable')
  @SensitiveRateLimit()
  @EmailDisableDocs
  async emailDisable(
    @Request() req: ExpressRequest,
    @Body() dto: VerifyEmailCodeDto,
  ) {
    await this.emailService.disable(req.user.id, dto.code);

    this.auditsService
      .logUserAction(
        req.user.id,
        AUDIT_ACTIONS.SETTINGS.EMAIL_DISABLED,
        AUDIT_RESOURCE.SETTINGS,
        req.user.id,
        { severity: AUDIT_SEVERITY.CRITICAL },
      )
      .catch(() => {
        /* noop */
      });

    return {
      success: true,
      message: 'Email 2FA disabled successfully',
      data: null,
    };
  }

  // ── Phone 2FA ─────────────────────────────────

  @Post('phone/send-otp')
  @SensitiveRateLimit()
  @PhoneSendOtpDocs
  async phoneSendOtp(@Request() req: ExpressRequest) {
    if (!req.user.phone) {
      return {
        success: false,
        message: 'No phone number associated with your account',
        data: null,
      };
    }
    await this.phoneService.sendOtp(req.user.id, req.user.phone);
    return { success: true, message: 'OTP sent to your phone', data: null };
  }

  @Post('phone/verify-otp')
  @SensitiveRateLimit()
  @PhoneVerifyOtpDocs
  async phoneVerifyOtp(
    @Request() req: ExpressRequest,
    @Body() dto: VerifyPhoneOtpDto,
  ) {
    await this.phoneService.verifyOtp(req.user.id, dto.code);

    this.auditsService
      .logUserAction(
        req.user.id,
        AUDIT_ACTIONS.SETTINGS.PHONE_ENABLED,
        AUDIT_RESOURCE.SETTINGS,
        req.user.id,
        { severity: AUDIT_SEVERITY.CRITICAL },
      )
      .catch(() => {
        /* noop */
      });

    return {
      success: true,
      message: 'Phone 2FA enabled successfully',
      data: null,
    };
  }

  @Post('phone/send-disable-otp')
  @SensitiveRateLimit()
  @PhoneSendDisableOtpDocs
  async phoneSendDisableOtp(@Request() req: ExpressRequest) {
    if (!req.user.phone) {
      return {
        success: false,
        message: 'No phone number associated with your account',
        data: null,
      };
    }
    await this.phoneService.sendDisableOtp(req.user.id, req.user.phone);
    return {
      success: true,
      message: 'OTP sent to your phone to confirm disabling 2FA',
      data: null,
    };
  }

  @Post('phone/disable')
  @SensitiveRateLimit()
  @PhoneDisableDocs
  async phoneDisable(
    @Request() req: ExpressRequest,
    @Body() dto: VerifyPhoneOtpDto,
  ) {
    await this.phoneService.disable(req.user.id, dto.code);

    this.auditsService
      .logUserAction(
        req.user.id,
        AUDIT_ACTIONS.SETTINGS.PHONE_DISABLED,
        AUDIT_RESOURCE.SETTINGS,
        req.user.id,
        { severity: AUDIT_SEVERITY.CRITICAL },
      )
      .catch(() => {
        /* noop */
      });

    return {
      success: true,
      message: 'Phone 2FA disabled successfully',
      data: null,
    };
  }

  // ── Passkeys ──────────────────────────────────

  @Post('passkey/register/options')
  @SensitiveRateLimit()
  async passkeyRegisterOptions(@Request() req: ExpressRequest) {
    const options = await this.passkeyService.getRegistrationOptions(
      req.user.id,
    );
    return {
      success: true,
      message: 'Passkey registration options',
      data: options,
    };
  }

  @Post('passkey/register/verify')
  @SensitiveRateLimit()
  async passkeyRegisterVerify(
    @Request() req: ExpressRequest,
    @Body() dto: VerifyPasskeyRegistrationDto,
  ) {
    const result = await this.passkeyService.verifyRegistration(
      req.user.id,
      dto.response as unknown as RegistrationResponseJSON,
      dto.nickname ?? '',
    );

    this.auditsService
      .logUserAction(
        req.user.id,
        AUDIT_ACTIONS.SETTINGS.PASSKEY_REGISTERED,
        AUDIT_RESOURCE.SETTINGS,
        req.user.id,
        { severity: AUDIT_SEVERITY.CRITICAL },
      )
      .catch(() => {
        /* noop */
      });

    return { success: true, message: 'Passkey registered', data: result };
  }

  @Get('passkey/credentials')
  @UserRateLimit()
  async passkeyList(@Request() req: ExpressRequest) {
    const data = await this.passkeyService.listCredentials(req.user.id);
    return { success: true, message: 'Passkeys fetched', data };
  }

  @Patch('passkey/credentials/:id')
  @SensitiveRateLimit()
  async passkeyRename(
    @Request() req: ExpressRequest,
    @Param('id') id: string,
    @Body() dto: RenamePasskeyDto,
  ) {
    await this.passkeyService.rename(req.user.id, id, dto.nickname);

    this.auditsService
      .logUserAction(
        req.user.id,
        AUDIT_ACTIONS.SETTINGS.PASSKEY_RENAMED,
        AUDIT_RESOURCE.SETTINGS,
        req.user.id,
        { severity: AUDIT_SEVERITY.LOW },
      )
      .catch(() => {
        /* noop */
      });

    return { success: true, message: 'Passkey renamed', data: null };
  }

  @Delete('passkey/credentials/:id')
  @SensitiveRateLimit()
  async passkeyRemove(@Request() req: ExpressRequest, @Param('id') id: string) {
    await this.passkeyService.remove(req.user.id, id);

    this.auditsService
      .logUserAction(
        req.user.id,
        AUDIT_ACTIONS.SETTINGS.PASSKEY_REMOVED,
        AUDIT_RESOURCE.SETTINGS,
        req.user.id,
        { severity: AUDIT_SEVERITY.CRITICAL },
      )
      .catch(() => {
        /* noop */
      });

    return { success: true, message: 'Passkey removed', data: null };
  }
}
