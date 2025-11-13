/**
 * Cron Jobs for Automated Tasks
 */

import cron from 'node-cron';
import { checkExpiredSubscriptions } from '../services/subscriptionService.js';
import { cleanupOldData } from '../services/cleanupService.js';
import logger from './logger.js';

/**
 * Start all cron jobs
 */
export function startCronJobs() {
  // Check for expired subscriptions every day at 2 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running expired subscriptions check...');
    try {
      const expired = await checkExpiredSubscriptions();
      logger.info(`Expired subscriptions check complete. ${expired} subscriptions expired.`);
    } catch (error) {
      logger.error('Error checking expired subscriptions:', error);
    }
  });

  // Cleanup old data every week on Sunday at 3 AM
  cron.schedule('0 3 * * 0', async () => {
    logger.info('Running data cleanup...');
    try {
      const cleaned = await cleanupOldData();
      logger.info(`Data cleanup complete. ${cleaned} records cleaned.`);
    } catch (error) {
      logger.error('Error during data cleanup:', error);
    }
  });

  logger.info('Cron jobs scheduled successfully');
}

export default {
  startCronJobs,
};
