/**
 * Session Management Middleware
 */

import { cache, cacheKeys } from '../../../config/redis.js';
import logger from '../../../utils/logger.js';

/**
 * Session middleware to load/save user sessions from Redis
 */
export async function sessionMiddleware(ctx, next) {
  const userId = ctx.from?.id;

  if (!userId) {
    return next();
  }

  try {
    // Load session from Redis
    const sessionKey = cacheKeys.userSession(userId);
    const savedSession = await cache.get(sessionKey);

    if (savedSession) {
      ctx.session = { ...ctx.session, ...savedSession };
    } else {
      // Initialize new session
      ctx.session = {
        userId,
        username: ctx.from.username,
        language: ctx.from.language_code?.split('-')[0] || 'en',
        startedAt: new Date().toISOString(),
      };
    }

    // Save session after each update
    const originalNext = next;
    await originalNext();

    // Save session to Redis
    await cache.set(sessionKey, ctx.session, 86400); // 24 hours TTL
  } catch (error) {
    logger.error('Session middleware error:', error);
    await next();
  }
}

export default sessionMiddleware;
