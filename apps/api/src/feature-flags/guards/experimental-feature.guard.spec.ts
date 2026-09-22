import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequireExperimentalFeature } from '../../decorators/guards.decorator';
import { ExperimentalFeatureGuard } from './experimental-feature.guard';

const ARENA_BETA = 'ARENA_BETA';

class GatedControllerFixture {
  @RequireExperimentalFeature(ARENA_BETA)
  gated() {
    return true;
  }

  ungated() {
    return true;
  }
}

describe('ExperimentalFeatureGuard', () => {
  const createExecutionContext = (
    request: Record<string, unknown>,
    handlerName: 'gated' | 'ungated' = 'gated',
  ) => {
    const controller = new GatedControllerFixture();
    const handler = controller[handlerName];

    return {
      getHandler: () => handler,
      getClass: () => GatedControllerFixture,
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as never;
  };

  it('throws when the request is unauthenticated', async () => {
    const guard = new ExperimentalFeatureGuard(new Reflector(), {
      assertFeatureAccess: jest.fn(),
    } as never);

    await expect(guard.canActivate(createExecutionContext({}))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('checks access to the flag named on the route', async () => {
    const assertFeatureAccess = jest.fn().mockResolvedValue(undefined);
    const guard = new ExperimentalFeatureGuard(new Reflector(), {
      assertFeatureAccess,
    } as never);

    await expect(
      guard.canActivate(createExecutionContext({ auth: { userId: 'user-1' } })),
    ).resolves.toBe(true);

    expect(assertFeatureAccess).toHaveBeenCalledWith('user-1', ARENA_BETA);
  });

  it('lets routes without a flag through untouched', async () => {
    const assertFeatureAccess = jest.fn();
    const guard = new ExperimentalFeatureGuard(new Reflector(), {
      assertFeatureAccess,
    } as never);

    await expect(
      guard.canActivate(createExecutionContext({}, 'ungated')),
    ).resolves.toBe(true);
    expect(assertFeatureAccess).not.toHaveBeenCalled();
  });
});
