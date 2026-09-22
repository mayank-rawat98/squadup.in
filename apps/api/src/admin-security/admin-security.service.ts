import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { RedisClientType } from 'redis';
import {
  IP_STRIKE_PREFIX,
  MAX_STRIKES,
  BLOCK_DURATION_MS,
  RATE_LIMIT_CONFIG_KEY,
  HARD_BLOCKED_IPS_SET,
  HARD_BLOCK_PREFIX,
  IP_WHITELIST_SET,
  IP_WHITELIST_PREFIX,
} from '../rate-limiter/constants/rate-limiter.constants';

export interface RateLimitConfig {
  strikesCount: number;
  hardBlockDuration: number; // seconds
}

export interface HardBlockEntry {
  ip: string;
  blockedAt: number;
  blockDuration: number; // seconds
  expiresAt: number; // unix timestamp – blockedAt + blockDuration (updated on extend/reduce)
  userAgent: string;
  strikes: number;
  reason?: string;
  ttl?: number; // remaining seconds – populated on read
}

export interface WhitelistEntry {
  ip: string;
  addedAt: number; // unix timestamp (seconds)
  reason?: string;
}

@Injectable()
export class AdminSecurityService {
  private readonly logger = new Logger(AdminSecurityService.name);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  /* ------------------------------------------------------------------ */
  /*  Rate-limit config                                                  */
  /* ------------------------------------------------------------------ */

  async getRateLimitConfig(): Promise<RateLimitConfig> {
    const raw = await this.redis.get(RATE_LIMIT_CONFIG_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as RateLimitConfig;
      } catch {
        this.logger.warn('Corrupt rate_limit_config in Redis, using defaults');
      }
    }
    return {
      strikesCount: MAX_STRIKES,
      hardBlockDuration: BLOCK_DURATION_MS / 1000,
    };
  }

  async updateRateLimitConfig(
    partial: Partial<RateLimitConfig>,
  ): Promise<RateLimitConfig> {
    const current = await this.getRateLimitConfig();
    const merged: RateLimitConfig = { ...current, ...partial };
    await this.redis.set(RATE_LIMIT_CONFIG_KEY, JSON.stringify(merged));
    return merged;
  }

  /* ------------------------------------------------------------------ */
  /*  Hard-blocked IPs                                                   */
  /* ------------------------------------------------------------------ */

  async getHardBlockedIps(): Promise<HardBlockEntry[]> {
    const ips = await this.redis.sMembers(HARD_BLOCKED_IPS_SET);
    if (ips.length === 0) return [];

    // Fetch all entries in parallel
    const results = await Promise.all(
      ips.map((ip) => this.getHardBlockEntry(ip)),
    );

    const entries: HardBlockEntry[] = [];
    const staleIps: string[] = [];

    for (let i = 0; i < ips.length; i++) {
      const entry = results[i];
      if (entry) {
        entries.push(entry);
      } else {
        // stale index — block already expired
        staleIps.push(ips[i]);
      }
    }

    if (staleIps.length > 0) {
      await this.redis.sRem(HARD_BLOCKED_IPS_SET, staleIps);
    }

    return entries;
  }

  async getHardBlockEntry(ip: string): Promise<HardBlockEntry | null> {
    const key = `${HARD_BLOCK_PREFIX}:${ip}`;
    const raw = await this.redis.get(key);
    if (!raw) return null;

    try {
      const entry = JSON.parse(raw) as HardBlockEntry;
      const ttlMs = await this.redis.pTTL(key);
      entry.ttl = ttlMs > 0 ? Math.ceil(ttlMs / 1000) : 0;
      return entry;
    } catch {
      return null;
    }
  }

  async manualBlockIp(
    ip: string,
    durationSec: number,
    reason?: string,
    userAgent = 'N/A',
  ): Promise<HardBlockEntry> {
    const blockedAt = Math.floor(Date.now() / 1000);
    const entry: HardBlockEntry = {
      ip,
      blockedAt,
      blockDuration: durationSec,
      expiresAt: blockedAt + durationSec,
      userAgent,
      strikes: 0,
      reason,
    };

    const key = `${HARD_BLOCK_PREFIX}:${ip}`;
    await this.redis.set(key, JSON.stringify(entry), {
      PX: durationSec * 1000,
    });

    // Also set the legacy block key used by the throttler guard
    const legacyBlockKey = `${IP_STRIKE_PREFIX}:${ip}:blocked`;
    await this.redis.set(legacyBlockKey, '1', { PX: durationSec * 1000 });

    await this.redis.sAdd(HARD_BLOCKED_IPS_SET, ip);

    entry.ttl = durationSec;
    return entry;
  }

  async removeIpBlock(ip: string): Promise<void> {
    const key = `${HARD_BLOCK_PREFIX}:${ip}`;
    const legacyBlockKey = `${IP_STRIKE_PREFIX}:${ip}:blocked`;
    const strikeKey = `${IP_STRIKE_PREFIX}:${ip}:count`;

    await Promise.all([
      this.redis.del(key),
      this.redis.del(legacyBlockKey),
      this.redis.del(strikeKey),
      this.redis.sRem(HARD_BLOCKED_IPS_SET, ip),
    ]);
  }

  async updateBlockDuration(
    ip: string,
    newDurationSec: number,
  ): Promise<HardBlockEntry | null> {
    const entry = await this.getHardBlockEntry(ip);
    if (!entry) return null;

    // Record when the new TTL starts so blockedAt + blockDuration stays meaningful.
    // expiresAt always reflects the real Redis expiry: now + newDurationSec.
    entry.blockDuration = newDurationSec;
    entry.expiresAt = Math.floor(Date.now() / 1000) + newDurationSec;

    const key = `${HARD_BLOCK_PREFIX}:${ip}`;
    await this.redis.set(key, JSON.stringify(entry), {
      PX: newDurationSec * 1000,
    });

    // Update legacy key TTL in sync
    const legacyBlockKey = `${IP_STRIKE_PREFIX}:${ip}:blocked`;
    await this.redis.pExpire(legacyBlockKey, newDurationSec * 1000);

    entry.ttl = newDurationSec;
    return entry;
  }

  /* ------------------------------------------------------------------ */
  /*  IP whitelist (bypass rate limits + blocks)                         */
  /* ------------------------------------------------------------------ */

  async getWhitelistedIps(): Promise<WhitelistEntry[]> {
    const ips = await this.redis.sMembers(IP_WHITELIST_SET);
    if (ips.length === 0) return [];

    const results = await Promise.all(
      ips.map((ip) => this.getWhitelistEntry(ip)),
    );

    const entries: WhitelistEntry[] = [];
    const staleIps: string[] = [];

    for (let i = 0; i < ips.length; i++) {
      const entry = results[i];
      if (entry) {
        entries.push(entry);
      } else {
        // Metadata key missing — drop from the index.
        staleIps.push(ips[i]);
      }
    }

    if (staleIps.length > 0) {
      await this.redis.sRem(IP_WHITELIST_SET, staleIps);
    }

    // Newest first.
    return entries.sort((a, b) => b.addedAt - a.addedAt);
  }

  async getWhitelistEntry(ip: string): Promise<WhitelistEntry | null> {
    const raw = await this.redis.get(`${IP_WHITELIST_PREFIX}:${ip}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as WhitelistEntry;
    } catch {
      return null;
    }
  }

  async addIpWhitelist(ip: string, reason?: string): Promise<WhitelistEntry> {
    const entry: WhitelistEntry = {
      ip,
      addedAt: Math.floor(Date.now() / 1000),
      reason,
    };
    // Whitelist entries are permanent (no TTL) until removed by an admin.
    await this.redis.set(`${IP_WHITELIST_PREFIX}:${ip}`, JSON.stringify(entry));
    await this.redis.sAdd(IP_WHITELIST_SET, ip);
    return entry;
  }

  async bulkAddWhitelist(
    ips: string[],
    reason?: string,
  ): Promise<{ added: WhitelistEntry[] }> {
    const unique = [...new Set(ips)];
    const added = await Promise.all(
      unique.map((ip) => this.addIpWhitelist(ip, reason)),
    );
    return { added };
  }

  async removeIpWhitelist(ip: string): Promise<void> {
    await Promise.all([
      this.redis.del(`${IP_WHITELIST_PREFIX}:${ip}`),
      this.redis.sRem(IP_WHITELIST_SET, ip),
    ]);
  }

  /* ------------------------------------------------------------------ */
  /*  Scheduled maintenance                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Prune expired IPs from the hard_blocked_ips index every 30 minutes.
   * This ensures the SET doesn't grow unbounded when the admin list endpoint
   * is never hit (e.g. if the admin panel is unused for a long period).
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async pruneExpiredBlockIndex(): Promise<void> {
    try {
      const ips = await this.redis.sMembers(HARD_BLOCKED_IPS_SET);
      if (ips.length === 0) return;

      const exists = await Promise.all(
        ips.map((ip) => this.redis.exists(`${HARD_BLOCK_PREFIX}:${ip}`)),
      );

      const staleIps = ips.filter((_, i) => exists[i] === 0);
      if (staleIps.length > 0) {
        await this.redis.sRem(HARD_BLOCKED_IPS_SET, staleIps);
        this.logger.log(
          `Pruned ${staleIps.length} expired IP(s) from hard_blocked_ips index`,
        );
      }
    } catch (err) {
      this.logger.error('Failed to prune hard_blocked_ips index', err);
    }
  }
}
