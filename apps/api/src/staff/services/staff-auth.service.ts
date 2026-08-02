import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../../redis/redis.service';
import { Staff, StaffStatus } from '../entities/staff.entity';
import { StaffRepository } from '../staff.repository';
import { StaffJwtService } from './staff-jwt.service';

export interface StaffSession {
  accessToken: string;
  refreshToken: string;
  deviceId: string;
  staff: Staff;
}

/**
 * Login / refresh / logout for the ops realm.
 *
 * Sessions mirror the customer model: a refresh token is recorded in Redis
 * against a device id, so an individual device or every device can be revoked
 * server-side. Rotation is unconditional — a refresh token is single-use.
 */
@Injectable()
export class StaffAuthService {
  constructor(
    private readonly repository: StaffRepository,
    private readonly jwt: StaffJwtService,
    private readonly redisService: RedisService,
  ) {}

  async login(email: string, password: string): Promise<StaffSession> {
    const staff = await this.repository.findByEmailWithPassword(email);
    // Same message for "no such account" and "wrong password" so the endpoint
    // can't be used to enumerate staff emails.
    if (!staff || !(await staff.validatePassword(password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (staff.status !== StaffStatus.ACTIVE) {
      throw new UnauthorizedException('This staff account is suspended');
    }

    await this.repository.update(staff.id, { lastLoginAt: new Date() });
    return this.issueSession(staff, randomUUID());
  }

  /** Rotate a refresh token: the presented one is consumed, a new pair issued. */
  async refresh(refreshToken: string): Promise<StaffSession> {
    const claims = await this.jwt.verifyRefreshToken(refreshToken);

    // The token must still be the one on record for this device — a rotated or
    // revoked jti is gone from Redis and must not be accepted.
    const record = await this.redisService.getStaffRefreshRecord(claims.jti);
    if (!record || record.staffId !== claims.sub) {
      throw new UnauthorizedException('Session expired, please sign in again');
    }
    if (await this.redisService.isStaffDeviceBlacklisted(claims.did)) {
      throw new UnauthorizedException('Unauthorized Access');
    }

    const staff = await this.repository.findById(claims.sub);
    if (!staff || staff.status !== StaffStatus.ACTIVE) {
      throw new UnauthorizedException('Unauthorized Access');
    }

    await this.redisService.deleteStaffRefreshRecord(claims.jti, claims.did);
    return this.issueSession(staff, claims.did);
  }

  /** Sign out the current device. */
  async logout(staffId: string, deviceId: string): Promise<void> {
    await this.redisService.removeStaffSingleDevice(staffId, deviceId);
  }

  /** Sign out every device for this operator. */
  async logoutAll(staffId: string): Promise<void> {
    await this.redisService.removeStaffAllDevices(staffId);
  }

  private async issueSession(
    staff: Staff,
    deviceId: string,
  ): Promise<StaffSession> {
    const access = await this.jwt.signAccessToken(staff.id, deviceId);
    const refresh = await this.jwt.signRefreshToken(staff.id, deviceId);

    await this.redisService.storeStaffRefreshRecord(
      refresh.jti,
      staff.id,
      deviceId,
      this.jwt.REFRESH_TTL_SECONDS,
    );

    return {
      accessToken: access.token,
      refreshToken: refresh.token,
      deviceId,
      staff,
    };
  }
}
