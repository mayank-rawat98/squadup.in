import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRateLimit } from '../../decorators/throttler.decorator';
import { UpdateFeatureFlagDto } from '../../feature-flags/dto/update-feature-flag.dto';
import { UpsertFeatureFlagUserAccessDto } from '../../feature-flags/dto/upsert-feature-flag-user-access.dto';
import { FeatureFlagsService } from '../../feature-flags/services/feature-flags.service';
import { StaffGuard } from '../../staff/guards/staff.guard';
import { AdminOpsFeatureFlagsService } from './admin-ops-feature-flags.service';

/**
 * Admin-ops Feature Flags: flip a flag's kill switch or rollout, and grant or
 * deny it to one user, or drop that decision. Flags themselves are declared
 * in code and seeded, so there is no create route. Domain logic is reused
 * from {@link FeatureFlagsService}; responses name the people each decision
 * is about.
 */
@Controller({ version: '1', path: 'admin-ops/feature-flags' })
@ApiTags('admin-ops')
@UseGuards(StaffGuard)
@UserRateLimit()
export class AdminOpsFeatureFlagsController {
  constructor(
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly adminFeatureFlags: AdminOpsFeatureFlagsService,
  ) {}

  @Get()
  async listFeatureFlags() {
    return {
      success: true,
      data: await this.adminFeatureFlags.list(),
      message: 'Feature flags fetched successfully',
    };
  }

  @Get(':key')
  async getFeatureFlag(@Param('key') key: string) {
    return {
      success: true,
      data: await this.adminFeatureFlags.get(key),
      message: 'Feature flag fetched successfully',
    };
  }

  @Patch(':key')
  async updateFeatureFlag(
    @Param('key') key: string,
    @Body() dto: UpdateFeatureFlagDto,
  ) {
    return {
      success: true,
      data: await this.adminFeatureFlags.update(key, dto),
      message: 'Feature flag updated successfully',
    };
  }

  @Delete(':key')
  async deleteFeatureFlag(@Param('key') key: string) {
    return {
      success: true,
      data: await this.featureFlagsService.deleteFeatureFlag(key),
      message: 'Feature flag deleted successfully',
    };
  }

  @Put(':key/users/:userId')
  async upsertUserAccess(
    @Param('key') key: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpsertFeatureFlagUserAccessDto,
  ) {
    return {
      success: true,
      data: await this.adminFeatureFlags.setUserAccess(
        key,
        userId,
        dto.enabled,
      ),
      message: 'Feature flag user access updated successfully',
    };
  }

  /** Removes a grant or deny, so the flag's rollout decides for this person again. */
  @Delete(':key/users/:userId')
  async removeUserAccess(
    @Param('key') key: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return {
      success: true,
      data: await this.adminFeatureFlags.removeUserAccess(key, userId),
      message: 'Feature flag user access removed successfully',
    };
  }
}
