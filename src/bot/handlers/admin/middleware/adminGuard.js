/**
 * Admin Access Guard Middleware
 * Ensures only authorized admins can access admin panel
 */

import { getUserLanguage } from '../../../utils/i18n.js';
import logger from '../../../utils/logger.js';
import { logFailedAction } from '../utils/audit.js';
import { initializeAdminSession } from '../utils/session.js';

/**
 * Get admin IDs from environment
 * @returns {array} Array of admin user IDs
 */
function getAdminIds() {
  const adminIdsStr = process.env.ADMIN_USER_IDS || '';
  return adminIdsStr.split(',').map((id) => parseInt(id.trim())).filter((id) => !isNaN(id));
}

/**
 * Check if user is admin
 * @param {number|string} userId - User ID to check
 * @returns {boolean} True if user is admin
 */
export function isAdmin(userId) {
  if (!userId) return false;
  const id = typeof userId === 'string' ? parseInt(userId) : userId;
  const adminIds = getAdminIds();
  return adminIds.includes(id);
}

/**
 * Admin guard middleware
 * Checks if user has admin access and initializes session
 * @returns {Function} Telegraf middleware
 */
export function adminGuard() {
  return async (ctx, next) => {
    const userId = ctx.from?.id;
    const lang = getUserLanguage(ctx);

    // Check if user is admin
    if (!isAdmin(userId)) {
      // Log unauthorized access attempt
      logger.warn('Unauthorized admin access attempt', {
        userId,
        username: ctx.from?.username,
        firstName: ctx.from?.first_name,
      });

      await logFailedAction(ctx, 'admin_access', 'User is not admin', { userId });

      const message = lang === 'es'
        ? '⛔ No autorizado. Este comando es solo para administradores.'
        : '⛔ Unauthorized. This command is for administrators only.';

      if (ctx.callbackQuery) {
        await ctx.answerCbQuery(message, true);
      } else {
        await ctx.reply(message);
      }

      return; // Don't proceed to next handler
    }

    // Initialize admin session
    initializeAdminSession(ctx);

    // Log admin access
    logger.debug('Admin access granted', {
      adminId: userId,
      username: ctx.from?.username,
    });

    // Continue to next handler
    return next();
  };
}

/**
 * Require specific permission within admin panel
 * @param {string} requiredPermission - Permission needed
 * @returns {Function} Telegraf middleware
 */
export function requirePermission(requiredPermission) {
  return async (ctx, next) => {
    const userId = ctx.from?.id;

    // TODO: Implement permission system based on admin roles
    // For now, all admins have full access

    return next();
  };
}

/**
 * Rate limit middleware for admin actions
 * @param {number} maxActions - Max actions allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Telegraf middleware
 */
export function adminRateLimit(maxActions = 10, windowMs = 60000) {
  const adminLimits = new Map();

  return async (ctx, next) => {
    const userId = ctx.from?.id;
    const now = Date.now();

    if (!adminLimits.has(userId)) {
      adminLimits.set(userId, []);
    }

    const timestamps = adminLimits.get(userId);
    const recentActions = timestamps.filter((ts) => now - ts < windowMs);

    if (recentActions.length >= maxActions) {
      const lang = getUserLanguage(ctx);
      const message = lang === 'es'
        ? '⏱️ Demasiadas solicitudes. Por favor espera un momento.'
        : '⏱️ Too many requests. Please wait a moment.';

      if (ctx.callbackQuery) {
        await ctx.answerCbQuery(message, true);
      } else {
        await ctx.reply(message);
      }

      logger.warn('Admin rate limit exceeded', { adminId: userId });
      return; // Don't proceed
    }

    recentActions.push(now);
    adminLimits.set(userId, recentActions);

    return next();
  };
}

/**
 * Validate callback query
 * Ensures callback data is properly formatted
 * @returns {Function} Telegraf middleware
 */
export function validateCallbackQuery() {
  return async (ctx, next) => {
    if (!ctx.callbackQuery) {
      return next();
    }

    const data = ctx.callbackQuery?.data;

    // Validate callback format
    if (!data || !data.startsWith('admin:')) {
      logger.warn('Invalid callback format', {
        adminId: ctx.from?.id,
        data,
      });

      await ctx.answerCbQuery('⚠️ Invalid action', true);
      return;
    }

    return next();
  };
}

/**
 * Get admin info for audit
 * @param {object} ctx - Telegraf context
 * @returns {object} Admin info
 */
export function getAdminInfo(ctx) {
  return {
    adminId: ctx.from?.id,
    username: ctx.from?.username || 'unknown',
    firstName: ctx.from?.first_name || '',
    lastName: ctx.from?.last_name || '',
    languageCode: ctx.from?.language_code || 'en',
  };
}

/**
 * Check admin role (for future implementation)
 * @param {number} adminId - Admin ID
 * @returns {string} Admin role
 */
export function getAdminRole(adminId) {
  // TODO: Implement role system
  // For now, all admins are 'super_admin'
  return 'super_admin';
}

export default {
  isAdmin,
  adminGuard,
  requirePermission,
  adminRateLimit,
  validateCallbackQuery,
  getAdminInfo,
  getAdminRole,
};
