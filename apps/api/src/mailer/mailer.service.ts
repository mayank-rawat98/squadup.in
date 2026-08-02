import { Injectable, Logger } from '@nestjs/common';
import { EMAIL_AUDIENCE } from './constants/mailer.constants';
import { EmailTemplateService } from './email-template.service';
import { MailtrClient } from './mailtr.client';

/** Values interpolated into the mailtr template. */
export type EmailVariables = Record<string, unknown>;

export interface NotifyByEmailParams {
  recipient: string;
  /** A value from EMAIL_TYPE_ENUM. */
  emailType: string;
  emailData?: EmailVariables;
}

export interface FollowUpEmailParams {
  recipient: string;
  /** A value from FOLLOW_UP_EMAIL_TYPE. */
  emailType: string;
  data?: EmailVariables;
}

export interface PreRenderedEmailParams {
  recipient: string;
  subject: string;
  html: string;
  text?: string;
  senderName?: string;
  senderEmail?: string;
}

/**
 * The application's single outbound-email entry point.
 *
 * Templates are no longer stored in this repo. Each functionality maps to a
 * mailtr template via an admin-configured row (see EmailTemplateService), and a
 * send is just `templateId` + `variables` — mailtr renders the markup and owns
 * the subject line.
 *
 * Every method resolves to a boolean and never throws: callers already treat
 * `false` as "the mail did not go out" and compensate (rolling back a
 * registration, discarding a stored OTP). Throwing here would turn a provider
 * outage into a 500 on unrelated user actions.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(
    private readonly templates: EmailTemplateService,
    private readonly mailtr: MailtrClient,
  ) {}

  /** Send a transactional email to a customer. */
  async notifyUserByEmail(params: NotifyByEmailParams): Promise<boolean> {
    return this.send(
      params.recipient,
      params.emailType,
      EMAIL_AUDIENCE.USER,
      params.emailData,
    );
  }

  /** Send the ops-facing counterpart of a functionality (e.g. a form landing). */
  async notifyAdminByEmail(params: NotifyByEmailParams): Promise<boolean> {
    return this.send(
      params.recipient,
      params.emailType,
      EMAIL_AUDIENCE.ADMIN,
      params.emailData,
    );
  }

  /**
   * Ticket status-change mail. Distinct only in that its key comes from
   * FOLLOW_UP_EMAIL_TYPE; resolution and delivery are identical.
   */
  async sendFollowUpEmailsToUser(
    params: FollowUpEmailParams,
  ): Promise<boolean> {
    return this.send(
      params.recipient,
      params.emailType,
      EMAIL_AUDIENCE.USER,
      params.data,
    );
  }

  /**
   * Send markup this API rendered itself, bypassing mailtr templates. Only the
   * notification digest queue uses this — it composes per-user content that has
   * no fixed template. Prefer notifyUserByEmail for anything template-shaped.
   */
  async sendPreRenderedEmail(
    params: PreRenderedEmailParams,
  ): Promise<boolean> {
    return this.mailtr.sendRaw({
      to: [params.recipient],
      subject: params.subject,
      html: params.html,
      text: params.text,
      from: params.senderEmail,
    });
  }

  private async send(
    recipient: string,
    emailType: string,
    audience: EMAIL_AUDIENCE,
    variables: EmailVariables = {},
  ): Promise<boolean> {
    if (!recipient) {
      this.logger.error(`No recipient for ${emailType}/${audience} — skipped.`);
      return false;
    }

    const resolved = await this.templates.resolveTemplateId(
      emailType,
      audience,
    );
    if (!resolved) {
      // resolveTemplateId already logged why (unmapped / inactive / no id).
      return false;
    }

    return this.mailtr.sendTemplate({
      to: [recipient],
      templateId: resolved.templateId,
      variables,
      from: resolved.fromEmail ?? undefined,
    });
  }
}
