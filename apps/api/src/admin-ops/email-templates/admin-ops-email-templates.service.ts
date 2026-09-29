import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AuditsService } from '../../audits/audits.service';
import {
  AUDIT_ACTIONS,
  AUDIT_CATEGORY,
  AUDIT_RESOURCE,
  AUDIT_SEVERITY,
  AUDIT_STATUS,
} from '../../audits/constants';
import type {
  AuditSeverity,
  AuditStatus,
} from '../../audits/interfaces/audit-event.interface';
import { clientUrl } from '../../config';
import { EMAIL_AUDIENCE } from '../../mailer/constants/mailer.constants';
import {
  EmailTemplatePatch,
  EmailTemplateService,
} from '../../mailer/email-template.service';
import { MailerService } from '../../mailer/mailer.service';
import { Staff } from '../../staff/entities/staff.entity';
import { normalizeUrl } from '../../utils/utils';
import {
  EmailTemplateView,
  presentEmailTemplate,
} from './email-template.presenter';
import { sampleVariables } from './sample-variables';

export interface TestSendResult {
  to: string;
  templateId: string;
}

/**
 * The ops side of email templates: shaping for the console, auditing each
 * change, and the test send. Resolution for real sends stays in the mailer.
 */
@Injectable()
export class AdminOpsEmailTemplatesService {
  private readonly logger = new Logger(AdminOpsEmailTemplatesService.name);

  constructor(
    private readonly emailTemplateService: EmailTemplateService,
    private readonly mailerService: MailerService,
    private readonly auditsService: AuditsService,
  ) {}

  async list(): Promise<EmailTemplateView[]> {
    const records = await this.emailTemplateService.list();
    return records.map(presentEmailTemplate);
  }

  async get(
    emailType: string,
    audience: EMAIL_AUDIENCE,
  ): Promise<EmailTemplateView> {
    return presentEmailTemplate(
      await this.emailTemplateService.get(emailType, audience),
    );
  }

  async update(
    emailType: string,
    audience: EMAIL_AUDIENCE,
    patch: EmailTemplatePatch,
    staff: Staff,
  ): Promise<EmailTemplateView> {
    const before = presentEmailTemplate(
      await this.emailTemplateService.get(emailType, audience),
    );
    const after = presentEmailTemplate(
      await this.emailTemplateService.update(emailType, audience, patch),
    );

    this.audit(staff, `${emailType}:${audience}`, {
      action: AUDIT_ACTIONS.EMAIL_TEMPLATE.UPDATED,
      // Every user who gets this email reads what was just changed.
      severity: AUDIT_SEVERITY.HIGH,
      status: AUDIT_STATUS.SUCCESS,
      description: `Staff ${staff.email} updated the ${emailType}/${audience} email template`,
      changesBefore: {
        templateId: before.templateId,
        fromEmail: before.fromEmail,
        isActive: before.isActive,
      },
      changesAfter: {
        templateId: after.templateId,
        fromEmail: after.fromEmail,
        isActive: after.isActive,
      },
    });

    return after;
  }

  /**
   * Sends the saved template, with sample values, to the staff member asking.
   * The recipient is never a parameter: an endpoint that mails any address on
   * request would be a relay for whoever holds a staff token.
   */
  async testSend(
    emailType: string,
    audience: EMAIL_AUDIENCE,
    staff: Staff,
  ): Promise<TestSendResult> {
    const { entry, row } = await this.emailTemplateService.get(
      emailType,
      audience,
    );
    if (!row?.templateId) {
      throw new BadRequestException(
        'This email has no templateId yet. Save one, then send a test.',
      );
    }

    const sent = await this.mailerService.sendTestEmail({
      recipient: staff.email,
      templateId: row.templateId,
      fromEmail: row.fromEmail,
      variables: sampleVariables(entry.variables, normalizeUrl(clientUrl)),
    });

    this.audit(staff, `${emailType}:${audience}`, {
      action: AUDIT_ACTIONS.EMAIL_TEMPLATE.TEST_SENT,
      severity: AUDIT_SEVERITY.LOW,
      status: sent ? AUDIT_STATUS.SUCCESS : AUDIT_STATUS.FAILURE,
      description: `Test send of ${emailType}/${audience} with template ${row.templateId}`,
    });

    if (!sent) {
      throw new BadRequestException(
        'Mailtr did not accept the test email. Check that the templateId exists in mailtr and that MAILTR_API_KEY is set, then try again.',
      );
    }
    return { to: staff.email, templateId: row.templateId };
  }

  private audit(
    staff: Staff,
    resourceId: string,
    event: {
      action: string;
      severity: AuditSeverity;
      status: AuditStatus;
      description: string;
      changesBefore?: Record<string, unknown>;
      changesAfter?: Record<string, unknown>;
    },
  ): void {
    // Fire-and-forget: a queue hiccup must not undo a saved change.
    this.auditsService
      .log({
        ...event,
        resourceType: AUDIT_RESOURCE.EMAIL_TEMPLATE,
        resourceId,
        resourceName: resourceId,
        userId: staff.id,
        userEmail: staff.email,
        userRole: 'staff',
        category: AUDIT_CATEGORY.CONFIGURATION,
        tags: ['staff', 'email-templates'],
      })
      .catch((error: unknown) =>
        this.logger.warn(
          `Audit log failed for ${event.action}: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
  }
}
