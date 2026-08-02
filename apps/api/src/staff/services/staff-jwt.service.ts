import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import {
  STAFF_JWT_ACCESS_TTL_MIN,
  STAFF_JWT_REFRESH_TTL_MIN,
} from '../constants/staff.constants';

export interface StaffJwtClaims {
  /** Staff id. */
  sub: string;
  /** Device id. */
  did: string;
  jti: string;
  typ: 'staff_access' | 'staff_refresh';
  iat: number;
  exp: number;
}

/**
 * Mints and verifies staff-realm tokens.
 *
 * Two properties matter for isolation:
 *  - a dedicated secret (STAFF_JWT_SECRET), so a customer token can never
 *    verify here even if the claim shape matched;
 *  - an explicit `typ`, so a staff refresh token cannot be replayed as a
 *    staff access token.
 */
@Injectable()
export class StaffJwtService {
  private readonly secret: string;
  public readonly ACCESS_TTL_SECONDS: number;
  public readonly REFRESH_TTL_SECONDS: number;

  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {
    const secret = this.configService.get<string>('STAFF_JWT_SECRET');
    if (!secret) {
      throw new Error(
        'Missing required environment variable: STAFF_JWT_SECRET. The staff realm must not share the customer JWT secret.',
      );
    }
    this.secret = secret;
    this.ACCESS_TTL_SECONDS =
      (this.configService.get<number>('STAFF_JWT_ACCESS_TTL_MIN') ??
        STAFF_JWT_ACCESS_TTL_MIN) * 60;
    this.REFRESH_TTL_SECONDS =
      (this.configService.get<number>('STAFF_JWT_REFRESH_TTL_MIN') ??
        STAFF_JWT_REFRESH_TTL_MIN) * 60;
  }

  async signAccessToken(staffId: string, deviceId: string) {
    return this.sign(staffId, deviceId, 'staff_access', this.ACCESS_TTL_SECONDS);
  }

  async signRefreshToken(staffId: string, deviceId: string) {
    return this.sign(
      staffId,
      deviceId,
      'staff_refresh',
      this.REFRESH_TTL_SECONDS,
    );
  }

  async verifyAccessToken(token: string): Promise<StaffJwtClaims> {
    return this.verify(token, 'staff_access');
  }

  async verifyRefreshToken(token: string): Promise<StaffJwtClaims> {
    return this.verify(token, 'staff_refresh');
  }

  private async sign(
    sub: string,
    did: string,
    typ: StaffJwtClaims['typ'],
    ttlSeconds: number,
  ) {
    const jti = randomUUID();
    const token = await this.jwtService.signAsync(
      { sub, did, jti, typ, iat: Math.floor(Date.now() / 1000) },
      { secret: this.secret, expiresIn: ttlSeconds },
    );
    return { token, jti, exp: ttlSeconds };
  }

  private async verify(
    token: string,
    expected: StaffJwtClaims['typ'],
  ): Promise<StaffJwtClaims> {
    const claims = await this.jwtService.verifyAsync<StaffJwtClaims>(token, {
      secret: this.secret,
    });
    if (claims.typ !== expected) {
      throw new UnauthorizedException('Invalid token type');
    }
    return claims;
  }
}
