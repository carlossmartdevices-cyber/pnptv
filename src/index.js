/**
 * PNPtv Telegram Bot - Main Entry Point
 * Production-ready bot with subscriptions, live streams, and social features
 */

import 'dotenv/config';
import { bot, startBot } from './bot/core/bot.js';
import { startWebServer } from './bot/api/server.js';
import { initializeFirebase } from './config/firebase.js';
import { initializeRedis } from './config/redis.js';
import { startCronJobs } from './utils/cron.js';
import logger from './utils/logger.js';
import * as Sentry from '@sentry/node';

/**
 * Initialize Sentry for error tracking
 */
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
  logger.info('Sentry initialized successfully');
}

/**
 * Main application initialization
 */
async function main() {
  try {
    logger.info('🚀 Starting PNPtv Telegram Bot...');

    // Initialize Firebase
    await initializeFirebase();
    logger.info('✅ Firebase initialized');

    // Initialize Redis
    await initializeRedis();
    logger.info('✅ Redis initialized');

    // Start web server for webhooks and API
    await startWebServer();
    logger.info('✅ Web server started');

    // Start Telegram bot
    await startBot();
    logger.info('✅ Telegram bot started');

    // Start cron jobs for subscription management
    startCronJobs();
    logger.info('✅ Cron jobs started');

    logger.info('🎉 PNPtv Bot is now running!');
  } catch (error) {
    logger.error('❌ Failed to start bot:', error);
    Sentry.captureException(error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal) {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  try {
    // Stop the bot
    await bot.stop(signal);
    logger.info('Bot stopped');

    // Add any other cleanup here
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  Sentry.captureException(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  Sentry.captureException(reason);
});

// Start the application
main();
