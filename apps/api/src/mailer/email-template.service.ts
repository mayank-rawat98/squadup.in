import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EmailTemplateRepository } from './email-template.repository';
import {
  EMAIL_AUDIENCE,
  EMAIL_TEMPLATE_CATALOGUE,
  TEMPLATE_CACHE_TTL_MS,
} from './constants/mailer.constants';
import { EmailTemplate } from './entities/email-template.entity';

interface CacheEntry {
  value: EmailTemplate | null;
  expiresAt: number;
}

/**
 * Owns the emailType → mailtr templateId mapping: the admin-configured table
 * that replaced the HTML templates this API used to render itself.
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

  constructor(private readonly repository: EmailTemplateRepository) {}

  private static key(emailType: string, audience: EMAIL_AUDIENCE): string {
    return `${emailType}:${audience}`;
  }

  /**
   * The mailtr templateId to send for this functionality, or null when the
   * admin has not configured one (or has deactivated it). Callers treat null as
   * a send failure rather than falling back to anything.
   */
  async resolveTemplateId(
    emailType: string,
    audience: EMAIL_AUDIENCE,
  ): Promise<{ templateId: string; fromEmail: string | null } | null> {
    const mapping = await this.getCached(emailType, audience);

    if (!mapping) {
      this.logger.error(
        `No email template row for ${emailType}/${audience}. Add it in the ops dashboard (Email Templates).`,
      );
      return null;
    }
    if (!mapping.isActive) {
      this.logger.warn(
        `Email template ${emailType}/${audience} is deactivated — send suppressed.`,
      );
      return null;
    }
    if (!mapping.templateId) {
      this.logger.error(
        `Email template ${emailType}/${audience} has no mailtr templateId configured — send skipped.`,
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
      return {
        id: row?.id ?? null,
        emailType: entry.emailType,
        audience: entry.audience,
        label: row?.label ?? entry.label,
        templateId: row?.templateId ?? null,
        fromEmail: row?.fromEmail ?? null,
        isActive: row?.isActive ?? true,
        configured: Boolean(row?.templateId),
        updatedAt: row?.updatedAt ?? null,
      };
    });
  }

  /** Set (or change) the mailtr templateId for one functionality. */
  async setTemplate(
    emailType: string,
    audience: EMAIL_AUDIENCE,
    patch: { templateId?: string | null; fromEmail?: string | null; isActive?: boolean },
  ) {
    const known = EMAIL_TEMPLATE_CATALOGUE.find(
      (e) => e.emailType === emailType && e.audience === audience,
    );
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
