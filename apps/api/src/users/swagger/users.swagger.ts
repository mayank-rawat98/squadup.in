import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { QueryUserDto } from '../dto/query-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

export const GetUsersDocs = applyDecorators(
  ApiOperation({
    summary: 'Get All Users',
    description: 'Retrieves a paginated list of users based on filters.',
  }),
  ApiBearerAuth('JWT-auth'),
  ApiBody({ type: QueryUserDto }),
  ApiResponse({
    status: 201,
    description: 'Users fetched successfully',
    schema: {
      example: {
        success: true,
        data: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 50,
          totalPages: 5,
          users: [],
        },
        message: 'User fetched successfully',
      },
    },
  }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 403, description: 'Forbidden' }),
);

export const GetUserDocs = applyDecorators(
  ApiOperation({
    summary: 'Get User by ID',
    description: 'Retrieves a single user by their ID.',
  }),
  ApiBearerAuth('JWT-auth'),
  ApiParam({ name: 'id', description: 'User ID' }),
  ApiResponse({
    status: 200,
    description: 'User fetched successfully',
  }),
  ApiResponse({ status: 404, description: 'User not found' }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 403, description: 'Forbidden' }),
);

export const UpdateUserDocs = applyDecorators(
  ApiOperation({
    summary: 'Update User',
    description: 'Updates a user by their ID.',
  }),
  ApiBearerAuth('JWT-auth'),
  ApiParam({ name: 'id', description: 'User ID' }),
  ApiBody({ type: UpdateUserDto }),
  ApiResponse({
    status: 200,
    description: 'User updated successfully',
  }),
  ApiResponse({ status: 404, description: 'User not found' }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
);

export const SoftDeleteUserDocs = applyDecorators(
  ApiOperation({
    summary: 'Soft Delete User',
    description: 'Soft deletes a user by their ID.',
  }),
  ApiBearerAuth('JWT-auth'),
  ApiParam({ name: 'id', description: 'User ID' }),
  ApiResponse({
    status: 200,
    description: 'Soft deletion successful',
  }),
  ApiResponse({ status: 404, description: 'User not found' }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 403, description: 'Forbidden' }),
);

export const ResetPasswordDocs = applyDecorators(
  ApiOperation({
    summary: 'Reset Password',
    description: "Resets the authenticated user's password.",
  }),
  ApiBearerAuth('JWT-auth'),
  ApiBody({ type: ResetPasswordDto }),
  ApiResponse({
    status: 201,
    description: 'Password reset successful',
  }),
  ApiResponse({ status: 400, description: 'Invalid new password' }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
);

export const SendEmailVerificationLinkDocs = applyDecorators(
  ApiOperation({
    summary: 'Send Email Verification Link',
    description: 'Sends an email verification link to the user.',
  }),
  ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
      },
    },
  }),
  ApiResponse({
    status: 201,
    description: 'Email will be sent to your inbox',
  }),
  ApiResponse({ status: 400, description: 'Invalid email' }),
);

export const VerifyEmailLinkDocs = applyDecorators(
  ApiOperation({
    summary: 'Verify Email Link',
    description: 'Verifies the email using the token sent via email.',
  }),
  ApiBody({
    schema: {
      type: 'object',
      properties: {
        encodedEmail: { type: 'string', example: 'user%40example.com' },
        token: { type: 'string', example: 'token123' },
      },
    },
  }),
  ApiResponse({
    status: 201,
    description: 'Email verified',
  }),
  ApiResponse({ status: 400, description: 'Invalid email or token' }),
);

export const SendForgotPasswordEmailDocs = applyDecorators(
  ApiOperation({
    summary: 'Send Forgot Password Email',
    description: 'Sends a password reset link to the user.',
  }),
  ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
      },
    },
  }),
  ApiResponse({
    status: 201,
    description: 'Email will be sent to your inbox',
  }),
  ApiResponse({ status: 400, description: 'Invalid email' }),
);

export const ForgotPasswordDocs = applyDecorators(
  ApiOperation({
    summary: 'Forgot Password',
    description: 'Resets the password using the token sent via email.',
  }),
  ApiBody({ type: ForgotPasswordDto }),
  ApiResponse({
    status: 201,
    description: 'Password reset successful',
  }),
  ApiResponse({ status: 400, description: 'Invalid request' }),
);

export const Generate2FAQrDocs = applyDecorators(
  ApiOperation({
    summary: 'Generate 2FA QR Code',
    description:
      'Generates or returns the user’s 2FA secret and provides a QR code when 2FA is not yet enabled. If a secret already exists but 2FA is not enabled, the existing secret is reused and not overwritten. You must complete the setup by calling enable-2fa. If 2FA is already enabled, this endpoint will return an error.',
  }),
  ApiBearerAuth('JWT-auth'),
  ApiResponse({
    status: 201,
    description: '2FA secret generated',
    schema: {
      example: {
        success: true,
        data: { qrCodeImage: 'data:image/png;base64,...' },
        message: '2FA secret generated',
      },
    },
  }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 400, description: '2FA is already enabled' }),
);

export const Enable2FADocs = applyDecorators(
  ApiOperation({
    summary: 'Enable 2FA',
    description:
      'Enables 2FA for the user using the code from the authenticator app. This endpoint must be called after generate-2fa-qr, and the code must match the secret generated in that previous step.',
  }),
  ApiBearerAuth('JWT-auth'),
  ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: '123456' },
      },
    },
  }),
  ApiResponse({
    status: 201,
    description: '2FA is now enabled',
  }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({
    status: 400,
    description:
      'Invalid code, 2FA is already enabled, or 2FA secret not generated',
  }),
);

export const Disable2FADocs = applyDecorators(
  ApiOperation({
    summary: 'Disable 2FA',
    description: 'Disables 2FA for the user.',
  }),
  ApiBearerAuth('JWT-auth'),
  ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: '123456' },
      },
    },
  }),
  ApiResponse({
    status: 201,
    description: '2FA is now disabled',
  }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 400, description: '2FA is not enabled' }),
);
