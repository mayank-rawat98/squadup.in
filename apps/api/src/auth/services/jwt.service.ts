import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import {
  JWT_ACCESS_TTL_MIN,
  JWT_REFRESH_REMEMBER_TTL_MIN,
  JWT_REFRESH_TTL_MIN,
} from '../common/constants/constant';
import FingerprintUtilService from '../common/utils/fingerprint.util';
import { generateJwtId } from '../common/utils/ids.util';
import { JwtAccessClaims, JwtRefreshClaims } from '../common/types/types';
import { JwtPayload } from '../../types/auth';

@Injectable()
export class JwtAppService {
  private JWT_SECRET: string | undefined;
  private JWT_ACCESS_TTL_MIN: number; // in  minutes (15 minutes)
  private JWT_REFRESH_TTL_MIN: number; // in  minutes (7 days — no remember me)
  private JWT_REFRESH_REMEMBER_TTL_MIN: number; // in minutes (30 days — remember me)
  //   public readonly
  public ACCESS_TTL_SECONDS: number; // in seconds
  public REFRESH_TTL_SECONDS: number; // in seconds (default / no remember me)
  public REFRESH_REMEMBER_TTL_SECONDS: number; // in seconds (remember me)

  constructor(
    @Inject(NestJwtService) private readonly jwtService: NestJwtService,
    private readonly fingerprintUtil: FingerprintUtilService,
    private readonly configService: ConfigService,
  ) {
    this.JWT_SECRET = this.configService.get<string>('JWT_ACCESS_SECRET');
    this.JWT_ACCESS_TTL_MIN =
      this.configService.get<number>('JWT_ACCESS_TTL_MIN') ??
      JWT_ACCESS_TTL_MIN;
    this.JWT_REFRESH_TTL_MIN =
      this.configService.get<number>('JWT_REFRESH_TTL_MIN') ??
      JWT_REFRESH_TTL_MIN;
    this.JWT_REFRESH_REMEMBER_TTL_MIN =
      this.configService.get<number>('JWT_REFRESH_REMEMBER_TTL_MIN') ??
      JWT_REFRESH_REMEMBER_TTL_MIN;
    this.ACCESS_TTL_SECONDS = this.JWT_ACCESS_TTL_MIN * 60;
    this.REFRESH_TTL_SECONDS = this.JWT_REFRESH_TTL_MIN * 60;
    this.REFRESH_REMEMBER_TTL_SECONDS = this.JWT_REFRESH_REMEMBER_TTL_MIN * 60;
  }

  /**
   * Resolve the refresh-token lifetime (seconds) for a session. Remember-me
   * sessions get the longer window; everything else the default. This single
   * value must be used for the JWT `exp`, the Redis record TTL and the cookie
   * `maxAge` so all three expire together.
   */
  refreshTtlSeconds(rememberMe: boolean): number {
    return rememberMe
      ? this.REFRESH_REMEMBER_TTL_SECONDS
      : this.REFRESH_TTL_SECONDS;
  }
  async signAccessToken(sub: string, did: string) {
    const jti = generateJwtId();
    const iat = this.fingerprintUtil.nowSec();
    const exp = this.ACCESS_TTL_SECONDS;
    const payload: Omit<JwtAccessClaims, 'exp'> = {
      sub,
      did,
      jti,
      typ: 'access',
      iat,
    };
    return {
      token: await this.jwtService.signAsync(payload, {
        secret: this.JWT_SECRET,
        expiresIn: exp,
      }),
      jti,
      exp,
    };
  }

  async signRefreshToken(
    sub: string,
    did: string,
    rememberMe = false,
    ver?: number,
  ) {
    const jti = generateJwtId();
    const iat = this.fingerprintUtil.nowSec();
    const exp = this.refreshTtlSeconds(rememberMe);
    const payload: Omit<JwtRefreshClaims, 'exp'> = {
      sub,
      did,
      jti,
      typ: 'refresh',
      iat,
      ver,
    };
    return {
      token: await this.jwtService.signAsync(payload, {
        secret: this.JWT_SECRET,
        expiresIn: exp,
      }),
      jti,
      exp,
    };
  }

  async verifyAccessToken(token: string): Promise<JwtAccessClaims> {
    const claims = await this.jwtService.verifyAsync<JwtAccessClaims>(token, {
      secret: this.JWT_SECRET,
    });
    // Token-type confirmation: access, refresh, and email tokens all share the
    // same JWT secret, so the signature alone does not prove this is an access
    // token. Reject anything not explicitly minted as `typ: 'access'` to stop
    // a refresh/email token being presented as a Bearer access token.
    if (claims.typ !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }
    return claims;
  }

  async verifyRefreshToken(token: string): Promise<JwtRefreshClaims> {
    const claims = await this.jwtService.verifyAsync<JwtRefreshClaims>(token, {
      secret: this.JWT_SECRET,
    });
    if (claims.typ !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }
    return claims;
  }
  async signEmailToken(payload: JwtPayload, expiresIn: number) {
    return await this.jwtService.signAsync(payload, {
      secret: this.JWT_SECRET,
      expiresIn,
    });
  }
  async verifyEmailToken(token: string) {
    const payload: JwtPayload & { typ?: string } =
      await this.jwtService.verifyAsync(token, {
        secret: this.JWT_SECRET,
      });
    // Email tokens carry no `typ`; reject access/refresh tokens replayed here
    // so the shared secret can't be used to cross token classes.
    if (payload.typ === 'access' || payload.typ === 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }
    return payload;
  }
}
