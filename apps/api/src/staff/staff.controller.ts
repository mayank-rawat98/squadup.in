import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentStaff, StaffAuth } from './decorators/staff.decorator';
import { Staff } from './entities/staff.entity';
import { CreateStaffDto } from './dto/create-staff.dto';
import {
  ChangeStaffPasswordDto,
  UpdateStaffDto,
} from './dto/update-staff.dto';
import { StaffGuard } from './guards/staff.guard';
import { StaffService } from './services/staff.service';

/**
 * Staff directory, managed from the ops dashboard. Single role for now, so any
 * active staff member may administer the others; StaffService still refuses to
 * remove the last account or let someone delete themselves.
 */
@Controller({ version: '1', path: 'staff' })
@ApiTags('staff')
@UseGuards(StaffGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get('me')
  me(@CurrentStaff() staff: Staff) {
    return {
      success: true,
      data: staff.toJSON(),
      message: 'Profile fetched successfully',
    };
  }

  @Get()
  async list() {
    const staff = await this.staffService.list();
    return {
      success: true,
      data: staff.map((s) => s.toJSON()),
      message: 'Staff fetched successfully',
    };
  }

  @Post()
  async create(@Body() dto: CreateStaffDto) {
    const staff = await this.staffService.create(dto);
    return {
      success: true,
      data: staff.toJSON(),
      message: 'Staff member created successfully',
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    const staff = await this.staffService.update(id, dto);
    return {
      success: true,
      data: staff.toJSON(),
      message: 'Staff member updated successfully',
    };
  }

  @Patch(':id/password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Param('id') id: string,
    @Body() dto: ChangeStaffPasswordDto,
  ) {
    await this.staffService.changePassword(id, dto.password);
    return { success: true, message: 'Password updated successfully' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
    @StaffAuth() auth: { staffId: string },
  ) {
    await this.staffService.remove(id, auth.staffId);
    return { success: true, message: 'Staff member removed successfully' };
  }
}
