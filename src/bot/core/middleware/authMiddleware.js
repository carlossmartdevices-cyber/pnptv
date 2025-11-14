/**
 * Authentication and Authorization Middleware
 */

import { getUserById } from '../../../services/userService.js';
import logger from '../../../../utils/logger.js';
import { t, getUserLanguage } from '../../../../utils/i18n.js';

/**
 * Check if user exists and has completed onboarding
 */
export async function authMiddleware(ctx, next) {
  const userId = ctx.from?.id;

  if (!userId) {
    return;
  }

  try {
    const user = await getUserById(userId);

    if (!user) {
      // User doesn't exist, will be handled by onboarding
      return next();
    }

    if (!user.onboardingCompleted) {
      // User exists but hasn't completed onboarding
      const lang = getUserLanguage(ctx);
      await ctx.reply(t('welcome', lang));
      return;
    }

    // Attach user to context
    ctx.state.user = user;
    return next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return next();
  }
}

/**
 * Require active subscription middleware
 */
export function requireSubscription(ctx, next) {
  const user = ctx.state.user;
  const lang = getUserLanguage(ctx);

  if (!user || user.subscriptionStatus !== 'active') {
    ctx.reply(t('notSubscribed', lang), {
      reply_markup: {
        inline_keyboard: [
          [{ text: t('subscribe', lang), callback_data: 'show_subscription_plans' }],
          [{ text: t('back', lang), callback_data: 'main_menu' }],
        ],
      },
    });
    return;
  }

  return next();
}

/**
 * Admin-only middleware
 */
export function requireAdmin(ctx, next) {
  const userId = ctx.from?.id;
  const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').map(Number);
  const lang = getUserLanguage(ctx);

  if (!adminIds.includes(userId)) {
    ctx.reply(t('unauthorized', lang), {
      reply_markup: {
        inline_keyboard: [[{ text: t('back', lang), callback_data: 'main_menu' }]],
      },
    });
    return;
  }

  return next();
}

/**
 * Require location middleware
 */
export function requireLocation(ctx, next) {
  const user = ctx.state.user;
  const lang = getUserLanguage(ctx);

  if (!user?.location) {
    ctx.reply(t('locationRequired', lang), {
      reply_markup: {
        inline_keyboard: [
          [{ text: t('editLocation', lang), callback_data: 'edit_location' }],
          [{ text: t('back', lang), callback_data: 'main_menu' }],
        ],
      },
    });
    return;
  }

  return next();
}

export default authMiddleware;
