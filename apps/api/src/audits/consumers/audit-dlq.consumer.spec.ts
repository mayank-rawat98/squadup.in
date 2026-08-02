import { Test, TestingModule } from '@nestjs/testing';
import { AuditDLQConsumer } from './audit-dlq.consumer';
import { RmqContext } from '@nestjs/microservices';

describe('AuditDLQConsumer', () => {
  let consumer: AuditDLQConsumer;

  const mockChannel = {
    ack: jest.fn(),
    nack: jest.fn(),
  };

  const mockMessage = {
    content: Buffer.from('test'),
    properties: {
      headers: {
        'x-death': [
          {
            count: 3,
            reason: 'rejected',
            queue: 'audit_logs_queue',
          },
        ],
      },
    },
  };

  const createMockContext = (): RmqContext => {
    return {
      getChannelRef: () => mockChannel,
      getMessage: () => mockMessage,
      getPattern: () => 'audit_dlq_queue',
    } as unknown as RmqContext;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditDLQConsumer],
    }).compile();

    consumer = module.get<AuditDLQConsumer>(AuditDLQConsumer);
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('handleDeadLetter', () => {
    const mockPayload = {
      action: 'FAILED_ACTION',
      resourceType: 'FailedResource',
      resourceId: '999',
      userId: 'user-1',
      retryCount: 3,
    };

    it('should process dead letter message and acknowledge', async () => {
      const mockContext = createMockContext();

      await consumer.handleDeadLetter(mockPayload, mockContext);

      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it('should handle message with various payload types', async () => {
      const mockContext = createMockContext();
      const payloads = [
        { action: 'EMAIL_FAILED', resourceType: 'Email', resourceId: '1' },
        { action: 'CAMPAIGN_ERROR', resourceType: 'Campaign', resourceId: '2' },
        null,
        undefined,
        { malformed: true },
      ];

      for (const payload of payloads) {
        jest.clearAllMocks();
        await consumer.handleDeadLetter(payload, mockContext);
        expect(mockChannel.ack).toHaveBeenCalled();
      }
    });

    it('should log message headers for debugging', async () => {
      const mockContext = createMockContext();
      const loggerSpy = jest.spyOn(consumer['logger'], 'error');

      await consumer.handleDeadLetter(mockPayload, mockContext);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Message received in Dead Letter Queue',
        expect.objectContaining({
          payload: mockPayload,
          headers: mockMessage.properties.headers,
        }),
      );
    });

    it('should nack message if processing fails internally', async () => {
      // Create a custom context that throws on ack
      const failingChannel = {
        ack: jest.fn().mockImplementation(() => {
          throw new Error('Channel error');
        }),
        nack: jest.fn(),
      };

      const failingContext = {
        getChannelRef: () => failingChannel,
        getMessage: () => mockMessage,
        getPattern: () => 'audit_dlq_queue',
      } as unknown as RmqContext;

      await consumer.handleDeadLetter(mockPayload, failingContext);

      expect(failingChannel.nack).toHaveBeenCalledWith(
        mockMessage,
        false,
        false,
      );
    });
  });

  describe('message metadata extraction', () => {
    it('should handle messages with x-death headers', async () => {
      const mockContext = createMockContext();
      const payloadWithMetadata = {
        action: 'FAILED_ACTION',
        resourceType: 'Resource',
        resourceId: '1',
        eventId: 'evt-123',
        timestamp: new Date().toISOString(),
      };

      await consumer.handleDeadLetter(payloadWithMetadata, mockContext);

      expect(mockChannel.ack).toHaveBeenCalled();
    });

    it('should handle messages without x-death headers', async () => {
      const contextWithoutDeathHeaders = {
        getChannelRef: () => mockChannel,
        getMessage: () => ({
          content: Buffer.from('test'),
          properties: { headers: {} },
        }),
        getPattern: () => 'audit_dlq_queue',
      } as unknown as RmqContext;

      const payload = { action: 'TEST', resourceType: 'Test', resourceId: '1' };

      await consumer.handleDeadLetter(payload, contextWithoutDeathHeaders);

      expect(mockChannel.ack).toHaveBeenCalled();
    });
  });
});
