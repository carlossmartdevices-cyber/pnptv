/**
 * Error Handling Middleware
 */

import * as Sentry from '@sentry/node';
import logger from '../../../../utils/logger.js';
import { t, getUserLanguage } from '../../../../utils/i18n.js';

/**
 * Global error handler for the bot
 */
export async function errorHandler(ctx, next) {
  try {
    await next();
  } catch (error) {
    const userId = ctx.from?.id;
    const username = ctx.from?.username;
    const lang = getUserLanguage(ctx);

    // Log error with context
    logger.error('Bot error:', {
      error: error.message,
      stack: error.stack,
      userId,
      username,
      update: ctx.update,
    });

    // Send to Sentry
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error, {
        user: { id: userId, username },
        extra: {
          update: ctx.update,
          session: ctx.session,
        },
      });
    }

    // Send user-friendly error message
    try {
      await ctx.reply(t('serverError', lang), {
        reply_markup: {
          inline_keyboard: [[{ text: t('back', lang), callback_data: 'main_menu' }]],
        },
      });
    } catch (replyError) {
      logger.error('Failed to send error message to user:', replyError);
    }
  }
}

export default errorHandler;
