import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AuditEventPayload } from '../interfaces/audit-event.interface';
import { v4 as uuidv4 } from 'uuid';
import { lastValueFrom, timeout, catchError, of, take } from 'rxjs';
import { RABBITMQ_CONSTANTS } from '../../constants/rabbitmq.constants';
import { MetricsService } from '../../metrics/metrics.service';

@Injectable()
export class AuditProducer {
  private readonly logger = new Logger(AuditProducer.name);

  constructor(
    @Inject('AUDIT_SERVICE') private readonly client: ClientProxy,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Emit audit event to RabbitMQ
   * Non-blocking operation with error handling
   */
  async emitAuditEvent(payload: AuditEventPayload): Promise<void> {
    try {
      const event = this.buildEvent(payload);

      this.logger.debug(`Emitting audit event: ${event.pattern}`, {
        action: payload.action,
        resourceType: payload.resourceType,
        userId: payload.userId,
      });

      // Track emitted event
      this.metricsService.incrementAuditEvent(payload.action);

      // Emit event asynchronously (fire and forget)
      // take(1) ensures observable completes after first emission, preventing memory leaks
      this.client
        .emit(event.pattern, event.data)
        .pipe(
          take(1), // Complete after first emission
          timeout(2000), // 2 second timeout
          catchError((error) => {
            this.logger.error('Failed to emit audit event', {
              error: error,
              event: event.pattern,
              payload,
            });
            // Don't throw - logging should never break the application
            return of(null);
          }),
        )
        .subscribe();
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error building audit event', {
        error: errMessage,
        payload,
      });
    }
  }

  /**
   * Emit audit event and wait for acknowledgment
   * Use for critical audits that must be guaranteed
   */
  async emitAuditEventSync(payload: AuditEventPayload): Promise<boolean> {
    try {
      const event = this.buildEvent(payload);

      this.logger.debug(`Emitting sync audit event: ${event.pattern}`);

      const result = await lastValueFrom(
        this.client
          .send(RABBITMQ_CONSTANTS.PATTERNS.AUDIT_LOG_CREATE, event.data)
          .pipe(
            timeout(5000),
            catchError((error) => {
              this.logger.error('Sync audit event failed', {
                error: error.message,
                event: event.pattern,
              });
              return of({ success: false, error });
            }),
          ),
      );

      return result?.success === true;
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error in sync audit event', {
        error: errMessage,
        payload,
      });
      return false;
    }
  }

  /**
   * Build audit event with metadata
   */
  private buildEvent(payload: AuditEventPayload) {
    const pattern = this.determinePattern(payload.action);

    return {
      pattern,
      data: {
        ...payload,
        timestamp: payload.timestamp || new Date(),
        eventId: uuidv4(),
      },
      metadata: {
        correlationId: uuidv4(),
        retryCount: 0,
        priority: this.determinePriority(payload.severity),
      },
    };
  }

  /**
   * Determine message pattern based on action
   */
  private determinePattern(action: string): string {
    if (action.includes('EMAIL')) {
      return RABBITMQ_CONSTANTS.ROUTING_KEYS.AUDIT_EMAIL_SENT;
    }
    if (action.includes('CAMPAIGN')) {
      return RABBITMQ_CONSTANTS.ROUTING_KEYS.AUDIT_CAMPAIGN;
    }
    if (action.includes('USER')) {
      return RABBITMQ_CONSTANTS.ROUTING_KEYS.AUDIT_USER_ACTION;
    }
    return RABBITMQ_CONSTANTS.ROUTING_KEYS.AUDIT_CREATE;
  }

  /**
   * Determine message priority
   */
  private determinePriority(severity?: string): number {
    switch (severity) {
      case 'CRITICAL':
        return 10;
      case 'HIGH':
        return 8;
      case 'MEDIUM':
        return 5;
      case 'LOW':
        return 3;
      default:
        return 1;
    }
  }

  /**
   * Health check - verify RabbitMQ connection
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.client.connect();
      return true;
    } catch (error) {
      this.logger.error('RabbitMQ health check failed', error);
      return false;
    }
  }

  /**
   * Graceful shutdown
   */
  async onModuleDestroy() {
    try {
      await this.client.close();
      this.logger.log('RabbitMQ producer connection closed');
    } catch (error) {
      this.logger.error('Error closing RabbitMQ producer', error);
    }
  }
}
