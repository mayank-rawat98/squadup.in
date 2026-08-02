// src/rate-limiter/rate-limiter.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import type { RedisClientType } from 'redis';
import { ThrottlerStorageRedis } from './interfaces/throttler-storage-redis.interface';

@Injectable()
export class RateLimiterService implements ThrottlerStorageRedis {
  private readonly scriptSrc: string;

  constructor(
    @Inject('REDIS_CLIENT') private readonly client: RedisClientType,
  ) {
    this.scriptSrc = this.getScriptSrc();
  }

  private getScriptSrc(): string {
    return `
      local hitKey = KEYS[1]
      local blockKey = KEYS[2]
      local throttlerName = ARGV[1]
      local ttl = tonumber(ARGV[2])
      local limit = tonumber(ARGV[3])
      local blockDuration = tonumber(ARGV[4])

      local totalHits = redis.call('INCR', hitKey)
      local timeToExpire = redis.call('PTTL', hitKey)

      if timeToExpire <= 0 then
        redis.call('PEXPIRE', hitKey, ttl)
        timeToExpire = ttl
      end

      local isBlocked = redis.call('GET', blockKey)
      local timeToBlockExpire = 0

      if isBlocked then
        timeToBlockExpire = redis.call('PTTL', blockKey)
      elseif totalHits > limit then
        redis.call('SET', blockKey, 1, 'PX', blockDuration)
        isBlocked = '1'
        timeToBlockExpire = blockDuration
      end

      if isBlocked and timeToBlockExpire <= 0 then
        redis.call('DEL', blockKey)
        redis.call('SET', hitKey, 1, 'PX', ttl)
        totalHits = 1
        timeToExpire = ttl
        isBlocked = false
      end

      return { totalHits, timeToExpire, isBlocked and 1 or 0, timeToBlockExpire }
    `.trim();
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitKey = `{${key}:${throttlerName}}:hits`;
    const blockKey = `{${key}:${throttlerName}}:blocked`;

    const args = [
      'EVAL',
      this.scriptSrc,
      '2',
      hitKey,
      blockKey,
      throttlerName,
      String(ttl),
      String(limit),
      String(blockDuration),
    ];

    const raw = await this.client.sendCommand(args as string[]);
    if (!Array.isArray(raw)) {
      throw new TypeError(
        `Expected array result from Redis eval, got ${typeof raw}`,
      );
    }

    const [totalHitsRaw, timeToExpireRaw, isBlockedRaw, timeToBlockExpireRaw] =
      raw;

    return {
      totalHits: Number(totalHitsRaw),
      timeToExpire: Math.ceil(Number(timeToExpireRaw) / 1000),
      isBlocked: Number(isBlockedRaw) === 1,
      timeToBlockExpire: Math.ceil(Number(timeToBlockExpireRaw) / 1000),
    };
  }
}
