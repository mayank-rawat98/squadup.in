import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditsService } from './audits.service';
import { QueryAuditDto } from './dto/query-audit.dto';
import { PermissionsGuard } from '../common/guards/auth.guard';
import type { Request as ExpressRequest } from 'express';

/**
 * Customer-facing audit access: a user may read their own activity and nothing
 * else. System-wide audit querying is an ops capability and lives in the staff
 * realm (AdminOpsAuditsController).
 */
@Controller({
  version: '1',
  path: 'audits',
})
@ApiTags('audits')
@UseGuards(PermissionsGuard)
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Get('my-activity')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user audit activity' })
  async getMyActivity(
    @Request() req: ExpressRequest,
    @Query() query: QueryAuditDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    // userId is forced from the token — a caller cannot query another user by
    // passing userId in the query string.
    return await this.auditsService.findAll(
      { ...query, userId: req.auth?.userId },
      page,
      limit,
    );
  }
}
