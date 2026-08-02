import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { LoginDto } from '../dto/login.dto';
import { RegisterUserDto } from '../../users/dto/register-user.dto';
import {
  VerifyTwoFactorDto,
  SelectTwoFactorMethodDto,
} from '../dto/verify-2fa.dto';
import {
  SendMobileOtpDto,
  VerifyMobileOtpDto,
} from '../dto/mobile-verification.dto';

export const RegisterDocs = applyDecorators(
  ApiOperation({ summary: 'Register a new user' }),
  ApiBody({ type: RegisterUserDto }),
  ApiResponse({
    status: 201,
    description: 'User registered successfully',
  }),
  ApiResponse({ status: 400, description: 'Bad Request' }),
);

export const LoginDocs = applyDecorators(
  ApiOperation({ summary: 'User Login' }),
  ApiBody({ type: LoginDto }),
  ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      oneOf: [
        {
          description: 'Direct login (no 2FA configured)',
          example: {
            success: true,
            data: {
              accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              deviceId: 'did_...',
              expiresIn: 900,
            },
            message: 'User login success',
          },
        },
        {
          description:
            '2FA Required – available methods returned (Session ID set in HttpOnly cookie)',
          example: {
            success: true,
            data: {
              requiresTwoFactor: true,
              availableMethods: [
                { method: 'authenticator', preference: 1 },
                { method: 'email', preference: 2 },
                { method: 'phone', preference: 3 },
                { method: 'backupCode', preference: 99 },
              ],
            },
            message:
              'Two-factor authentication required. Please select a method.',
          },
        },
      ],
    },
  }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
);

export const SelectTwoFactorMethodDocs = applyDecorators(
  ApiOperation({
    summary: 'Select 2FA method & trigger OTP delivery',
    description:
      'After login returns available 2FA methods, the client picks one. For email/phone this sends an OTP. For authenticator/backupCode it confirms readiness. Requires the `2fa_session` cookie.',
  }),
  ApiCookieAuth('2fa_session'),
  ApiBody({ type: SelectTwoFactorMethodDto }),
  ApiResponse({
    status: 200,
    description: 'Method selected and OTP dispatched (if applicable)',
    schema: {
      example: {
        success: true,
        data: null,
        message: 'OTP sent to your registered email address.',
      },
    },
  }),
  ApiResponse({
    status: 400,
    description: 'Method not enabled or delivery failure',
  }),
  ApiResponse({ status: 401, description: 'Session expired or missing' }),
);

export const VerifyTwoFactorDocs = applyDecorators(
  ApiOperation({
    summary: 'Verify 2FA Code',
    description:
      'Verifies the code for the selected 2FA method (authenticator / email / phone / backupCode). Requires the `2fa_session` cookie set by the login endpoint.',
  }),
  ApiCookieAuth('2fa_session'),
  ApiBody({ type: VerifyTwoFactorDto }),
  ApiResponse({
    status: 200,
    description: '2FA verification successful',
    schema: {
      example: {
        success: true,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          deviceId: 'did_...',
          expiresIn: 900,
        },
        message: 'User login success',
      },
    },
  }),
  ApiResponse({
    status: 401,
    description: 'Session expired or invalid',
  }),
  ApiResponse({
    status: 400,
    description: 'Invalid code or too many attempts',
  }),
);

export const GetProfileDocs = applyDecorators(
  ApiOperation({ summary: 'Get current user profile' }),
  ApiBearerAuth('JWT-auth'),
  ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
);

export const SendMobileOtpDocs = applyDecorators(
  ApiOperation({
    summary: 'Send mobile OTP',
    description:
      'Generates a 6-digit OTP and dispatches it to the phone number provided by the user. The OTP is valid for 15 minutes.',
  }),
  ApiBearerAuth('JWT-auth'),
  ApiBody({ type: SendMobileOtpDto }),
  ApiResponse({
    status: 200,
    description: 'OTP dispatched successfully',
    schema: {
      example: {
        success: true,
        data: null,
        message:
          'OTP will be sent to the provided mobile number. OTP will be valid for the next 15 minutes',
      },
    },
  }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
);

export const VerifyMobileOtpDocs = applyDecorators(
  ApiOperation({
    summary: 'Verify mobile OTP',
    description:
      "Validates the 6-digit OTP sent to the user's mobile number. On success the OTP is consumed and the mobile number is marked as verified.",
  }),
  ApiBearerAuth('JWT-auth'),
  ApiBody({ type: VerifyMobileOtpDto }),
  ApiResponse({
    status: 200,
    description: 'Mobile number verified successfully',
    schema: {
      example: {
        success: true,
        data: null,
        message: 'Mobile number verified successfully',
      },
    },
  }),
  ApiResponse({ status: 400, description: 'Invalid or expired OTP' }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
);
