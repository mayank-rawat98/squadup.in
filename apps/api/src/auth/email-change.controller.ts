import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { PermissionsGuard } from '../common/guards/auth.guard';
import { Public } from '../decorators/guards.decorator';
import { SensitiveRateLimit } from '../decorators/throttler.decorator';
import { EmailChangeService } from './services/email-change.service';
import {
  ConfirmEmailChangeDto,
  RequestEmailChangeDto,
} from './dto/email-change.dto';

@ApiTags('auth/email-change')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'auth/email-change', version: '1' })
@UseGuards(PermissionsGuard)
export class EmailChangeController {
  constructor(private readonly service: EmailChangeService) {}

  @Get('pending')
  async pending(@Request() req: ExpressRequest) {
    const data = await this.service.getPending(req.auth.userId);
    return { success: true, data };
  }

  @Delete('pending')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(@Request() req: ExpressRequest) {
    await this.service.cancelPending(req.auth.userId);
  }

  /** OAuth users (no password): get an OTP on the CURRENT email. */
  @Post('preauth')
  @SensitiveRateLimit()
  @HttpCode(HttpStatus.OK)
  async preauth(@Request() req: ExpressRequest) {
    await this.service.sendPreauthOtp(req.auth.userId);
    return { success: true, message: 'OTP sent to your current email' };
  }

  @Post('request')
  @SensitiveRateLimit()
  @HttpCode(HttpStatus.OK)
  async request(
    @Request() req: ExpressRequest,
    @Body() dto: RequestEmailChangeDto,
  ) {
    const ip = (req.ip || '').toString();
    const ua = req.headers['user-agent'] ?? '';
    const data = await this.service.request(req.auth.userId, ip, ua, dto);
    return {
      success: true,
      data,
      message: `OTP sent to ${dto.newEmail}. Enter it within 10 minutes to confirm.`,
    };
  }

  @Post('confirm')
  @SensitiveRateLimit()
  @HttpCode(HttpStatus.OK)
  async confirm(
    @Request() req: ExpressRequest,
    @Body() dto: ConfirmEmailChangeDto,
  ) {
    const ip = (req.ip || '').toString();
    const ua = req.headers['user-agent'] ?? '';
    const data = await this.service.confirm(
      req.auth.userId,
      ip,
      ua,
      req.auth.deviceId,
      dto.otp,
    );
    return { success: true, data, message: 'Email updated successfully' };
  }

  /** Public — invoked from the link in the change-notification email. */
  @Public()
  @SensitiveRateLimit()
  @Post('revert/:token')
  @HttpCode(HttpStatus.OK)
  async revert(@Param('token') token: string, @Request() req: ExpressRequest) {
    const ip = (req.ip || '').toString();
    const ua = req.headers['user-agent'] ?? '';
    const data = await this.service.revert(token, ip, ua);
    return { success: true, data, message: 'Email change has been reverted' };
  }
}
