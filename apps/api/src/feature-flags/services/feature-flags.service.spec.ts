import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FeatureRequestStatus } from '../feature-flags.constants';
import { FeatureFlagsService } from './feature-flags.service';

describe('FeatureFlagsService', () => {
  const createFeatureFlagsRepository = () => ({
    listFlags: jest.fn(),
    findFlagByKey: jest.fn(),
    saveFlag: jest.fn(async (value) => value),
    deleteFlag: jest.fn(),
    createUserAccess: jest.fn((value) => value),
    saveUserAccess: jest.fn(async (value) => value),
    findUserAccess: jest.fn(),
  });

  const createUsersService = () => ({
    getUser: jest.fn().mockResolvedValue({ id: 'user-1' }),
  });

  const makeFlag = (overrides: Record<string, unknown> = {}) => ({
    id: 'flag-1',
    key: 'ARENA_BETA',
    enabled: true,
    rolloutToAll: false,
    userAccesses: [],
    ...overrides,
  });

  const makeService = (repository = createFeatureFlagsRepository()) => ({
    repository,
    service: new FeatureFlagsService(
      repository as never,
      createUsersService() as never,
    ),
  });

  describe('hasFeatureAccess', () => {
    it('returns false for an unknown flag', async () => {
      const { repository, service } = makeService();
      repository.findFlagByKey.mockResolvedValue(null);

      await expect(
        service.hasFeatureAccess('user-1', 'MISSING'),
      ).resolves.toBe(false);
    });

    it('returns false when the flag is disabled, even with a grant', async () => {
      const { repository, service } = makeService();
      repository.findFlagByKey.mockResolvedValue(
        makeFlag({
          enabled: false,
          rolloutToAll: true,
          userAccesses: [
            {
              userId: 'user-1',
              enabled: true,
              status: FeatureRequestStatus.APPROVED,
            },
          ],
        }),
      );

      await expect(
        service.hasFeatureAccess('user-1', 'ARENA_BETA'),
      ).resolves.toBe(false);
    });

    it('grants everyone when rolled out to all', async () => {
      const { repository, service } = makeService();
      repository.findFlagByKey.mockResolvedValue(
        makeFlag({ rolloutToAll: true }),
      );

      await expect(
        service.hasFeatureAccess('user-1', 'ARENA_BETA'),
      ).resolves.toBe(true);
    });

    it('denies a user with no grant when not rolled out', async () => {
      const { repository, service } = makeService();
      repository.findFlagByKey.mockResolvedValue(makeFlag());

      await expect(
        service.hasFeatureAccess('user-1', 'ARENA_BETA'),
      ).resolves.toBe(false);
    });

    it('grants a user with an explicit grant when not rolled out', async () => {
      const { repository, service } = makeService();
      repository.findFlagByKey.mockResolvedValue(
        makeFlag({
          userAccesses: [
            {
              userId: 'user-1',
              enabled: true,
              status: FeatureRequestStatus.APPROVED,
            },
          ],
        }),
      );

      await expect(
        service.hasFeatureAccess('user-1', 'ARENA_BETA'),
      ).resolves.toBe(true);
    });

    it('lets an explicit deny override a rollout to all', async () => {
      const { repository, service } = makeService();
      repository.findFlagByKey.mockResolvedValue(
        makeFlag({
          rolloutToAll: true,
          userAccesses: [
            {
              userId: 'user-1',
              enabled: false,
              status: FeatureRequestStatus.REJECTED,
            },
          ],
        }),
      );

      await expect(
        service.hasFeatureAccess('user-1', 'ARENA_BETA'),
      ).resolves.toBe(false);
    });

    it('does not let a pending request take away rolled-out access', async () => {
      const { repository, service } = makeService();
      repository.findFlagByKey.mockResolvedValue(
        makeFlag({
          rolloutToAll: true,
          userAccesses: [
            {
              userId: 'user-1',
              enabled: false,
              status: FeatureRequestStatus.PENDING,
            },
          ],
        }),
      );

      await expect(
        service.hasFeatureAccess('user-1', 'ARENA_BETA'),
      ).resolves.toBe(true);
    });

    it("ignores another user's grant", async () => {
      const { repository, service } = makeService();
      repository.findFlagByKey.mockResolvedValue(
        makeFlag({
          userAccesses: [
            {
              userId: 'user-2',
              enabled: true,
              status: FeatureRequestStatus.APPROVED,
            },
          ],
        }),
      );

      await expect(
        service.hasFeatureAccess('user-1', 'ARENA_BETA'),
      ).resolves.toBe(false);
    });
  });

  it('returns the available features for a user', async () => {
    const { repository, service } = makeService();
    repository.listFlags.mockResolvedValue([
      makeFlag({ key: 'ROLLED_OUT', rolloutToAll: true }),
      makeFlag({ id: 'flag-2', key: 'NOT_ROLLED_OUT' }),
      makeFlag({ id: 'flag-3', key: 'OFF', enabled: false, rolloutToAll: true }),
    ]);

    await expect(service.getAvailableFeatures('user-1')).resolves.toEqual({
      features: ['ROLLED_OUT'],
    });
  });

  it('assertFeatureAccess throws when the user lacks access', async () => {
    const { repository, service } = makeService();
    repository.findFlagByKey.mockResolvedValue(makeFlag());

    await expect(
      service.assertFeatureAccess('user-1', 'ARENA_BETA'),
    ).rejects.toThrow(ForbiddenException);
  });

  describe('upsertUserAccess', () => {
    it('settles a pending request when ops overrides it', async () => {
      const { repository, service } = makeService();
      repository.findFlagByKey.mockResolvedValue(makeFlag());
      const pending = {
        id: 'access-1',
        userId: 'user-1',
        enabled: false,
        status: FeatureRequestStatus.PENDING,
      };
      repository.findUserAccess.mockResolvedValue(pending);

      const saved = await service.upsertUserAccess('ARENA_BETA', 'user-1', true);

      expect(saved).toMatchObject({
        enabled: true,
        status: FeatureRequestStatus.APPROVED,
      });
      expect(saved.decidedAt).toBeInstanceOf(Date);
    });

    it('creates a decided row when none exists', async () => {
      const { repository, service } = makeService();
      repository.findFlagByKey.mockResolvedValue(makeFlag());
      repository.findUserAccess.mockResolvedValue(null);

      await service.upsertUserAccess('ARENA_BETA', 'user-1', false);

      expect(repository.createUserAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          featureFlagId: 'flag-1',
          userId: 'user-1',
          enabled: false,
          status: FeatureRequestStatus.APPROVED,
        }),
      );
    });

    it('throws for an unknown flag', async () => {
      const { repository, service } = makeService();
      repository.findFlagByKey.mockResolvedValue(null);

      await expect(
        service.upsertUserAccess('MISSING', 'user-1', true),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
