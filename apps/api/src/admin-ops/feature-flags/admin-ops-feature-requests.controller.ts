import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRateLimit } from '../../decorators/throttler.decorator';
import { ListFeatureRequestsDto } from '../../feature-flags/dto/list-feature-requests.dto';
import { RejectFeatureRequestDto } from '../../feature-flags/dto/reject-feature-request.dto';
import { FeatureRequestsService } from '../../feature-flags/services/feature-requests.service';
import { StaffGuard } from '../../staff/guards/staff.guard';

/**
 * Admin-ops Feature Requests: the review queue for users asking into an
 * experimental feature. `pending-count` drives the dashboard badge, which is how
 * ops learns a request is waiting.
 *
 * NOTE: the static `pending-count` segment is declared before the `:id` routes.
 */
@Controller({ version: '1', path: 'admin-ops/feature-requests' })
@ApiTags('admin-ops')
@UseGuards(StaffGuard)
@UserRateLimit()
export class AdminOpsFeatureRequestsController {
  constructor(
    private readonly featureRequestsService: FeatureRequestsService,
  ) {}

  @Get()
  async listRequests(@Query() query: ListFeatureRequestsDto) {
    return {
      success: true,
      data: await this.featureRequestsService.listRequests(query),
      message: 'Feature requests fetched successfully',
    };
  }

  @Get('pending-count')
  async pendingCount() {
    return {
      success: true,
      data: { count: await this.featureRequestsService.countPendingRequests() },
      message: 'Pending feature request count fetched successfully',
    };
  }

  @Patch(':id/approve')
  async approve(@Param('id', ParseUUIDPipe) id: string) {
    return {
      success: true,
      data: await this.featureRequestsService.approveRequest(id),
      message: 'Feature request approved successfully',
    };
  }

  @Patch(':id/reject')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectFeatureRequestDto,
  ) {
    return {
      success: true,
      data: await this.featureRequestsService.rejectRequest(id, dto.reason),
      message: 'Feature request rejected successfully',
    };
  }
}
