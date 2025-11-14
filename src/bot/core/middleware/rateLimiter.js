/**
 * Rate Limiting Middleware
 */

import { cache, cacheKeys } from '../../../config/redis.js';
import logger from '../../../../utils/logger.js';
import { t, getUserLanguage } from '../../../../utils/i18n.js';

const RATE_LIMIT_WINDOW = 60; // 60 seconds
const RATE_LIMIT_MAX = 20; // 20 requests per minute

/**
 * Rate limiter middleware to prevent spam
 */
export async function rateLimiter(ctx, next) {
  const userId = ctx.from?.id;

  if (!userId) {
    return next();
  }

  try {
    const key = cacheKeys.rateLimit(userId, 'general');
    const current = await cache.incr(key, RATE_LIMIT_WINDOW);

    if (current === 1) {
      // First request in the window, just proceed
      return next();
    }

    if (current > RATE_LIMIT_MAX) {
      const lang = getUserLanguage(ctx);
      logger.warn(`Rate limit exceeded for user ${userId}`);

      await ctx.reply(t('error', lang) + ' Please slow down.', {
        reply_markup: {
          inline_keyboard: [[{ text: t('back', lang), callback_data: 'main_menu' }]],
        },
      });
      return;
    }

    return next();
  } catch (error) {
    logger.error('Rate limiter error:', error);
    // Don't block user if rate limiter fails
    return next();
  }
}

/**
 * Action-specific rate limiter
 */
export async function actionRateLimiter(action, maxRequests = 5, windowSeconds = 60) {
  return async (ctx, next) => {
    const userId = ctx.from?.id;

    if (!userId) {
      return next();
    }

    try {
      const key = cacheKeys.rateLimit(userId, action);
      const current = await cache.incr(key, windowSeconds);

      if (current > maxRequests) {
        const lang = getUserLanguage(ctx);
        logger.warn(`Rate limit exceeded for user ${userId} on action ${action}`);

        await ctx.reply(
          t('error', lang) + ` Please wait before trying this action again.`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: t('back', lang), callback_data: 'main_menu' }]],
            },
          }
        );
        return;
      }

      return next();
    } catch (error) {
      logger.error('Action rate limiter error:', error);
      return next();
    }
  };
}

export default rateLimiter;
