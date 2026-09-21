import { ConflictException, NotFoundException } from '@nestjs/common';
import { FeatureRequestStatus } from '../feature-flags.constants';
import { FeatureRequestsService } from './feature-requests.service';

describe('FeatureRequestsService.requestAccess', () => {
  const experimentalFlag = {
    id: 'flag-1',
    key: 'ARENA_BETA',
    name: 'Arena beta',
    enabled: true,
    isExperimental: true,
    rolloutToAll: false,
    userAccesses: [],
  };

  const setup = (hasAccess: boolean) => {
    const repo = {
      findFlagByKey: jest.fn().mockResolvedValue(experimentalFlag),
      findUserAccess: jest.fn().mockResolvedValue(null),
      createUserAccess: jest.fn((value) => value),
      saveUserAccess: jest.fn(async (value) => ({ id: 'access-1', ...value })),
    };
    const featureFlags = {
      hasFeatureAccess: jest.fn().mockResolvedValue(hasAccess),
    };
    const service = new FeatureRequestsService(
      repo as never,
      {} as never,
      {} as never,
      featureFlags as never,
    );
    return { repo, service };
  };

  it('opens a pending request for a user without access', async () => {
    const { repo, service } = setup(false);

    const saved = await service.requestAccess('user-1', 'ARENA_BETA', 'pls');

    expect(saved).toMatchObject({
      userId: 'user-1',
      enabled: false,
      status: FeatureRequestStatus.PENDING,
      requestMessage: 'pls',
    });
    expect(repo.saveUserAccess).toHaveBeenCalled();
  });

  it('refuses when the user already has access through the rollout', async () => {
    const { repo, service } = setup(true);

    await expect(
      service.requestAccess('user-1', 'ARENA_BETA'),
    ).rejects.toThrow(ConflictException);
    expect(repo.saveUserAccess).not.toHaveBeenCalled();
  });

  it('refuses a second request while one is pending', async () => {
    const { repo, service } = setup(false);
    repo.findUserAccess.mockResolvedValue({
      id: 'access-1',
      status: FeatureRequestStatus.PENDING,
      enabled: false,
    });

    await expect(
      service.requestAccess('user-1', 'ARENA_BETA'),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects a flag that is not experimental', async () => {
    const { repo, service } = setup(false);
    repo.findFlagByKey.mockResolvedValue({
      ...experimentalFlag,
      isExperimental: false,
    });

    await expect(
      service.requestAccess('user-1', 'ARENA_BETA'),
    ).rejects.toThrow(NotFoundException);
  });
});
