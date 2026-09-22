import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { AdminSecurityService } from './admin-security.service';

/**
 * Owns the admin side of rate limiting: the Redis-held rate-limit config, IP
 * hard-blocks and the IP whitelist that the audited throttler guard reads on
 * every request. It exposes no HTTP routes of its own — the ops dashboard
 * reaches it through the staff-guarded admin-ops security controller.
 */
@Module({
  imports: [RedisModule],
  providers: [AdminSecurityService],
  exports: [AdminSecurityService],
})
export class AdminSecurityModule {}
