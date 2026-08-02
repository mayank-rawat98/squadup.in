import {
  ClientsProviderAsyncOptions,
  MicroserviceOptions,
  RmqOptions,
  Transport,
} from '@nestjs/microservices';
import { RabbitmqConfig } from './index';
import { RABBITMQ_CONSTANTS } from '../constants/rabbitmq.constants';

/**
 * Shared RabbitMQ queue options configuration
 * Used across the application for consistent queue setup
 *
 * IMPORTANT: These parameters must remain consistent across all environments
 * and deployments. Changing them requires deleting the existing queue first,
 * or you'll get "PRECONDITION_FAILED - inequivalent arg" errors.
 *
 * To change queue parameters in production:
 * 1. Stop all consumers
 * 2. Delete the queue via RabbitMQ Management UI (will lose pending messages!)
 * 3. Deploy with new parameters
 * 4. Queue will be auto-created with new settings
 */
export const getRabbitMQQueueOptions = () => ({
  durable: RABBITMQ_CONSTANTS.OPTIONS.DURABLE,
  arguments: {
    'x-message-ttl': RABBITMQ_CONSTANTS.OPTIONS.MESSAGE_TTL,
    'x-dead-letter-exchange': RabbitmqConfig.dlxExchange,
    'x-dead-letter-routing-key': 'audit.dlq',
  },
});

/**
 * Retry queue options with dynamic TTL
 * Messages expire after TTL and route back to main queue via DLX
 *
 * HOW IT WORKS:
 * 1. Failed message is published to retry queue with per-message TTL
 * 2. Message sits in retry queue (not consumed) until TTL expires
 * 3. After TTL, message is routed back to main exchange via x-dead-letter-exchange
 * 4. Main consumer picks it up again for retry
 *
 * This implements delayed retry without requiring the RabbitMQ delayed message plugin
 */
export const getRetryQueueOptions = () => ({
  durable: true,
  arguments: {
    // Route expired messages back to main audit exchange
    'x-dead-letter-exchange': RabbitmqConfig.exchange,
    // Use the original routing key to route back to correct queue
    'x-dead-letter-routing-key': 'audit.create',
  },
});

/**
 * Factory function for ClientsModule.registerAsync
 * Used in modules that need to inject the AUDIT_SERVICE client
 */
export const createAuditClientConfig = (): ClientsProviderAsyncOptions => ({
  name: 'AUDIT_SERVICE',
  useFactory: (): RmqOptions => ({
    transport: Transport.RMQ,
    options: {
      urls: [RabbitmqConfig.url],
      queue: RabbitmqConfig.queue,
      queueOptions: getRabbitMQQueueOptions(),
      prefetchCount: RabbitmqConfig.prefetchCount,
      noAck: RABBITMQ_CONSTANTS.OPTIONS.NO_ACK,
      persistent: true,
      socketOptions: {
        heartbeatIntervalInSeconds: 60,
        reconnectTimeInSeconds: 5,
      },
    },
  }),
});

/**
 * Configuration for ClientsModule.register (synchronous)
 * Used when async configuration is not needed
 */
export const getAuditClientSyncConfig = (): RmqOptions & { name: string } => ({
  name: 'AUDIT_SERVICE',
  transport: Transport.RMQ,
  options: {
    urls: [RabbitmqConfig.url],
    queue: RabbitmqConfig.queue,
    queueOptions: getRabbitMQQueueOptions(),
  },
});

/**
 * Microservice configuration for app.connectMicroservice
 * Used in main.ts to set up the RabbitMQ microservice consumer
 */
export const getMicroserviceConfig = (): MicroserviceOptions => ({
  transport: Transport.RMQ,
  options: {
    urls: [RabbitmqConfig.url],
    queue: RabbitmqConfig.queue,
    queueOptions: getRabbitMQQueueOptions(),
    prefetchCount: RabbitmqConfig.prefetchCount,
    noAck: RABBITMQ_CONSTANTS.OPTIONS.NO_ACK,
    socketOptions: {
      heartbeatIntervalInSeconds: 60,
      reconnectTimeInSeconds: 5,
    },
  },
});

/**
 * Dead Letter Queue microservice configuration
 * Used in main.ts to set up a separate consumer for the DLQ
 *
 * IMPORTANT: This must be a separate microservice connection because:
 * - DLQ needs its own consumer group
 * - Different prefetch count for failed messages
 * - Isolated error handling and alerting
 * - Prevents DLQ messages from blocking main queue processing
 */
export const getDLQMicroserviceConfig = (): MicroserviceOptions => ({
  transport: Transport.RMQ,
  options: {
    urls: [RabbitmqConfig.url],
    queue: RABBITMQ_CONSTANTS.QUEUES.AUDIT_DLQ,
    queueOptions: {
      durable: true,
      // No DLX for DLQ itself - these are final resting place for failed messages
    },
    prefetchCount: 1, // Process DLQ messages one at a time
    noAck: false, // Must manually ack DLQ messages
    socketOptions: {
      heartbeatIntervalInSeconds: 60,
      reconnectTimeInSeconds: 5,
    },
  },
});

export const getInvoicePdfMicroserviceConfig = (): MicroserviceOptions => ({
  transport: Transport.RMQ,
  options: {
    urls: [RabbitmqConfig.url],
    queue: RABBITMQ_CONSTANTS.QUEUES.INVOICE_PDF,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': RABBITMQ_CONSTANTS.QUEUES.INVOICE_PDF_DLQ,
      },
    },
    prefetchCount: 2,
    noAck: false,
  },
});

export const getInvoicePdfClientConfig = (): RmqOptions & { name: string } => ({
  name: 'INVOICE_PDF_SERVICE',
  transport: Transport.RMQ,
  options: {
    urls: [RabbitmqConfig.url],
    queue: RABBITMQ_CONSTANTS.QUEUES.INVOICE_PDF,
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': RABBITMQ_CONSTANTS.QUEUES.INVOICE_PDF_DLQ,
      },
    },
  },
});
