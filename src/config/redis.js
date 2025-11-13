/**
 * Redis Configuration and Cache Management
 */

import Redis from 'ioredis';
import logger from '../utils/logger.js';

let redisClient = null;

/**
 * Initialize Redis connection
 */
export async function initializeRedis() {
  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB) || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    redisClient.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis ready');
    });

    // Test connection
    await redisClient.ping();

    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    throw error;
  }
}

/**
 * Get Redis client instance
 */
export function getRedis() {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initializeRedis() first.');
  }
  return redisClient;
}

/**
 * Cache wrapper with automatic JSON serialization
 */
export const cache = {
  /**
   * Get value from cache
   */
  async get(key) {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Set value in cache with TTL
   */
  async set(key, value, ttl = parseInt(process.env.CACHE_TTL) || 300) {
    try {
      const serialized = JSON.stringify(value);
      await redisClient.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Delete value from cache
   */
  async del(key) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
      return keys.length;
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  },

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      return (await redisClient.exists(key)) === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Increment value
   */
  async incr(key, ttl = null) {
    try {
      const value = await redisClient.incr(key);
      if (ttl) {
        await redisClient.expire(key, ttl);
      }
      return value;
    } catch (error) {
      logger.error(`Cache incr error for key ${key}:`, error);
      return null;
    }
  },
};

/**
 * Cache key builders for consistency
 */
export const cacheKeys = {
  user: (userId) => `user:${userId}`,
  userSession: (userId) => `session:${userId}`,
  nearbyUsers: (lat, lng, radius) => `nearby:${lat}:${lng}:${radius}`,
  plan: (planId) => `plan:${planId}`,
  liveStreams: () => 'liveStreams:active',
  radioNowPlaying: () => 'radio:nowPlaying',
  zoomRoom: (roomId) => `zoom:${roomId}`,
  rateLimit: (userId, action) => `ratelimit:${userId}:${action}`,
};

export default {
  initializeRedis,
  getRedis,
  cache,
  cacheKeys,
};
