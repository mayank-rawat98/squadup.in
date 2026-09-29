import {
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { EmailTemplateRepository } from './email-template.repository';
import {
  EMAIL_AUDIENCE,
  EMAIL_TEMPLATE_CATALOGUE,
  EmailTemplateCatalogueEntry,
  TEMPLATE_CACHE_TTL_MS,
  findCatalogueEntry,
} from './constants/mailer.constants';
import { EmailTemplate } from './entities/email-template.entity';

interface CacheEntry {
  value: EmailTemplate | null;
  expiresAt: number;
}

/** One catalogue entry and its row, if it has one yet. */
export interface EmailTemplateRecord {
  entry: EmailTemplateCatalogueEntry;
  row: EmailTemplate | null;
}

/** What staff may change about one email. */
export interface EmailTemplatePatch {
  templateId?: string | null;
  fromEmail?: string | null;
  isActive?: boolean;
}

/**
 * Owns the emailType → mailtr templateId mapping, which lives only in the
 * `email_templates` table and is edited by staff from the ops console. An
 * email with no templateId on its row, or whose row is switched off, is not
 * sent.
 *
 * Resolution is on the hot path of every transactional email, so lookups are
 * cached in-process. Writes clear the cache for this instance immediately; the
 * short TTL is what lets other replicas pick a change up, so a templateId edit
 * is live everywhere within TEMPLATE_CACHE_TTL_MS.
 */
@Injectable()
export class EmailTemplateService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EmailTemplateService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly repository: EmailTemplateRepository) {}

  private static key(emailType: string, audience: EMAIL_AUDIENCE): string {
    return `${emailType}:${audience}`;
  }

  /**
   * Give every catalogue entry a row at boot, so ops lists each email the code
   * can send, including one added in this release.
   */
  async onApplicationBootstrap(): Promise<void> {
    try {
      const created = await this.repository.insertMissing(
        EMAIL_TEMPLATE_CATALOGUE,
      );
      if (created > 0) {
        this.logger.log(
          `Added ${created} email template row(s) from the catalogue.`,
        );
      }
      this.cache.clear();
    } catch (error: unknown) {
      // A failed sync must not stop the API booting: existing rows still send,
      // and the next boot tries again.
      this.logger.error(
        'Failed to sync the email template catalogue',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * The mailtr templateId to send for this email, or null when its row has
   * none or is switched off. Callers treat null as a send failure.
   */
  async resolveTemplateId(
    emailType: string,
    audience: EMAIL_AUDIENCE,
  ): Promise<{ templateId: string; fromEmail: string | null } | null> {
    if (!findCatalogueEntry(emailType, audience)) {
      this.logger.error(
        `Unknown email type ${emailType}/${audience} — add it to EMAIL_TEMPLATE_CATALOGUE.`,
      );
      return null;
    }

    const mapping = await this.getCached(emailType, audience);
    if (mapping && !mapping.isActive) {
      this.logger.warn(
        `Email template ${emailType}/${audience} is switched off — send skipped.`,
      );
      return null;
    }
    if (!mapping?.templateId) {
      this.logger.error(
        `No mailtr templateId for ${emailType}/${audience} — send skipped. Set it in the ops console (Email templates).`,
      );
      return null;
    }
    return { templateId: mapping.templateId, fromEmail: mapping.fromEmail };
  }

  private async getCached(
    emailType: string,
    audience: EMAIL_AUDIENCE,
  ): Promise<EmailTemplate | null> {
    const key = EmailTemplateService.key(emailType, audience);
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.value;
    }
    const value = await this.repository.findOneByKey(emailType, audience);
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + TEMPLATE_CACHE_TTL_MS,
    });
    return value;
  }

  // ── Admin surface ────────────────────────────────────────────────────────

  /**
   * Every email the app can send, each with its row where one exists, so staff
   * see the gaps rather than only what is already configured. Rows for types
   * no longer in the catalogue are left out: nothing sends them.
   */
  async list(): Promise<EmailTemplateRecord[]> {
    const rows = await this.repository.findAll();
    const byKey = new Map(
      rows.map((r) => [EmailTemplateService.key(r.emailType, r.audience), r]),
    );
    return EMAIL_TEMPLATE_CATALOGUE.map((entry) => ({
      entry,
      row:
        byKey.get(EmailTemplateService.key(entry.emailType, entry.audience)) ??
        null,
    }));
  }

  /** One email, or a 404 when the app sends nothing under that key. */
  async get(
    emailType: string,
    audience: EMAIL_AUDIENCE,
  ): Promise<EmailTemplateRecord> {
    const entry = this.requireEntry(emailType, audience);
    const row = await this.repository.findOneByKey(emailType, audience);
    return { entry, row };
  }

  /** Set (or change) the mailtr templateId, sender or on/off for one email. */
  async update(
    emailType: string,
    audience: EMAIL_AUDIENCE,
    patch: EmailTemplatePatch,
  ): Promise<EmailTemplateRecord> {
    const entry = this.requireEntry(emailType, audience);
    const row = await this.repository.upsert(emailType, audience, {
      ...patch,
      label: entry.label,
    });
    this.cache.delete(EmailTemplateService.key(emailType, audience));
    return { entry, row };
  }

  private requireEntry(
    emailType: string,
    audience: EMAIL_AUDIENCE,
  ): EmailTemplateCatalogueEntry {
    const entry = findCatalogueEntry(emailType, audience);
    if (!entry) {
      throw new NotFoundException(
        `SquadUp sends no "${emailType}" email to the ${audience} audience. Pick one from the email templates list.`,
      );
    }
    return entry;
  }
}
