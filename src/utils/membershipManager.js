/**
 * Membership Management Utility
 * Handles user tier activation, upgrades, and channel invitations
 */

import { collections } from '../config/firebase.js';
import logger from './logger.js';

/**
 * Activate membership for a user
 * @param {number} userId - Telegram user ID
 * @param {string} tier - Membership tier: "Free", "Silver", or "Golden"
 * @param {string} activatedBy - Who activated (e.g., "system", "admin", "payment")
 * @param {number} durationDays - Duration in days (0 = lifetime for Free tier)
 * @param {object} telegram - Telegram bot instance for sending notifications
 * @returns {Promise<object>} Activation result
 */
export async function activateMembership(userId, tier, activatedBy = 'system', durationDays = 0, telegram = null) {
  try {
    const userRef = collections.users().doc(userId.toString());
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error(`User ${userId} not found`);
    }

    const now = new Date();
    const expiresAt = durationDays > 0
      ? new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)
      : null; // null = lifetime for Free tier

    const updates = {
      tier,
      membershipExpiresAt: expiresAt,
      membershipActivatedAt: now,
      membershipActivatedBy: activatedBy,
      updatedAt: now,
    };

    await userRef.update(updates);

    logger.info(`Membership activated for user ${userId}: ${tier} tier by ${activatedBy}`);

    // Send notification to user if telegram instance provided
    if (telegram) {
      try {
        const user = userDoc.data();
        const lang = user.language || 'en';
        const message = tier === 'Free'
          ? (lang === 'es'
              ? '🎉 ¡Tu membresía gratuita ha sido activada!'
              : '🎉 Your free membership has been activated!')
          : (lang === 'es'
              ? `💎 ¡Tu membresía ${tier} ha sido activada! Expira: ${expiresAt?.toLocaleDateString()}`
              : `💎 Your ${tier} membership has been activated! Expires: ${expiresAt?.toLocaleDateString()}`);

        await telegram.sendMessage(userId, message);
      } catch (notifyError) {
        logger.warn(`Could not send activation notification to user ${userId}:`, notifyError.message);
      }
    }

    return {
      success: true,
      tier,
      expiresAt,
      activatedBy,
    };
  } catch (error) {
    logger.error(`Error activating membership for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Check if user's membership is active
 * @param {number} userId - Telegram user ID
 * @returns {Promise<boolean>} True if membership is active
 */
export async function isMembershipActive(userId) {
  try {
    const userRef = collections.users().doc(userId.toString());
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return false;
    }

    const user = userDoc.data();

    // Free tier never expires
    if (user.tier === 'Free') {
      return true;
    }

    // Check if paid tier is still valid
    if (user.membershipExpiresAt) {
      const now = new Date();
      const expiresAt = user.membershipExpiresAt.toDate
        ? user.membershipExpiresAt.toDate()
        : new Date(user.membershipExpiresAt);

      return now < expiresAt;
    }

    return false;
  } catch (error) {
    logger.error(`Error checking membership for user ${userId}:`, error);
    return false;
  }
}

/**
 * Upgrade user membership to a higher tier
 * @param {number} userId - Telegram user ID
 * @param {string} newTier - New membership tier
 * @param {number} durationDays - Duration in days
 * @param {string} upgradedBy - Who upgraded (e.g., "payment", "admin")
 * @returns {Promise<object>} Upgrade result
 */
export async function upgradeMembership(userId, newTier, durationDays, upgradedBy = 'payment') {
  return activateMembership(userId, newTier, upgradedBy, durationDays);
}

/**
 * Get user's current membership tier
 * @param {number} userId - Telegram user ID
 * @returns {Promise<string|null>} Current tier or null
 */
export async function getUserTier(userId) {
  try {
    const userRef = collections.users().doc(userId.toString());
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return null;
    }

    const user = userDoc.data();
    return user.tier || 'Free';
  } catch (error) {
    logger.error(`Error getting tier for user ${userId}:`, error);
    return null;
  }
}

export default {
  activateMembership,
  isMembershipActive,
  upgradeMembership,
  getUserTier,
};
