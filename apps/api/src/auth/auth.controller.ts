import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Request,
  Res,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { PermissionsGuard } from '../common/guards/auth.guard';
import { Public } from '../decorators/guards.decorator';
import {
  EmailRateLimit,
  PublicRateLimit,
  SensitiveRateLimit,
  UserRateLimit,
} from '../decorators/throttler.decorator';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { RegisterUserDto } from '../users/dto/register-user.dto';
import { getClientIp } from './common/utils/auth.util';
import { X_APP_ORIGIN_HEADER } from './constants/auth.constants';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import {
  SendMobileOtpDto,
  VerifyMobileOtpDto,
} from './dto/mobile-verification.dto';
import {
  SelectTwoFactorMethodDto,
  VerifyPasskeyLoginDto,
  VerifyTwoFactorDto,
} from './dto/verify-2fa.dto';
import { AuthService } from './services/auth.service';
import {
  GetProfileDocs,
  LoginDocs,
  RegisterDocs,
  SelectTwoFactorMethodDocs,
  SendMobileOtpDocs,
  VerifyMobileOtpDocs,
  VerifyTwoFactorDocs,
} from './swagger/auth.swagger';
@Controller({
  version: '1',
  path: 'auth',
})
@ApiTags('auth')
@UseGuards(PermissionsGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Public()
  @PublicRateLimit()
  @Post('register')
  @RegisterDocs
  async createUser(
    @Body() registerUserDto: RegisterUserDto,
    @Res() res: ExpressResponse,
  ) {
    await this.authService.registerUser(registerUserDto);
    res.status(201).json({
      success: true,
      data: null,
      message: 'User registration success',
    });
  }

  @Public()
  @PublicRateLimit()
  @Post('verify-email')
  @ApiExcludeEndpoint()
  async verifyEmail(
    @Body() body: { encodedEmail: string; token: string },
    @Res() res: ExpressResponse,
  ) {
    await this.authService.verifyEmailToken(body.encodedEmail, body.token);
    res.status(200).json({
      success: true,
      data: null,
      message: 'Email verification successful',
    });
  }

  @Public()
  @EmailRateLimit(10)
  @Post('resend-verification-email')
  @ApiExcludeEndpoint()
  async sendEmailVerificationLink(@Body() body: { email: string }) {
    if (!body.email || typeof body.email !== 'string') {
      throw new BadRequestException('Invalid email');
    }
    await this.authService.resendVerificationEmail(body.email);
    return {
      success: true,
      data: null,
      message:
        'Email will be sent to your inbox. Link will be valid for the next 15 minutes',
    };
  }

  @Post('send-mobile-otp')
  @SendMobileOtpDocs
  @SensitiveRateLimit()
  async sendMobileOtp(
    @Request() req: ExpressRequest,
    @Body() dto: SendMobileOtpDto,
  ) {
    await this.authService.sendMobileOtp(req.user.id, dto.phone);
    return {
      success: true,
      data: null,
      message:
        'OTP will be sent to the provided mobile number. OTP will be valid for the next 15 minutes',
    };
  }

  @Post('verify-mobile-otp')
  @VerifyMobileOtpDocs
  @SensitiveRateLimit()
  async verifyMobileOtp(
    @Request() req: ExpressRequest,
    @Body() dto: VerifyMobileOtpDto,
  ) {
    await this.authService.verifyMobileOtp(req.user.id, dto.otp);
    return {
      success: true,
      data: null,
      message: 'Mobile number verified successfully',
    };
  }

  @PublicRateLimit()
  @Post('complete-profile')
  @ApiExcludeEndpoint()
  async completeRegistration(
    @Request() req: ExpressRequest,
    @Body() createUserDto: CreateUserDto,
    @Res() res: ExpressResponse,
  ) {
    await this.authService.createUser(req.user.id, createUserDto);
    res.status(201).json({
      success: true,
      data: null,
      message: 'User profile completion success',
    });
  }

  @Public()
  @PublicRateLimit()
  @Post('login')
  @LoginDocs
  async loginUser(
    @Request() req: ExpressRequest,
    @Res() res: ExpressResponse,
    @Body() body: LoginDto,
  ) {
    const ua = req.get('user-agent') ?? '';
    const ip = getClientIp(req);
    const headers = req.headers;
    const origin = headers[X_APP_ORIGIN_HEADER];
    const userData = await this.authService.loginService(
      body,
      ua,
      ip,
      res,
      origin,
    );

    if (userData.requiresTwoFactor) {
      res.status(200).json({
        success: true,
        data: {
          requiresTwoFactor: true,
          availableMethods: userData.availableMethods,
        },
        message: 'Two-factor authentication required. Please select a method.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: userData,
      message: 'User login success',
    });
  }

  @Public()
  @PublicRateLimit()
  @Post('google')
  async authenticateWithGoogle(
    @Request() req: ExpressRequest,
    @Res() res: ExpressResponse,
    @Body() body: GoogleAuthDto,
  ) {
    const ua = req.get('user-agent') ?? '';
    const ip = getClientIp(req);

    const userData = await this.authService.authenticateWithGoogle(
      body,
      ua,
      ip,
      res,
    );

    if (userData.requiresTwoFactor) {
      return res.status(200).json({
        success: true,
        data: {
          requiresTwoFactor: true,
          availableMethods: userData.availableMethods,
        },
        message: 'Two-factor authentication required. Please select a method.',
      });
    }

    return res.status(200).json({
      success: true,
      data: userData,
      message: 'Google authentication success',
    });
  }

  @Public()
  @PublicRateLimit()
  @Post('2fa/select-method')
  @SelectTwoFactorMethodDocs
  async selectTwoFactorMethod(
    @Body() body: SelectTwoFactorMethodDto,
    @Request() req: ExpressRequest,
    @Res() res: ExpressResponse,
  ) {
    const sessionId = req.cookies?.['2fa_session'];
    if (!sessionId) {
      throw new UnauthorizedException(
        'No active 2FA session. Please log in first.',
      );
    }
    const result = await this.authService.selectTwoFactorMethod(
      sessionId,
      body.method,
    );

    res.status(200).json({
      success: true,
      data: null,
      message: result.message,
    });
  }

  @Public()
  @SensitiveRateLimit()
  @Post('2fa/passkey/options')
  async passkeyLoginOptions(
    @Request() req: ExpressRequest,
    @Res() res: ExpressResponse,
  ) {
    const options = await this.authService.getPasskeyLoginOptions(
      req.cookies?.['2fa_session'],
    );
    res.status(200).json({
      success: true,
      data: options,
      message: 'Passkey authentication options',
    });
  }

  @Public()
  @SensitiveRateLimit()
  @Post('2fa/passkey/verify')
  async passkeyLoginVerify(
    @Body() body: VerifyPasskeyLoginDto,
    @Request() req: ExpressRequest,
    @Res() res: ExpressResponse,
  ) {
    const userData = await this.authService.verifyPasskeyLogin(
      req.cookies?.['2fa_session'],
      body.response,
      res,
    );
    res.status(200).json({
      success: true,
      data: userData,
      message: 'User login success',
    });
  }

  @Public()
  @SensitiveRateLimit()
  @Post('verify-2fa')
  @VerifyTwoFactorDocs
  async verifyTwoFactor(
    @Body() body: VerifyTwoFactorDto,
    @Res() res: ExpressResponse,
    @Request() req: ExpressRequest,
  ) {
    const userData = await this.authService.verifyTwoFactorCode(
      req.cookies?.['2fa_session'],
      body.code,
      body.method,
      res,
    );

    res.status(200).json({
      success: true,
      data: userData,
      message: 'User login success',
    });
  }

  @Get('me')
  @UserRateLimit()
  @GetProfileDocs
  async getProfile(
    @Request() req: ExpressRequest,
    @Res() res: ExpressResponse,
  ) {
    const user = await this.authService.getProfileService(req.auth.userId);
    res.status(200).json({
      success: true,
      data: user,
      message: 'User fetch successful',
    });
  }
  @Post('logout')
  @UserRateLimit()
  @ApiBearerAuth('JWT-auth')
  async logoutUser(
    @Request() req: ExpressRequest,
    @Res() res: ExpressResponse,
  ) {
    if (!req.auth) {
      throw new UnauthorizedException('Unauthorized');
    }
    await this.authService.logoutService(req.auth, res);
    res.status(204).send();
  }
  @Post('logout-all')
  @UserRateLimit()
  @ApiBearerAuth('JWT-auth')
  async logoutAll(@Request() req: ExpressRequest, @Res() res: ExpressResponse) {
    if (!req.auth) {
      throw new UnauthorizedException('Unauthorized');
    }
    await this.authService.logoutAllService(res, req.auth.userId);
    res.status(204).send();
  }
  @Public()
  @UserRateLimit()
  @Post('refresh')
  @ApiExcludeEndpoint()
  async refreshAccessToken(
    @Request() req: ExpressRequest,
    @Res() res: ExpressResponse,
  ) {
    const resData = await this.authService.refreshAccessTokenService(
      req.cookies?.refresh,
      res,
    );
    res.status(200).json({
      success: true,
      data: {
        accessToken: resData.accessToken,
        deviceId: resData.deviceId,
        expiresIn: resData.expiresIn,
      },
      message: 'Token generated successfully',
    });
  }
  @Get('user-devices')
  @UserRateLimit()
  @ApiBearerAuth('JWT-auth')
  async getUserDevices(
    @Request() req: ExpressRequest,
    @Res() res: ExpressResponse,
  ) {
    if (!req.auth) {
      throw new UnauthorizedException('Unauthorized');
    }
    const devices = await this.authService.getUserDevicesService(
      req.auth.userId,
    );
    res.status(200).json({
      success: true,
      data: devices,
      message: 'Users devices fetch successful',
    });
  }
  @Post('revoke-device')
  @UserRateLimit()
  @ApiBearerAuth('JWT-auth')
  async revokeDevice(
    @Request() req: ExpressRequest,
    @Res() res: ExpressResponse,
    @Body('deviceId') deviceId: string,
  ) {
    if (!deviceId) {
      throw new UnauthorizedException('Missing deviceId');
    }
    if (!req.auth) {
      throw new UnauthorizedException('Unauthorized');
    }
    await this.authService.revokeDeviceService(req.auth.userId, deviceId, {
      blacklist: true,
    });
    res.status(204).send();
  }
}
