import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailTemplateRepository } from './email-template.repository';
import {
  EMAIL_AUDIENCE,
  EMAIL_TEMPLATE_CATALOGUE,
  EmailTemplateCatalogueEntry,
  TEMPLATE_CACHE_TTL_MS,
} from './constants/mailer.constants';
import { EmailTemplate } from './entities/email-template.entity';

interface CacheEntry {
  value: EmailTemplate | null;
  expiresAt: number;
}

/** Where a resolved templateId came from, shown to admins. */
export type TemplateSource = 'database' | 'env';

/**
 * Owns the emailType → mailtr templateId mapping: the admin-configured table
 * that replaced the HTML templates this API used to render itself.
 *
 * A templateId set on the database row (from the ops dashboard) wins. When the
 * row has none, the entry's env var (e.g. MAILTR_TEMPLATE_WELCOME) is used, so
 * a deploy can configure mail before any staff tooling exists. A deactivated
 * row suppresses the send whatever the env says.
 *
 * Resolution is on the hot path of every transactional email, so lookups are
 * cached in-process. Writes clear the cache for this instance immediately; the
 * short TTL is what lets other replicas pick a change up, so a templateId edit
 * is live everywhere within TEMPLATE_CACHE_TTL_MS.
 */
@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly repository: EmailTemplateRepository,
    private readonly configService: ConfigService,
  ) {}

  private static key(emailType: string, audience: EMAIL_AUDIENCE): string {
    return `${emailType}:${audience}`;
  }

  private static catalogueEntry(
    emailType: string,
    audience: EMAIL_AUDIENCE,
  ): EmailTemplateCatalogueEntry | undefined {
    return EMAIL_TEMPLATE_CATALOGUE.find(
      (e) => e.emailType === emailType && e.audience === audience,
    );
  }

  /** The templateId from the entry's env var, or null when unset or blank. */
  private envTemplateId(entry: EmailTemplateCatalogueEntry | undefined) {
    if (!entry) {
      return null;
    }
    const value = this.configService.get<string>(entry.envKey)?.trim();
    return value ? value : null;
  }

  /**
   * The mailtr templateId to send for this functionality, or null when neither
   * the database row nor the env var sets one, or the row is deactivated.
   * Callers treat null as a send failure.
   */
  async resolveTemplateId(
    emailType: string,
    audience: EMAIL_AUDIENCE,
  ): Promise<{ templateId: string; fromEmail: string | null } | null> {
    const mapping = await this.getCached(emailType, audience);

    if (mapping && !mapping.isActive) {
      this.logger.warn(
        `Email template ${emailType}/${audience} is deactivated — send suppressed.`,
      );
      return null;
    }
    if (mapping?.templateId) {
      return { templateId: mapping.templateId, fromEmail: mapping.fromEmail };
    }

    const entry = EmailTemplateService.catalogueEntry(emailType, audience);
    const envTemplateId = this.envTemplateId(entry);
    if (envTemplateId) {
      return {
        templateId: envTemplateId,
        fromEmail: mapping?.fromEmail ?? null,
      };
    }

    this.logger.error(
      entry
        ? `No mailtr templateId for ${emailType}/${audience} — send skipped. Set ${entry.envKey} or configure it in the ops dashboard (Email Templates).`
        : `Unknown email type ${emailType}/${audience} — add it to EMAIL_TEMPLATE_CATALOGUE.`,
    );
    return null;
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
   * The full catalogue for the ops dashboard: every email the app can send,
   * each with its configured templateId (or null where unconfigured), so the
   * admin sees the gaps rather than only what already exists.
   */
  async listForAdmin() {
    const rows = await this.repository.findAll();
    const byKey = new Map(
      rows.map((r) => [EmailTemplateService.key(r.emailType, r.audience), r]),
    );

    return EMAIL_TEMPLATE_CATALOGUE.map((entry) => {
      const row = byKey.get(
        EmailTemplateService.key(entry.emailType, entry.audience),
      );
      const envTemplateId = this.envTemplateId(entry);
      const source: TemplateSource | null = row?.templateId
        ? 'database'
        : envTemplateId
          ? 'env'
          : null;
      return {
        id: row?.id ?? null,
        emailType: entry.emailType,
        audience: entry.audience,
        label: row?.label ?? entry.label,
        templateId: row?.templateId ?? envTemplateId,
        fromEmail: row?.fromEmail ?? null,
        isActive: row?.isActive ?? true,
        configured: source !== null,
        source,
        envKey: entry.envKey,
        updatedAt: row?.updatedAt ?? null,
      };
    });
  }

  /** Set (or change) the mailtr templateId for one functionality. */
  async setTemplate(
    emailType: string,
    audience: EMAIL_AUDIENCE,
    patch: {
      templateId?: string | null;
      fromEmail?: string | null;
      isActive?: boolean;
    },
  ) {
    const known = EmailTemplateService.catalogueEntry(emailType, audience);
    if (!known) {
      throw new NotFoundException(
        `Unknown email type "${emailType}" for audience "${audience}"`,
      );
    }

    const saved = await this.repository.upsert(emailType, audience, {
      ...patch,
      label: known.label,
    });
    this.cache.delete(EmailTemplateService.key(emailType, audience));
    return saved;
  }

  /**
   * Create rows for catalogue entries that have none yet, so a fresh database
   * shows the whole list with empty templateIds instead of nothing.
   */
  async syncCatalogue() {
    const created = await this.repository.insertMissing(
      EMAIL_TEMPLATE_CATALOGUE,
    );
    this.cache.clear();
    return { created, total: EMAIL_TEMPLATE_CATALOGUE.length };
  }
}
