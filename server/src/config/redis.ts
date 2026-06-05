import Redis from 'ioredis';
import { logger } from '../utils/logger';
import env from './env';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  // Skip Redis entirely if no URL is configured
  if (!env.REDIS_URL) return null;

  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });

    redisClient.on('error', (error) => {
      logger.warn('⚠️ Redis connection error (non-fatal):', error.message);
    });
  }
  return redisClient;
}

export async function connectRedis(): Promise<void> {
  if (!env.REDIS_URL) {
    logger.info('ℹ️  Redis URL not set — skipping Redis (cache disabled)');
    return;
  }
  try {
    const client = getRedisClient();
    if (client) await client.connect();
  } catch (error) {
    logger.warn('⚠️ Redis unavailable, continuing without cache');
  }
}

export class RedisCache {
  private client: Redis | null;

  constructor() {
    this.client = getRedisClient();
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.setex(key, ttlSeconds, JSON.stringify(value));
    } catch {
      // fail silently
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch {
      // fail silently
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.client) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch {
      // fail silently
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch {
      return false;
    }
  }

  async increment(key: string): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.incr(key);
    } catch {
      return 0;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.expire(key, ttlSeconds);
    } catch {
      // fail silently
    }
  }
}

export const cache = new RedisCache();
export default cache;
