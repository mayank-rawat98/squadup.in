import { Global, Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisModule } from '../redis/redis.module';
import { AuthController } from './auth.controller';
import FingerprintUtilService from './common/utils/fingerprint.util';
import IpLocationService from './common/utils/ip.fetchLocation';
import { AuthService } from './services/auth.service';
import { JwtAppService } from './services/jwt.service';
import { GoogleAuthModule } from './google-auth/google-auth.module';
import { OtpTokenService } from '../utils/generateOtp';

@Global()
@Module({
  imports: [RedisModule, GoogleAuthModule ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAppService,
    JwtService,
    IpLocationService,
    FingerprintUtilService,
    OtpTokenService,
  ],
  exports: [
    JwtAppService,
    RedisModule,
    AuthService,
    FingerprintUtilService,
    IpLocationService  ],
})
export class AuthModule {}
