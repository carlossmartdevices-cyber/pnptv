/**
 * Data Cleanup Service
 */

import { collections } from '../config/firebase.js';
import logger from '../utils/logger.js';

/**
 * Cleanup old data
 */
export async function cleanupOldData() {
  try {
    let cleanedCount = 0;

    // Delete old inactive live streams (older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const oldStreams = await collections
      .liveStreams()
      .where('isActive', '==', false)
      .where('createdAt', '<', sevenDaysAgo)
      .get();

    for (const doc of oldStreams.docs) {
      await doc.ref.delete();
      cleanedCount++;
    }

    logger.info(`Cleaned up ${cleanedCount} old records`);
    return cleanedCount;
  } catch (error) {
    logger.error('Error during cleanup:', error);
    throw error;
  }
}

export default {
  cleanupOldData,
};
