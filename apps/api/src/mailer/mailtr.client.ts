import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface MailtrTemplateSend {
  to: string[];
  templateId: string;
  variables?: Record<string, unknown>;
  from?: string;
}

export interface MailtrRawSend {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

/**
 * Thin transport over the mailtr REST API. Knows how to authenticate and shape
 * a request; it deliberately holds no knowledge of which template belongs to
 * which functionality — that is MailerService's job.
 *
 * Every method resolves to a boolean rather than throwing: callers across the
 * app already branch on a send having failed (rolling back registrations,
 * discarding OTPs), so a transport error must not surface as a 500.
 */
@Injectable()
export class MailtrClient {
  private readonly logger = new Logger(MailtrClient.name);
  private readonly http: AxiosInstance;
  private readonly defaultFrom: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('MAILTR_API_KEY');
    const baseURL =
      this.configService.get<string>('MAILTR_API_URL') ??
      'https://api.mailtr.co';
    this.defaultFrom =
      this.configService.get<string>('MAILTR_FROM_EMAIL') ??
      'no-reply@squadup.in';
    this.enabled = Boolean(apiKey);

    if (!this.enabled) {
      this.logger.warn(
        'MAILTR_API_KEY is not set — outbound email is disabled and every send will report failure.',
      );
    }

    this.http = axios.create({
      baseURL,
      timeout: Number(
        this.configService.get<string>('MAILTR_TIMEOUT_MS') ?? 10_000,
      ),
      headers: {
        Authorization: `Bearer ${apiKey ?? ''}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /** Send using a mailtr-hosted template. mailtr owns the subject and markup. */
  async sendTemplate(payload: MailtrTemplateSend): Promise<boolean> {
    return this.post({
      from: payload.from ?? this.defaultFrom,
      to: payload.to,
      templateId: payload.templateId,
      variables: payload.variables ?? {},
    });
  }

  /**
   * Send fully-rendered markup. Used only by the notification queue, which
   * renders its own per-user digests and has no mailtr template.
   */
  async sendRaw(payload: MailtrRawSend): Promise<boolean> {
    return this.post({
      from: payload.from ?? this.defaultFrom,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      ...(payload.text ? { text: payload.text } : {}),
    });
  }

  private async post(body: Record<string, unknown>): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }
    try {
      await this.http.post('/api/v1/emails/send', body);
      return true;
    } catch (error: unknown) {
      // Log the provider's own error body when present — it names the offending
      // field (unknown templateId, missing variable) far better than the status.
      const detail = axios.isAxiosError(error)
        ? JSON.stringify(error.response?.data ?? error.message)
        : error instanceof Error
          ? error.message
          : String(error);
      this.logger.error(`mailtr send failed: ${detail}`);
      return false;
    }
  }
}
