import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditEventPayload } from '../interfaces/audit-event.interface';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { AuditLog, AuditLogDocument } from '../schema/audit-log.schema';
import { QueryAuditDto } from '../dto/query-audit.dto';

@Injectable()
export class AuditRepository {
  private readonly logger = new Logger(AuditRepository.name);

  constructor(
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
  ) {}

  /**
   * Create audit log in MongoDB
   */
  async create(payload: AuditEventPayload): Promise<AuditLogDocument> {
    try {
      const auditLog = this.buildAuditLog(payload);
      const created = await this.auditLogModel.create(auditLog);

      this.logger.debug(`Audit log created: ${created.auditId}`, {
        action: created.action,
        resourceType: created.resourceType,
      });

      return created;
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to create audit log', {
        error: errMessage,
        payload,
      });
      throw error;
    }
  }

  /**
   * Bulk insert audit logs (for high-volume events)
   */
  async bulkCreate(payloads: AuditEventPayload[]): Promise<number> {
    try {
      const auditLogs = payloads.map((payload) => this.buildAuditLog(payload));
      const result = await this.auditLogModel.insertMany(auditLogs, {
        ordered: false,
      });

      this.logger.debug(`Bulk created ${result.length} audit logs`);
      return result.length;
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to bulk create audit logs', {
        error: errMessage,
        count: payloads.length,
      });
      throw error;
    }
  }

  /**
   * Find audit logs with filters
   */
  async find(filters: QueryAuditDto, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const query = this.buildSafeQuery(filters);

    const [data, total] = await Promise.all([
      this.auditLogModel
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Build a safe query object from the DTO
   * Only includes explicitly allowed fields to prevent query injection
   */
  private buildSafeQuery(filters: QueryAuditDto): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    // User filters - sanitize string values
    if (filters.userId) {
      query.userId = this.sanitizeValue(filters.userId);
    }
    if (filters.userEmail) {
      query.userEmail = this.hashPii(this.sanitizeValue(filters.userEmail));
    }
    if (filters.userRole) {
      query.userRole = this.sanitizeValue(filters.userRole);
    }

    // Action & Resource filters
    if (filters.action) {
      query.action = this.sanitizeValue(filters.action);
    }
    if (filters.resourceType) {
      query.resourceType = this.sanitizeValue(filters.resourceType);
    }
    if (filters.resourceId) {
      query.resourceId = this.sanitizeValue(filters.resourceId);
    }

    // Status & Severity filters
    if (filters.status) {
      query.status = this.sanitizeValue(filters.status);
    }
    if (filters.severity) {
      query.severity = this.sanitizeValue(filters.severity);
    }

    // Category & Tags
    if (filters.category) {
      query.category = this.sanitizeValue(filters.category);
    }
    if (
      filters.tags &&
      Array.isArray(filters.tags) &&
      filters.tags.length > 0
    ) {
      query.tags = { $all: filters.tags.map((tag) => this.sanitizeValue(tag)) };
    }

    // Date range filters - safely construct date queries
    if (filters.startDate || filters.endDate) {
      const timestampQuery: Record<string, Date> = {};
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        if (!isNaN(startDate.getTime())) {
          timestampQuery.$gte = startDate;
        }
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        if (!isNaN(endDate.getTime())) {
          timestampQuery.$lte = endDate;
        }
      }
      if (Object.keys(timestampQuery).length > 0) {
        query.timestamp = timestampQuery;
      }
    }

    // IP & Session filters
    if (filters.ipAddress) {
      query.ipAddress = this.sanitizeValue(filters.ipAddress);
    }
    if (filters.sessionId) {
      query.sessionId = this.sanitizeValue(filters.sessionId);
    }

    return query;
  }

  /**
   * Sanitize a value to prevent NoSQL injection
   * Rejects values containing MongoDB query operators
   */
  private sanitizeValue(value: unknown): string {
    if (typeof value !== 'string') {
      return String(value);
    }

    // Check for MongoDB query operator patterns in the string
    if (value.includes('$')) {
      this.logger.warn('Potential NoSQL injection attempt detected', { value });
      // Remove any $ characters to neutralize query operators
      return value.replace(/\$/g, '');
    }

    return value;
  }

  /**
   * Build audit log object with hash
   */
  private buildAuditLog(payload: AuditEventPayload): Partial<AuditLog> {
    const auditId = payload['eventId'] || uuidv4();
    const timestamp = payload.timestamp
      ? new Date(payload.timestamp)
      : new Date();

    // Calculate retention period based on severity
    const retentionPeriod = this.calculateRetentionPeriod(payload.severity);
    const archiveEligibleAt = new Date(
      timestamp.getTime() + retentionPeriod * 24 * 60 * 60 * 1000,
    );

    const safePayload = this.anonymizePayload(payload);

    const auditLog: Partial<AuditLog> = {
      auditId,
      ...safePayload,
      timestamp,
      retentionPeriod,
      archiveEligibleAt,
      processingAttempts: payload['processingAttempts'] || 0,
    };

    // Generate integrity hash for tamper detection
    auditLog.integrityHash = this.generateHash(auditLog);

    return auditLog;
  }

  /**
   * Anonymize PII in payload for GDPR compliance
   * Hashes personally identifiable information before storage
   */
  private anonymizePayload(payload: AuditEventPayload): AuditEventPayload {
    const anonymized = { ...payload };

    // Hash user email
    if (anonymized.userEmail) {
      anonymized.userEmail = this.hashPii(anonymized.userEmail);
    }

    // Hash user name (keep first initial + hash for auditability)
    if (anonymized.userName) {
      const firstInitial = anonymized.userName.charAt(0).toUpperCase();
      anonymized.userName = `${firstInitial}***${this.hashPii(anonymized.userName).substring(0, 8)}`;
    }

    // Anonymize IP address (keep first two octets for geo-analysis, hash the rest)
    if (anonymized.ipAddress) {
      anonymized.ipAddress = this.anonymizeIpAddress(anonymized.ipAddress);
    }

    // Hash recipient email and other PII in email metadata
    if (anonymized.emailMetadata) {
      anonymized.emailMetadata = {
        ...anonymized.emailMetadata,
      };

      if (anonymized.emailMetadata.recipientEmail) {
        anonymized.emailMetadata.recipientEmail = this.hashPii(
          anonymized.emailMetadata.recipientEmail,
        );
      }
    }

    // Hash alert acknowledged by (if it's a user identifier)
    if (anonymized.alertAcknowledgedBy) {
      anonymized.alertAcknowledgedBy = this.hashPii(
        anonymized.alertAcknowledgedBy,
      );
    }

    return anonymized;
  }

  /**
   * Anonymize IP address while preserving some utility for analysis
   * Keeps first two octets for geographic analysis, hashes the rest
   */
  private anonymizeIpAddress(ip: string): string {
    // Handle IPv4
    if (ip.includes('.') && !ip.includes(':')) {
      const octets = ip.split('.');
      if (octets.length === 4) {
        const prefix = `${octets[0]}.${octets[1]}`;
        const suffix = this.hashPii(`${octets[2]}.${octets[3]}`).substring(
          0,
          8,
        );
        return `${prefix}.x.x (${suffix})`;
      }
    }

    // Handle IPv6 - hash the entire address but keep prefix indicator
    if (ip.includes(':')) {
      return `ipv6:${this.hashPii(ip).substring(0, 16)}`;
    }

    // Fallback - hash the entire value
    return this.hashPii(ip);
  }

  /**
   * Hash PII data
   */
  private hashPii(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate cryptographic hash for integrity verification
   * Used to detect if an audit log has been tampered with
   */
  private generateHash(auditLog: Partial<AuditLog>): string {
    const data = JSON.stringify({
      auditId: auditLog.auditId,
      action: auditLog.action,
      resourceType: auditLog.resourceType,
      resourceId: auditLog.resourceId,
      userId: auditLog.userId,
      timestamp: auditLog.timestamp,
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Calculate retention period based on severity
   */
  private calculateRetentionPeriod(severity?: string): number {
    switch (severity) {
      case 'CRITICAL':
        return 2555; // 7 years
      case 'HIGH':
        return 1095; // 3 years
      case 'MEDIUM':
        return 365; // 1 year
      case 'LOW':
        return 90; // 90 days
      default:
        return 30; // 30 days
    }
  }

  /**
   * Increment processing attempts (for retry logic)
   */
  async incrementProcessingAttempts(auditId: string): Promise<void> {
    await this.auditLogModel.updateOne(
      { auditId },
      { $inc: { processingAttempts: 1 } },
    );
  }
}
