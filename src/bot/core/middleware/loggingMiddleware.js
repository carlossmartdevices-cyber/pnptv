/**
 * Logging Middleware
 */

import logger from '../../../../utils/logger.js';

/**
 * Log all incoming updates
 */
export async function loggingMiddleware(ctx, next) {
  const start = Date.now();
  const userId = ctx.from?.id;
  const username = ctx.from?.username;
  const updateType = ctx.updateType;

  logger.info('Incoming update', {
    userId,
    username,
    updateType,
    messageText: ctx.message?.text,
    callbackData: ctx.callbackQuery?.data,
  });

  await next();

  const ms = Date.now() - start;
  logger.info('Update processed', { userId, username, updateType, duration: `${ms}ms` });
}

export default loggingMiddleware;
