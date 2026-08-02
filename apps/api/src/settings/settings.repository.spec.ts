import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSettings } from './entities/user-settings.entity';
import { SettingsRepository } from './settings.repository';

const USER_ID = 'user-uuid';

/** Returns a jest-mocked TypeORM QueryBuilder chain. */
function buildQueryBuilderMock(getOneResult: UserSettings | null) {
  const qb = {
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
    getOne: jest.fn().mockResolvedValue(getOneResult),
  };
  return qb;
}

describe('SettingsRepository', () => {
  let settingsRepo: SettingsRepository;
  let typeormRepo: jest.Mocked<Repository<UserSettings>>;

  beforeEach(async () => {
    typeormRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      merge: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserSettings>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsRepository,
        {
          provide: getRepositoryToken(UserSettings),
          useValue: typeormRepo,
        },
      ],
    }).compile();

    settingsRepo = module.get<SettingsRepository>(SettingsRepository);
  });

  it('should be defined', () => {
    expect(settingsRepo).toBeDefined();
  });

  // ── findByUserId ────────────────────────────────────────────────────────────

  describe('findByUserId', () => {
    it('should return settings when found', async () => {
      const settings = { userId: USER_ID } as UserSettings;
      typeormRepo.findOne.mockResolvedValue(settings);

      const result = await settingsRepo.findByUserId(USER_ID);

      expect(typeormRepo.findOne).toHaveBeenCalledWith({
        where: { userId: USER_ID },
      });
      expect(result).toBe(settings);
    });

    it('should return null when settings not found', async () => {
      typeormRepo.findOne.mockResolvedValue(null);

      const result = await settingsRepo.findByUserId(USER_ID);

      expect(result).toBeNull();
    });
  });

  // ── findByUserIdWithSecrets ─────────────────────────────────────────────────

  describe('findByUserIdWithSecrets', () => {
    it('should query with addSelect for secret and backupCodes', async () => {
      const settings = { userId: USER_ID } as UserSettings;
      const qb = buildQueryBuilderMock(settings);
      typeormRepo.createQueryBuilder.mockReturnValue(qb as any);

      const result = await settingsRepo.findByUserIdWithSecrets(USER_ID);

      expect(typeormRepo.createQueryBuilder).toHaveBeenCalledWith('s');
      expect(qb.addSelect).toHaveBeenCalledWith(
        's.twoFactor.authenticator.secret',
      );
      expect(qb.addSelect).toHaveBeenCalledWith(
        's.twoFactor.authenticator.backupCodes',
      );
      expect(qb.where).toHaveBeenCalledWith('s.userId = :userId', {
        userId: USER_ID,
      });
      expect(result).toBe(settings);
    });

    it('should return null when user has no settings', async () => {
      const qb = buildQueryBuilderMock(null);
      typeormRepo.createQueryBuilder.mockReturnValue(qb as any);

      const result = await settingsRepo.findByUserIdWithSecrets(USER_ID);

      expect(result).toBeNull();
    });
  });

  // ── upsert ──────────────────────────────────────────────────────────────────

  describe('upsert', () => {
    it('should create and save a new settings row when none exists', async () => {
      const partial = {
        twoFactor: { authenticator: { enabled: false } },
      } as any;
      const created = { userId: USER_ID, ...partial } as UserSettings;
      const saved = { ...created } as UserSettings;

      typeormRepo.findOne.mockResolvedValue(null);
      typeormRepo.create.mockReturnValue(created);
      typeormRepo.save.mockResolvedValue(saved);

      const result = await settingsRepo.upsert(USER_ID, partial);

      expect(typeormRepo.findOne).toHaveBeenCalledWith({
        where: { userId: USER_ID },
      });
      expect(typeormRepo.create).toHaveBeenCalledWith({
        userId: USER_ID,
        ...partial,
      });
      expect(typeormRepo.save).toHaveBeenCalledWith(created);
      expect(result).toBe(saved);
    });

    it('should merge and save an existing settings row', async () => {
      const existing = { userId: USER_ID } as UserSettings;
      const partial = {
        twoFactor: { authenticator: { enabled: true } },
      } as any;
      const saved = { ...existing, ...partial } as UserSettings;

      typeormRepo.findOne.mockResolvedValue(existing);
      typeormRepo.merge.mockReturnValue(existing);
      typeormRepo.save.mockResolvedValue(saved);

      const result = await settingsRepo.upsert(USER_ID, partial);

      expect(typeormRepo.merge).toHaveBeenCalledWith(existing, partial);
      expect(typeormRepo.save).toHaveBeenCalledWith(existing);
      expect(result).toBe(saved);
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should call repo.update with userId filter and partial data', async () => {
      const partial = { twoFactor: { email: { enabled: true } } } as any;
      typeormRepo.update.mockResolvedValue({ affected: 1 } as any);

      await settingsRepo.update(USER_ID, partial);

      expect(typeormRepo.update).toHaveBeenCalledWith(
        { userId: USER_ID },
        partial,
      );
    });
  });

  // ── saveBackupCodes ─────────────────────────────────────────────────────────

  describe('saveBackupCodes', () => {
    it('should execute a query builder update with hashed backup codes', async () => {
      const hashedCodes = ['hashed1', 'hashed2'];
      const qb = buildQueryBuilderMock(null);
      typeormRepo.createQueryBuilder.mockReturnValue(qb as any);

      await settingsRepo.saveBackupCodes(USER_ID, hashedCodes);

      expect(typeormRepo.createQueryBuilder).toHaveBeenCalled();
      expect(qb.update).toHaveBeenCalledWith(UserSettings);
      expect(qb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          twoFactor: { authenticator: { backupCodes: hashedCodes } },
        }),
      );
      expect(qb.where).toHaveBeenCalledWith('userId = :userId', {
        userId: USER_ID,
      });
      expect(qb.execute).toHaveBeenCalled();
    });
  });

  // ── getBackupCodes ──────────────────────────────────────────────────────────

  describe('getBackupCodes', () => {
    it('should return backup codes when present', async () => {
      const codes = ['hashed1', 'hashed2'];
      const settings = {
        userId: USER_ID,
        twoFactor: { authenticator: { backupCodes: codes } },
      } as unknown as UserSettings;
      const qb = buildQueryBuilderMock(settings);
      typeormRepo.createQueryBuilder.mockReturnValue(qb as any);

      const result = await settingsRepo.getBackupCodes(USER_ID);

      expect(qb.addSelect).toHaveBeenCalledWith(
        's.twoFactor.authenticator.backupCodes',
      );
      expect(qb.where).toHaveBeenCalledWith('s.userId = :userId', {
        userId: USER_ID,
      });
      expect(result).toEqual(codes);
    });

    it('should return null when settings row does not exist', async () => {
      const qb = buildQueryBuilderMock(null);
      typeormRepo.createQueryBuilder.mockReturnValue(qb as any);

      const result = await settingsRepo.getBackupCodes(USER_ID);

      expect(result).toBeNull();
    });

    it('should return null when backup codes are not set on the row', async () => {
      const settings = {
        userId: USER_ID,
        twoFactor: { authenticator: { backupCodes: null } },
      } as unknown as UserSettings;
      const qb = buildQueryBuilderMock(settings);
      typeormRepo.createQueryBuilder.mockReturnValue(qb as any);

      const result = await settingsRepo.getBackupCodes(USER_ID);

      expect(result).toBeNull();
    });
  });
});
