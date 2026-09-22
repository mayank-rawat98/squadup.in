import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type Request as ExpressRequest } from 'express';
import { AdminSecurityService } from '../../admin-security/admin-security.service';
import { UpdateRateLimitConfigDto } from '../../admin-security/dto/rate-limit-config.dto';
import {
  ManualBlockIpDto,
  UpdateBlockDurationDto,
} from '../../admin-security/dto/ip-block.dto';
import {
  BulkWhitelistDto,
  WhitelistIpDto,
} from '../../admin-security/dto/ip-whitelist.dto';
import { IpParam } from '../../admin-security/dto/ip-param.dto';
import { StaffGuard } from '../../staff/guards/staff.guard';
import { UserRateLimit } from '../../decorators/throttler.decorator';

/**
 * Admin-ops Security: rate-limit config, IP hard-blocks and the IP whitelist.
 * The ops app authenticates with a staff token, so authorization is the staff
 * realm's `StaffGuard`. Domain logic is reused from {@link AdminSecurityService}.
 */
@Controller({ version: '1', path: 'admin-ops/security' })
@ApiTags('admin-ops')
@UseGuards(StaffGuard)
@UserRateLimit()
export class AdminOpsSecurityController {
  constructor(private readonly service: AdminSecurityService) {}

  /* ---------- Rate-limit config ---------- */

  @Get('rate-limit-config')
  async getRateLimitConfig() {
    const config = await this.service.getRateLimitConfig();
    return { success: true, data: config };
  }

  @Patch('rate-limit-config')
  async updateRateLimitConfig(@Body() dto: UpdateRateLimitConfigDto) {
    const config = await this.service.updateRateLimitConfig(dto);
    return { success: true, data: config };
  }

  /* ---------- Hard-blocked IPs ---------- */

  @Get('ip-blocks')
  async getIpBlocks() {
    const blocks = await this.service.getHardBlockedIps();
    return { success: true, data: blocks };
  }

  @Post('ip-block')
  @HttpCode(HttpStatus.CREATED)
  async manualBlockIp(@Body() dto: ManualBlockIpDto) {
    const entry = await this.service.manualBlockIp(
      dto.ip,
      dto.duration,
      dto.reason,
    );
    return { success: true, data: entry };
  }

  @Delete('ip-block/:ip')
  async removeIpBlock(@Param() params: IpParam) {
    await this.service.removeIpBlock(params.ip);
    return { success: true, data: null };
  }

  @Patch('ip-block/:ip')
  async updateBlockDuration(
    @Param() params: IpParam,
    @Body() dto: UpdateBlockDurationDto,
  ) {
    const entry = await this.service.updateBlockDuration(
      params.ip,
      dto.duration,
    );
    if (!entry) {
      throw new NotFoundException(`No active block found for IP ${params.ip}`);
    }
    return { success: true, data: entry };
  }

  /* ---------- IP whitelist ---------- */

  // Returns the caller's IP exactly as the server resolves it (proxy-aware),
  // so the operator can whitelist their own address with one click.
  @Get('my-ip')
  getMyIp(@Req() req: ExpressRequest) {
    return { success: true, data: { ip: req.ip ?? '' } };
  }

  @Get('ip-whitelist')
  async getIpWhitelist() {
    const list = await this.service.getWhitelistedIps();
    return { success: true, data: list };
  }

  @Post('ip-whitelist')
  @HttpCode(HttpStatus.CREATED)
  async addIpWhitelist(@Body() dto: WhitelistIpDto) {
    const entry = await this.service.addIpWhitelist(dto.ip, dto.reason);
    return { success: true, data: entry };
  }

  @Post('ip-whitelist/bulk')
  @HttpCode(HttpStatus.CREATED)
  async bulkAddWhitelist(@Body() dto: BulkWhitelistDto) {
    const result = await this.service.bulkAddWhitelist(dto.ips, dto.reason);
    return { success: true, data: result };
  }

  @Delete('ip-whitelist/:ip')
  async removeIpWhitelist(@Param() params: IpParam) {
    await this.service.removeIpWhitelist(params.ip);
    return { success: true, data: null };
  }
}
