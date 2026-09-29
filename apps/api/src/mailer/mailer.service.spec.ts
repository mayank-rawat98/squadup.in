import { EMAIL_AUDIENCE, EMAIL_TYPE_ENUM } from './constants/mailer.constants';
import { EmailTemplateService } from './email-template.service';
import { MailerService } from './mailer.service';
import { MailtrClient } from './mailtr.client';

jest.mock('../config', () => ({ clientUrl: 'https://squadup.test' }));

describe('MailerService', () => {
  let templates: jest.Mocked<Pick<EmailTemplateService, 'resolveTemplateId'>>;
  let mailtr: jest.Mocked<Pick<MailtrClient, 'sendTemplate' | 'sendRaw'>>;
  let service: MailerService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-28T12:00:00Z'));
    templates = {
      resolveTemplateId: jest
        .fn()
        .mockResolvedValue({ templateId: 'tpl_welcome', fromEmail: null }),
    };
    mailtr = {
      sendTemplate: jest.fn().mockResolvedValue(true),
      sendRaw: jest.fn().mockResolvedValue(true),
    };
    service = new MailerService(
      templates as unknown as EmailTemplateService,
      mailtr as unknown as MailtrClient,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends the resolved template with the base variables and the caller variables', async () => {
    await expect(
      service.notifyUserByEmail({
        recipient: 'sam@example.com',
        emailType: EMAIL_TYPE_ENUM.WELCOME,
        emailData: { url: 'http://localhost:3000/auth/verify-email?token=t' },
      }),
    ).resolves.toBe(true);

    expect(templates.resolveTemplateId).toHaveBeenCalledWith(
      EMAIL_TYPE_ENUM.WELCOME,
      EMAIL_AUDIENCE.USER,
    );
    expect(mailtr.sendTemplate).toHaveBeenCalledWith({
      to: ['sam@example.com'],
      templateId: 'tpl_welcome',
      from: undefined,
      variables: {
        appName: 'SquadUp',
        appUrl: 'https://squadup.test',
        email: 'sam@example.com',
        year: '2026',
        url: 'http://localhost:3000/auth/verify-email?token=t',
      },
    });
  });

  it('lets a caller variable override a base variable', async () => {
    await service.notifyUserByEmail({
      recipient: 'sam@example.com',
      emailType: EMAIL_TYPE_ENUM.WELCOME,
      emailData: { email: 'new@example.com' },
    });

    expect(mailtr.sendTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({ email: 'new@example.com' }),
      }),
    );
  });

  it('uses the per-template sender when one is configured', async () => {
    templates.resolveTemplateId.mockResolvedValue({
      templateId: 'tpl_welcome',
      fromEmail: 'hello@squadup.in',
    });

    await service.notifyUserByEmail({
      recipient: 'sam@example.com',
      emailType: EMAIL_TYPE_ENUM.WELCOME,
    });

    expect(mailtr.sendTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'hello@squadup.in' }),
    );
  });

  it('resolves the admin audience for admin emails', async () => {
    await service.notifyAdminByEmail({
      recipient: 'ops@squadup.in',
      emailType: EMAIL_TYPE_ENUM.CONTACT_US,
    });

    expect(templates.resolveTemplateId).toHaveBeenCalledWith(
      EMAIL_TYPE_ENUM.CONTACT_US,
      EMAIL_AUDIENCE.ADMIN,
    );
  });

  it('reports failure without calling mailtr when no template is configured', async () => {
    templates.resolveTemplateId.mockResolvedValue(null);

    await expect(
      service.notifyUserByEmail({
        recipient: 'sam@example.com',
        emailType: EMAIL_TYPE_ENUM.WELCOME,
      }),
    ).resolves.toBe(false);
    expect(mailtr.sendTemplate).not.toHaveBeenCalled();
  });

  it('reports failure without resolving a template when there is no recipient', async () => {
    await expect(
      service.notifyUserByEmail({
        recipient: '',
        emailType: EMAIL_TYPE_ENUM.WELCOME,
      }),
    ).resolves.toBe(false);
    expect(templates.resolveTemplateId).not.toHaveBeenCalled();
  });

  it('reports failure when mailtr rejects the send', async () => {
    mailtr.sendTemplate.mockResolvedValue(false);

    await expect(
      service.notifyUserByEmail({
        recipient: 'sam@example.com',
        emailType: EMAIL_TYPE_ENUM.WELCOME,
      }),
    ).resolves.toBe(false);
  });
});
