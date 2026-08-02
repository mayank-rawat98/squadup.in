import { ExecutionContext, Inject, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ThrottlerGuard,
  ThrottlerStorage,
  ThrottlerLimitDetail,
  ThrottlerException,
} from '@nestjs/throttler';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import type { RedisClientType } from 'redis';
import { AuditProducer } from '../audits/producers/audit.producer';
import {
  AUDIT_ACTIONS,
  AUDIT_RESOURCE,
} from '../audits/constants/audit-actions.constant';
import {
  BLOCK_DURATION_MS,
  IP_STRIKE_PREFIX,
  MAX_STRIKES,
  RATE_LIMIT_CONFIG_KEY,
  HARD_BLOCK_PREFIX,
  HARD_BLOCKED_IPS_SET,
  IP_WHITELIST_SET,
} from './constants/rate-limiter.constants';

interface DynamicConfig {
  strikesCount: number;
  hardBlockDurationMs: number;
}

@Injectable()
export class AuditedThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(AuditedThrottlerGuard.name);

  constructor(
    @Inject('THROTTLER:MODULE_OPTIONS') options: ThrottlerModuleOptions,
    @Inject(ThrottlerStorage) storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly auditProducer: AuditProducer,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {
    super(options, storageService, reflector);
  }

  /**
   * Reads the dynamic rate-limit configuration from Redis.
   * Falls back to compile-time defaults when no config exists.
   */
  private async getDynamicConfig(): Promise<DynamicConfig> {
    try {
      const raw = await this.redis.get(RATE_LIMIT_CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          strikesCount: parsed.strikesCount ?? MAX_STRIKES,
          hardBlockDurationMs:
            (parsed.hardBlockDuration ?? BLOCK_DURATION_MS / 1000) * 1000,
        };
      }
    } catch {
      this.logger.warn('Failed to read rate_limit_config, using defaults');
    }
    return {
      strikesCount: MAX_STRIKES,
      hardBlockDurationMs: BLOCK_DURATION_MS,
    };
  }

  /**
   * Returns the real client IP as the throttler storage key.
   * Express populates req.ip correctly once "trust proxy" is set in main.ts;
   * this override makes the contract explicit and keeps it consistent with
   * the hard-block check in canActivate.
   */
  protected override async getTracker(
    req: Record<string, unknown>,
  ): Promise<string> {
    return req.ip as string;
  }

  /**
   * Extends canActivate to check if the IP is currently hard-blocked
   * before running the normal throttle logic.
   *
   * Two Redis keys can indicate a hard block:
   *   • rate_limit_strikes:{ip}:blocked — set by the auto-block flow
   *   • hard_block:{ip}                 — set by admin manual blocks (and auto-block)
   *
   * Checking both ensures blocks are enforced even if one key is out of sync.
   */
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const ip = req.ip;

    // Whitelisted IPs bypass all rate limiting and blocking entirely.
    if (await this.redis.sIsMember(IP_WHITELIST_SET, ip)) {
      return true;
    }

    const legacyBlockKey = `${IP_STRIKE_PREFIX}:${ip}:blocked`;
    const metaBlockKey = `${HARD_BLOCK_PREFIX}:${ip}`;

    const [legacyBlocked, metaBlocked] = await Promise.all([
      this.redis.get(legacyBlockKey),
      this.redis.get(metaBlockKey),
    ]);

    if (legacyBlocked || metaBlocked) {
      // Use whichever key is present for the TTL
      const activeKey = legacyBlocked ? legacyBlockKey : metaBlockKey;
      const ttl = await this.redis.pTTL(activeKey);
      this.logger.warn(
        `Blocked IP ${ip} attempted request, block expires in ${Math.ceil(ttl / 1000)}s`,
      );

      await this.emitAuditEvent(context, 'IP is hard-blocked', true);

      // Throw 429 directly — do NOT delegate to super which would
      // allow the request once the 60s rate-limit window resets.
      throw new ThrottlerException();
    }

    return super.canActivate(context);
  }

  /**
   * Called by the parent ThrottlerGuard when a request exceeds its limit.
   * We intercept to:
   *  1. Emit an audit log
   *  2. Increment the per-IP strike counter
   *  3. If strikes >= configured strikesCount, block the IP
   */
  protected override async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest();
    const ip = req.ip;
    const strikeKey = `${IP_STRIKE_PREFIX}:${ip}:count`;

    const { strikesCount, hardBlockDurationMs } = await this.getDynamicConfig();

    // Increment strike counter with configurable TTL
    const strikes = await this.redis.incr(strikeKey);
    if (strikes === 1) {
      await this.redis.pExpire(strikeKey, hardBlockDurationMs);
    }

    const shouldBlock = strikes >= strikesCount;

    if (shouldBlock) {
      const blockKey = `${IP_STRIKE_PREFIX}:${ip}:blocked`;
      await this.redis.set(blockKey, '1', { PX: hardBlockDurationMs });

      // Store detailed metadata in the hard_block:{ip} key
      const now = Math.floor(Date.now() / 1000);
      const metadata = {
        ip,
        blockedAt: now,
        blockDuration: hardBlockDurationMs / 1000,
        expiresAt: now + hardBlockDurationMs / 1000,
        userAgent: req.headers?.['user-agent'] ?? 'N/A',
        strikes,
      };
      const metaKey = `${HARD_BLOCK_PREFIX}:${ip}`;
      await this.redis.set(metaKey, JSON.stringify(metadata), {
        PX: hardBlockDurationMs,
      });

      // Maintain an index set for the admin panel
      await this.redis.sAdd(HARD_BLOCKED_IPS_SET, ip);

      // Reset the strike counter (will rebuild after block expires)
      await this.redis.del(strikeKey);

      const durationHrs = Math.round(hardBlockDurationMs / 3_600_000);
      this.logger.warn(
        `IP ${ip} blocked for ${durationHrs}h after ${strikes} rate-limit strikes`,
      );
    }

    // Fire-and-forget audit event
    await this.emitAuditEvent(
      context,
      shouldBlock
        ? `IP blocked for ${Math.round(hardBlockDurationMs / 1000)}s after ${strikes} rate-limit violations`
        : `Rate limit exceeded (strike ${strikes}/${strikesCount})`,
      shouldBlock,
      throttlerLimitDetail,
    );

    return super.throwThrottlingException(context, throttlerLimitDetail);
  }

  private async emitAuditEvent(
    context: ExecutionContext,
    description: string,
    isBlocked: boolean,
    throttlerLimitDetail?: ThrottlerLimitDetail,
  ): Promise<void> {
    try {
      const req = context.switchToHttp().getRequest();

      this.auditProducer.emitAuditEvent({
        action: isBlocked
          ? AUDIT_ACTIONS.SECURITY.IP_BLOCKED
          : AUDIT_ACTIONS.SECURITY.RATE_LIMIT_EXCEEDED,
        resourceType: AUDIT_RESOURCE.RATE_LIMIT,
        resourceId: req.ip,
        ipAddress: req.ip,
        userId: req.user?.id,
        userEmail: req.user?.email,
        userAgent: req.headers?.['user-agent'],
        severity: isBlocked ? 'CRITICAL' : 'HIGH',
        status: 'ALERT',
        description,
        tags: ['rate-limit', 'security'],
        category: 'security',
        changesAfter: {
          method: req.method,
          path: req.url,
          ...(throttlerLimitDetail && {
            limit: throttlerLimitDetail.limit,
            ttl: throttlerLimitDetail.ttl,
            totalHits: throttlerLimitDetail.totalHits,
          }),
        },
      });
    } catch (error) {
      // Never let audit failures break the throttle flow
      this.logger.error('Failed to emit rate-limit audit event', error);
    }
  }
}
