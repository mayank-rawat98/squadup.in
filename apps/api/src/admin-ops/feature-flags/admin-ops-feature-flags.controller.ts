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

/**
 * Admin-ops Feature Flags: flip a flag's kill switch or rollout, and grant or
 * deny it to one user. Flags themselves are declared in code and seeded, so
 * there is no create route. Domain logic is reused from
 * {@link FeatureFlagsService}.
 */
@Controller({ version: '1', path: 'admin-ops/feature-flags' })
@ApiTags('admin-ops')
@UseGuards(StaffGuard)
@UserRateLimit()
export class AdminOpsFeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  async listFeatureFlags() {
    return {
      success: true,
      data: await this.featureFlagsService.getAdminFeatureFlags(),
      message: 'Feature flags fetched successfully',
    };
  }

  @Patch(':key')
  async updateFeatureFlag(
    @Param('key') key: string,
    @Body() dto: UpdateFeatureFlagDto,
  ) {
    return {
      success: true,
      data: await this.featureFlagsService.updateFeatureFlag(key, dto),
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
      data: await this.featureFlagsService.upsertUserAccess(
        key,
        userId,
        dto.enabled,
      ),
      message: 'Feature flag user access updated successfully',
    };
  }
}
