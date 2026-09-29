import { BadRequestException } from '@nestjs/common';
import { AuditsService } from '../../audits/audits.service';
import {
  EMAIL_AUDIENCE,
  EMAIL_TYPE_ENUM,
  findCatalogueEntry,
} from '../../mailer/constants/mailer.constants';
import { EmailTemplate } from '../../mailer/entities/email-template.entity';
import {
  EmailTemplateRecord,
  EmailTemplateService,
} from '../../mailer/email-template.service';
import { MailerService } from '../../mailer/mailer.service';
import { Staff } from '../../staff/entities/staff.entity';
import { AdminOpsEmailTemplatesService } from './admin-ops-email-templates.service';

jest.mock('../../config', () => ({ clientUrl: 'https://squadup.test' }));

const staff = { id: 'staff-1', email: 'ops@squadup.in' } as Staff;

function record(patch: Partial<EmailTemplate> | null): EmailTemplateRecord {
  const entry = findCatalogueEntry(
    EMAIL_TYPE_ENUM.TWO_FACTOR_OTP,
    EMAIL_AUDIENCE.USER,
  );
  if (!entry) throw new Error('catalogue entry missing');
  return {
    entry,
    row: patch
      ? ({
          templateId: null,
          fromEmail: null,
          isActive: true,
          updatedAt: new Date('2026-09-29T10:00:00Z'),
          ...patch,
        } as EmailTemplate)
      : null,
  };
}

describe('AdminOpsEmailTemplatesService', () => {
  let templates: jest.Mocked<
    Pick<EmailTemplateService, 'list' | 'get' | 'update'>
  >;
  let mailer: jest.Mocked<Pick<MailerService, 'sendTestEmail'>>;
  let audits: jest.Mocked<Pick<AuditsService, 'log'>>;
  let service: AdminOpsEmailTemplatesService;

  beforeEach(() => {
    templates = {
      list: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
    };
    mailer = { sendTestEmail: jest.fn().mockResolvedValue(true) };
    audits = { log: jest.fn().mockResolvedValue(undefined) };
    service = new AdminOpsEmailTemplatesService(
      templates as unknown as EmailTemplateService,
      mailer as unknown as MailerService,
      audits as unknown as AuditsService,
    );
  });

  describe('status', () => {
    it.each([
      ['not_configured', null],
      ['not_configured', { templateId: null }],
      ['configured', { templateId: 'tpl_1' }],
      ['off', { templateId: 'tpl_1', isActive: false }],
    ] as const)('is %s for row %p', async (status, patch) => {
      templates.get.mockResolvedValue(record(patch));

      await expect(
        service.get(EMAIL_TYPE_ENUM.TWO_FACTOR_OTP, EMAIL_AUDIENCE.USER),
      ).resolves.toMatchObject({ status });
    });
  });

  it('shows the catalogue facts and never the row id', async () => {
    templates.get.mockResolvedValue(
      record({ id: 'row-1', templateId: 'tpl_1' } as Partial<EmailTemplate>),
    );

    const view = await service.get(
      EMAIL_TYPE_ENUM.TWO_FACTOR_OTP,
      EMAIL_AUDIENCE.USER,
    );

    expect(view).toEqual({
      emailType: 'two_factor_otp',
      audience: 'user',
      label: 'Two-factor authentication code',
      description:
        'A 6-digit code for sign-in, turning email 2FA on or off, or a password reset code.',
      variables: ['otp'],
      templateId: 'tpl_1',
      fromEmail: null,
      isActive: true,
      status: 'configured',
      updatedAt: new Date('2026-09-29T10:00:00Z'),
    });
  });

  it('audits an update with the values before and after', async () => {
    templates.get.mockResolvedValue(record({ templateId: 'tpl_old' }));
    templates.update.mockResolvedValue(record({ templateId: 'tpl_new' }));

    await service.update(
      EMAIL_TYPE_ENUM.TWO_FACTOR_OTP,
      EMAIL_AUDIENCE.USER,
      { templateId: 'tpl_new' },
      staff,
    );

    expect(audits.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EMAIL_TEMPLATE_UPDATED',
        resourceType: 'EmailTemplate',
        resourceId: 'two_factor_otp:user',
        userId: 'staff-1',
        userRole: 'staff',
        changesBefore: {
          templateId: 'tpl_old',
          fromEmail: null,
          isActive: true,
        },
        changesAfter: {
          templateId: 'tpl_new',
          fromEmail: null,
          isActive: true,
        },
      }),
    );
  });

  it('still returns the saved template when the audit log fails', async () => {
    templates.get.mockResolvedValue(record(null));
    templates.update.mockResolvedValue(record({ templateId: 'tpl_new' }));
    audits.log.mockRejectedValue(new Error('queue down'));

    await expect(
      service.update(
        EMAIL_TYPE_ENUM.TWO_FACTOR_OTP,
        EMAIL_AUDIENCE.USER,
        { templateId: 'tpl_new' },
        staff,
      ),
    ).resolves.toMatchObject({ templateId: 'tpl_new' });
  });

  describe('testSend', () => {
    it('sends the saved template to the staff member, with sample values', async () => {
      templates.get.mockResolvedValue(
        record({ templateId: 'tpl_1', fromEmail: 'hello@squadup.in' }),
      );

      await expect(
        service.testSend(
          EMAIL_TYPE_ENUM.TWO_FACTOR_OTP,
          EMAIL_AUDIENCE.USER,
          staff,
        ),
      ).resolves.toEqual({ to: 'ops@squadup.in', templateId: 'tpl_1' });
      expect(mailer.sendTestEmail).toHaveBeenCalledWith({
        recipient: 'ops@squadup.in',
        templateId: 'tpl_1',
        fromEmail: 'hello@squadup.in',
        variables: { otp: '000000' },
      });
    });

    it('sends even when the email is switched off', async () => {
      templates.get.mockResolvedValue(
        record({ templateId: 'tpl_1', isActive: false }),
      );

      await service.testSend(
        EMAIL_TYPE_ENUM.TWO_FACTOR_OTP,
        EMAIL_AUDIENCE.USER,
        staff,
      );

      expect(mailer.sendTestEmail).toHaveBeenCalledTimes(1);
    });

    it('refuses when no templateId is saved', async () => {
      templates.get.mockResolvedValue(record({ templateId: null }));

      await expect(
        service.testSend(
          EMAIL_TYPE_ENUM.TWO_FACTOR_OTP,
          EMAIL_AUDIENCE.USER,
          staff,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mailer.sendTestEmail).not.toHaveBeenCalled();
    });

    it('reports a failure, and audits it, when mailtr refuses the send', async () => {
      templates.get.mockResolvedValue(record({ templateId: 'tpl_1' }));
      mailer.sendTestEmail.mockResolvedValue(false);

      await expect(
        service.testSend(
          EMAIL_TYPE_ENUM.TWO_FACTOR_OTP,
          EMAIL_AUDIENCE.USER,
          staff,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(audits.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'EMAIL_TEMPLATE_TEST_SENT',
          status: 'FAILURE',
        }),
      );
    });
  });
});
