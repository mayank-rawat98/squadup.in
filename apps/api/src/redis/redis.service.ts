import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RedisClientType } from 'redis';
import {
  JWT_ACCESS_TTL_MIN,
  REDIS_KEYS,
} from '../auth/common/constants/constant';
import {
  DeviceDTO,
  DeviceMeta,
  RefreshRecord,
  TwoFactorSession,
} from '../auth/common/types/types';
import { STAFF_REDIS_KEYS } from '../staff/constants/staff.constants';

@Injectable()
export class RedisService {
  private JWT_ACCESS_TTL_MIN: number;
  constructor(
    @Inject('REDIS_CLIENT') private redis: RedisClientType,
    private readonly configService: ConfigService,
  ) {
    this.JWT_ACCESS_TTL_MIN =
      this.configService.get<number>('JWT_ACCESS_TTL_MIN') ||
      JWT_ACCESS_TTL_MIN;
  }
  async storeRefreshRecord(
    jti: string,
    userId: string,
    deviceId: string,
    ttlSec: number,
    rememberMe = true,
  ): Promise<void> {
    const rec = JSON.stringify({ userId, deviceId, rememberMe });
    await this.redis
      .multi()
      .setEx(REDIS_KEYS.REFRESH(jti), ttlSec, rec)
      .sAdd(REDIS_KEYS.DEVICE_RT_SET(deviceId), jti)
      .expire(REDIS_KEYS.DEVICE_RT_SET(deviceId), ttlSec)
      .exec();
  }

  async getRefreshRecord(jti: string): Promise<RefreshRecord | null> {
    const raw = await this.redis.get(REDIS_KEYS.REFRESH(jti));
    if (!raw) return null;
    const rec = JSON.parse(raw) as RefreshRecord;
    // Records written before rotation carried `rememberMe` are all remember-me
    // sessions — that was the only kind that got a refresh token.
    return { ...rec, rememberMe: rec.rememberMe ?? true };
  }

  async deleteRefreshRecord(jti: string, deviceId: string): Promise<void> {
    await this.redis.del(REDIS_KEYS.REFRESH(jti));
    await this.redis.sRem(REDIS_KEYS.DEVICE_RT_SET(deviceId), jti);
  }

  async storeDeviceMeta(
    deviceId: string,
    meta: DeviceMeta,
    ttlSec: number,
  ): Promise<void> {
    await this.redis.hSet(REDIS_KEYS.DEVICE_META(deviceId), {
      userId: meta.userId,
      uaHash: meta.uaHash,
      ipHash: meta.ipHash,
      ipMask: meta.ipMask,
      createdAt: String(meta.createdAt),
      lastSeen: String(meta.lastSeen),
      city: meta.city,
      country: meta.country,
      region: meta.region,
      countryCode: meta.countryCode,
      countryFlag: meta.countryFlag,
      deviceName: meta.deviceName,
      deviceOs: meta.deviceOs,
      deviceType: meta.deviceType,
    });
    await this.redis.expire(REDIS_KEYS.DEVICE_META(deviceId), ttlSec);
    await this.redis.zAdd(REDIS_KEYS.USER_DEVICES(meta.userId), [
      { score: Date.now(), value: deviceId },
    ]);
    await this.redis.expire(REDIS_KEYS.USER_DEVICES(meta.userId), ttlSec);
  }

  async updateDeviceLastSeen(deviceId: string): Promise<void> {
    const now = Date.now();
    const meta = await this.redis.hGet(
      REDIS_KEYS.DEVICE_META(deviceId),
      'userId',
    );
    if (meta) {
      await this.redis
        .multi()
        .hSet(REDIS_KEYS.DEVICE_META(deviceId), { lastSeen: String(now) })
        .zAdd(REDIS_KEYS.USER_DEVICES(meta), [{ score: now, value: deviceId }])
        .exec();
    }
  }

  async blacklistDevice(deviceId: string, ttlSec: number): Promise<void> {
    await this.redis.setEx(REDIS_KEYS.BL_DEVICE(deviceId), ttlSec, '1');
  }

  async isDeviceBlacklisted(deviceId: string): Promise<boolean> {
    return (await this.redis.exists(REDIS_KEYS.BL_DEVICE(deviceId))) === 1;
  }

  async getUserDevices(uid: string): Promise<DeviceDTO[]> {
    // get all device ids for user, newest first
    const dids = await this.redis.zRange(REDIS_KEYS.USER_DEVICES(uid), 0, -1);
    if (dids.length === 0) return [];
    // pipeline HGETALL for each device meta
    const pipeline = this.redis.multi();
    for (const did of dids) pipeline.hGetAll(REDIS_KEYS.DEVICE_META(did));
    const rows = (await pipeline.exec()) as unknown as Array<
      Record<string, string>
    >;
    const out: DeviceDTO[] = [];
    rows.forEach((meta, idx) => {
      if (!meta || Object.keys(meta).length === 0) return; // meta might have expired
      const did = dids[idx];
      out.push({
        deviceId: did,
        lastSeen: Number(meta.lastSeen ?? 0),
        createdAt: Number(meta.createdAt ?? 0),
        uaHash: meta.uaHash,
        ipMask: meta.ipMask,
        ipHash: meta.ipHash,
        city: meta.city,
        country: meta.country,
        region: meta.region,
        countryCode: meta.countryCode,
        countryFlag: meta.countryFlag,
        deviceName: meta.deviceName,
        deviceType: meta.deviceType,
        deviceOs: meta.deviceOs,
      });
    });
    out.sort((a, b) => b.lastSeen - a.lastSeen);
    return out;
  }

  /** Logout all devices for a user (recommended model) */
  async removeAllDevices(
    uid: string,
  ): Promise<{ devicesBlacklisted: number; refreshDeleted: number }> {
    // 1) fetch device IDs for user
    const dids = await this.redis.zRange(REDIS_KEYS.USER_DEVICES(uid), 0, -1);
    let devicesBlacklisted = 0;
    let refreshDeleted = 0;
    const pipeline = this.redis.multi();
    // 2) for each device: delete all refresh JTIs and blacklist device
    for (const did of dids) {
      const jtIs = await this.redis.sMembers(REDIS_KEYS.DEVICE_RT_SET(did));
      if (jtIs.length) {
        const refreshArray = jtIs.map((j) => REDIS_KEYS.REFRESH(j));
        // delete rt:{jti}
        pipeline.del(refreshArray);
        // remove the set itself
        pipeline.del(REDIS_KEYS.DEVICE_RT_SET(did));
        refreshDeleted += jtIs.length;
      }
      // blacklist device for the access TTL
      pipeline.del(REDIS_KEYS.DEVICE_META(did));
      pipeline.setEx(
        REDIS_KEYS.BL_DEVICE(did),
        this.JWT_ACCESS_TTL_MIN * 60,
        '1',
      );
      devicesBlacklisted++;
    }

    // (optional) clear user's device list
    if (dids.length) {
      pipeline.del(REDIS_KEYS.USER_DEVICES(uid));
    }

    await pipeline.exec();
    return { devicesBlacklisted, refreshDeleted };
  }

  async removeSingleDevice(
    uid: string,
    did: string,
    opts: { blacklist?: boolean } = { blacklist: true },
  ): Promise<{ refreshDeleted: number }> {
    const jtIs = await this.redis.sMembers(REDIS_KEYS.DEVICE_RT_SET(did));
    const pipeline = this.redis.multi();

    // delete rt:{jti} for this device
    if (jtIs.length) {
      const refreshKeys = jtIs.map((j) => REDIS_KEYS.REFRESH(j));
      pipeline.del(refreshKeys);
      // clear device's JTI set
      pipeline.del(REDIS_KEYS.DEVICE_RT_SET(did));
    }

    // remove device from user's device index
    pipeline.zRem(REDIS_KEYS.USER_DEVICES(uid), did);

    // delete device meta
    pipeline.del(REDIS_KEYS.DEVICE_META(did));

    // optional immediate cut-off for access tokens
    if (opts.blacklist) {
      pipeline.setEx(
        REDIS_KEYS.BL_DEVICE(did),
        this.JWT_ACCESS_TTL_MIN * 60,
        '1',
      );
    }

    await pipeline.exec();
    return { refreshDeleted: jtIs.length };
  }

  async removeOtherDevices(
    uid: string,
    currentDid: string,
  ): Promise<{ devicesRemoved: number }> {
    const dids = await this.redis.zRange(REDIS_KEYS.USER_DEVICES(uid), 0, -1);
    let devicesRemoved = 0;
    for (const did of dids) {
      if (did === currentDid) continue;
      await this.removeSingleDevice(uid, did);
      devicesRemoved++;
    }
    return { devicesRemoved };
  }

  // Generic helpers --------------------------------------------------------
  /**
   * Store a value under a key. If ttlSec is provided and > 0, uses SETEX.
   * Value will be JSON-stringified unless it's already a string.
   */
  async storeRecord(
    key: string,
    value: unknown,
    ttlSec?: number,
  ): Promise<boolean> {
    const payload = typeof value === 'string' ? value : JSON.stringify(value);
    let result: string | null;
    if (ttlSec && ttlSec > 0) {
      result = await this.redis.set(key, payload, {
        EX: ttlSec,
        NX: true,
      });
      return result === 'OK';
    } else {
      result = await this.redis.set(key, payload);
      return result === 'OK';
    }
  }

  /**
   * Retrieve a value by key. Attempts JSON.parse and falls back to string.
   */
  async getRecord<T = unknown>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  /**
   * Delete a key. Returns number of keys removed (0 or 1).
   */
  async deleteRecord(key: string): Promise<number> {
    return await this.redis.del(key);
  }

  /**
   * Overwrite a key with a TTL (always replaces existing value).
   * Unlike storeRecord, this does NOT use NX – it always writes.
   */
  async setRecordEx(
    key: string,
    value: unknown,
    ttlSec: number,
  ): Promise<void> {
    const payload = typeof value === 'string' ? value : JSON.stringify(value);
    await this.redis.setEx(key, ttlSec, payload);
  }

  /**
   * Atomically increment a counter key and set its expiry on the first hit.
   * Returns the current count after the increment.
   */
  async incrWithExpiry(key: string, ttlSec: number): Promise<number> {
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, ttlSec);
    }
    return count;
  }

  async incrByWithExpiry(
    key: string,
    increment: number,
    ttlSec: number,
  ): Promise<number> {
    const count = await this.redis.incrBy(key, increment);
    if (count === increment) {
      await this.redis.expire(key, ttlSec);
    }
    return count;
  }

  async store2FASession(
    sessionId: string,
    session: TwoFactorSession,
    ttlSec = 300,
  ): Promise<void> {
    await this.redis.setEx(
      REDIS_KEYS.TWO_FACTOR_SESSION(sessionId),
      ttlSec,
      JSON.stringify(session),
    );
  }

  async get2FASession(sessionId: string): Promise<TwoFactorSession | null> {
    const raw = await this.redis.get(REDIS_KEYS.TWO_FACTOR_SESSION(sessionId));
    return raw ? (JSON.parse(raw) as TwoFactorSession) : null;
  }

  async delete2FASession(sessionId: string): Promise<void> {
    await this.redis.del(REDIS_KEYS.TWO_FACTOR_SESSION(sessionId));
  }

  async update2FASession(
    sessionId: string,
    session: TwoFactorSession,
    ttlSec = 300,
  ): Promise<void> {
    await this.store2FASession(sessionId, session, ttlSec);
  }
  // ============================================================================
  // EMAIL WHITELIST METHODS
  // ============================================================================

  // Key for the Set containing all whitelisted items
  private readonly WHITELIST_SET_KEY = 'whitelist:emails';

  /**
   * Add an email address to the whitelist set
   * @param emailAddress - Full email like "admin@example.com"
   */
  async addEmailToWhitelist(emailAddress: string): Promise<void> {
    await this.redis.sAdd(
      this.WHITELIST_SET_KEY,
      emailAddress.toLowerCase().trim(),
    );
  }

  /**
   * Remove an email address from the whitelist set
   */
  async removeEmailFromWhitelist(emailAddress: string): Promise<void> {
    await this.redis.sRem(
      this.WHITELIST_SET_KEY,
      emailAddress.toLowerCase().trim(),
    );
  }

  /**
   * Check if an email address is whitelisted efficiently
   * Returns true if whitelisted, false otherwise
   */
  async isEmailWhitelisted(emailAddress: string): Promise<boolean> {
    const isMember = await this.redis.sIsMember(
      this.WHITELIST_SET_KEY,
      emailAddress.toLowerCase().trim(),
    );
    return !!isMember;
  }

  /**
   * Bulk add email addresses to whitelist set
   * @param emailAddresses - Array of email addresses
   */
  async bulkAddEmailsToWhitelist(emailAddresses: string[]): Promise<void> {
    if (emailAddresses.length === 0) return;
    const cleanEmails = emailAddresses.map((e) => e.toLowerCase().trim());
    await this.redis.sAdd(this.WHITELIST_SET_KEY, cleanEmails);
  }

  /**
   * Sync all active email addresses from database to Redis
   * Replaces the entire set with the new list from DB
   */
  async syncEmailWhitelistFromDatabase(
    emailAddresses: Array<{ emailAddress: string; isActive: boolean }>,
  ): Promise<{ synced: number; removed: number }> {
    // 1. Filter only active emails
    const activeEmails = emailAddresses
      .filter((e) => e.isActive)
      .map((e) => e.emailAddress.toLowerCase().trim());

    if (activeEmails.length === 0) {
      // If no emails are active, remove the set entirely
      await this.redis.del(this.WHITELIST_SET_KEY);
      return { synced: 0, removed: 0 };
    }

    // 2. Clear old set and add new items in a transaction
    await this.redis
      .multi()
      .del(this.WHITELIST_SET_KEY)
      .sAdd(this.WHITELIST_SET_KEY, activeEmails)
      .exec();

    return { synced: activeEmails.length, removed: 0 };
  }
  async getAllWhitelistedEmails(): Promise<string[]> {
    return await this.redis.sMembers(this.WHITELIST_SET_KEY);
  }

  // ============================================================================
  // GENERIC SET METHODS
  // ============================================================================

  async sAdd(key: string, members: string | string[]): Promise<void> {
    const arr = Array.isArray(members) ? members : [members];
    if (arr.length === 0) return;
    await this.redis.sAdd(key, arr);
  }

  async sIsMember(key: string, member: string): Promise<boolean> {
    return !!(await this.redis.sIsMember(key, member));
  }

  async sMembers(key: string): Promise<string[]> {
    return this.redis.sMembers(key);
  }

  async sCard(key: string): Promise<number> {
    return this.redis.sCard(key);
  }

  // ============================================================================
  // STAFF SESSION METHODS
  // Isolated key space (`staff_rt:`, `staff_device:`, `bl:staff_device:`) so
  // staff sessions never collide with customer sessions.
  // ============================================================================

  async storeStaffRefreshRecord(
    jti: string,
    staffId: string,
    deviceId: string,
    ttlSec: number,
  ): Promise<void> {
    const rec = JSON.stringify({ staffId, deviceId });
    await this.redis
      .multi()
      .setEx(STAFF_REDIS_KEYS.REFRESH(jti), ttlSec, rec)
      .sAdd(STAFF_REDIS_KEYS.DEVICE_RT_SET(deviceId), jti)
      .expire(STAFF_REDIS_KEYS.DEVICE_RT_SET(deviceId), ttlSec)
      .sAdd(STAFF_REDIS_KEYS.STAFF_DEVICES(staffId), deviceId)
      .expire(STAFF_REDIS_KEYS.STAFF_DEVICES(staffId), ttlSec)
      .exec();
  }

  async getStaffRefreshRecord(
    jti: string,
  ): Promise<{ staffId: string; deviceId: string } | null> {
    const raw = await this.redis.get(STAFF_REDIS_KEYS.REFRESH(jti));
    return raw
      ? (JSON.parse(raw) as { staffId: string; deviceId: string })
      : null;
  }

  async deleteStaffRefreshRecord(jti: string, deviceId: string): Promise<void> {
    await this.redis.del(STAFF_REDIS_KEYS.REFRESH(jti));
    await this.redis.sRem(STAFF_REDIS_KEYS.DEVICE_RT_SET(deviceId), jti);
  }

  async blacklistStaffDevice(deviceId: string, ttlSec: number): Promise<void> {
    await this.redis.setEx(STAFF_REDIS_KEYS.BL_DEVICE(deviceId), ttlSec, '1');
  }

  async isStaffDeviceBlacklisted(deviceId: string): Promise<boolean> {
    return (
      (await this.redis.exists(STAFF_REDIS_KEYS.BL_DEVICE(deviceId))) === 1
    );
  }

  /** Blacklist + tear down a single staff device's refresh tokens. */
  async removeStaffSingleDevice(
    staffId: string,
    deviceId: string,
    opts: { blacklist?: boolean } = { blacklist: true },
  ): Promise<void> {
    const jtIs = await this.redis.sMembers(
      STAFF_REDIS_KEYS.DEVICE_RT_SET(deviceId),
    );
    const pipeline = this.redis.multi();
    if (jtIs.length) {
      pipeline.del(jtIs.map((j) => STAFF_REDIS_KEYS.REFRESH(j)));
      pipeline.del(STAFF_REDIS_KEYS.DEVICE_RT_SET(deviceId));
    }
    pipeline.sRem(STAFF_REDIS_KEYS.STAFF_DEVICES(staffId), deviceId);
    if (opts.blacklist) {
      pipeline.setEx(
        STAFF_REDIS_KEYS.BL_DEVICE(deviceId),
        this.JWT_ACCESS_TTL_MIN * 60,
        '1',
      );
    }
    await pipeline.exec();
  }

  /** Revoke every staff device — used on suspend/disable/reset-password. */
  async removeStaffAllDevices(staffId: string): Promise<void> {
    const dids = await this.redis.sMembers(
      STAFF_REDIS_KEYS.STAFF_DEVICES(staffId),
    );
    for (const did of dids) {
      await this.removeStaffSingleDevice(staffId, did);
    }
    await this.redis.del(STAFF_REDIS_KEYS.STAFF_DEVICES(staffId));
  }
}
