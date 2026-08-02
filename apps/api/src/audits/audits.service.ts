import { Injectable } from '@nestjs/common';
import { AuditProducer } from './producers/audit.producer';
import { AuditRepository } from './repositories/audit.repository';
import {
  AuditEventPayload,
  AuditSeverity,
  AuditStatus,
  CampaignSentAuditData,
  EmailAuditData,
  EmailBounceAuditData,
  UserActionMetadata,
} from './interfaces/audit-event.interface';
import { QueryAuditDto } from './dto/query-audit.dto';
import {
  AUDIT_ACTIONS,
  AUDIT_CATEGORY,
  AUDIT_RESOURCE,
  AUDIT_SEVERITY,
  AUDIT_STATUS,
} from './constants';

@Injectable()
export class AuditsService {
  constructor(
    private readonly auditProducer: AuditProducer,
    private readonly auditRepository: AuditRepository,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  //  Core logging methods
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Create audit log asynchronously (via RabbitMQ).
   * Non-blocking – failures are swallowed to protect main workflow.
   */
  async log(payload: AuditEventPayload): Promise<void> {
    await this.auditProducer.emitAuditEvent(payload);
  }

  /**
   * Create audit log synchronously (with guarantee).
   * Use for critical audits that must be persisted before responding.
   */
  async logSync(payload: AuditEventPayload): Promise<boolean> {
    return await this.auditProducer.emitAuditEventSync(payload);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Query methods
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Paginated query of audit logs.
   */
  async findAll(filters: QueryAuditDto, page = 1, limit = 50) {
    return await this.auditRepository.find(filters, page, limit);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Generic helper – used by all feature modules
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * General-purpose user action audit helper.
   *
   * All feature modules SHOULD use this method to keep payloads consistent.
   */
  async logUserAction(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata?: UserActionMetadata,
  ) {
    await this.log({
      userId,
      action,
      resourceType,
      resourceId,
      ...metadata,
      severity: metadata?.severity ?? 'INFO',
      status: metadata?.status ?? 'SUCCESS',
    });
  }

  /**
   * Log a failed user action.
   */
  async logFailedAction(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    errorMessage: string,
    metadata?: UserActionMetadata,
  ) {
    await this.log({
      userId,
      action,
      resourceType,
      resourceId,
      ...metadata,
      severity: metadata?.severity ?? 'MEDIUM',
      status: 'FAILURE',
      errorMessage,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Auth helpers
  // ═══════════════════════════════════════════════════════════════════════

  async logAuthEvent(
    action: string,
    payload: {
      userId?: string;
      userEmail?: string;
      ipAddress?: string;
      userAgent?: string;
      deviceId?: string;
      description?: string;
      severity?: string;
      status?: string;
      tags?: string[];
    },
  ) {
    await this.log({
      action,
      resourceType: AUDIT_RESOURCE.USER,
      resourceId: payload.userId ?? 'anonymous',
      userId: payload.userId,
      userEmail: payload.userEmail,
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent,
      description: payload.description,
      severity: (payload.severity ?? AUDIT_SEVERITY.INFO) as AuditSeverity,
      status: (payload.status ?? AUDIT_STATUS.SUCCESS) as AuditStatus,
      category: AUDIT_CATEGORY.AUTHENTICATION,
      tags: payload.tags ?? ['auth'],
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Email helpers
  // ═══════════════════════════════════════════════════════════════════════

  async logEmailSent(emailData: EmailAuditData) {
    await this.log({
      action: AUDIT_ACTIONS.EMAIL_EVENT.SENT,
      resourceType: AUDIT_RESOURCE.EMAIL,
      resourceId: emailData.emailId,
      emailMetadata: emailData,
      severity: AUDIT_SEVERITY.INFO,
      status: AUDIT_STATUS.SUCCESS,
      category: AUDIT_CATEGORY.EMAIL,
    });
  }

  async logEmailBounced(bounceData: EmailBounceAuditData) {
    await this.log({
      action: AUDIT_ACTIONS.EMAIL_EVENT.BOUNCED,
      resourceType: AUDIT_RESOURCE.EMAIL,
      resourceId: bounceData.emailId,
      emailMetadata: bounceData,
      severity: AUDIT_SEVERITY.MEDIUM,
      status: AUDIT_STATUS.FAILURE,
      category: AUDIT_CATEGORY.EMAIL,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Campaign helpers
  // ═══════════════════════════════════════════════════════════════════════

  async logCampaignSent(campaignData: CampaignSentAuditData) {
    await this.log({
      action: AUDIT_ACTIONS.CAMPAIGN.SENT,
      resourceType: AUDIT_RESOURCE.CAMPAIGN,
      resourceId: campaignData.campaignId,
      emailMetadata: campaignData,
      bulkMetadata: {
        totalCount: campaignData.totalCount,
        successCount: campaignData.successCount,
        failureCount: campaignData.failureCount,
        batchId: campaignData.batchId,
      },
      severity: AUDIT_SEVERITY.HIGH,
      status: AUDIT_STATUS.SUCCESS,
      category: AUDIT_CATEGORY.CAMPAIGN,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Security helpers
  // ═══════════════════════════════════════════════════════════════════════

  async logSecurityEvent(
    action: string,
    payload: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      description?: string;
      severity?: string;
    },
  ) {
    await this.log({
      action,
      resourceType: AUDIT_RESOURCE.USER,
      resourceId: payload.userId ?? 'anonymous',
      userId: payload.userId,
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent,
      description: payload.description,
      severity: (payload.severity ?? AUDIT_SEVERITY.HIGH) as AuditSeverity,
      status: AUDIT_STATUS.ALERT,
      category: AUDIT_CATEGORY.SECURITY,
      alertTriggered: true,
      tags: ['security'],
    });
  }
}
