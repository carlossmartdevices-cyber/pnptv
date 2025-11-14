/**
 * Rate Limiting Middleware for Admin Actions
 */

import logger from '../../../utils/logger.js';
import { getUserLanguage } from '../../../utils/i18n.js';
import { logFailedAction } from '../utils/audit.js';

/**
 * In-memory rate limit store
 * Structure: Map<userId, Map<action, [timestamps]>>
 */
const rateLimitStore = new Map();

/**
 * Default rate limit config
 */
const DEFAULT_LIMITS = {
  broadcast: { maxRequests: 5, windowMs: 60000 }, // 5 per minute
  activation: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
  search: { maxRequests: 30, windowMs: 60000 }, // 30 per minute
  message: { maxRequests: 20, windowMs: 60000 }, // 20 per minute
  default: { maxRequests: 100, windowMs: 60000 }, // 100 per minute (default)
};

/**
 * Check rate limit for action
 * @param {string} userId - User ID
 * @param {string} action - Action name
 * @param {object} limits - Rate limit config (maxRequests, windowMs)
 * @returns {object} Rate limit info { allowed: boolean, remaining: number, resetIn: number }
 */
export function checkRateLimit(userId, action, limits = DEFAULT_LIMITS.default) {
  const now = Date.now();
  const userKey = String(userId);

  // Initialize store if needed
  if (!rateLimitStore.has(userKey)) {
    rateLimitStore.set(userKey, new Map());
  }

  const userActions = rateLimitStore.get(userKey);

  // Initialize action tracking if needed
  if (!userActions.has(action)) {
    userActions.set(action, []);
  }

  const timestamps = userActions.get(action);

  // Remove old timestamps outside window
  const recentTimestamps = timestamps.filter((ts) => now - ts < limits.windowMs);

  // Check if limit exceeded
  const allowed = recentTimestamps.length < limits.maxRequests;
  const remaining = Math.max(0, limits.maxRequests - recentTimestamps.length);
  const resetIn = recentTimestamps.length > 0
    ? limits.windowMs - (now - recentTimestamps[0])
    : 0;

  // Add current timestamp if allowed
  if (allowed) {
    recentTimestamps.push(now);
  }

  userActions.set(action, recentTimestamps);

  return {
    allowed,
    remaining: allowed ? remaining - 1 : 0,
    resetIn: allowed ? 0 : resetIn,
  };
}

/**
 * Create rate limit middleware
 * @param {string} action - Action name
 * @param {object} limits - Rate limit config
 * @returns {Function} Telegraf middleware
 */
export function createRateLimitMiddleware(action, limits = null) {
  const config = limits || DEFAULT_LIMITS[action] || DEFAULT_LIMITS.default;

  return async (ctx, next) => {
    const userId = ctx.from?.id;
    const lang = getUserLanguage(ctx);

    const result = checkRateLimit(userId, action, config);

    if (!result.allowed) {
      const waitSeconds = Math.ceil(result.resetIn / 1000);

      const message = lang === 'es'
        ? `⏱️ Demasiadas solicitudes. Intenta de nuevo en ${waitSeconds}s.`
        : `⏱️ Too many requests. Try again in ${waitSeconds}s.`;

      if (ctx.callbackQuery) {
        await ctx.answerCbQuery(message, true);
      } else {
        await ctx.reply(message);
      }

      logger.warn(`Rate limit exceeded: ${action}`, {
        adminId: userId,
        action,
        resetIn: result.resetIn,
      });

      await logFailedAction(ctx, 'rate_limit', `Rate limited on ${action}`, {
        action,
        resetIn: result.resetIn,
      });

      return; // Don't proceed
    }

    // Attach rate limit info to context
    ctx.rateLimit = {
      action,
      remaining: result.remaining,
      resetIn: result.resetIn,
    };

    return next();
  };
}

/**
 * Rate limit middleware factory - checks multiple actions
 * @param {array} actions - Array of [action, limits] tuples
 * @returns {Function} Telegraf middleware
 */
export function createMultiActionRateLimiter(actions = []) {
  return async (ctx, next) => {
    const userId = ctx.from?.id;
    const lang = getUserLanguage(ctx);

    // Check limits for all specified actions
    for (const [action, limits] of actions) {
      const config = limits || DEFAULT_LIMITS[action] || DEFAULT_LIMITS.default;
      const result = checkRateLimit(userId, action, config);

      if (!result.allowed) {
        const waitSeconds = Math.ceil(result.resetIn / 1000);

        const message = lang === 'es'
          ? `⏱️ Límite de ${action} alcanzado. Intenta en ${waitSeconds}s.`
          : `⏱️ ${action} limit reached. Try again in ${waitSeconds}s.`;

        if (ctx.callbackQuery) {
          await ctx.answerCbQuery(message, true);
        } else {
          await ctx.reply(message);
        }

        return; // Don't proceed
      }
    }

    return next();
  };
}

/**
 * Reset rate limit for user (admin action)
 * @param {string} userId - User ID
 * @param {string} action - Action to reset or 'all' for everything
 */
export function resetRateLimit(userId, action = 'all') {
  const userKey = String(userId);

  if (action === 'all') {
    rateLimitStore.delete(userKey);
  } else if (rateLimitStore.has(userKey)) {
    const userActions = rateLimitStore.get(userKey);
    userActions.delete(action);
  }

  logger.debug('Rate limit reset', { userId, action });
}

/**
 * Get rate limit status for user
 * @param {string} userId - User ID
 * @returns {object} Current rate limit status
 */
export function getRateLimitStatus(userId) {
  const userKey = String(userId);

  if (!rateLimitStore.has(userKey)) {
    return {};
  }

  const userActions = rateLimitStore.get(userKey);
  const status = {};

  userActions.forEach((timestamps, action) => {
    const now = Date.now();
    const config = DEFAULT_LIMITS[action] || DEFAULT_LIMITS.default;
    const recent = timestamps.filter((ts) => now - ts < config.windowMs);

    status[action] = {
      count: recent.length,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - recent.length),
    };
  });

  return status;
}

/**
 * Clear all rate limit data (admin action)
 * WARNING: This affects all users
 */
export function clearAllRateLimits() {
  rateLimitStore.clear();
  logger.warn('All rate limits cleared');
}

/**
 * Get rate limiter stats
 * @returns {object} Stats about rate limiter
 */
export function getRateLimiterStats() {
  let totalUsers = 0;
  let totalActions = 0;

  rateLimitStore.forEach((userActions) => {
    totalUsers++;
    totalActions += userActions.size;
  });

  return {
    trackingUsers: totalUsers,
    trackedActions: totalActions,
  };
}

export default {
  checkRateLimit,
  createRateLimitMiddleware,
  createMultiActionRateLimiter,
  resetRateLimit,
  getRateLimitStatus,
  clearAllRateLimits,
  getRateLimiterStats,
};
