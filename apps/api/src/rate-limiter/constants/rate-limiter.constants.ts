export const IP_STRIKE_PREFIX = 'rate_limit_strikes';
export const MAX_STRIKES = 4;
export const BLOCK_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

/** Redis key for dynamic rate-limit configuration */
export const RATE_LIMIT_CONFIG_KEY = 'rate_limit_config';
/** Redis SET holding all currently hard-blocked IPs */
export const HARD_BLOCKED_IPS_SET = 'hard_blocked_ips';
/** Prefix for per-IP hard-block metadata (hard_block:{ip}) */
export const HARD_BLOCK_PREFIX = 'hard_block';

/** Redis SET holding all whitelisted IPs (bypass rate limits + blocks) */
export const IP_WHITELIST_SET = 'ip_whitelist_ips';
/** Prefix for per-IP whitelist metadata (ip_whitelist:{ip}) */
export const IP_WHITELIST_PREFIX = 'ip_whitelist';
