import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UpdateEmailTemplateDto } from '../dto/email-template.dto';

const EXAMPLE_TEMPLATE = {
  emailType: 'welcome',
  audience: 'user',
  label: 'Welcome / verify email on registration',
  description: 'An account is registered. Contains the verify-email link.',
  variables: ['url'],
  templateId: 'tpl_aB3xK9mZ',
  fromEmail: null,
  isActive: true,
  status: 'configured',
  updatedAt: '2026-09-29T10:00:00.000Z',
};

const NOT_FOUND = ApiResponse({
  status: 404,
  description: 'The app sends no email under that type and audience',
});

export const ListEmailTemplatesDocs = applyDecorators(
  ApiBearerAuth('JWT-auth'),
  ApiOperation({
    summary: 'Every email the app sends, and its mailtr template',
    description:
      'Includes emails with no templateId yet (status `not_configured`): those are not sent until one is set.',
  }),
  ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        data: [EXAMPLE_TEMPLATE],
        message: 'Email templates fetched successfully',
      },
    },
  }),
);

export const GetEmailTemplateDocs = applyDecorators(
  ApiBearerAuth('JWT-auth'),
  ApiOperation({ summary: 'One email and its mailtr template' }),
  ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        data: EXAMPLE_TEMPLATE,
        message: 'Email template fetched successfully',
      },
    },
  }),
  NOT_FOUND,
);

export const UpdateEmailTemplateDocs = applyDecorators(
  ApiBearerAuth('JWT-auth'),
  ApiOperation({
    summary: 'Set the templateId, sender or on/off for one email',
    description:
      'Only the fields sent change. Live on this instance at once and on every instance within a minute.',
  }),
  ApiBody({ type: UpdateEmailTemplateDto }),
  ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        data: EXAMPLE_TEMPLATE,
        message: 'Email template updated successfully',
      },
    },
  }),
  ApiResponse({ status: 400, description: 'Invalid templateId or sender' }),
  NOT_FOUND,
);

export const TestSendEmailTemplateDocs = applyDecorators(
  ApiBearerAuth('JWT-auth'),
  ApiOperation({
    summary: 'Send this email to yourself with sample values',
    description:
      'Always goes to the signed-in staff member. Sends the saved templateId even when the email is switched off.',
  }),
  ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        data: { to: 'ops@squadup.in', templateId: 'tpl_aB3xK9mZ' },
        message: 'Test email sent to ops@squadup.in',
      },
    },
  }),
  ApiResponse({
    status: 400,
    description: 'No templateId saved, or mailtr refused the send',
  }),
  NOT_FOUND,
);
