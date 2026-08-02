import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { PermissionsGuard } from '../common/guards/auth.guard';
import { UploadFileInterceptor } from '../common/interceptors/upload.interceptor';
import { Public } from '../decorators/guards.decorator';
import {
  EmailRateLimit,
  SensitiveRateLimit,
  UploadRateLimit,
  UserRateLimit,
} from '../decorators/throttler.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { CompletePasswordResetDto } from './dto/complete-password-reset.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ForgotPasswordDocs,
  ResetPasswordDocs,
  SendEmailVerificationLinkDocs,
  SendForgotPasswordEmailDocs,
  UpdateUserDocs,
  VerifyEmailLinkDocs,
} from './swagger/users.swagger';
import { UsersService } from './users.service';

@Controller({
  version: '1',
  path: 'users',
})
@ApiTags('users')
@UseGuards(PermissionsGuard)
@UserRateLimit()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me/avatar')
  @UploadRateLimit()
  @UseInterceptors(UploadFileInterceptor('file'))
  async updateMyAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: ExpressRequest,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const result = await this.usersService.updateAvatar(req.user.id, file);
    return {
      success: true,
      data: result,
      message: 'Avatar updated successfully',
    };
  }

  @Delete('me/avatar')
  async deleteMyAvatar(@Request() req: ExpressRequest) {
    const result = await this.usersService.deleteAvatar(req.user.id);
    return {
      success: true,
      data: result,
      message: 'Avatar removed successfully',
    };
  }

  @Patch()
  @UpdateUserDocs
  async updateUser(
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: ExpressRequest,
  ) {
    return {
      success: true,
      data: await this.usersService.updateUser(req.auth.userId, updateUserDto),
      message: 'User updated successfully',
    };
  }

  @Post('reset-password')
  @SensitiveRateLimit()
  @ResetPasswordDocs
  async resetPassword(
    @Body() body: ResetPasswordDto,
    @Request() req: ExpressRequest,
  ) {
    await this.usersService.resetPassword(
      req.user.email,
      body,
      req.auth?.deviceId,
    );

    return {
      success: true,
      data: null,
      message: 'Password reset successful',
    };
  }

  @Post('password-reset-code')
  @EmailRateLimit()
  async sendPasswordResetCode(@Request() req: ExpressRequest) {
    await this.usersService.sendPasswordResetCode(req.user.id);
    return {
      success: true,
      data: null,
      message: 'A reset code has been sent to your email.',
    };
  }

  @Post('password-reset-code/verify')
  @SensitiveRateLimit()
  async verifyPasswordResetCode(
    @Body() body: VerifyResetCodeDto,
    @Request() req: ExpressRequest,
  ) {
    const ticket = await this.usersService.verifyPasswordResetCode(
      req.user.id,
      body.code,
    );
    return {
      success: true,
      data: { ticket },
      message: 'Reset code verified.',
    };
  }

  @Post('password-reset-code/complete')
  @SensitiveRateLimit()
  async completePasswordReset(
    @Body() body: CompletePasswordResetDto,
    @Request() req: ExpressRequest,
  ) {
    await this.usersService.completePasswordReset(
      req.user.id,
      body.ticket,
      body.newPassword,
      req.auth?.deviceId,
    );
    return {
      success: true,
      data: null,
      message: 'Password reset successful',
    };
  }

  @Post('set-password')
  @SensitiveRateLimit()
  async setPassword(
    @Body() body: SetPasswordDto,
    @Request() req: ExpressRequest,
  ) {
    const result = await this.usersService.setPassword(
      req.user.id,
      body,
      req.auth?.deviceId,
    );
    return {
      success: true,
      data: result,
      message: 'Password set successfully',
    };
  }
  @Public()
  @EmailRateLimit()
  @Post('send-email-link')
  @SendEmailVerificationLinkDocs
  async sendEmailVerificationLink(@Body() body: { email: string }) {
    if (!body.email || typeof body.email !== 'string') {
      throw new BadRequestException('Invalid email');
    }
    await this.usersService.sendEmailVerificationLink(body.email);
    return {
      success: true,
      data: null,
      message:
        'Email will be sent to your inbox. Link will be valid for the next 15 minutes',
    };
  }
  @Public()
  @Post('verify-email-link')
  @VerifyEmailLinkDocs
  async verifyEmailLink(@Body() body: { encodedEmail: string; token: string }) {
    if (
      !body.encodedEmail ||
      typeof body.encodedEmail !== 'string' ||
      !body.token ||
      typeof body.token !== 'string'
    ) {
      throw new BadRequestException('Invalid email');
    }
    await this.usersService.verifyEmailLink(body.encodedEmail, body.token);
    return {
      success: true,
      data: null,
      message: 'Email verified',
    };
  }
  @Public()
  @EmailRateLimit()
  @Post('forgot-password-email')
  @SendForgotPasswordEmailDocs
  async sendForgotPasswordEmail(@Body() body: { email: string }) {
    if (!body.email || typeof body.email !== 'string') {
      throw new BadRequestException('Invalid email');
    }
    await this.usersService.sendForgotPasswordEmail(body.email);
    return {
      success: true,
      data: null,
      message:
        'Email will be sent to your inbox. Link will be valid for the next 15 minutes',
    };
  }
  @Public()
  @SensitiveRateLimit()
  @Post('forgot-password')
  @ForgotPasswordDocs
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.usersService.forgotPassword(forgotPasswordDto);
    return {
      success: true,
      data: null,
      message: 'Password reset successful',
    };
  }
}
