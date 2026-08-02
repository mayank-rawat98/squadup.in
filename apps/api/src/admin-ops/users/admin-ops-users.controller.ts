import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRateLimit } from '../../decorators/throttler.decorator';
import { StaffGuard } from '../../staff/guards/staff.guard';
import { ListUsersDto } from '../dto/list-users.dto';
import { SuspendUserDto } from '../dto/suspend-user.dto';
import { AdminOpsUsersService } from './admin-ops-users.service';

/**
 * Admin-ops Users tab. Every ops-dashboard user-administration call routes
 * through here; the ops app authenticates with a staff token, not a user
 * `role==='admin'` token, so authorization is the staff realm's `StaffGuard`.
 *
 * NOTE: the static `stats` segment is declared before the `:id` route so Nest
 * matches it ahead of the param route.
 */
@Controller({ version: '1', path: 'admin-ops/users' })
@ApiTags('admin-ops')
@UseGuards(StaffGuard)
@UserRateLimit()
export class AdminOpsUsersController {
  constructor(private readonly adminOpsUsersService: AdminOpsUsersService) {}

  @Get()
  async listUsers(@Query() query: ListUsersDto) {
    return {
      success: true,
      data: await this.adminOpsUsersService.listUsers(query),
      message: 'Users fetched successfully',
    };
  }

  @Get('stats')
  async getStats() {
    return {
      success: true,
      data: await this.adminOpsUsersService.getStats(),
      message: 'User stats fetched successfully',
    };
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return {
      success: true,
      data: await this.adminOpsUsersService.getUserDetail(id),
      message: 'User fetched successfully',
    };
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivateUser(@Param('id') id: string) {
    return {
      success: true,
      data: await this.adminOpsUsersService.deactivateUser(id),
      message: 'User deactivated successfully',
    };
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendUser(@Param('id') id: string, @Body() dto: SuspendUserDto) {
    return {
      success: true,
      data: await this.adminOpsUsersService.suspendUser(id, dto.reason),
      message: 'User suspended successfully',
    };
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivateUser(@Param('id') id: string) {
    return {
      success: true,
      data: await this.adminOpsUsersService.reactivateUser(id),
      message: 'User reactivated successfully',
    };
  }
}
