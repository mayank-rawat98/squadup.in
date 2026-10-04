import { Injectable } from '@nestjs/common';
import type { UpdateFeatureFlagDto } from '../../feature-flags/dto/update-feature-flag.dto';
import type { FeatureFlag } from '../../feature-flags/entities/feature-flag.entity';
import { FeatureFlagsService } from '../../feature-flags/services/feature-flags.service';
import { UsersService } from '../../users/users.service';
import {
  type FeatureFlagView,
  type FlagUser,
  presentFeatureFlag,
} from './feature-flag.presenter';

/**
 * The ops console's view of feature flags: the domain rules stay in
 * {@link FeatureFlagsService}; this adds who each decision is about.
 */
@Injectable()
export class AdminOpsFeatureFlagsService {
  constructor(
    private readonly featureFlags: FeatureFlagsService,
    private readonly users: UsersService,
  ) {}

  async list(): Promise<FeatureFlagView[]> {
    const flags = await this.featureFlags.getAdminFeatureFlags();
    const users = await this.usersOf(flags);
    return flags.map((flag) => presentFeatureFlag(flag, users));
  }

  async get(key: string): Promise<FeatureFlagView> {
    return this.present(await this.featureFlags.getAdminFeatureFlag(key));
  }

  async update(key: string, dto: UpdateFeatureFlagDto) {
    await this.featureFlags.updateFeatureFlag(key, dto);
    return this.get(key);
  }

  async setUserAccess(key: string, userId: string, enabled: boolean) {
    await this.featureFlags.upsertUserAccess(key, userId, enabled);
    return this.get(key);
  }

  async removeUserAccess(key: string, userId: string) {
    await this.featureFlags.removeUserAccess(key, userId);
    return this.get(key);
  }

  private async present(flag: FeatureFlag) {
    return presentFeatureFlag(flag, await this.usersOf([flag]));
  }

  /** One lookup for every user any of the flags mentions. */
  private async usersOf(
    flags: readonly FeatureFlag[],
  ): Promise<Map<string, FlagUser>> {
    const ids = [
      ...new Set(
        flags.flatMap((flag) =>
          (flag.userAccesses ?? []).map((access) => access.userId),
        ),
      ),
    ];
    if (ids.length === 0) return new Map();
    const users: FlagUser[] = await this.users.findByIds(ids);
    return new Map(users.map((user) => [user.id, user]));
  }
}
