import { Test, TestingModule } from '@nestjs/testing';
import { AuditsService } from './audits.service';
import { AuditProducer } from './producers/audit.producer';
import { AuditRepository } from './repositories/audit.repository';
import { AuditEventPayload } from './interfaces/audit-event.interface';
import { QueryAuditDto } from './dto/query-audit.dto';

describe('AuditsService', () => {
  let service: AuditsService;
  let auditProducer: jest.Mocked<AuditProducer>;
  let auditRepository: jest.Mocked<AuditRepository>;

  beforeEach(async () => {
    const mockAuditProducer = {
      emitAuditEvent: jest.fn(),
      emitAuditEventSync: jest.fn(),
      isHealthy: jest.fn(),
    };

    const mockAuditRepository = {
      find: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditsService,
        { provide: AuditProducer, useValue: mockAuditProducer },
        { provide: AuditRepository, useValue: mockAuditRepository },
      ],
    }).compile();

    service = module.get<AuditsService>(AuditsService);
    auditProducer = module.get(AuditProducer);
    auditRepository = module.get(AuditRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should call emitAuditEvent on producer', async () => {
      const payload = {
        action: 'TEST_ACTION',
        resourceType: 'Test',
        resourceId: '123',
      } as AuditEventPayload;

      await service.log(payload);

      expect(auditProducer.emitAuditEvent).toHaveBeenCalledWith(payload);
    });
  });

  describe('logSync', () => {
    it('should call emitAuditEventSync on producer', async () => {
      const payload = {
        action: 'TEST_ACTION',
        resourceType: 'Test',
        resourceId: '123',
      } as AuditEventPayload;

      auditProducer.emitAuditEventSync.mockResolvedValue(true);

      const result = await service.logSync(payload);

      expect(auditProducer.emitAuditEventSync).toHaveBeenCalledWith(payload);
      expect(result).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should call find on repository', async () => {
      const filters = new QueryAuditDto();
      const page = 1;
      const limit = 10;
      const expectedResult = {
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };

      auditRepository.find.mockResolvedValue(expectedResult as any);

      const result = await service.findAll(filters, page, limit);

      expect(auditRepository.find).toHaveBeenCalledWith(filters, page, limit);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('logUserAction', () => {
    it('should construct payload and call log', async () => {
      const userId = 'user-123';
      const action = 'USER_LOGIN';
      const resourceType = 'User';
      const resourceId = 'user-123';
      const metadata = { ipAddress: '127.0.0.1' };

      const spyLog = jest.spyOn(service, 'log').mockResolvedValue(undefined);

      await service.logUserAction(
        userId,
        action,
        resourceType,
        resourceId,
        metadata,
      );

      expect(spyLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action,
          resourceType,
          resourceId,
          ...metadata,
        }),
      );
    });
  });
});
