import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({
  timestamps: true,
  collection: 'audit_logs',
})
export class AuditLog {
  @Prop({ required: true, unique: true })
  auditId!: string;

  // User Context
  @Prop({ index: true })
  userId?: string;

  @Prop()
  userName?: string;

  @Prop()
  userEmail?: string;

  @Prop()
  userRole?: string;

  // Action Details
  @Prop({ required: true, index: true })
  action!: string;

  @Prop({ required: true, index: true })
  resourceType!: string;

  @Prop({ required: true, index: true })
  resourceId!: string;

  @Prop()
  resourceName?: string;

  // Change Tracking
  @Prop({ type: Object })
  changesBefore?: Record<string, any>;

  @Prop({ type: Object })
  changesAfter?: Record<string, any>;

  @Prop()
  changesSummary?: string;

  // Request Context
  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  requestId?: string;

  @Prop()
  sessionId?: string;

  @Prop()
  apiKeyId?: string;

  // Email-Specific Fields
  @Prop({ type: Object })
  emailMetadata?: {
    campaignId?: string;
    campaignName?: string;
    templateId?: string;
    templateName?: string;
    recipientEmail?: string;
    recipientCount?: number;
    sendingDomain?: string;
    messageId?: string;
    espProvider?: string;
    bounceType?: string;
    bounceReason?: string;
    complaintType?: string;
    engagementType?: string;
    linkUrl?: string;
  };

  // Status & Severity
  @Prop({ default: 'SUCCESS', index: true })
  status?: string;

  @Prop({ default: 'INFO', index: true })
  severity?: string;

  @Prop()
  errorMessage?: string;

  @Prop()
  errorCode?: string;

  @Prop()
  description?: string;

  // Bulk Operations
  @Prop()
  parentAuditId?: string;

  @Prop({ type: Object })
  bulkMetadata?: {
    totalCount?: number;
    successCount?: number;
    failureCount?: number;
    batchId?: string;
  };

  // Compliance
  @Prop({ type: Object })
  complianceFlags?: {
    gdprRelevant?: boolean;
    canSpamRelevant?: boolean;
    hipaaRelevant?: boolean;
    consentRecorded?: boolean;
    legalBasis?: string;
    recipientJurisdiction?: string;
  };

  // Security & Integrity
  @Prop({ required: true })
  integrityHash!: string;

  @Prop()
  previousHash?: string;

  // Timestamps
  @Prop({ required: true, index: true })
  timestamp!: Date;

  // Retention
  @Prop({ default: 365 })
  retentionPeriod?: number;

  @Prop({ index: true })
  archiveEligibleAt?: Date;

  @Prop()
  archivedAt?: Date;

  @Prop()
  archiveLocation?: string;

  // Tags
  @Prop({ type: [String] })
  tags?: string[];

  @Prop()
  category?: string;

  // Alert
  @Prop({ default: false })
  alertTriggered?: boolean;

  @Prop()
  alertId?: string;

  // Event Metadata
  @Prop()
  eventId?: string;

  @Prop()
  correlationId?: string;

  @Prop({ default: 0 })
  processingAttempts?: number;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Indexes
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ 'emailMetadata.campaignId': 1, timestamp: -1 });
AuditLogSchema.index({ 'emailMetadata.messageId': 1 });
AuditLogSchema.index({ severity: 1, status: 1, timestamp: -1 });
