import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import {
  DisableAuthenticatorDto,
  VerifyAuthenticatorDto,
  VerifyEmailCodeDto,
  VerifyPhoneOtpDto,
} from '../dto';

// ── Authenticator ─────────────────────────────────────────────────────────────

export const AuthenticatorSetupDocs = applyDecorators(
  ApiBearerAuth('JWT-auth'),
  ApiOperation({
    summary: 'Initiate authenticator app setup',
    description:
      'Generates a TOTP secret and returns a QR code URI that the user scans with their authenticator app.',
  }),
  ApiResponse({
    status: 201,
    description: 'Authenticator setup initiated',
    schema: {
      example: {
        success: true,
        message: 'Authenticator setup initiated',
        data: {
          authenticatorData: {
            otpAuthUrl:
              'otpauth://totp/squadup.in:user@example.com?secret=BASE32SECRET&issuer=squadup.in',
            secret: 'BASE32SECRET',
          },
        },
      },
    },
  }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 429, description: 'Too Many Requests' }),
);

export const AuthenticatorVerifyDocs = applyDecorators(
  ApiBearerAuth('JWT-auth'),
  ApiOperation({
    summary: 'Verify TOTP code and enable authenticator 2FA',
    description:
      'Confirms the TOTP code from the authenticator app and activates 2FA on the account. Returns backup codes – store them securely.',
  }),
  ApiBody({ type: VerifyAuthenticatorDto }),
  ApiResponse({
    status: 201,
    description: 'Authenticator 2FA enabled',
    schema: {
      example: {
        success: true,
        message: 'Authenticator 2FA enabled. Save your backup codes.',
        data: {
          backupCodes: ['abc12345', 'def67890'],
        },
      },
    },
  }),
  ApiResponse({ status: 400, description: 'Invalid or expired TOTP code' }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 429, description: 'Too Many Requests' }),
);

export const RegenerateBackupCodesDocs = applyDecorators(
  ApiBearerAuth('JWT-auth'),
  ApiOperation({
    summary: 'Regenerate authenticator backup codes',
    description:
      'Invalidates all existing backup codes and generates a fresh set.',
  }),
  ApiResponse({
    status: 201,
    description: 'Backup codes regenerated',
    schema: {
      example: {
        success: true,
        message: 'Backup codes regenerated. Previous codes are now invalid.',
        data: {
          backupCodes: ['abc12345', 'def67890'],
        },
      },
    },
  }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 429, description: 'Too Many Requests' }),
);

// ── Email 2FA ─────────────────────────────────────────────────────────────────

export const EmailSendOtpDocs = applyDecorators(
  ApiBearerAuth('JWT-auth'),
  ApiOperation({
    summary: 'Send OTP to email for 2FA setup',
    description:
      'Sends a 6-digit OTP to the provided email address. Protected by a short-term rate limit per client (e.g., IP) and an additional per-user/per-channel limit of 5 requests per 15 minutes.',
  }),
  ApiResponse({
    status: 201,
    description: 'OTP dispatched',
    schema: {
      example: { success: true, message: 'OTP sent to your email', data: null },
    },
  }),
  ApiResponse({ status: 400, description: 'Invalid email address' }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 429, description: 'Too Many Requests' }),
);

export const EmailVerifyOtpDocs = applyDecorators(
  ApiBearerAuth('JWT-auth'),
  ApiOperation({
    summary: 'Verify email OTP and enable email 2FA',
    description:
      'Validates the 6-digit OTP sent to the email and enables email-based 2FA on the account.',
  }),
  ApiBody({ type: VerifyEmailCodeDto }),
  ApiResponse({
    status: 201,
    description: 'Email 2FA enabled',
    schema: {
      example: {
        success: true,
        message: 'Email 2FA enabled successfully',
        data: null,
      },
    },
  }),
  ApiResponse({ status: 400, description: 'Invalid or expired OTP' }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 429, description: 'Too Many Requests' }),
);

// ── Phone 2FA ─────────────────────────────────────────────────────────────────

export const PhoneSendOtpDocs = applyDecorators(
  ApiBearerAuth('JWT-auth'),
  ApiOperation({
    summary: 'Send OTP to phone for 2FA setup',
    description:
      'Sends a 6-digit OTP via SMS to the provided phone number. Rate-limited to 3 requests per minute per user.',
  }),
  ApiResponse({
    status: 201,
    description: 'OTP dispatched',
    schema: {
      example: { success: true, message: 'OTP sent to your phone', data: null },
    },
  }),
  ApiResponse({ status: 400, description: 'Invalid phone number' }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 429, description: 'Too Many Requests' }),
);

export const PhoneVerifyOtpDocs = applyDecorators(
  ApiBearerAuth('JWT-auth'),
  ApiOperation({
    summary: 'Verify phone OTP and enable phone 2FA',
    description:
      'Validates the 6-digit OTP sent via SMS and enables phone-based 2FA on the account.',
  }),
  ApiBody({ type: VerifyPhoneOtpDto }),
  ApiResponse({
    status: 201,
    description: 'Phone 2FA enabled',
    schema: {
      example: {
        success: true,
        message: 'Phone 2FA enabled successfully',
        data: null,
      },
    },
  }),
  ApiResponse({ status: 400, description: 'Invalid or expired OTP' }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 429, description: 'Too Many Requests' }),
);

// ── Disable 2FA ───────────────────────────────────────────────────────────────

export const AuthenticatorSendRecoveryOtpDocs = applyDecorators(
  ApiBearerAuth('JWT-auth'),
  ApiOperation({
    summary: 'Send authenticator recovery OTP to email',
    description:
      'Sends a 6-digit OTP to the registered email so a user who lost their authenticator device can disable authenticator 2FA.',
  }),
  ApiResponse({
    status: 201,
    description: 'Recovery OTP dispatched',
    schema: {
      example: {
        success: true,
        message: 'Recovery OTP sent to your email',
        data: null,
      },
    },
  }),
  ApiResponse({
    status: 400,
    description: 'Authenticator 2FA not enabled or OTP could not be sent',
  }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 429, description: 'Too Many Requests' }),
);

export const AuthenticatorDisableWithEmailDocs = applyDecorators(
  ApiBearerAuth('JWT-auth'),
  ApiOperation({
    summary: 'Disable authenticator 2FA via email OTP',
    description:
      'Verifies the recovery OTP sent to the registered email and disables authenticator 2FA.',
  }),
  ApiBody({ type: VerifyEmailCodeDto }),
  ApiResponse({
    status: 201,
    description: 'Authenticator 2FA disabled',
    schema: {
      example: {
        success: true,
        message: 'Authenticator 2FA disabled successfully',
        data: null,
      },
    },
  }),
  ApiResponse({
    status: 400,
    description: 'Invalid OTP or authenticator 2FA not enabled',
  }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 429, description: 'Too Many Requests' }),
);

export const AuthenticatorDisableDocs = applyDecorators(
  ApiBearerAuth('JWT-auth'),
  ApiOperation({
    summary: 'Disable authenticator 2FA',
    description:
      'Requires a valid TOTP code from the authenticator app or a one-time backup code. Clears the secret, backup codes, and disables authenticator 2FA.',
  }),
  ApiBody({ type: DisableAuthenticatorDto }),
  ApiResponse({
    status: 201,
    description: 'Authenticator 2FA disabled',
    schema: {
      example: {
        success: true,
        message: 'Authenticator 2FA disabled successfully',
        data: null,
      },
    },
  }),
  ApiResponse({
    status: 400,
    description: 'Invalid TOTP code or 2FA not enabled',
  }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 429, description: 'Too Many Requests' }),
);

export const EmailSendDisableOtpDocs = applyDecorators(
  ApiBearerAuth('JWT-auth'),
  ApiOperation({
    summary: 'Send OTP to disable email 2FA',
    description:
      'Sends a 6-digit OTP to the registered email address to confirm disabling email 2FA.',
  }),
  ApiResponse({
    status: 201,
    description: 'OTP dispatched for disabling',
    schema: {
      example: {
        success: true,
        message: 'OTP sent to your email to confirm disabling 2FA',
        data: null,
      },
    },
  }),
  ApiResponse({
    status: 400,
    description: 'Email 2FA not enabled or email mismatch',
  }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 429, description: 'Too Many Requests' }),
);

export const EmailDisableDocs = applyDecorators(
  ApiBearerAuth('JWT-auth'),
  ApiOperation({
    summary: 'Disable email 2FA',
    description:
      'Verifies the 6-digit OTP and disables email-based 2FA on the account.',
  }),
  ApiBody({ type: VerifyEmailCodeDto }),
  ApiResponse({
    status: 201,
    description: 'Email 2FA disabled',
    schema: {
      example: {
        success: true,
        message: 'Email 2FA disabled successfully',
        data: null,
      },
    },
  }),
  ApiResponse({
    status: 400,
    description: 'Invalid OTP or 2FA not enabled',
  }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 429, description: 'Too Many Requests' }),
);

export const PhoneSendDisableOtpDocs = applyDecorators(
  ApiBearerAuth('JWT-auth'),
  ApiOperation({
    summary: 'Send OTP to disable phone 2FA',
    description:
      'Sends a 6-digit OTP via SMS to the registered phone number to confirm disabling phone 2FA.',
  }),
  ApiResponse({
    status: 201,
    description: 'OTP dispatched for disabling',
    schema: {
      example: {
        success: true,
        message: 'OTP sent to your phone to confirm disabling 2FA',
        data: null,
      },
    },
  }),
  ApiResponse({
    status: 400,
    description: 'Phone 2FA not enabled or phone mismatch',
  }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 429, description: 'Too Many Requests' }),
);

export const PhoneDisableDocs = applyDecorators(
  ApiBearerAuth('JWT-auth'),
  ApiOperation({
    summary: 'Disable phone 2FA',
    description:
      'Verifies the 6-digit OTP and disables phone-based 2FA on the account.',
  }),
  ApiBody({ type: VerifyPhoneOtpDto }),
  ApiResponse({
    status: 201,
    description: 'Phone 2FA disabled',
    schema: {
      example: {
        success: true,
        message: 'Phone 2FA disabled successfully',
        data: null,
      },
    },
  }),
  ApiResponse({
    status: 400,
    description: 'Invalid OTP or 2FA not enabled',
  }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 429, description: 'Too Many Requests' }),
);
