import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EMAIL_AUDIENCE } from './constants/mailer.constants';
import { EmailTemplate } from './entities/email-template.entity';

@Injectable()
export class EmailTemplateRepository {
  constructor(
    @InjectRepository(EmailTemplate)
    private readonly repo: Repository<EmailTemplate>,
  ) {}

  findAll(): Promise<EmailTemplate[]> {
    return this.repo.find({ order: { audience: 'ASC', emailType: 'ASC' } });
  }

  findById(id: string): Promise<EmailTemplate | null> {
    return this.repo.findOne({ where: { id } });
  }

  findOneByKey(
    emailType: string,
    audience: EMAIL_AUDIENCE,
  ): Promise<EmailTemplate | null> {
    return this.repo.findOne({ where: { emailType, audience } });
  }

  /**
   * Insert the (emailType, audience) row if absent, otherwise update it. Used
   * both by the ops dashboard and by catalogue sync, so it must not clobber
   * columns the caller did not supply.
   */
  async upsert(
    emailType: string,
    audience: EMAIL_AUDIENCE,
    patch: Partial<EmailTemplate>,
  ): Promise<EmailTemplate> {
    const existing = await this.findOneByKey(emailType, audience);
    if (existing) {
      Object.assign(existing, patch);
      return this.repo.save(existing);
    }
    return this.repo.save(
      this.repo.create({ emailType, audience, ...patch }),
    );
  }

  /** Create any catalogue entries missing from the table, leaving the rest untouched. */
  async insertMissing(
    entries: ReadonlyArray<{
      emailType: string;
      audience: EMAIL_AUDIENCE;
      label: string;
    }>,
  ): Promise<number> {
    const existing = await this.repo.find({
      select: { emailType: true, audience: true },
    });
    const seen = new Set(existing.map((e) => `${e.emailType}:${e.audience}`));
    const missing = entries.filter(
      (e) => !seen.has(`${e.emailType}:${e.audience}`),
    );
    if (!missing.length) {
      return 0;
    }
    await this.repo.save(
      missing.map((e) =>
        this.repo.create({
          emailType: e.emailType,
          audience: e.audience,
          label: e.label,
          templateId: null,
        }),
      ),
    );
    return missing.length;
  }
}
