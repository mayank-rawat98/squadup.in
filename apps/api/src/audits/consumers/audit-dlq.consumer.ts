import { Controller, Logger } from '@nestjs/common';
import {
  MessagePattern,
  Payload,
  Ctx,
  RmqContext,
} from '@nestjs/microservices';
import { RABBITMQ_CONSTANTS } from '../../constants/rabbitmq.constants';

/**
 * Dead Letter Queue Consumer for Audit Logs
 *
 * SETUP REQUIREMENTS:
 * This consumer requires a separate microservice connection to function properly.
 * The DLQ microservice connection is configured in:
 * - config/rabbitmq.config.ts (getDLQMicroserviceConfig)
 * - main.ts (app.connectMicroservice for DLQ)
 *
 * WHY SEPARATE CONNECTION:
 * - DLQ needs isolated consumer group for failed message processing
 * - Different prefetch count (1) to process failures cautiously
 * - Independent error handling without blocking main queue
 * - Allows for different retry/alerting strategies
 *
 * MESSAGE FLOW:
 * 1. Message fails in main audit queue (after max retries)
 * 2. RabbitMQ routes to DLX exchange via x-dead-letter-exchange
 * 3. DLX routes to audit_dlq_queue via routing key 'audit.dlq'
 * 4. This consumer picks up from audit_dlq_queue
 * 5. Logs error, alerts monitoring systems, stores for manual review
 *
 * HEADERS AVAILABLE:
 * - x-death: Array of death records with reason, count, queue, time
 * - x-first-death-reason: rejected | expired | maxlen
 * - x-first-death-queue: Original queue name
 * - x-first-death-exchange: Original exchange
 */
@Controller()
export class AuditDLQConsumer {
  private readonly logger = new Logger(AuditDLQConsumer.name);

  /**
   * Handle messages from Dead Letter Queue
   *
   * This method processes messages that failed in the main queue.
   * It extracts death metadata to understand why the message failed.
   */
  @MessagePattern(RABBITMQ_CONSTANTS.QUEUES.AUDIT_DLQ)
  async handleDeadLetter(@Payload() payload: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    this.logger.error('Message received in Dead Letter Queue', {
      payload,
      headers: originalMsg.properties.headers,
    });

    try {
      // Log to external system (e.g., Sentry, CloudWatch)
      // await this.alertingService.sendCriticalAlert(payload);

      // Store in separate collection for manual review
      // await this.failedAuditsRepository.create(payload);

      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error('Failed to process DLQ message', error);
      channel.nack(originalMsg, false, false);
    }
  }
}
