import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { PermissionsGuard } from '../../common/guards/auth.guard';
import { UserRateLimit } from '../../decorators/throttler.decorator';
import { RequestFeatureAccessDto } from '../dto/request-feature-access.dto';
import { FeatureFlagsService } from '../services/feature-flags.service';
import { FeatureRequestsService } from '../services/feature-requests.service';

@Controller({ version: '1', path: 'feature-flags' })
@UseGuards(PermissionsGuard)
@UserRateLimit()
export class FeatureFlagsController {
  constructor(
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly featureRequestsService: FeatureRequestsService,
  ) {}

  @Get('experimental')
  async listExperimental(@Req() req: Request) {
    return {
      success: true,
      data: await this.featureRequestsService.listExperimentalForUser(
        req.auth.userId,
      ),
      message: 'Experimental features fetched successfully',
    };
  }

  @Post(':key/request')
  async requestAccess(
    @Req() req: Request,
    @Param('key') key: string,
    @Body() dto: RequestFeatureAccessDto,
  ) {
    return {
      success: true,
      data: await this.featureRequestsService.requestAccess(
        req.auth.userId,
        key,
        dto.message,
      ),
      message: 'Feature access requested successfully',
    };
  }

  @Delete(':key/request')
  async withdrawRequest(@Req() req: Request, @Param('key') key: string) {
    await this.featureRequestsService.withdrawRequest(req.auth.userId, key);
    return {
      success: true,
      data: null,
      message: 'Feature access request withdrawn successfully',
    };
  }

  @Get('available')
  async getAvailableFeatures(@Req() req: Request) {
    return {
      success: true,
      data: await this.featureFlagsService.getAvailableFeatures(
        req.auth.userId,
      ),
      message: 'Available feature flags fetched successfully',
    };
  }

  @Get(':key/access')
  async getFeatureAccess(@Req() req: Request, @Param('key') key: string) {
    return {
      success: true,
      data: await this.featureFlagsService.getFeatureAccess(
        req.auth.userId,
        key,
      ),
      message: 'Feature flag access fetched successfully',
    };
  }
}
