import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';

/**
 * Interface for Redis-backed throttler storage services.
 * This defines the contract your RateLimiterService implements.
 */
export interface ThrottlerStorageRedis {
  /**
   * Increments the request counter for a given key and returns
   * the current throttling state.
   *
   * @param key - Unique identifier for the client (IP, userId, etc.)
   * @param ttl - Time-to-live in milliseconds for the rate window
   * @param limit - Maximum allowed hits within the ttl period
   * @param blockDuration - Optional duration (in ms) to block the key after exceeding the limit
   * @param throttlerName - Name of the throttler (useful for multi-throttler setups)
   *
   * @returns ThrottlerStorageRecord
   */
  increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord>;
}
