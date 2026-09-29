import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  PublicRateLimit,
  UserRateLimit,
} from '../decorators/throttler.decorator';
import { STAFF_REFRESH_COOKIE } from './constants/staff.constants';
import { StaffAuth } from './decorators/staff.decorator';
import { StaffLoginDto } from './dto/staff-login.dto';
import { StaffGuard } from './guards/staff.guard';
import { StaffAuthService } from './services/staff-auth.service';
import {
  clearStaffRefreshCookie,
  setStaffRefreshCookie,
} from './utils/staff-cookie.util';

/**
 * Staff sign-in. `login` and `refresh` are excluded from StaffAuthMiddleware in
 * AppModule — they are what mint the token in the first place — so they must
 * not carry StaffGuard either. Everything else here requires an active session.
 *
 * The refresh token is set as an HttpOnly cookie and never appears in a body;
 * the ops console holds only the short-lived access token.
 */
@Controller({ version: '1', path: 'staff/auth' })
@ApiTags('staff')
export class StaffAuthController {
  constructor(private readonly staffAuthService: StaffAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @PublicRateLimit()
  async login(
    @Body() dto: StaffLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.staffAuthService.login(dto.email, dto.password);
    setStaffRefreshCookie(res, session.refreshToken, session.refreshExpiresIn);
    return {
      success: true,
      data: {
        accessToken: session.accessToken,
        deviceId: session.deviceId,
        expiresIn: session.expiresIn,
        staff: session.staff.toJSON(),
      },
      message: 'Logged in successfully',
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UserRateLimit()
  @ApiCookieAuth(STAFF_REFRESH_COOKIE)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken: unknown = req.cookies?.[STAFF_REFRESH_COOKIE];
    if (typeof refreshToken !== 'string' || !refreshToken) {
      throw new UnauthorizedException(
        'Your session has ended. Please sign in again.',
      );
    }

    // A refused token leaves the cookie alone: when two tabs race, the loser's
    // failure must not wipe the cookie the winner was just given.
    const session = await this.staffAuthService.refresh(refreshToken);
    setStaffRefreshCookie(res, session.refreshToken, session.refreshExpiresIn);
    return {
      success: true,
      data: {
        accessToken: session.accessToken,
        deviceId: session.deviceId,
        expiresIn: session.expiresIn,
      },
      message: 'Session refreshed successfully',
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(StaffGuard)
  async logout(
    @StaffAuth() auth: { staffId: string; deviceId: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.staffAuthService.logout(auth.staffId, auth.deviceId);
    clearStaffRefreshCookie(res);
    return { success: true, message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(StaffGuard)
  async logoutAll(
    @StaffAuth() auth: { staffId: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.staffAuthService.logoutAll(auth.staffId);
    clearStaffRefreshCookie(res);
    return { success: true, message: 'Logged out from all devices' };
  }
}
