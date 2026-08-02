import { Test, TestingModule } from '@nestjs/testing';
import { AuditProducer } from './audit.producer';
import { ClientProxy } from '@nestjs/microservices';
import { AuditEventPayload } from '../interfaces/audit-event.interface';
import { Observable, of, throwError } from 'rxjs';
import { RABBITMQ_CONSTANTS } from '../../constants/rabbitmq.constants';
import { MetricsService } from '../../metrics/metrics.service';

type MockObservable = Observable<unknown> & {
  pipe: jest.Mock;
  subscribe: jest.Mock;
};

describe('AuditProducer', () => {
  let producer: AuditProducer;
  let clientProxy: jest.Mocked<ClientProxy>;

  const mockClientProxy = {
    emit: jest.fn(),
    send: jest.fn(),
    connect: jest.fn(),
    close: jest.fn(),
  };

  const mockMetricsService = {
    incrementAuditEvent: jest.fn(),
    recordProcessingTime: jest.fn(),
    incrementRetry: jest.fn(),
    incrementFailure: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditProducer,
        {
          provide: 'AUDIT_SERVICE',
          useValue: mockClientProxy,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    producer = module.get<AuditProducer>(AuditProducer);
    clientProxy = module.get('AUDIT_SERVICE');
  });

  it('should be defined', () => {
    expect(producer).toBeDefined();
  });

  describe('emitAuditEvent', () => {
    const mockPayload: AuditEventPayload = {
      action: 'TEST_ACTION',
      resourceType: 'TestResource',
      resourceId: '123',
      userId: 'user-1',
    };

    it('should emit an audit event successfully', async () => {
      const mockObservable: MockObservable = {
        pipe: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      } as unknown as MockObservable;
      clientProxy.emit.mockReturnValue(mockObservable);

      await producer.emitAuditEvent(mockPayload);

      expect(clientProxy.emit).toHaveBeenCalled();
      expect(mockObservable.pipe).toHaveBeenCalled();
      expect(mockObservable.subscribe).toHaveBeenCalled();
    });

    it('should determine EMAIL pattern for email actions', async () => {
      const emailPayload: AuditEventPayload = {
        action: 'EMAIL_SENT',
        resourceType: 'Email',
        resourceId: '456',
      };

      const mockObservable: MockObservable = {
        pipe: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      } as unknown as MockObservable;
      clientProxy.emit.mockReturnValue(mockObservable);

      await producer.emitAuditEvent(emailPayload);

      expect(clientProxy.emit).toHaveBeenCalledWith(
        RABBITMQ_CONSTANTS.ROUTING_KEYS.AUDIT_EMAIL_SENT,
        expect.objectContaining({
          action: 'EMAIL_SENT',
        }),
      );
    });

    it('should determine CAMPAIGN pattern for campaign actions', async () => {
      const campaignPayload: AuditEventPayload = {
        action: 'CAMPAIGN_CREATED',
        resourceType: 'Campaign',
        resourceId: '789',
      };

      const mockObservable: MockObservable = {
        pipe: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      } as unknown as MockObservable;
      clientProxy.emit.mockReturnValue(mockObservable);

      await producer.emitAuditEvent(campaignPayload);

      expect(clientProxy.emit).toHaveBeenCalledWith(
        RABBITMQ_CONSTANTS.ROUTING_KEYS.AUDIT_CAMPAIGN,
        expect.objectContaining({
          action: 'CAMPAIGN_CREATED',
        }),
      );
    });

    it('should determine USER pattern for user actions', async () => {
      const userPayload: AuditEventPayload = {
        action: 'USER_LOGIN',
        resourceType: 'User',
        resourceId: '101',
      };

      const mockObservable: MockObservable = {
        pipe: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      } as unknown as MockObservable;
      clientProxy.emit.mockReturnValue(mockObservable);

      await producer.emitAuditEvent(userPayload);

      expect(clientProxy.emit).toHaveBeenCalledWith(
        RABBITMQ_CONSTANTS.ROUTING_KEYS.AUDIT_USER_ACTION,
        expect.objectContaining({
          action: 'USER_LOGIN',
        }),
      );
    });

    it('should not throw when emit fails', async () => {
      const mockObservable: MockObservable = {
        pipe: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      } as unknown as MockObservable;
      clientProxy.emit.mockReturnValue(mockObservable);

      await expect(producer.emitAuditEvent(mockPayload)).resolves.not.toThrow();
    });
  });

  describe('emitAuditEventSync', () => {
    const mockPayload: AuditEventPayload = {
      action: 'CRITICAL_ACTION',
      resourceType: 'CriticalResource',
      resourceId: '999',
    };

    it('should return true on successful sync emit', async () => {
      clientProxy.send.mockReturnValue(of({ success: true }));

      const result = await producer.emitAuditEventSync(mockPayload);

      expect(result).toBe(true);
      expect(clientProxy.send).toHaveBeenCalledWith(
        RABBITMQ_CONSTANTS.PATTERNS.AUDIT_LOG_CREATE,
        expect.objectContaining({
          action: 'CRITICAL_ACTION',
        }),
      );
    });

    it('should return false on failed sync emit', async () => {
      clientProxy.send.mockReturnValue(of({ success: false, error: 'Failed' }));

      const result = await producer.emitAuditEventSync(mockPayload);

      expect(result).toBe(false);
    });

    it('should return false when send throws an error', async () => {
      clientProxy.send.mockReturnValue(
        throwError(() => new Error('Connection failed')),
      );

      const result = await producer.emitAuditEventSync(mockPayload);

      expect(result).toBe(false);
    });
  });

  describe('isHealthy', () => {
    it('should return true when connection succeeds', async () => {
      clientProxy.connect.mockResolvedValue(undefined);

      const result = await producer.isHealthy();

      expect(result).toBe(true);
      expect(clientProxy.connect).toHaveBeenCalled();
    });

    it('should return false when connection fails', async () => {
      clientProxy.connect.mockRejectedValue(new Error('Connection refused'));

      const result = await producer.isHealthy();

      expect(result).toBe(false);
    });
  });

  describe('onModuleDestroy', () => {
    it('should close the client connection', async () => {
      clientProxy.close.mockResolvedValue(undefined);

      await producer.onModuleDestroy();

      expect(clientProxy.close).toHaveBeenCalled();
    });

    it('should not throw when close fails', async () => {
      clientProxy.close.mockRejectedValue(new Error('Close failed'));

      await expect(producer.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('buildEvent', () => {
    it('should add timestamp and eventId to payload for CRITICAL severity', async () => {
      const criticalPayload = {
        action: 'TEST_ACTION',
        resourceType: 'Test',
        resourceId: '1',
        severity: 'CRITICAL',
      } as AuditEventPayload & { severity: string };

      const mockObservable: MockObservable = {
        pipe: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      } as unknown as MockObservable;
      clientProxy.emit.mockReturnValue(mockObservable);

      await producer.emitAuditEvent(criticalPayload);

      expect(clientProxy.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          action: 'TEST_ACTION',
          resourceType: 'Test',
          resourceId: '1',
          severity: 'CRITICAL',
          timestamp: expect.any(Date),
          eventId: expect.any(String),
        }),
      );
    });

    it('should add timestamp and eventId to payload for HIGH severity', async () => {
      const highPayload = {
        action: 'TEST_ACTION',
        resourceType: 'Test',
        resourceId: '1',
        severity: 'HIGH',
      } as AuditEventPayload & { severity: string };

      const mockObservable: MockObservable = {
        pipe: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      } as unknown as MockObservable;
      clientProxy.emit.mockReturnValue(mockObservable);

      await producer.emitAuditEvent(highPayload);

      expect(clientProxy.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          action: 'TEST_ACTION',
          resourceType: 'Test',
          resourceId: '1',
          severity: 'HIGH',
          timestamp: expect.any(Date),
          eventId: expect.any(String),
        }),
      );
    });
  });
});
