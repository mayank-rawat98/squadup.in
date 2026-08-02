import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditProducer } from './producers/audit.producer';
import { AuditConsumer } from './consumers/audit.consumer';
import { AuditDLQConsumer } from './consumers/audit-dlq.consumer';
import { AuditRepository } from './repositories/audit.repository';
import { AuditsService } from './audits.service';
import { AuditsController } from './audits.controller';
import { AuditLog, AuditLogSchema } from './schema/audit-log.schema';
import { ClientsModule } from '@nestjs/microservices';
import { getAuditClientSyncConfig } from '../config';

/**
 * Audits Module
 *
 * Handles audit event processing with:
 * - Asynchronous event emission via RabbitMQ
 * - Delayed retry with exponential backoff
 * - Dead Letter Queue for failed messages
 * - Prometheus metrics tracking
 *
 * Note: The retry queue (audit_retry_queue) is automatically created by RabbitMQ
 * when the first failed message is published to it. No manual initialization needed.
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    ClientsModule.register([getAuditClientSyncConfig()]),
  ],
  controllers: [AuditsController, AuditConsumer, AuditDLQConsumer],
  providers: [AuditsService, AuditProducer, AuditRepository],
  exports: [AuditsService, AuditProducer, AuditRepository],
})
export class AuditsModule {}
