import { FeatureRequestStatus } from '../../feature-flags/feature-flags.constants';
import type { FeatureFlag } from '../../feature-flags/entities/feature-flag.entity';
import { type FlagUser, presentFeatureFlag } from './feature-flag.presenter';

const updatedAt = new Date('2026-10-04T10:00:00Z');

const flag = (overrides: Partial<FeatureFlag> = {}) =>
  ({
    id: 'flag-1',
    key: 'reactSandbox',
    name: 'React sandbox',
    description: null,
    enabled: true,
    isExperimental: true,
    rolloutToAll: false,
    userAccesses: [],
    createdAt: updatedAt,
    updatedAt,
    ...overrides,
  }) as FeatureFlag;

const access = (
  userId: string,
  enabled: boolean,
  status: FeatureRequestStatus,
  decidedAt: Date | null,
) => ({ userId, enabled, status, decidedAt }) as never;

const users = new Map<string, FlagUser>([
  [
    'u1',
    {
      id: 'u1',
      email: 'diya@example.com',
      fullName: 'Diya Shah',
      username: 'diya',
    },
  ],
]);

describe('presentFeatureFlag', () => {
  it.each([
    [{ enabled: false, rolloutToAll: true }, 'off'],
    [{ enabled: true, rolloutToAll: true }, 'everyone'],
    [{ enabled: true, rolloutToAll: false }, 'selected'],
  ] as const)('reads %o as %s', (overrides, audience) => {
    expect(presentFeatureFlag(flag(overrides), users).audience).toBe(audience);
  });

  it('lists decided people newest first, named, and counts pending requests', () => {
    const view = presentFeatureFlag(
      flag({
        userAccesses: [
          access(
            'u2',
            false,
            FeatureRequestStatus.REJECTED,
            new Date('2026-10-01'),
          ),
          access(
            'u1',
            true,
            FeatureRequestStatus.APPROVED,
            new Date('2026-10-03'),
          ),
          access('u3', false, FeatureRequestStatus.PENDING, null),
        ],
      }),
      users,
    );

    expect(view.users).toEqual([
      {
        userId: 'u1',
        name: 'Diya Shah',
        email: 'diya@example.com',
        username: 'diya',
        enabled: true,
        decidedAt: new Date('2026-10-03'),
      },
      {
        userId: 'u2',
        name: null,
        email: null,
        username: null,
        enabled: false,
        decidedAt: new Date('2026-10-01'),
      },
    ]);
    expect(view.pendingRequests).toBe(1);
  });

  it('leaves out the row ids', () => {
    const view = presentFeatureFlag(flag(), users);

    expect(view).not.toHaveProperty('id');
    expect(view).not.toHaveProperty('userAccesses');
  });
});
