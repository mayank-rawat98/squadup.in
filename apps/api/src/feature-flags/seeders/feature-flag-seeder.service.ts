import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { FeatureFlagsRepository } from '../repositories/feature-flags.repository';

interface FeatureFlagSeed {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  isExperimental: boolean;
  rolloutToAll: boolean;
}

/**
 * Makes sure every flag the code checks exists in the database. A new flag is
 * added by declaring its key in feature-flags.constants and listing it here.
 *
 * On later boots only the descriptive fields (name, description,
 * isExperimental) are re-synced from code. `enabled` and `rolloutToAll` are
 * operational switches owned by ops, so a deploy never flips them back.
 */
@Injectable()
export class FeatureFlagSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FeatureFlagSeederService.name);
  private readonly flagsToSeed: ReadonlyArray<FeatureFlagSeed> = [];

  constructor(
    private readonly featureFlagsRepository: FeatureFlagsRepository,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    for (const definition of this.flagsToSeed) {
      const existing = await this.featureFlagsRepository.findFlagByKey(
        definition.key,
      );

      if (existing) {
        let shouldSave = false;
        if (existing.name !== definition.name) {
          existing.name = definition.name;
          shouldSave = true;
        }
        if (existing.description !== definition.description) {
          existing.description = definition.description;
          shouldSave = true;
        }
        if (existing.isExperimental !== definition.isExperimental) {
          existing.isExperimental = definition.isExperimental;
          shouldSave = true;
        }
        if (shouldSave) {
          await this.featureFlagsRepository.saveFlag(existing);
          this.logger.log(`Updated feature flag seed: ${definition.key}`);
        }
        continue;
      }

      await this.featureFlagsRepository.saveFlag(
        this.featureFlagsRepository.createFlag(definition),
      );

      this.logger.log(`Seeded feature flag: ${definition.key}`);
    }
  }
}
