import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StaffAuth } from './decorators/staff.decorator';
import { StaffGuard } from './guards/staff.guard';
import { StaffLoginDto, StaffRefreshDto } from './dto/staff-login.dto';
import { StaffAuthService } from './services/staff-auth.service';

/**
 * Staff sign-in. `login` and `refresh` are excluded from StaffAuthMiddleware in
 * AppModule — they are what mint the token in the first place — so they must
 * not carry StaffGuard either. Everything else here requires an active session.
 */
@Controller({ version: '1', path: 'staff/auth' })
@ApiTags('staff')
export class StaffAuthController {
  constructor(private readonly staffAuthService: StaffAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: StaffLoginDto) {
    const session = await this.staffAuthService.login(dto.email, dto.password);
    return {
      success: true,
      data: {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        deviceId: session.deviceId,
        staff: session.staff.toJSON(),
      },
      message: 'Logged in successfully',
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: StaffRefreshDto) {
    const session = await this.staffAuthService.refresh(dto.refreshToken);
    return {
      success: true,
      data: {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        deviceId: session.deviceId,
      },
      message: 'Session refreshed successfully',
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(StaffGuard)
  async logout(
    @StaffAuth() auth: { staffId: string; deviceId: string },
  ) {
    await this.staffAuthService.logout(auth.staffId, auth.deviceId);
    return { success: true, message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(StaffGuard)
  async logoutAll(@StaffAuth() auth: { staffId: string }) {
    await this.staffAuthService.logoutAll(auth.staffId);
    return { success: true, message: 'Logged out from all devices' };
  }
}
