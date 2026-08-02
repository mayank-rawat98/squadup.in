import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerStorage } from '@nestjs/throttler';
import { RedisModule } from '../redis/redis.module';
import { RateLimiterService } from './rate-limiter.service';
import { AuditedThrottlerGuard } from './audited-throttler.guard';

@Global()
@Module({
  imports: [
    RedisModule,
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      useFactory: async (rateLimiter: RateLimiterService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: 60,
            limit: 25,
          },
        ],
        storage: {
          increment: async (
            key: string,
            ttl: number,
            limit: number,
            blockDuration = 0,
            throttlerName = 'default',
          ) =>
            rateLimiter.increment(
              key,
              ttl * 1000,
              limit,
              blockDuration * 1000,
              throttlerName,
            ),
        } as ThrottlerStorage,
      }),
      inject: [RateLimiterService],
    }),
  ],
  providers: [
    RateLimiterService,
    {
      provide: ThrottlerStorage,
      useFactory: (rateLimiter: RateLimiterService): ThrottlerStorage =>
        ({
          increment: async (
            key: string,
            ttl: number,
            limit: number,
            blockDuration = 0,
            throttlerName = 'default',
          ) =>
            rateLimiter.increment(
              key,
              ttl * 1000,
              limit,
              blockDuration * 1000,
              throttlerName,
            ),
        }) as ThrottlerStorage,
      inject: [RateLimiterService],
    },
    {
      provide: APP_GUARD,
      useClass: AuditedThrottlerGuard,
    },
  ],
  exports: [RateLimiterService],
})
export class RateLimiterModule {}
