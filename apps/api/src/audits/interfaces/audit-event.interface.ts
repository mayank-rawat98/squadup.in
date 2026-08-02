/**
 * Generic JSON value type
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonArray = Array<JsonValue>;

/**
 * Audit event payload
 */
export interface AuditEventPayload {
  // User Context
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;

  // Action Details
  action: string;
  resourceType: string;
  resourceId: string;
  resourceName?: string;

  // Change Tracking
  changesBefore?: JsonObject | Record<string, unknown>;
  changesAfter?: JsonObject | Record<string, unknown>;
  changesSummary?: string;

  // Request Context
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  apiKeyId?: string;

  // Email-Specific
  emailMetadata?: EmailMetadata;

  // Status & Severity
  status?: AuditStatus;
  severity?: AuditSeverity;
  errorMessage?: string;
  errorCode?: string;

  // Description
  description?: string;

  // Bulk Operations
  parentAuditId?: string;
  bulkMetadata?: BulkMetadata;

  // Compliance
  complianceFlags?: ComplianceFlags;

  // Alert
  alertTriggered?: boolean;
  alertId?: string;
  alertAcknowledged?: boolean;
  alertAcknowledgedBy?: string;
  alertAcknowledgedAt?: Date;

  // Tags
  tags?: string[];
  category?: string;

  // Infrastructure
  retryCount?: number;
  eventId?: string;
  processingAttempts?: number;

  // Timestamp
  timestamp?: Date;
}

/**
 * Email metadata for audit logs
 */
export interface EmailMetadata {
  campaignId?: string;
  campaignName?: string;
  templateId?: string;
  templateName?: string;
  recipientEmail?: string;
  recipientCount?: number;
  sendingDomain?: string;
  messageId?: string;
  espProvider?: string;
  bounceType?: BounceType;
  bounceReason?: string;
  complaintType?: ComplaintType;
  engagementType?: EngagementType;
  linkUrl?: string;
}

/**
 * Bulk operation metadata
 */
export interface BulkMetadata {
  totalCount: number;
  successCount: number;
  failureCount: number;
  batchId: string;
}

/**
 * Compliance flags
 */
export interface ComplianceFlags {
  gdprRelevant?: boolean;
  canSpamRelevant?: boolean;
  hipaaRelevant?: boolean;
  consentRecorded?: boolean;
  legalBasis?: LegalBasis;
  recipientJurisdiction?: string;
}

/**
 * Audit event with pattern
 */
export interface AuditEvent {
  pattern: string;
  data: AuditEventPayload;
  metadata?: AuditEventMetadata;
}

/**
 * Audit event metadata
 */
export interface AuditEventMetadata {
  correlationId?: string;
  retryCount?: number;
  priority?: number;
}

// ========================================
// Enums and Type Literals
// ========================================

export type AuditStatus = 'SUCCESS' | 'FAILURE' | 'PENDING' | 'ALERT';

export type AuditSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type BounceType = 'hard' | 'soft';

export type ComplaintType = 'spam' | 'abuse' | 'fraud' | 'other';

export type EngagementType = 'open' | 'click' | 'unsubscribe';

export type LegalBasis =
  | 'consent'
  | 'contract'
  | 'legal_obligation'
  | 'vital_interest'
  | 'public_task'
  | 'legitimate_interest';

export type VerificationMethod = 'dns' | 'http' | 'email';

export type VerificationStatus = 'pending' | 'verified' | 'failed';

export type UnsubscribeMethod = 'link' | 'list-unsubscribe' | 'manual';

export type UserChangeType =
  | 'create'
  | 'update'
  | 'delete'
  | 'role_change'
  | 'password_change';

// ========================================
// Specialized Audit Data Interfaces
// ========================================

/**
 * Email data for audit logging
 */
export interface EmailAuditData {
  emailId: string;
  campaignId?: string;
  campaignName?: string;
  templateId?: string;
  templateName?: string;
  recipientEmail?: string; // Should be hashed
  recipientCount?: number;
  sendingDomain?: string;
  messageId?: string;
  espProvider?: string;
  subject?: string;
}

/**
 * Email bounce data for audit logging
 */
export interface EmailBounceAuditData extends EmailAuditData {
  bounceType?: BounceType;
  bounceReason?: string;
  bounceCode?: string;
  bouncedAt?: Date;
}

/**
 * Campaign sent data for audit logging
 */
export interface CampaignSentAuditData {
  campaignId: string;
  campaignName?: string;
  templateId?: string;
  templateName?: string;
  sendingDomain?: string;
  totalCount: number;
  successCount: number;
  failureCount: number;
  batchId: string;
  scheduledAt?: Date;
  sentAt?: Date;
}

/**
 * User action metadata
 */
export interface UserActionMetadata {
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  changesBefore?: JsonObject | Record<string, unknown>;
  changesAfter?: JsonObject | Record<string, unknown>;
  changesSummary?: string;
  description?: string;
  tags?: string[];
  category?: string;
  severity?: AuditSeverity;
  status?: AuditStatus;
  resourceName?: string;
  userEmail?: string;
}

/**
 * Email opened data
 */
export interface EmailOpenedAuditData extends EmailAuditData {
  openedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  isFirstOpen?: boolean;
  openCount?: number;
}

/**
 * Email clicked data
 */
export interface EmailClickedAuditData extends EmailAuditData {
  clickedAt: Date;
  linkUrl: string;
  linkLabel?: string;
  ipAddress?: string;
  userAgent?: string;
  clickCount?: number;
}

/**
 * Spam complaint data
 */
export interface SpamComplaintAuditData extends EmailAuditData {
  complaintType: ComplaintType;
  complaintSource?: string; // e.g., 'Gmail', 'Outlook'
  complaintedAt: Date;
  feedbackId?: string;
}

/**
 * Unsubscribe data
 */
export interface UnsubscribeAuditData extends EmailAuditData {
  unsubscribedAt: Date;
  unsubscribeMethod?: UnsubscribeMethod;
  unsubscribeReason?: string;
}

/**
 * Template data for audit logging
 */
export interface TemplateAuditData {
  templateId: string;
  templateName: string;
  version?: number;
  changedFields?: string[];
  changesBefore?: TemplateSnapshot;
  changesAfter?: TemplateSnapshot;
}

/**
 * Template snapshot for change tracking
 */
export interface TemplateSnapshot {
  name?: string;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  variables?: string[];
  status?: string;
  version?: number;
  [key: string]: JsonValue | undefined;
}

/**
 * Contact import data
 */
export interface ContactImportAuditData {
  listId: string;
  listName?: string;
  fileName?: string;
  fileSize?: number;
  totalRows: number;
  importedCount: number;
  duplicateCount: number;
  invalidCount: number;
  batchId: string;
}

/**
 * User management data
 */
export interface UserManagementAuditData {
  targetUserId: string;
  targetUserEmail?: string;
  targetUserRole?: string;
  changeType?: UserChangeType;
  changesBefore?: Partial<UserSnapshot>;
  changesAfter?: Partial<UserSnapshot>;
}

/**
 * User snapshot for change tracking
 */
export interface UserSnapshot {
  id: string;
  email: string;
  name?: string;
  role: string;
  status: string;
  emailVerified: boolean;
  isTwoFactorEnabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Domain verification data
 */
export interface DomainVerificationAuditData {
  domainId: string;
  domainName: string;
  verificationMethod: VerificationMethod;
  dkimEnabled?: boolean;
  spfEnabled?: boolean;
  dmarcEnabled?: boolean;
  verificationStatus: VerificationStatus;
  verifiedAt?: Date;
}

/**
 * Configuration change data
 */
export interface ConfigChangeAuditData {
  configKey: string;
  configSection?: string;
  oldValue?: ConfigValue;
  newValue?: ConfigValue;
  changeReason?: string;
}

/**
 * Configuration value type
 */
export type ConfigValue =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | ConfigObject;

export interface ConfigObject {
  [key: string]: ConfigValue;
}

/**
 * API key management data
 */
export interface ApiKeyAuditData {
  apiKeyId: string;
  apiKeyName?: string;
  permissions?: ApiKeyPermission[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt?: Date;
}

/**
 * API key permissions
 */
export type ApiKeyPermission =
  | 'read:campaigns'
  | 'write:campaigns'
  | 'read:templates'
  | 'write:templates'
  | 'read:contacts'
  | 'write:contacts'
  | 'read:analytics'
  | 'send:emails'
  | 'admin:*';

/**
 * Device/Session data
 */
export interface DeviceSessionAuditData {
  deviceId: string;
  deviceName?: string;
  deviceType?: DeviceType;
  deviceOs?: string;
  ipAddress?: string;
  location?: LocationData;
  lastSeen?: Date;
  createdAt?: Date;
}

/**
 * Device type
 */
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';

/**
 * Location data
 */
export interface LocationData {
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  countryFlag?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

/**
 * Rate limit data
 */
export interface RateLimitAuditData {
  endpoint: string;
  limit: number;
  current: number;
  resetAt: Date;
  userId?: string;
  ipAddress?: string;
}

/**
 * Authentication attempt data
 */
export interface AuthAttemptAuditData {
  attemptType: AuthAttemptType;
  success: boolean;
  failureReason?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: LocationData;
  deviceId?: string;
}

/**
 * Authentication attempt type
 */
export type AuthAttemptType =
  | 'password'
  | '2fa'
  | 'oauth'
  | 'api_key'
  | 'magic_link';

/**
 * Suppression list data
 */
export interface SuppressionListAuditData {
  listType: SuppressionListType;
  action: SuppressionAction;
  emailCount: number;
  reason?: string;
  source?: string;
}

/**
 * Suppression list type
 */
export type SuppressionListType =
  | 'bounce'
  | 'complaint'
  | 'unsubscribe'
  | 'manual';

/**
 * Suppression action
 */
export type SuppressionAction =
  | 'add'
  | 'remove'
  | 'bulk_import'
  | 'bulk_export';

/**
 * Webhook data
 */
export interface WebhookAuditData {
  webhookId: string;
  webhookUrl: string;
  event: string;
  statusCode?: number;
  success: boolean;
  responseTime?: number;
  retryCount?: number;
  errorMessage?: string;
}

/**
 * Export data
 */
export interface ExportAuditData {
  exportId: string;
  exportType: ExportType;
  format: ExportFormat;
  recordCount: number;
  fileSize?: number;
  downloadUrl?: string;
  expiresAt?: Date;
}

/**
 * Export type
 */
export type ExportType =
  | 'contacts'
  | 'campaigns'
  | 'audit_logs'
  | 'analytics'
  | 'templates';

/**
 * Export format
 */
export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'pdf';

/**
 * Payment/Billing data
 */
export interface BillingAuditData {
  transactionId: string;
  amount: number;
  currency: string;
  paymentMethod?: string;
  status: PaymentStatus;
  invoiceId?: string;
  subscriptionId?: string;
}

/**
 * Payment status
 */
export type PaymentStatus =
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'disputed';

/**
 * GDPR request data
 */
export interface GdprRequestAuditData {
  requestId: string;
  requestType: GdprRequestType;
  userEmail: string;
  status: GdprRequestStatus;
  completedAt?: Date;
  dataExportUrl?: string;
}

/**
 * GDPR request type
 */
export type GdprRequestType =
  | 'access'
  | 'erasure'
  | 'portability'
  | 'rectification'
  | 'restriction';

/**
 * GDPR request status
 */
export type GdprRequestStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'rejected';
