import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { htmlToText } from 'html-to-text';
import { EmailQueue } from '../entities';
import { EmailQueueStatus, EMAIL_QUEUE_CONFIG } from '../constants';
import { MailerService } from '../../mailer/mailer.service';

@Injectable()
export class NotificationEmailService {
  private readonly logger = new Logger(NotificationEmailService.name);

  constructor(
    @InjectRepository(EmailQueue)
    private readonly emailQueueRepo: Repository<EmailQueue>,
    private readonly mailerService: MailerService,
  ) {}

  // ─── Queue Management ─────────────────────────────────────────

  /**
   * Bulk-insert email records into the queue for async processing.
   * Called by NotificationService after preference filtering.
   */
  async queueEmails(
    emails: Array<{
      userId: string;
      notificationId: string;
      email: string;
      subject: string;
      template?: string;
      variables?: Record<string, unknown>;
    }>,
  ): Promise<void> {
    if (emails.length === 0) return;

    try {
      const entities = emails.map((email) =>
        this.emailQueueRepo.create({
          userId: email.userId,
          notificationId: email.notificationId,
          email: email.email,
          subject: email.subject,
          template: email.template || 'notification',
          variables: email.variables,
          status: EmailQueueStatus.PENDING,
          scheduledFor: new Date(),
        }),
      );

      await this.emailQueueRepo.save(entities);
      this.logger.log(`Queued ${entities.length} notification emails`);
    } catch (error: unknown) {
      this.logger.error(
        `Error queuing emails: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  // ─── Cron-Based Queue Processor ───────────────────────────────

  /**
   * Processes pending emails every 5 minutes.
   * Handles retries with exponential backoff.
   */
  @Cron(EMAIL_QUEUE_CONFIG.CRON_INTERVAL)
  async processEmailQueue(): Promise<void> {
    try {
      const pendingEmails = await this.emailQueueRepo.find({
        where: {
          status: EmailQueueStatus.PENDING,
          scheduledFor: LessThanOrEqual(new Date()),
        },
        order: { createdAt: 'ASC' },
        take: EMAIL_QUEUE_CONFIG.BATCH_SIZE,
      });

      if (pendingEmails.length === 0) return;

      this.logger.log(`Processing ${pendingEmails.length} queued emails`);

      // Process in parallel batches of 5
      const PARALLEL_LIMIT = 5;
      for (let i = 0; i < pendingEmails.length; i += PARALLEL_LIMIT) {
        const batch = pendingEmails.slice(i, i + PARALLEL_LIMIT);
        await Promise.allSettled(
          batch.map((emailDoc) => this.sendEmail(emailDoc)),
        );
      }
    } catch (error: unknown) {
      this.logger.error(
        `Email queue processing error: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  // ─── Email Sending ────────────────────────────────────────────

  private async sendEmail(emailDoc: EmailQueue): Promise<void> {
    try {
      const subject = this.renderTemplate(
        emailDoc.subject,
        emailDoc.variables || {},
      );
      const html = this.renderEmailTemplate(
        emailDoc.template,
        emailDoc.variables || {},
      );
      const text = htmlToText(html, {
        wordwrap: 130,
        selectors: [
          { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
          { selector: 'img', format: 'skip' },
        ],
      });

      // Route through MailerService for DKIM signing and centralized config
      await this.mailerService.sendPreRenderedEmail({
        senderName: 'Squadup',
        senderEmail: 'no-reply@squadup.in',
        recipient: emailDoc.email,
        subject,
        html,
        text,
      });

      await this.emailQueueRepo.update(emailDoc.id, {
        status: EmailQueueStatus.SENT,
        sentAt: new Date(),
        attempts: emailDoc.attempts + 1,
      });

      this.logger.log(`Email sent to ${emailDoc.email}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to send email to ${emailDoc.email}: ${(error as Error).message}`,
      );

      const newAttempts = emailDoc.attempts + 1;
      const isFinalFailure = newAttempts >= EMAIL_QUEUE_CONFIG.MAX_ATTEMPTS;

      // Calculate next retry time using exponential backoff
      const retryDelayMs = isFinalFailure
        ? 0
        : EMAIL_QUEUE_CONFIG.RETRY_DELAYS[newAttempts - 1] || 30000;

      const nextScheduledFor = isFinalFailure
        ? emailDoc.scheduledFor // Keep original for failed records
        : new Date(Date.now() + retryDelayMs);

      await this.emailQueueRepo.update(emailDoc.id, {
        attempts: newAttempts,
        lastError: (error as Error).message,
        scheduledFor: nextScheduledFor,
        status: isFinalFailure
          ? EmailQueueStatus.FAILED
          : EmailQueueStatus.PENDING,
      });
    }
  }

  // ─── Template Rendering ───────────────────────────────────────

  private renderTemplate(
    template: string,
    variables: Record<string, unknown>,
  ): string {
    return template.replace(
      /\{\{(\w+)\}\}/g,
      (match, key) => variables[key]?.toString() || match,
    );
  }

  private renderEmailTemplate(
    templateName: string,
    variables: Record<string, unknown>,
  ): string {
    const templates: Record<string, string> = {
      notification: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 20px auto; padding: 0;">
              <div style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <div style="background: #1a73e8; padding: 24px 30px;">
                  <h2 style="margin: 0; color: #ffffff; font-size: 18px;">{{title}}</h2>
                </div>
                <div style="padding: 30px;">
                  <p style="margin: 0 0 20px; font-size: 15px; color: #555;">{{message}}</p>
                  ${
                    variables.actionUrl
                      ? `<a href="{{actionUrl}}" style="background: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500; font-size: 14px;">View Details</a>`
                      : ''
                  }
                </div>
                <div style="padding: 16px 30px; border-top: 1px solid #eee; background: #fafafa;">
                  <p style="margin: 0; color: #999; font-size: 12px;">
                    ${variables.actorName ? 'Triggered by: {{actorName}}' : ''}
                  </p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
      'billing-invoice': `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; color: #111827; background: #f9fafb; margin: 0; padding: 32px;">
            <div style="max-width: 720px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">Squadup billing</p>
              <h1 style="margin: 8px 0 24px;">{{title}}</h1>
              <p style="margin: 0 0 24px; color: #4b5563;">{{message}}</p>
              <div style="display: grid; gap: 12px; margin-bottom: 24px;">
                <div><strong>Invoice:</strong> {{invoiceReferenceNumber}}</div>
                <div><strong>Plan:</strong> {{planName}}</div>
                <div><strong>Amount:</strong> {{currency}} {{amount}}</div>
                <div><strong>Billing period:</strong> {{periodStart}} – {{periodEnd}}</div>
                <div><strong>Payment method:</strong> {{paymentMethod}}</div>
              </div>
              <a href="{{downloadUrl}}" style="display: inline-block; background: #1a73e8; color: #ffffff; padding: 12px 20px; border-radius: 6px; text-decoration: none;">Download invoice PDF</a>
            </div>
          </body>
        </html>
      `,
      'payment-incomplete': `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; color: #111827; background: #f9fafb; margin: 0; padding: 32px;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
              <div style="background: #1a2547; padding: 28px 32px;">
                <p style="margin: 0; color: #9ca3af; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">Squadup Billing</p>
                <h1 style="margin: 8px 0 0; color: #ffffff; font-size: 22px; font-weight: 700;">Action required: complete your payment</h1>
              </div>
              <div style="padding: 32px;">
                <p style="margin: 0 0 20px; color: #4b5563; font-size: 15px; line-height: 1.6;">
                  Hi {{customerName}}, your <strong>{{planName}}</strong> subscription has been created but payment is not yet complete. Your account will remain on the free plan until payment is confirmed.
                </p>
                <div style="background: #f9fafb; border-radius: 10px; padding: 20px; margin-bottom: 28px; border: 1px solid #e5e7eb;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: #6b7280;">Plan</span>
                    <span style="font-weight: 600; color: #1a2547;">{{planName}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #6b7280;">Amount due</span>
                    <span style="font-weight: 700; color: #1a2547; font-size: 16px;">{{currency}} {{amount}}</span>
                  </div>
                </div>
                <a href="{{actionUrl}}" style="display: inline-block; background: #1a2547; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Complete payment →</a>
                <p style="margin: 24px 0 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                  If you did not initiate this, you can ignore this email. The pending subscription will expire automatically within 24 hours.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    };

    const html = templates[templateName] || templates['notification'];
    return this.renderTemplate(html, variables);
  }
}
