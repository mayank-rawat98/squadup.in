import { Global, Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisModule } from '../redis/redis.module';
import { AuthController } from './auth.controller';
import FingerprintUtilService from './common/utils/fingerprint.util';
import IpLocationService from './common/utils/ip.fetchLocation';
import { AuthService } from './services/auth.service';
import { JwtAppService } from './services/jwt.service';
import { GoogleAuthModule } from './google-auth/google-auth.module';
import { EmailChangeService } from './services/email-change.service';
import { EmailChangeController } from './email-change.controller';
import { OtpTokenService } from '../utils/generateOtp';

@Global()
@Module({
  imports: [RedisModule, GoogleAuthModule],
  controllers: [AuthController, EmailChangeController],
  providers: [
    AuthService,
    JwtAppService,
    JwtService,
    IpLocationService,
    FingerprintUtilService,
    EmailChangeService,
    OtpTokenService,
  ],
  exports: [
    JwtAppService,
    RedisModule,
    AuthService,
    FingerprintUtilService,
    IpLocationService,
    EmailChangeService,
  ],
})
export class AuthModule {}
