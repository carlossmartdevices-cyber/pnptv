/**
 * Group Tier Synchronization System
 *
 * Handles automatic synchronization of user tier/membership status with group permissions.
 * Ensures users always have the correct permission level matching their subscription tier.
 */

import { getDb, collections } from '../../../config/firebase.js';
import logger from '../../../../utils/logger.js';
import { MEMBERSHIP_TIERS } from '../../../services/membershipService.js';

/**
 * Get user's current tier and membership status
 * @param {string} userId - Telegram user ID
 * @returns {Promise<{tier: string, isActive: boolean, expiryDate: Date|null}>}
 */
export async function getUserTier(userId) {
  try {
    const userDoc = await collections.users().doc(userId).get();

    if (!userDoc.exists) {
      return { tier: MEMBERSHIP_TIERS.FREE, isActive: false, expiryDate: null };
    }

    const userData = userDoc.data();
    const tier = userData.tier || MEMBERSHIP_TIERS.FREE;
    const subscriptionStatus = userData.subscriptionStatus || 'inactive';
    const planExpiry = userData.planExpiry ? new Date(userData.planExpiry) : null;

    // Check if subscription is still valid
    const isActive = subscriptionStatus === 'active' && (!planExpiry || planExpiry > new Date());

    return {
      tier: isActive ? tier : MEMBERSHIP_TIERS.FREE,
      isActive,
      expiryDate: planExpiry
    };
  } catch (error) {
    logger.error(`Error getting user tier for ${userId}:`, error);
    return { tier: MEMBERSHIP_TIERS.FREE, isActive: false, expiryDate: null };
  }
}

/**
 * Get Telegram permissions object for a given tier
 * @param {string} tier - Membership tier
 * @returns {Object} Telegram chat permissions
 */
export function getPermissionsForTier(tier) {
  const basePermissions = {
    can_send_messages: true,
    can_send_audios: tier !== MEMBERSHIP_TIERS.FREE,
    can_send_documents: tier !== MEMBERSHIP_TIERS.FREE,
    can_send_photos: tier !== MEMBERSHIP_TIERS.FREE,
    can_send_videos: tier !== MEMBERSHIP_TIERS.FREE,
    can_send_video_notes: tier !== MEMBERSHIP_TIERS.FREE,
    can_send_voice_notes: tier !== MEMBERSHIP_TIERS.FREE,
    can_send_polls: tier !== MEMBERSHIP_TIERS.FREE,
    can_send_other_messages: tier !== MEMBERSHIP_TIERS.FREE, // Stickers, GIFs, etc.
    can_add_web_page_previews: true,
    can_change_info: false,
    can_invite_users: tier !== MEMBERSHIP_TIERS.FREE,
    can_pin_messages: false,
    can_manage_topics: false
  };

  return basePermissions;
}

/**
 * Sync user's group permissions with their current tier
 * Should be called whenever a user interacts in a group or when tier changes
 * @param {object} ctx - Telegraf context
 * @param {string} userId - Telegram user ID
 * @param {string} tier - User's tier (optional, will fetch if not provided)
 * @returns {Promise<boolean>} Success status
 */
export async function syncGroupPermissions(ctx, userId, tier = null) {
  try {
    // Only process in group chats
    if (!ctx.chat || (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')) {
      return false;
    }

    // Get tier if not provided
    if (!tier) {
      const tierData = await getUserTier(userId);
      tier = tierData.tier;
    }

    const permissions = getPermissionsForTier(tier);

    await ctx.restrictChatMember(userId, permissions);

    logger.debug(`Synced permissions for user ${userId} in group ${ctx.chat.id}: tier=${tier}`);

    return true;
  } catch (error) {
    if (error.message.includes('user not found') || error.message.includes('member not found')) {
      logger.debug(`User ${userId} not in group ${ctx.chat?.id}`);
    } else {
      logger.warn(`Failed to sync permissions for user ${userId}:`, error.message);
    }
    return false;
  }
}

/**
 * Batch sync all group members with their current tiers
 * Admin function to synchronize all members after tier changes
 * @param {object} ctx - Telegraf context
 * @param {number} delayMs - Delay between syncs to avoid rate limits (default 100ms)
 * @returns {Promise<Object>} Sync results {syncedCount, errorCount, totalMembers}
 */
export async function syncAllGroupMembers(ctx, delayMs = 100) {
  try {
    const chatId = ctx.chat.id;

    logger.info(`Starting batch tier sync for group ${chatId}`);

    let syncedCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;

    // Get all users from database
    const usersSnapshot = await collections.users().get();

    for (const doc of usersSnapshot.docs) {
      const userId = doc.id;
      const userData = doc.data();
      const tier = userData.tier || MEMBERSHIP_TIERS.FREE;

      try {
        // Check if user is in this group
        const member = await ctx.getChatMember(parseInt(userId)).catch(() => null);

        if (member && member.status !== 'left' && member.status !== 'kicked') {
          // Sync permissions
          const permissions = getPermissionsForTier(tier);
          await ctx.restrictChatMember(parseInt(userId), permissions);
          syncedCount++;

          logger.debug(`Synced user ${userId} in group ${chatId}: tier=${tier}`);
        } else {
          notFoundCount++;
        }
      } catch (error) {
        errorCount++;
        logger.warn(`Could not sync user ${userId}:`, error.message);
      }

      // Rate limit: wait before next user
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    const result = { syncedCount, errorCount, notFoundCount };
    logger.info(`Batch sync complete for group ${chatId}:`, result);

    return result;
  } catch (error) {
    logger.error('Error in batch sync:', error);
    throw error;
  }
}

/**
 * Track which groups a user belongs to (for syncing across multiple groups)
 * Called whenever user interacts in a group
 * @param {string} userId - Telegram user ID
 * @param {string} groupId - Telegram group ID
 * @param {string} groupName - Group name (optional)
 * @returns {Promise<void>}
 */
export async function trackUserInGroup(userId, groupId, groupName = null) {
  try {
    const userGroupRef = collections.userGroups().doc(`${userId}_${groupId}`);
    const existingDoc = await userGroupRef.get();

    await userGroupRef.set({
      userId: parseInt(userId),
      groupId: parseInt(groupId),
      groupName,
      lastSeen: new Date(),
      joinedAt: existingDoc.exists ? existingDoc.data().joinedAt : new Date()
    }, { merge: true });

    logger.debug(`Tracked user ${userId} in group ${groupId}`);
  } catch (error) {
    logger.warn(`Failed to track user in group:`, error.message);
  }
}

/**
 * Sync user permissions in all groups they're part of
 * Called when tier changes to propagate across all groups
 * @param {object} bot - Telegraf bot instance
 * @param {string} userId - Telegram user ID
 * @param {string} newTier - New tier
 * @returns {Promise<void>}
 */
export async function syncUserInAllGroups(bot, userId, newTier) {
  try {
    // Get list of groups user is in from database
    const userGroupsSnapshot = await getDb()
      .collection('user_groups')
      .where('userId', '==', parseInt(userId))
      .get();

    const permissions = getPermissionsForTier(newTier);

    for (const doc of userGroupsSnapshot.docs) {
      const groupId = doc.data().groupId;

      try {
        await bot.telegram.restrictChatMember(groupId, parseInt(userId), permissions);

        logger.info(`Auto-synced user ${userId} in group ${groupId} to tier ${newTier}`);
      } catch (error) {
        logger.warn(`Could not sync user ${userId} in group ${groupId}:`, error.message);
      }
    }
  } catch (error) {
    logger.error(`Error syncing user ${userId} in all groups:`, error);
  }
}

/**
 * Setup Firestore listeners for tier changes
 * Automatically syncs permissions when user tier changes in Firestore
 * @param {object} bot - Telegraf bot instance
 * @returns {Function} Unsubscribe function to stop listening
 */
export function setupTierChangeListener(bot) {
  try {
    // Watch users collection for tier changes
    const unsubscribe = collections.users().onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'modified') {
          const userId = change.doc.id;
          const newData = change.doc.data();
          const oldData = change.doc.data();

          // Check if tier or subscription status changed
          const tierChanged = newData.tier !== oldData.tier;
          const statusChanged = newData.subscriptionStatus !== oldData.subscriptionStatus;

          if (tierChanged || statusChanged) {
            logger.info(`Tier/status change detected for user ${userId}`);

            // Sync permissions in all groups
            syncUserInAllGroups(bot, userId, newData.tier || MEMBERSHIP_TIERS.FREE)
              .catch(error => logger.error('Error syncing tier change:', error));
          }
        }
      });
    });

    logger.info('Tier change listener setup complete');

    return unsubscribe;
  } catch (error) {
    logger.error('Failed to setup tier change listener:', error);
    return () => {}; // Return no-op unsubscribe
  }
}

/**
 * Get user's tier badge/emoji
 * @param {string} tier - Membership tier
 * @returns {string} Badge emoji
 */
export function getTierBadge(tier) {
  const badges = {
    [MEMBERSHIP_TIERS.FREE]: '🆓',
    [MEMBERSHIP_TIERS.BASIC]: '💎',
    [MEMBERSHIP_TIERS.PREMIUM]: '👑'
  };

  return badges[tier] || '🆓';
}

/**
 * Get user's tier name
 * @param {string} tier - Membership tier
 * @param {string} lang - Language code ('en' or 'es')
 * @returns {string} Tier name
 */
export function getTierName(tier, lang = 'en') {
  const names = {
    [MEMBERSHIP_TIERS.FREE]: lang === 'es' ? 'Gratuito' : 'Free',
    [MEMBERSHIP_TIERS.BASIC]: lang === 'es' ? 'Básico' : 'Basic',
    [MEMBERSHIP_TIERS.PREMIUM]: lang === 'es' ? 'Premium' : 'Premium'
  };

  return names[tier] || names[MEMBERSHIP_TIERS.FREE];
}

export default {
  getUserTier,
  getPermissionsForTier,
  syncGroupPermissions,
  syncAllGroupMembers,
  trackUserInGroup,
  syncUserInAllGroups,
  setupTierChangeListener,
  getTierBadge,
  getTierName
};
