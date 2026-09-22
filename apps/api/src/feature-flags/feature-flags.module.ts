import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureFlagsController } from './controllers/feature-flags.controller';
import { FeatureFlagUserAccess } from './entities/feature-flag-user-access.entity';
import { FeatureFlag } from './entities/feature-flag.entity';
import { ExperimentalFeatureGuard } from './guards/experimental-feature.guard';
import { FeatureFlagsRepository } from './repositories/feature-flags.repository';
import { FeatureFlagSeederService } from './seeders/feature-flag-seeder.service';
import { FeatureFlagsService } from './services/feature-flags.service';
import { FeatureRequestNotificationsService } from './services/feature-request-notifications.service';
import { FeatureRequestsService } from './services/feature-requests.service';

/**
 * Feature flags and experimental-feature access requests. Only the user-facing
 * routes live here; flag and request administration is exposed to the ops
 * dashboard by the staff-guarded admin-ops controllers, which reuse these
 * services. @Global so any module can gate a route with ExperimentalFeatureGuard.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([FeatureFlag, FeatureFlagUserAccess])],
  controllers: [FeatureFlagsController],
  providers: [
    FeatureFlagsRepository,
    FeatureFlagsService,
    FeatureRequestsService,
    FeatureRequestNotificationsService,
    ExperimentalFeatureGuard,
    FeatureFlagSeederService,
  ],
  exports: [FeatureFlagsService, FeatureRequestsService, ExperimentalFeatureGuard],
})
export class FeatureFlagsModule {}
