/**
 * Cron Jobs for Automated Tasks
 */

import { CronJob } from 'cron';
import { checkExpiredSubscriptions } from '../services/subscriptionService.js';
import { cleanupOldData } from '../services/cleanupService.js';
import {
  batchExpireMemberships,
  getExpiringMemberships,
} from '../services/membershipService.js';
import {
  sendExpirationWarnings,
  sendExpirationReminders,
  cleanupExpiredInviteLinks,
} from '../services/membershipNotificationService.js';
import logger from './logger.js';

/**
 * Start all cron jobs
 */
export function startCronJobs() {
  // Batch expire memberships every day at 2 AM UTC
  new CronJob('0 2 * * *', async () => {
    logger.info('🔄 Running batch membership expiration...');
    try {
      const result = await batchExpireMemberships(1000); // Process up to 1000 at a time
      logger.info(`✅ Batch expiration complete:`, result);
    } catch (error) {
      logger.error('❌ Error in batch expiration:', error);
    }
  }, null, true);

  // Send expiration warnings (7 days before) every day at 10 AM UTC
  new CronJob('0 10 * * *', async () => {
    logger.info('⚠️ Sending expiration warnings (7 days)...');
    try {
      const expiringUsers = await getExpiringMemberships(7);
      const result = await sendExpirationWarnings(expiringUsers);
      logger.info(`✅ Expiration warnings sent: ${result.sent}/${result.total}`);
    } catch (error) {
      logger.error('❌ Error sending expiration warnings:', error);
    }
  }, null, true);

  // Send expiration reminders (1 day before) every day at 6 PM UTC
  new CronJob('0 18 * * *', async () => {
    logger.info('🔔 Sending expiration reminders (1 day)...');
    try {
      const expiringUsers = await getExpiringMemberships(1);
      const result = await sendExpirationReminders(expiringUsers);
      logger.info(`✅ Expiration reminders sent: ${result.sent}/${result.total}`);
    } catch (error) {
      logger.error('❌ Error sending expiration reminders:', error);
    }
  }, null, true);

  // Cleanup expired invite links every week on Sunday at 3 AM UTC
  new CronJob('0 3 * * 0', async () => {
    logger.info('🧹 Cleaning up expired invite links...');
    try {
      const result = await cleanupExpiredInviteLinks();
      logger.info(`✅ Invite links cleanup complete: ${result.cleaned} links deactivated`);
    } catch (error) {
      logger.error('❌ Error cleaning up invite links:', error);
    }
  }, null, true);

  // Legacy: Check for expired subscriptions (backwards compatibility)
  // This can be removed after migration to batchExpireMemberships
  if (process.env.LEGACY_EXPIRATION_CHECK === 'true') {
    new CronJob('0 2 * * *', async () => {
      logger.info('Running legacy expired subscriptions check...');
      try {
        const expired = await checkExpiredSubscriptions();
        logger.info(`Legacy check complete. ${expired} subscriptions expired.`);
      } catch (error) {
        logger.error('Error in legacy expiration check:', error);
      }
    }, null, true);
  }

  // Cleanup old data every week on Sunday at 4 AM UTC
  new CronJob('0 4 * * 0', async () => {
    logger.info('🧹 Running data cleanup...');
    try {
      const cleaned = await cleanupOldData();
      logger.info(`✅ Data cleanup complete. ${cleaned} records cleaned.`);
    } catch (error) {
      logger.error('❌ Error during data cleanup:', error);
    }
  }, null, true);

  logger.info('✅ Cron jobs scheduled successfully:');
  logger.info('   • Batch expiration: Daily at 2 AM UTC');
  logger.info('   • Expiration warnings (7d): Daily at 10 AM UTC');
  logger.info('   • Expiration reminders (1d): Daily at 6 PM UTC');
  logger.info('   • Invite links cleanup: Weekly Sunday at 3 AM UTC');
  logger.info('   • Data cleanup: Weekly Sunday at 4 AM UTC');
}

export default {
  startCronJobs,
};
