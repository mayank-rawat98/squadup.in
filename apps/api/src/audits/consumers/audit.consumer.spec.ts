import { Test, TestingModule } from '@nestjs/testing';
import { AuditConsumer } from './audit.consumer';
import { AuditRepository } from '../repositories/audit.repository';
import { RmqContext } from '@nestjs/microservices';
import { AuditEventPayload } from '../interfaces/audit-event.interface';
import { RABBITMQ_CONSTANTS } from '../../constants/rabbitmq.constants';
import { AuditLogDocument } from '../schema/audit-log.schema';
import { MetricsService } from '../../metrics/metrics.service';

describe('AuditConsumer', () => {
  let consumer: AuditConsumer;
  let auditRepository: jest.Mocked<AuditRepository>;

  const mockChannel = {
    ack: jest.fn(),
    nack: jest.fn(),
    sendToQueue: jest.fn(),
  };

  const createMockMessage = (headers: Record<string, unknown> = {}) => ({
    content: Buffer.from('test'),
    properties: { headers },
  });

  let mockMessage = createMockMessage();

  const createMockContext = (
    pattern = 'test.pattern',
    message = mockMessage,
  ): RmqContext => {
    return {
      getChannelRef: () => mockChannel,
      getMessage: () => message,
      getPattern: () => pattern,
    } as unknown as RmqContext;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockMessage = createMockMessage();

    const mockAuditRepository = {
      create: jest.fn(),
      find: jest.fn(),
      bulkCreate: jest.fn(),
    };

    const mockMetricsService = {
      incrementAuditEvent: jest.fn(),
      recordProcessingTime: jest.fn(),
      incrementRetry: jest.fn(),
      incrementFailure: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditConsumer],
      providers: [
        {
          provide: AuditRepository,
          useValue: mockAuditRepository,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    consumer = module.get<AuditConsumer>(AuditConsumer);
    auditRepository = module.get(AuditRepository);
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('handleAuditEvent', () => {
    const mockPayload: AuditEventPayload = {
      action: 'TEST_ACTION',
      resourceType: 'TestResource',
      resourceId: '123',
      userId: 'user-1',
    };

    it('should process audit event and acknowledge message', async () => {
      const mockContext = createMockContext(
        RABBITMQ_CONSTANTS.ROUTING_KEYS.AUDIT_CREATE,
      );
      const mockAuditLog = { auditId: 'audit-123', ...mockPayload };
      auditRepository.create.mockResolvedValue(
        mockAuditLog as unknown as AuditLogDocument,
      );

      await consumer.handleAuditEvent(mockPayload, mockContext);

      expect(auditRepository.create).toHaveBeenCalledWith(mockPayload);
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it('should send message to retry queue on first failure (no retry header)', async () => {
      const mockContext = createMockContext();
      auditRepository.create.mockRejectedValue(new Error('Database error'));

      await consumer.handleAuditEvent(mockPayload, mockContext);

      // Should ACK original message and send to retry queue
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        RABBITMQ_CONSTANTS.QUEUES.AUDIT_RETRY,
        expect.any(Buffer),
        expect.objectContaining({
          persistent: true,
          expiration: '5000', // First retry delay
          headers: expect.objectContaining({
            'x-retry-count': 1,
          }),
        }),
      );
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it('should send message to retry queue when retry count header is below max', async () => {
      const messageWithRetryHeader = createMockMessage({
        'x-retry-count': 1,
      });
      const mockContext = createMockContext(
        'test.pattern',
        messageWithRetryHeader,
      );
      auditRepository.create.mockRejectedValue(new Error('Database error'));

      await consumer.handleAuditEvent(mockPayload, mockContext);

      // Should ACK and send to retry queue with incremented count
      expect(mockChannel.ack).toHaveBeenCalledWith(messageWithRetryHeader);
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        RABBITMQ_CONSTANTS.QUEUES.AUDIT_RETRY,
        expect.any(Buffer),
        expect.objectContaining({
          persistent: true,
          expiration: '15000', // Second retry delay (exponential backoff)
          headers: expect.objectContaining({
            'x-retry-count': 2,
          }),
        }),
      );
    });

    it('should send to DLQ after max retries exceeded (via x-retry-count header)', async () => {
      const messageWithMaxRetries = createMockMessage({
        'x-retry-count': RABBITMQ_CONSTANTS.OPTIONS.RETRY_ATTEMPTS,
      });
      const mockContext = createMockContext(
        'test.pattern',
        messageWithMaxRetries,
      );
      auditRepository.create.mockRejectedValue(new Error('Database error'));

      await consumer.handleAuditEvent(mockPayload, mockContext);

      expect(mockChannel.nack).toHaveBeenCalledWith(
        messageWithMaxRetries,
        false,
        false,
      );
      expect(mockChannel.ack).not.toHaveBeenCalled();
    });

    it('should send to DLQ after max retries exceeded (via x-death header)', async () => {
      const messageWithXDeath = createMockMessage({
        'x-death': [
          {
            count: RABBITMQ_CONSTANTS.OPTIONS.RETRY_ATTEMPTS,
            reason: 'rejected',
          },
        ],
      });
      const mockContext = createMockContext('test.pattern', messageWithXDeath);
      auditRepository.create.mockRejectedValue(new Error('Database error'));

      await consumer.handleAuditEvent(mockPayload, mockContext);

      expect(mockChannel.nack).toHaveBeenCalledWith(
        messageWithXDeath,
        false,
        false,
      );
      expect(mockChannel.ack).not.toHaveBeenCalled();
    });

    it('should handle different routing patterns', async () => {
      const patterns = [
        RABBITMQ_CONSTANTS.ROUTING_KEYS.AUDIT_EMAIL_SENT,
        RABBITMQ_CONSTANTS.ROUTING_KEYS.AUDIT_CAMPAIGN,
        RABBITMQ_CONSTANTS.ROUTING_KEYS.AUDIT_USER_ACTION,
      ];

      for (const pattern of patterns) {
        jest.clearAllMocks();
        const mockContext = createMockContext(pattern);
        auditRepository.create.mockResolvedValue({
          auditId: 'audit-123',
        } as unknown as AuditLogDocument);

        await consumer.handleAuditEvent(mockPayload, mockContext);

        expect(auditRepository.create).toHaveBeenCalled();
        expect(mockChannel.ack).toHaveBeenCalled();
      }
    });
  });

  describe('handleSyncAuditEvent', () => {
    const mockPayload: AuditEventPayload = {
      action: 'SYNC_ACTION',
      resourceType: 'SyncResource',
      resourceId: '456',
    };

    it('should process sync event and return success response', async () => {
      const mockContext = createMockContext();
      const mockAuditLog = {
        auditId: 'audit-456',
        timestamp: new Date(),
        ...mockPayload,
      };
      auditRepository.create.mockResolvedValue(
        mockAuditLog as unknown as AuditLogDocument,
      );

      const result = await consumer.handleSyncAuditEvent(
        mockPayload,
        mockContext,
      );

      expect(result).toEqual({
        success: true,
        auditId: 'audit-456',
        timestamp: mockAuditLog.timestamp,
      });
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should return error response on failure', async () => {
      const mockContext = createMockContext();
      auditRepository.create.mockRejectedValue(new Error('Database error'));

      const result = await consumer.handleSyncAuditEvent(
        mockPayload,
        mockContext,
      );

      expect(result).toEqual({
        success: false,
        error: 'Database error',
      });
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });

    it('should handle non-Error thrown objects', async () => {
      const mockContext = createMockContext();
      auditRepository.create.mockRejectedValue('String error');

      const result = await consumer.handleSyncAuditEvent(
        mockPayload,
        mockContext,
      );

      expect(result).toEqual({
        success: false,
        error: 'String error',
      });
    });
  });
});
