/**
 * Telegram Bot Core Setup
 */

import { Telegraf, session } from 'telegraf';
import logger from '../../utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { sessionMiddleware } from './middleware/sessionMiddleware.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { loggingMiddleware } from './middleware/loggingMiddleware.js';

// Import handlers
import { registerOnboardingHandlers } from '../handlers/user/onboardingHandler.js';
import { registerMainMenuHandlers } from '../handlers/user/mainMenuHandler.js';
import { registerProfileHandlers } from '../handlers/user/profileHandler.js';
import { registerSubscriptionHandlers } from '../handlers/payments/subscriptionHandler.js';
import { registerNearbyUsersHandlers } from '../handlers/user/nearbyUsersHandler.js';
import { registerLiveStreamHandlers } from '../handlers/media/liveStreamHandler.js';
import { registerRadioHandlers } from '../handlers/media/radioHandler.js';
import { registerZoomRoomHandlers } from '../handlers/media/zoomRoomHandler.js';
import { registerAdminHandlers } from '../handlers/admin/adminHandler.js';
import { registerSupportHandlers } from '../handlers/user/supportHandler.js';
import { registerSettingsHandlers } from '../handlers/user/settingsHandler.js';

// Import group handlers
import { registerGroupMenuHandlers } from '../handlers/group/index.js';
import { handleNewGroupMembers } from '../handlers/group/welcome.js';
import { setupTierChangeListener } from '../helpers/group/tierSync.js';
import { mediaFilterMiddleware, engagementTrackerMiddleware } from '../middleware/group/mediaFilter.js';

// Create bot instance
export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

/**
 * Initialize bot with middleware and handlers
 */
export function initializeBot() {
  // Apply middleware in order
  bot.use(loggingMiddleware);
  bot.use(session());
  bot.use(sessionMiddleware);
  bot.use(errorHandler);
  bot.use(rateLimiter);

  // Register group middleware
  bot.use(mediaFilterMiddleware);
  bot.use(engagementTrackerMiddleware);

  // Register all handlers
  registerOnboardingHandlers(bot);
  registerMainMenuHandlers(bot);
  registerProfileHandlers(bot);
  registerSubscriptionHandlers(bot);
  registerNearbyUsersHandlers(bot);
  registerLiveStreamHandlers(bot);
  registerRadioHandlers(bot);
  registerZoomRoomHandlers(bot);
  registerAdminHandlers(bot);
  registerSupportHandlers(bot);
  registerSettingsHandlers(bot);

  // Register group handlers
  registerGroupMenuHandlers(bot);

  // Register new member welcome handler for groups
  bot.on('new_chat_members', handleNewGroupMembers);

  // Setup tier change listener for automatic permission syncing
  try {
    setupTierChangeListener(bot);
  } catch (error) {
    logger.warn('Could not setup tier change listener:', error.message);
  }

  logger.info('Bot initialized with all handlers including group menu system');
}

/**
 * Start the bot
 */
export async function startBot() {
  try {
    initializeBot();

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));

    // Start bot
    await bot.launch();
    logger.info(`Bot @${bot.botInfo.username} started successfully`);

    return bot;
  } catch (error) {
    logger.error('Failed to start bot:', error);
    throw error;
  }
}

export default bot;
