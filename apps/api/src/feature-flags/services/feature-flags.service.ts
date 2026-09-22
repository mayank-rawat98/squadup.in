import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { UpdateFeatureFlagDto } from '../dto/update-feature-flag.dto';
import { FeatureRequestStatus } from '../feature-flags.constants';
import { FeatureFlagsRepository } from '../repositories/feature-flags.repository';

/** The slice of a flag the access decision needs. */
interface FlagAccessView {
  id: string;
  enabled: boolean;
  rolloutToAll: boolean;
  userAccesses?: Array<{
    userId: string;
    enabled: boolean;
    status: FeatureRequestStatus;
  }>;
}

@Injectable()
export class FeatureFlagsService {
  constructor(
    private readonly featureFlagsRepository: FeatureFlagsRepository,
    private readonly usersService: UsersService,
  ) {}

  async getAvailableFeatures(userId: string) {
    const flags = await this.featureFlagsRepository.listFlags();
    const features: string[] = [];

    for (const flag of flags) {
      if (await this.hasFeatureAccess(userId, flag.key, flag)) {
        features.push(flag.key);
      }
    }

    return { features };
  }

  async getFeatureAccess(userId: string, featureKey: string) {
    const hasAccess = await this.hasFeatureAccess(userId, featureKey);
    return { key: featureKey, hasAccess };
  }

  /**
   * Whether `userId` may use `featureKey`. See {@link FeatureFlag} for the
   * order of precedence. A PENDING request row is not a decision, so it never
   * overrides the rollout — requesting a feature must not take away access the
   * user already had.
   */
  async hasFeatureAccess(
    userId: string,
    featureKey: string,
    existingFlag?: FlagAccessView | null,
  ) {
    const flag =
      existingFlag ??
      (await this.featureFlagsRepository.findFlagByKey(featureKey));
    if (!flag || !flag.enabled) {
      return false;
    }

    const decided = flag.userAccesses?.find(
      (access) =>
        access.userId === userId &&
        access.status !== FeatureRequestStatus.PENDING,
    );
    if (decided) {
      return decided.enabled;
    }

    return flag.rolloutToAll;
  }

  async assertFeatureAccess(userId: string, featureKey: string) {
    const hasAccess = await this.hasFeatureAccess(userId, featureKey);
    if (!hasAccess) {
      throw new ForbiddenException(
        'This experimental feature is not enabled for your account.',
      );
    }
  }

  async getAdminFeatureFlags() {
    return this.featureFlagsRepository.listFlags();
  }

  async updateFeatureFlag(key: string, dto: UpdateFeatureFlagDto) {
    const featureFlag = await this.requireFlag(key);
    Object.assign(featureFlag, dto);
    return this.featureFlagsRepository.saveFlag(featureFlag);
  }

  async deleteFeatureFlag(key: string) {
    const featureFlag = await this.requireFlag(key);
    await this.featureFlagsRepository.deleteFlag(featureFlag.id);
    return { key };
  }

  /**
   * Grant or deny one user directly. An ops override is a decision, so it
   * also settles any pending request the user had open for this flag.
   */
  async upsertUserAccess(key: string, userId: string, enabled: boolean) {
    await this.usersService.getUser(userId);
    const featureFlag = await this.requireFlag(key);
    const existing = await this.featureFlagsRepository.findUserAccess(
      featureFlag.id,
      userId,
    );

    const decision = {
      enabled,
      status: FeatureRequestStatus.APPROVED,
      decidedAt: new Date(),
    };
    const access = existing
      ? Object.assign(existing, decision)
      : this.featureFlagsRepository.createUserAccess({
          featureFlagId: featureFlag.id,
          userId,
          ...decision,
        });

    return this.featureFlagsRepository.saveUserAccess(access);
  }

  private async requireFlag(key: string) {
    const featureFlag = await this.featureFlagsRepository.findFlagByKey(key);
    if (!featureFlag) {
      throw new NotFoundException(`Feature flag "${key}" not found`);
    }
    return featureFlag;
  }
}
