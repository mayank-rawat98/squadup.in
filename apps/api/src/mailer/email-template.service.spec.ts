import { NotFoundException } from '@nestjs/common';
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
    Pick<
      EmailTemplateRepository,
      'findOneByKey' | 'findAll' | 'upsert' | 'insertMissing'
    >
  >;
  let service: EmailTemplateService;

  beforeEach(() => {
    repository = {
      findOneByKey: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(async (emailType, audience, patch) =>
        row({ emailType, audience, ...patch }),
      ),
      insertMissing: jest.fn().mockResolvedValue(0),
    };
    service = new EmailTemplateService(
      repository as unknown as EmailTemplateRepository,
    );
  });

  describe('resolveTemplateId', () => {
    it('uses the templateId and sender on the row', async () => {
      repository.findOneByKey.mockResolvedValue(
        row({ templateId: 'tpl_db', fromEmail: 'hello@squadup.in' }),
      );

      await expect(
        service.resolveTemplateId(EMAIL_TYPE_ENUM.WELCOME, EMAIL_AUDIENCE.USER),
      ).resolves.toEqual({
        templateId: 'tpl_db',
        fromEmail: 'hello@squadup.in',
      });
    });

    it('returns null when there is no row', async () => {
      await expect(
        service.resolveTemplateId(EMAIL_TYPE_ENUM.WELCOME, EMAIL_AUDIENCE.USER),
      ).resolves.toBeNull();
    });

    it('returns null when the row has no templateId', async () => {
      repository.findOneByKey.mockResolvedValue(row({ templateId: null }));

      await expect(
        service.resolveTemplateId(EMAIL_TYPE_ENUM.WELCOME, EMAIL_AUDIENCE.USER),
      ).resolves.toBeNull();
    });

    it('returns null when the row is switched off', async () => {
      repository.findOneByKey.mockResolvedValue(
        row({ templateId: 'tpl_db', isActive: false }),
      );

      await expect(
        service.resolveTemplateId(EMAIL_TYPE_ENUM.WELCOME, EMAIL_AUDIENCE.USER),
      ).resolves.toBeNull();
    });

    it('never reads a MAILTR_TEMPLATE_* env var', async () => {
      process.env.MAILTR_TEMPLATE_WELCOME = 'tpl_env';
      try {
        await expect(
          service.resolveTemplateId(
            EMAIL_TYPE_ENUM.WELCOME,
            EMAIL_AUDIENCE.USER,
          ),
        ).resolves.toBeNull();
      } finally {
        delete process.env.MAILTR_TEMPLATE_WELCOME;
      }
    });

    it('returns null for an email type the catalogue does not list', async () => {
      await expect(
        service.resolveTemplateId('made_up', EMAIL_AUDIENCE.USER),
      ).resolves.toBeNull();
      expect(repository.findOneByKey).not.toHaveBeenCalled();
    });

    it('serves a repeat lookup from the cache', async () => {
      repository.findOneByKey.mockResolvedValue(row({ templateId: 'tpl_db' }));

      await service.resolveTemplateId(
        EMAIL_TYPE_ENUM.WELCOME,
        EMAIL_AUDIENCE.USER,
      );
      await service.resolveTemplateId(
        EMAIL_TYPE_ENUM.WELCOME,
        EMAIL_AUDIENCE.USER,
      );

      expect(repository.findOneByKey).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('saves the patch with the catalogue label and clears the cached lookup', async () => {
      repository.findOneByKey.mockResolvedValue(row({ templateId: 'tpl_old' }));
      await service.resolveTemplateId(
        EMAIL_TYPE_ENUM.WELCOME,
        EMAIL_AUDIENCE.USER,
      );

      await service.update(EMAIL_TYPE_ENUM.WELCOME, EMAIL_AUDIENCE.USER, {
        templateId: 'tpl_new',
      });
      repository.findOneByKey.mockResolvedValue(row({ templateId: 'tpl_new' }));

      expect(repository.upsert).toHaveBeenCalledWith(
        EMAIL_TYPE_ENUM.WELCOME,
        EMAIL_AUDIENCE.USER,
        {
          templateId: 'tpl_new',
          label: 'Welcome / verify email on registration',
        },
      );
      await expect(
        service.resolveTemplateId(EMAIL_TYPE_ENUM.WELCOME, EMAIL_AUDIENCE.USER),
      ).resolves.toEqual({ templateId: 'tpl_new', fromEmail: null });
    });

    it('refuses an email type the catalogue does not list', async () => {
      await expect(
        service.update('made_up', EMAIL_AUDIENCE.USER, { templateId: 'tpl' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.upsert).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('returns every catalogue entry, with its row where one exists', async () => {
      repository.findAll.mockResolvedValue([row({ templateId: 'tpl_db' })]);

      const list = await service.list();

      expect(list).toHaveLength(EMAIL_TEMPLATE_CATALOGUE.length);
      const welcome = list.find(
        (r) =>
          r.entry.emailType === EMAIL_TYPE_ENUM.WELCOME &&
          r.entry.audience === EMAIL_AUDIENCE.USER,
      );
      const reset = list.find(
        (r) => r.entry.emailType === EMAIL_TYPE_ENUM.PASSWORD_RESET,
      );
      expect(welcome?.row?.templateId).toBe('tpl_db');
      expect(reset?.row).toBeNull();
    });
  });

  describe('onApplicationBootstrap', () => {
    it('creates rows for catalogue entries that have none', async () => {
      await service.onApplicationBootstrap();

      expect(repository.insertMissing).toHaveBeenCalledWith(
        EMAIL_TEMPLATE_CATALOGUE,
      );
    });

    it('does not stop the API booting when the sync fails', async () => {
      repository.insertMissing.mockRejectedValue(new Error('db down'));

      await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    });
  });

  it('lists each (emailType, audience) once in the catalogue', () => {
    const keys = EMAIL_TEMPLATE_CATALOGUE.map(
      (e) => `${e.emailType}:${e.audience}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});
