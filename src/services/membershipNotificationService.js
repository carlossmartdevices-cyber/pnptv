/**
 * Membership Notification Service
 *
 * Handles all membership-related notifications:
 * - Activation confirmations
 * - Expiration warnings (7 days before)
 * - Expiration reminders (1 day before)
 * - Downgrade notifications
 * - Invite link notifications
 */

import { bot } from '../bot/core/bot.js';
import { Markup } from 'telegraf';
import { t } from '../utils/i18n.js';
import logger from '../utils/logger.js';
import { collections } from '../config/firebase.js';
import { TIER_FEATURES } from './membershipService.js';

/**
 * Send membership activation confirmation
 *
 * @param {number} userId - User ID
 * @param {Object} membershipData - Membership details
 * @returns {Promise<boolean>} Success status
 */
export async function sendActivationConfirmation(userId, membershipData) {
  try {
    const { tier, planName, expiryDate, inviteLink } = membershipData;
    const tierFeatures = TIER_FEATURES[tier];

    // Get user language
    const userDoc = await collections.users().doc(userId.toString()).get();
    const lang = userDoc.exists ? userDoc.data().language : 'en';

    let message =
      t('membershipActivated', lang) + '\n\n' +
      `🎉 *${t('congratulations', lang)}!*\n\n` +
      `${t('yourPlan', lang)}: *${planName}*\n` +
      `${t('tier', lang)}: *${tier.toUpperCase()}*\n` +
      `${t('expiresOn', lang)}: ${expiryDate.toLocaleDateString()}\n\n` +
      `${t('yourFeatures', lang)}:\n`;

    tierFeatures.features.forEach(feature => {
      message += `✅ ${feature}\n`;
    });

    if (inviteLink) {
      message +=
        `\n🔗 *${t('yourInviteCode', lang)}:*\n` +
        `\`${inviteLink}\`\n\n` +
        `${t('shareInviteCode', lang)}`;
    }

    await bot.telegram.sendMessage(userId, message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(t('myProfile', lang), 'show_profile')],
        [Markup.button.callback(t('backToMenu', lang), 'show_main_menu')],
      ]),
    });

    logger.info(`Activation confirmation sent to user ${userId}`);
    return true;
  } catch (error) {
    logger.error(`Error sending activation confirmation to ${userId}:`, error);
    return false;
  }
}

/**
 * Send expiration warnings (7 days before)
 *
 * @param {Array} expiringUsers - Array of expiring users
 * @returns {Promise<Object>} Send results
 */
export async function sendExpirationWarnings(expiringUsers) {
  let sent = 0;
  let failed = 0;

  for (const user of expiringUsers) {
    try {
      const { userId, language, tier, planId, expiryDate, daysRemaining } = user;

      const message =
        `⚠️ *${t('expirationWarning', language)}*\n\n` +
        `${t('yourMembership', language)}: *${tier.toUpperCase()}*\n` +
        `${t('expiresIn', language)}: *${daysRemaining} ${t('days', language)}*\n` +
        `${t('expiryDate', language)}: ${expiryDate.toLocaleDateString()}\n\n` +
        `${t('renewNowMessage', language)}`;

      await bot.telegram.sendMessage(userId, message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(t('renewNow', language), 'show_subscription_plans')],
          [Markup.button.callback(t('dismiss', language), 'dismiss_notification')],
        ]),
      });

      // Log the notification
      await collections.membershipHistory().add({
        userId,
        action: 'expiration_warning',
        tier,
        planId,
        expiryDate,
        daysRemaining,
        triggeredBy: 'system',
        reason: 'expiration_warning_7d',
        createdAt: new Date(),
      });

      sent++;
      logger.info(`Expiration warning sent to user ${userId} (${daysRemaining} days)`);
    } catch (error) {
      failed++;
      logger.error(`Failed to send expiration warning to ${user.userId}:`, error);
    }

    // Rate limiting: wait 100ms between messages
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const result = {
    total: expiringUsers.length,
    sent,
    failed,
  };

  logger.info('Expiration warnings completed:', result);
  return result;
}

/**
 * Send expiration reminders (1 day before)
 *
 * @param {Array} expiringUsers - Array of expiring users
 * @returns {Promise<Object>} Send results
 */
export async function sendExpirationReminders(expiringUsers) {
  let sent = 0;
  let failed = 0;

  for (const user of expiringUsers) {
    try {
      const { userId, language, tier, planId, expiryDate, daysRemaining } = user;

      const message =
        `🔔 *${t('finalReminder', language)}*\n\n` +
        `${t('yourMembership', language)} *${tier.toUpperCase()}* ${t('expiresIn', language)} *${daysRemaining} ${t('days', language)}*!\n\n` +
        `${t('expiryDate', language)}: ${expiryDate.toLocaleDateString()}\n\n` +
        `${t('afterExpirationMessage', language)}\n\n` +
        `${t('renewNowToKeepAccess', language)}`;

      await bot.telegram.sendMessage(userId, message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(t('renewNow', language), 'show_subscription_plans')],
          [Markup.button.callback(t('dismiss', language), 'dismiss_notification')],
        ]),
      });

      // Log the notification
      await collections.membershipHistory().add({
        userId,
        action: 'expiration_reminder',
        tier,
        planId,
        expiryDate,
        daysRemaining,
        triggeredBy: 'system',
        reason: 'expiration_reminder_1d',
        createdAt: new Date(),
      });

      sent++;
      logger.info(`Expiration reminder sent to user ${userId} (${daysRemaining} days)`);
    } catch (error) {
      failed++;
      logger.error(`Failed to send expiration reminder to ${user.userId}:`, error);
    }

    // Rate limiting: wait 100ms between messages
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const result = {
    total: expiringUsers.length,
    sent,
    failed,
  };

  logger.info('Expiration reminders completed:', result);
  return result;
}

/**
 * Send downgrade notification (after membership expires)
 *
 * @param {number} userId - User ID
 * @param {string} previousTier - Previous tier
 * @param {string} language - User language
 * @returns {Promise<boolean>} Success status
 */
export async function sendDowngradeNotification(userId, previousTier, language = 'en') {
  try {
    const message =
      `📉 *${t('membershipExpired', language)}*\n\n` +
      `${t('yourMembershipHasExpired', language)}\n\n` +
      `${t('previousTier', language)}: *${previousTier.toUpperCase()}*\n` +
      `${t('currentTier', language)}: *FREE*\n\n` +
      `${t('renewToReactivate', language)}`;

    await bot.telegram.sendMessage(userId, message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(t('renewNow', language), 'show_subscription_plans')],
        [Markup.button.callback(t('backToMenu', language), 'show_main_menu')],
      ]),
    });

    logger.info(`Downgrade notification sent to user ${userId}`);
    return true;
  } catch (error) {
    logger.error(`Error sending downgrade notification to ${userId}:`, error);
    return false;
  }
}

/**
 * Send invite link generated notification
 *
 * @param {number} userId - User ID
 * @param {string} inviteCode - Invite code
 * @param {Date} expiresAt - Expiration date
 * @param {string} language - User language
 * @returns {Promise<boolean>} Success status
 */
export async function sendInviteLinkGenerated(userId, inviteCode, expiresAt, language = 'en') {
  try {
    const botUsername = process.env.BOT_USERNAME || 'PNPtvBot';
    const inviteUrl = `https://t.me/${botUsername}?start=${inviteCode}`;

    const message =
      `🎁 *${t('inviteLinkGenerated', language)}*\n\n` +
      `${t('yourInviteCode', language)}:\n` +
      `\`${inviteCode}\`\n\n` +
      `${t('inviteLink', language)}:\n` +
      `${inviteUrl}\n\n` +
      `${t('maxUses', language)}: 5\n` +
      `${t('expiresOn', language)}: ${expiresAt.toLocaleDateString()}\n\n` +
      `${t('shareWithFriends', language)}`;

    await bot.telegram.sendMessage(userId, message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.url(t('shareLink', language), `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}`)],
        [Markup.button.callback(t('backToMenu', language), 'show_main_menu')],
      ]),
    });

    logger.info(`Invite link notification sent to user ${userId}`);
    return true;
  } catch (error) {
    logger.error(`Error sending invite link notification to ${userId}:`, error);
    return false;
  }
}

/**
 * Cleanup expired invite links
 *
 * @returns {Promise<Object>} Cleanup results
 */
export async function cleanupExpiredInviteLinks() {
  try {
    const now = new Date();
    let cleaned = 0;

    // Find expired active invite links
    const snapshot = await collections.inviteLinks()
      .where('status', '==', 'active')
      .where('expiresAt', '<', now)
      .get();

    logger.info(`Found ${snapshot.size} expired invite links to clean up`);

    // Deactivate each link
    const batch = [];

    for (const doc of snapshot.docs) {
      batch.push(
        doc.ref.update({
          status: 'expired',
          deactivatedAt: now,
          deactivationReason: 'expired',
        })
      );

      cleaned++;

      // Batch in chunks of 500 (Firestore limit)
      if (batch.length >= 500) {
        await Promise.all(batch);
        batch.length = 0;
      }
    }

    // Process remaining batch
    if (batch.length > 0) {
      await Promise.all(batch);
    }

    const result = {
      total: snapshot.size,
      cleaned,
    };

    logger.info('Invite links cleanup completed:', result);
    return result;
  } catch (error) {
    logger.error('Error cleaning up invite links:', error);
    throw error;
  }
}

/**
 * Notify user about successful invite link usage
 *
 * @param {number} ownerId - Invite link owner ID
 * @param {number} newUserId - New user who used the invite
 * @param {string} language - Owner language
 * @returns {Promise<boolean>} Success status
 */
export async function sendInviteUsedNotification(ownerId, newUserId, language = 'en') {
  try {
    const message =
      `🎉 *${t('inviteUsed', language)}*\n\n` +
      `${t('newUserJoined', language)}: ${newUserId}\n` +
      `${t('thankYouForSharing', language)}`;

    await bot.telegram.sendMessage(ownerId, message, {
      parse_mode: 'Markdown',
    });

    logger.info(`Invite used notification sent to owner ${ownerId}`);
    return true;
  } catch (error) {
    logger.error(`Error sending invite used notification to ${ownerId}:`, error);
    return false;
  }
}

export default {
  sendActivationConfirmation,
  sendExpirationWarnings,
  sendExpirationReminders,
  sendDowngradeNotification,
  sendInviteLinkGenerated,
  cleanupExpiredInviteLinks,
  sendInviteUsedNotification,
};
