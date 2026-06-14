/**
 * JWT Token Blacklist
 * Uses Redis to store revoked tokens. When Redis is unavailable, falls back
 * to an in-memory Set (cleared on server restart — acceptable for dev).
 *
 * Blacklisted tokens are stored with TTL = token expiry, so Redis auto-cleans them.
 */

import { getRedisClient } from '../config/redis';
import { logger } from './logger';

// In-memory fallback (when Redis isn't configured)
const memBlacklist = new Set<string>();

/**
 * Blacklist a JWT token (called on logout or user deactivation).
 * @param jti  JWT ID (use userId+iat as the key if no jti claim)
 * @param ttlSeconds  Seconds until the token expires naturally
 */
export async function blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.setex(`blacklist:${jti}`, ttlSeconds, '1');
      logger.debug(`🚫 Token blacklisted in Redis: ${jti}`);
    } catch (err) {
      logger.warn('Token blacklist Redis write failed — falling back to memory', err);
      memBlacklist.add(jti);
    }
  } else {
    // No Redis — use in-memory (cleared on restart, fine for dev)
    memBlacklist.add(jti);
    // Auto-expire from memory after ttlSeconds
    setTimeout(() => memBlacklist.delete(jti), ttlSeconds * 1000);
    logger.debug(`🚫 Token blacklisted in memory: ${jti}`);
  }
}

/**
 * Check if a JWT token has been blacklisted.
 */
export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const result = await redis.exists(`blacklist:${jti}`);
      return result === 1;
    } catch {
      // Redis read failed — check memory fallback
      return memBlacklist.has(jti);
    }
  }
  return memBlacklist.has(jti);
}
