/**
 * Admin Panel Module
 * Main entry point for admin functionality
 */

import { registerAdminRoutes } from './router.js';
import { adminGuard, adminRateLimit, validateCallbackQuery } from './middleware/adminGuard.js';
import { sessionCleanupMiddleware } from './utils/session.js';
import logger from '../../../utils/logger.js';

/**
 * Register all admin handlers with the bot
 * @param {Telegraf} bot - Telegraf bot instance
 */
export function registerAdminHandlers(bot) {
  logger.info('Registering admin handlers...');

  // Apply admin-specific middleware to admin commands and callbacks
  // This ensures all admin actions are protected and rate-limited

  // Command: /admin
  bot.command('admin',
    sessionCleanupMiddleware(),
    adminGuard(),
    adminRateLimit(5, 60000), // 5 requests per minute
    async (ctx) => {
      const { showAdminPanel } = await import('./router.js');
      await showAdminPanel(ctx);
    }
  );

  // Callback: admin_panel (legacy)
  bot.action('admin_panel',
    sessionCleanupMiddleware(),
    adminGuard(),
    async (ctx) => {
      const { showAdminPanel } = await import('./router.js');
      await showAdminPanel(ctx);
    }
  );

  // Callbacks: admin:* (new pattern)
  bot.action(/^admin:/,
    sessionCleanupMiddleware(),
    adminGuard(),
    adminRateLimit(20, 60000), // 20 requests per minute
    validateCallbackQuery(),
    async (ctx) => {
      const { routeAdminCallback } = await import('./router.js');
      await routeAdminCallback(ctx);
    }
  );

  // Register all routes
  registerAdminRoutes(bot);

  logger.info('Admin handlers registered successfully');
}

export default registerAdminHandlers;
