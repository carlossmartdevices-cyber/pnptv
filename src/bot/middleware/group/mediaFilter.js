/**
 * Group Media Filter Middleware
 *
 * Filters media messages for free users in groups.
 * Automatically deletes prohibited media and notifies users.
 */

import logger from '../../../utils/logger.js';
import { getUserLanguage } from '../../../utils/i18n.js';
import { getUserTier } from '../../helpers/group/tierSync.js';
import { trackEngagement } from '../../handlers/group/leaderboard.js';
import { MEMBERSHIP_TIERS } from '../../../services/membershipService.js';

/**
 * Check if message contains media
 * @param {object} ctx - Telegraf context
 * @returns {boolean} True if message contains media
 */
function hasMedia(ctx) {
  return !!(
    ctx.message.photo ||
    ctx.message.video ||
    ctx.message.audio ||
    ctx.message.document ||
    ctx.message.voice ||
    ctx.message.video_note ||
    ctx.message.animation ||
    ctx.message.sticker
  );
}

/**
 * Get media type from message
 * @param {object} ctx - Telegraf context
 * @returns {string} Media type
 */
function getMediaType(ctx) {
  if (ctx.message.photo) return 'photo';
  if (ctx.message.video) return 'video';
  if (ctx.message.audio) return 'audio';
  if (ctx.message.document) return 'document';
  if (ctx.message.voice) return 'voice';
  if (ctx.message.video_note) return 'video_note';
  if (ctx.message.animation) return 'animation';
  if (ctx.message.sticker) return 'sticker';
  return 'unknown';
}

/**
 * Media filter middleware for groups
 * Restricts media uploads for free users
 * @param {object} ctx - Telegraf context
 * @param {Function} next - Next middleware function
 */
export async function mediaFilterMiddleware(ctx, next) {
  try {
    // Only process messages in groups
    if (!ctx.message || (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')) {
      return next();
    }

    // Skip commands and text-only messages
    if (!hasMedia(ctx)) {
      return next();
    }

    const userId = ctx.from.id.toString();
    const lang = getUserLanguage(ctx);

    // Get user tier
    const { tier } = await getUserTier(userId);

    // Allow media for premium users
    if (tier !== MEMBERSHIP_TIERS.FREE) {
      // Track media for engagement
      await trackEngagement(userId, ctx.chat.id, 'media', 5);
      return next();
    }

    // Free user posted media - need to handle
    const mediaType = getMediaType(ctx);

    logger.debug(`Free user ${userId} posted ${mediaType} in group ${ctx.chat.id}`);

    // Delete the message
    try {
      await ctx.deleteMessage();
    } catch (error) {
      logger.warn(`Could not delete media from free user ${userId}:`, error.message);
    }

    // Send upgrade notification
    const message = lang === 'es'
      ? `📸 *Oops!* Los usuarios gratuitos no pueden enviar fotos, videos o documentos.\n\n` +
        `💎 Actualiza a Premium para desbloquear esta función y muchas más.\n\n` +
        `[Ver planes](https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=subscribe)`
      : `📸 *Oops!* Free users can't send photos, videos, or documents.\n\n` +
        `💎 Upgrade to Premium to unlock this feature and many more.\n\n` +
        `[View plans](https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=subscribe)`;

    const notifMsg = await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    });

    // Auto-delete notification after 10 seconds
    setTimeout(() => {
      ctx.deleteMessage(notifMsg.message_id).catch(() => {});
    }, 10000);

    // Don't continue to next handler
    return;
  } catch (error) {
    logger.error('Error in media filter middleware:', error);
    return next();
  }
}

/**
 * Engagement tracker middleware for groups
 * Tracks user activity to calculate engagement score
 * @param {object} ctx - Telegraf context
 * @param {Function} next - Next middleware function
 */
export async function engagementTrackerMiddleware(ctx, next) {
  try {
    // Only process in groups
    if (!ctx.message || (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')) {
      return next();
    }

    // Skip commands
    if (ctx.message.entities?.some(e => e.type === 'bot_command')) {
      return next();
    }

    const userId = ctx.from.id.toString();
    const groupId = ctx.chat.id.toString();

    // Track based on content type
    let action = 'message';
    let points = 1;

    if (hasMedia(ctx)) {
      action = 'media';
      points = 5; // Media is worth more points
    } else if (ctx.message.text?.length > 100) {
      points = 2; // Long messages worth more
    }

    // Track engagement asynchronously (don't block response)
    trackEngagement(userId, groupId, action, points).catch(error => {
      logger.warn('Error tracking engagement:', error.message);
    });

    return next();
  } catch (error) {
    logger.error('Error in engagement tracker middleware:', error);
    return next();
  }
}

export default {
  mediaFilterMiddleware,
  engagementTrackerMiddleware
};
