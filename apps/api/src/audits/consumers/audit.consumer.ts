import { Controller, Logger } from '@nestjs/common';
import {
  MessagePattern,
  EventPattern,
  Payload,
  Ctx,
  RmqContext,
} from '@nestjs/microservices';
import { AuditRepository } from '../repositories/audit.repository';
import type { AuditEventPayload } from '../interfaces/audit-event.interface';
import { RABBITMQ_CONSTANTS } from '../../constants/rabbitmq.constants';
import { MetricsService } from '../../metrics/metrics.service';

/**
 * Audit Event Consumer with Delayed Retry and Exponential Backoff
 *
 * RETRY MECHANISM:
 * This consumer implements a delayed retry pattern using a temporary retry queue.
 * Unlike immediate requeue (nack with requeue: true), this approach adds delays
 * between retries to prevent tight loops when failures are persistent.
 *
 * HOW IT WORKS:
 * 1. Message fails processing in main queue
 * 2. Consumer ACKs original message and publishes to retry queue with TTL
 * 3. Message sits in retry queue (no consumers) until TTL expires
 * 4. After TTL, RabbitMQ routes message back to main queue via x-dead-letter-exchange
 * 5. Main consumer picks it up again for retry
 * 6. Retry count is tracked via x-retry-count header
 * 7. After max retries, message is sent to DLQ
 *
 * EXPONENTIAL BACKOFF:
 * - Retry 1: 5 seconds delay
 * - Retry 2: 15 seconds delay
 * - Retry 3: 45 seconds delay
 *
 * BENEFITS:
 * - No tight retry loops consuming resources
 * - Gives downstream services time to recover
 * - Works without RabbitMQ delayed message plugin
 * - Simple to configure and understand
 *
 * QUEUE TOPOLOGY:
 * audit_logs_queue (main) -> audit_retry_queue (TTL) -> audit_logs_queue (retry)
 *                         \\-> audit_dlq_queue (max retries exceeded)
 */

// Custom header for tracking retry attempts
const RETRY_COUNT_HEADER = 'x-retry-count';

// RabbitMQ message type with properties
interface RmqMessage {
  properties?: {
    headers?: Record<string, unknown>;
  };
}

@Controller()
export class AuditConsumer {
  private readonly logger = new Logger(AuditConsumer.name);

  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Calculate retry delay with exponential backoff
   * @param retryCount Current retry attempt (0-indexed)
   * @returns Delay in milliseconds
   */
  private getRetryDelay(retryCount: number): number {
    const delays = RABBITMQ_CONSTANTS.OPTIONS.RETRY_DELAYS as Record<
      number,
      number
    >;
    const attemptNumber = retryCount + 1;

    // Use configured delay for this attempt, or calculate exponential backoff
    return (
      delays[attemptNumber] ||
      RABBITMQ_CONSTANTS.OPTIONS.RETRY_DELAY * Math.pow(3, retryCount)
    );
  }

  /**
   * Extract retry count from message headers
   * Uses custom header or falls back to x-death count from DLQ redelivery
   */
  private getRetryCount(message: RmqMessage): number {
    const headers = message.properties?.headers || {};

    // Check custom retry header first
    if (typeof headers[RETRY_COUNT_HEADER] === 'number') {
      return headers[RETRY_COUNT_HEADER];
    }

    // Fall back to x-death header (set by RabbitMQ on DLQ redelivery)
    const xDeath = headers['x-death'] as Array<{ count?: number }> | undefined;
    if (Array.isArray(xDeath) && xDeath.length > 0) {
      return xDeath.reduce((total, death) => total + (death.count || 0), 0);
    }

    return 0;
  }

  /**
   * Handle all audit events (pattern-based)
   */
  @EventPattern(Object.values(RABBITMQ_CONSTANTS.ROUTING_KEYS))
  async handleAuditEvent(
    @Payload() payload: AuditEventPayload,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const pattern = context.getPattern();
    const startTime = Date.now();

    try {
      this.logger.debug(`Processing audit event: ${pattern}`, {
        action: payload.action,
        resourceType: payload.resourceType,
      });

      // Store in MongoDB
      await this.auditRepository.create(payload);

      // Track successful processing
      const duration = Date.now() - startTime;
      this.metricsService.incrementAuditEvent(payload.action);
      this.metricsService.recordProcessingTime(duration);

      // Acknowledge message
      channel.ack(originalMsg);

      this.logger.log(`Successfully processed audit event: ${pattern}`);
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process audit event: ${pattern}`, {
        error: errMessage,
        payload,
      });

      // Get retry count from message headers (not payload)
      const retryCount = this.getRetryCount(originalMsg);
      const maxRetries = RABBITMQ_CONSTANTS.OPTIONS.RETRY_ATTEMPTS;

      if (retryCount < maxRetries) {
        // Calculate delay with exponential backoff
        const retryDelay = this.getRetryDelay(retryCount);
        const nextRetryCount = retryCount + 1;

        // Track retry metrics
        this.metricsService.incrementRetry(payload.action, nextRetryCount);
        this.metricsService.incrementAuditEvent(payload.action, 'retry');

        this.logger.warn(
          `Scheduling retry ${nextRetryCount}/${maxRetries} with ${retryDelay}ms delay`,
        );

        // Acknowledge original message (we'll republish to retry queue)
        channel.ack(originalMsg);

        // Publish to retry queue with TTL and updated retry count
        // Message will automatically route back to main queue after TTL expires
        channel.sendToQueue(
          RABBITMQ_CONSTANTS.QUEUES.AUDIT_RETRY,
          Buffer.from(JSON.stringify(payload)),
          {
            persistent: true,
            expiration: retryDelay.toString(),
            headers: {
              ...originalMsg.properties.headers,
              [RETRY_COUNT_HEADER]: nextRetryCount,
              'x-original-pattern': pattern,
            },
          },
        );
      } else {
        // Track failure metrics
        this.metricsService.incrementFailure(
          payload.action,
          'max_retries_exceeded',
        );
        this.metricsService.incrementAuditEvent(payload.action, 'failure');

        // Send to Dead Letter Queue (no requeue)
        channel.nack(originalMsg, false, false);
        this.logger.error(
          `Max retries (${maxRetries}) exceeded. Sending to DLQ.`,
        );
      }
    }
  }

  /**
   * Handle synchronous audit log creation (with response)
   */
  @MessagePattern(RABBITMQ_CONSTANTS.PATTERNS.AUDIT_LOG_CREATE)
  async handleSyncAuditEvent(
    @Payload() payload: AuditEventPayload,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.debug('Processing sync audit event', {
        action: payload.action,
      });

      const auditLog = await this.auditRepository.create(payload);

      channel.ack(originalMsg);

      return {
        success: true,
        auditId: auditLog.auditId,
        timestamp: auditLog.timestamp,
      };
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to process sync audit event', {
        error: errMessage,
        payload,
      });

      channel.nack(originalMsg, false, false);

      return {
        success: false,
        error: errMessage,
      };
    }
  }
}
