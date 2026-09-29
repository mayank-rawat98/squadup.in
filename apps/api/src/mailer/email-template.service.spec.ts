import { ConfigService } from '@nestjs/config';
import {
  EMAIL_AUDIENCE,
  EMAIL_TEMPLATE_CATALOGUE,
  EMAIL_TYPE_ENUM,
} from './constants/mailer.constants';
import { EmailTemplateRepository } from './email-template.repository';
import { EmailTemplateService } from './email-template.service';
import { EmailTemplate } from './entities/email-template.entity';

const row = (patch: Partial<EmailTemplate>): EmailTemplate =>
  ({
    id: 'row-1',
    emailType: EMAIL_TYPE_ENUM.WELCOME,
    audience: EMAIL_AUDIENCE.USER,
    templateId: null,
    label: 'Welcome',
    fromEmail: null,
    isActive: true,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...patch,
  }) as EmailTemplate;

describe('EmailTemplateService', () => {
  let repository: jest.Mocked<
    Pick<EmailTemplateRepository, 'findOneByKey' | 'findAll'>
  >;
  let env: Record<string, string | undefined>;
  let service: EmailTemplateService;

  beforeEach(() => {
    repository = {
      findOneByKey: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([]),
    };
    env = {};
    const configService = {
      get: jest.fn((key: string) => env[key]),
    } as unknown as ConfigService;
    service = new EmailTemplateService(
      repository as unknown as EmailTemplateRepository,
      configService,
    );
  });

  describe('resolveTemplateId', () => {
    it('uses the database templateId when the row has one', async () => {
      repository.findOneByKey.mockResolvedValue(
        row({ templateId: 'tpl_db', fromEmail: 'hello@squadup.in' }),
      );
      env.MAILTR_TEMPLATE_WELCOME = 'tpl_env';

      await expect(
        service.resolveTemplateId(EMAIL_TYPE_ENUM.WELCOME, EMAIL_AUDIENCE.USER),
      ).resolves.toEqual({
        templateId: 'tpl_db',
        fromEmail: 'hello@squadup.in',
      });
    });

    it('falls back to the env var when there is no row', async () => {
      env.MAILTR_TEMPLATE_WELCOME = 'tpl_env';

      await expect(
        service.resolveTemplateId(EMAIL_TYPE_ENUM.WELCOME, EMAIL_AUDIENCE.USER),
      ).resolves.toEqual({ templateId: 'tpl_env', fromEmail: null });
    });

    it('falls back to the env var and keeps the row sender when the row has no templateId', async () => {
      repository.findOneByKey.mockResolvedValue(
        row({ fromEmail: 'hello@squadup.in' }),
      );
      env.MAILTR_TEMPLATE_WELCOME = 'tpl_env';

      await expect(
        service.resolveTemplateId(EMAIL_TYPE_ENUM.WELCOME, EMAIL_AUDIENCE.USER),
      ).resolves.toEqual({
        templateId: 'tpl_env',
        fromEmail: 'hello@squadup.in',
      });
    });

    it('suppresses the send when the row is deactivated, even with an env var', async () => {
      repository.findOneByKey.mockResolvedValue(
        row({ templateId: 'tpl_db', isActive: false }),
      );
      env.MAILTR_TEMPLATE_WELCOME = 'tpl_env';

      await expect(
        service.resolveTemplateId(EMAIL_TYPE_ENUM.WELCOME, EMAIL_AUDIENCE.USER),
      ).resolves.toBeNull();
    });

    it('returns null when neither the row nor the env var sets a templateId', async () => {
      env.MAILTR_TEMPLATE_WELCOME = '   ';

      await expect(
        service.resolveTemplateId(EMAIL_TYPE_ENUM.WELCOME, EMAIL_AUDIENCE.USER),
      ).resolves.toBeNull();
    });

    it('reads the admin env var for the admin audience', async () => {
      env.MAILTR_TEMPLATE_CONTACT_US = 'tpl_user';
      env.MAILTR_TEMPLATE_CONTACT_US_ADMIN = 'tpl_admin';

      await expect(
        service.resolveTemplateId(
          EMAIL_TYPE_ENUM.CONTACT_US,
          EMAIL_AUDIENCE.ADMIN,
        ),
      ).resolves.toEqual({ templateId: 'tpl_admin', fromEmail: null });
    });
  });

  describe('listForAdmin', () => {
    it('reports where each templateId comes from', async () => {
      repository.findAll.mockResolvedValue([row({ templateId: 'tpl_db' })]);
      env.MAILTR_TEMPLATE_PASSWORD_RESET = 'tpl_env';

      const list = await service.listForAdmin();
      const byType = (emailType: string) =>
        list.find(
          (e) =>
            e.emailType === emailType && e.audience === EMAIL_AUDIENCE.USER,
        );

      expect(byType(EMAIL_TYPE_ENUM.WELCOME)).toMatchObject({
        templateId: 'tpl_db',
        source: 'database',
        configured: true,
      });
      expect(byType(EMAIL_TYPE_ENUM.PASSWORD_RESET)).toMatchObject({
        templateId: 'tpl_env',
        source: 'env',
        configured: true,
        envKey: 'MAILTR_TEMPLATE_PASSWORD_RESET',
      });
      expect(byType(EMAIL_TYPE_ENUM.TWO_FACTOR_OTP)).toMatchObject({
        templateId: null,
        source: null,
        configured: false,
      });
    });
  });

  it('gives every catalogue entry its own env var', () => {
    const keys = EMAIL_TEMPLATE_CATALOGUE.map((e) => e.envKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect(key).toMatch(/^MAILTR_TEMPLATE_[A-Z_]+$/);
    }
  });
});
