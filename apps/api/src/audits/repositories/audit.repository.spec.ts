import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AuditRepository } from './audit.repository';
import { AuditLog } from '../schema/audit-log.schema';
import * as crypto from 'crypto';

describe('AuditRepository', () => {
  let repository: AuditRepository;
  let model: any;

  beforeEach(async () => {
    const mockModel = {
      create: jest.fn(),
      insertMany: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      updateOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditRepository,
        {
          provide: getModelToken(AuditLog.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    repository = module.get<AuditRepository>(AuditRepository);
    model = module.get(getModelToken(AuditLog.name));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should hash PII fields', async () => {
      const payload = {
        action: 'TEST',
        resourceType: 'Test',
        resourceId: '1',
        userEmail: 'test@example.com',
        emailMetadata: {
          recipientEmail: 'recipient@example.com',
        },
      } as any;

      model.create.mockImplementation((doc: any) => ({
        ...doc,
        auditId: '123',
      }));

      await repository.create(payload);

      expect(model.create).toHaveBeenCalled();
      const calledDoc = model.create.mock.calls[0][0];

      const expectedUserEmailHash = crypto
        .createHash('sha256')
        .update('test@example.com')
        .digest('hex');
      const expectedRecipientEmailHash = crypto
        .createHash('sha256')
        .update('recipient@example.com')
        .digest('hex');

      expect(calledDoc.userEmail).toBe(expectedUserEmailHash);
      expect(calledDoc.emailMetadata.recipientEmail).toBe(
        expectedRecipientEmailHash,
      );
    });
  });

  describe('find', () => {
    it('should hash userEmail in filters', async () => {
      const filters = {
        userEmail: 'test@example.com',
      };

      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      model.find.mockReturnValue(mockFind);
      model.countDocuments.mockResolvedValue(0);

      await repository.find(filters as any);

      const expectedHash = crypto
        .createHash('sha256')
        .update('test@example.com')
        .digest('hex');

      expect(model.find).toHaveBeenCalledWith(
        expect.objectContaining({
          userEmail: expectedHash,
        }),
      );
    });
  });
});
