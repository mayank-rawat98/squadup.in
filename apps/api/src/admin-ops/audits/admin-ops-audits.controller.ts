import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditsService } from '../../audits/audits.service';
import { AuditProducer } from '../../audits/producers/audit.producer';
import { QueryAuditDto } from '../../audits/dto/query-audit.dto';
import { StaffGuard } from '../../staff/guards/staff.guard';

/**
 * System-wide audit access for the ops dashboard. These routes read every
 * user's activity, so they are staff-only — the customer-facing controller
 * exposes `my-activity` and nothing more.
 */
@Controller({ version: '1', path: 'admin-ops/audits' })
@ApiTags('admin-ops')
@UseGuards(StaffGuard)
export class AdminOpsAuditsController {
  constructor(
    private readonly auditProducer: AuditProducer,
    private readonly auditsService: AuditsService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Check audit system health' })
  async health() {
    const isHealthy = await this.auditProducer.isHealthy();
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      rabbitmq: isHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Query audit logs with filters' })
  async findAll(@Query() query: QueryAuditDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    return await this.auditsService.findAll(query, page, limit);
  }
}
