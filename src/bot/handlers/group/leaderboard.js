/**
 * Group Leaderboard & Engagement Handler
 *
 * Tracks user engagement and displays group leaderboard.
 * Gamification features to encourage community participation.
 */

import { Markup } from 'telegraf';
import { collections } from '../../../config/firebase.js';
import logger from '../../../utils/logger.js';
import { getUserLanguage } from '../../../utils/i18n.js';
import { getTierBadge, getTierName } from '../../helpers/group/tierSync.js';

/**
 * Track user engagement action
 * @param {string} userId - Telegram user ID
 * @param {string} groupId - Telegram group ID
 * @param {string} action - Action type (message, media, menu_opened, etc.)
 * @param {number} points - Points to add (default 1)
 */
export async function trackEngagement(userId, groupId, action, points = 1) {
  try {
    const engagementRef = collections.groupEngagement().doc(`${groupId}_${userId}`);
    const doc = await engagementRef.get();

    const now = new Date();
    const updateData = {
      userId: parseInt(userId),
      groupId: parseInt(groupId),
      score: doc.exists ? doc.data().score + points : points,
      lastActive: now
    };

    // Track action-specific counts
    if (action === 'message') {
      updateData.messagesCount = doc.exists ? (doc.data().messagesCount || 0) + 1 : 1;
    } else if (action === 'media') {
      updateData.mediaCount = doc.exists ? (doc.data().mediaCount || 0) + 1 : 1;
    } else if (action === 'event') {
      updateData.eventsAttended = doc.exists ? (doc.data().eventsAttended || 0) + 1 : 1;
    }

    // Preserve other fields
    if (doc.exists) {
      const existing = doc.data();
      updateData.joinedAt = existing.joinedAt;
      updateData.messagesCount = updateData.messagesCount || existing.messagesCount || 0;
      updateData.mediaCount = updateData.mediaCount || existing.mediaCount || 0;
      updateData.eventsAttended = updateData.eventsAttended || existing.eventsAttended || 0;
    } else {
      updateData.joinedAt = now;
      updateData.messagesCount = updateData.messagesCount || 0;
      updateData.mediaCount = updateData.mediaCount || 0;
      updateData.eventsAttended = updateData.eventsAttended || 0;
    }

    await engagementRef.set(updateData, { merge: true });

    logger.debug(`Tracked engagement for user ${userId} in group ${groupId}: ${action} (+${points})`);
  } catch (error) {
    logger.warn(`Error tracking engagement:`, error.message);
  }
}

/**
 * Get top users by engagement score
 * @param {string} groupId - Telegram group ID
 * @param {number} limit - Number of top users to return (default 10)
 * @returns {Promise<Array>} Array of top users with tier info
 */
export async function getTopUsers(groupId, limit = 10) {
  try {
    const snapshot = await collections.groupEngagement()
      .where('groupId', '==', parseInt(groupId))
      .orderBy('score', 'desc')
      .limit(limit)
      .get();

    const users = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const userId = data.userId.toString();

      try {
        // Get user info
        const userDoc = await collections.users().doc(userId).get();
        const userData = userDoc.data();

        users.push({
          userId,
          name: userData?.firstName || userData?.username || 'User',
          tier: userData?.tier || 'free',
          score: data.score,
          messagesCount: data.messagesCount || 0,
          mediaCount: data.mediaCount || 0,
          eventsAttended: data.eventsAttended || 0
        });
      } catch (error) {
        logger.warn(`Could not fetch user ${userId} info:`, error.message);
      }
    }

    return users;
  } catch (error) {
    logger.warn(`Error getting top users for group ${groupId}:`, error.message);
    return [];
  }
}

/**
 * Get user's current rank in group
 * @param {string} userId - Telegram user ID
 * @param {string} groupId - Telegram group ID
 * @returns {Promise<Object>} User rank info
 */
export async function getUserRank(userId, groupId) {
  try {
    const userEngagementRef = collections.groupEngagement().doc(`${groupId}_${userId}`);
    const userDoc = await userEngagementRef.get();

    if (!userDoc.exists) {
      return { rank: null, score: 0, percentile: 0 };
    }

    const userData = userDoc.data();
    const userScore = userData.score;

    // Count users with higher score
    const higherSnapshot = await collections.groupEngagement()
      .where('groupId', '==', parseInt(groupId))
      .where('score', '>', userScore)
      .get();

    const rank = higherSnapshot.size + 1;

    // Get total users for percentile
    const totalSnapshot = await collections.groupEngagement()
      .where('groupId', '==', parseInt(groupId))
      .get();

    const totalUsers = totalSnapshot.size;
    const percentile = totalUsers > 0 ? Math.round(((totalUsers - rank + 1) / totalUsers) * 100) : 0;

    return {
      rank,
      score: userScore,
      percentile,
      messagesCount: userData.messagesCount || 0,
      mediaCount: userData.mediaCount || 0,
      eventsAttended: userData.eventsAttended || 0
    };
  } catch (error) {
    logger.warn(`Error getting user rank:`, error.message);
    return { rank: null, score: 0, percentile: 0 };
  }
}

/**
 * Format and display leaderboard
 * @param {object} ctx - Telegraf context
 */
export async function showLeaderboard(ctx) {
  try {
    const lang = getUserLanguage(ctx);
    const groupId = ctx.chat.id.toString();

    // Get top users
    const topUsers = await getTopUsers(groupId, 10);

    if (topUsers.length === 0) {
      const message = lang === 'es'
        ? '📊 *Tabla de Clasificación*\n\nNo hay datos de actividad aún. ¡Comienza a participar!'
        : '📊 *Leaderboard*\n\nNo activity data yet. Start participating!';

      const keyboard = Markup.inlineKeyboard([
        Markup.button.callback(
          lang === 'es' ? '« Volver' : '« Back',
          'group:community:menu'
        )
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      return;
    }

    const message = formatLeaderboard(topUsers, lang);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(
        lang === 'es' ? '🏆 Mi Rango' : '🏆 My Rank',
        'group:community:myrank'
      )],
      [Markup.button.callback(
        lang === 'es' ? '« Volver' : '« Back',
        'group:community:menu'
      )]
    ]);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error) {
    logger.error('Error showing leaderboard:', error);
    await ctx.answerCbQuery('Error loading leaderboard.', true);
  }
}

/**
 * Show user's rank in the group
 * @param {object} ctx - Telegraf context
 */
export async function showMyRank(ctx) {
  try {
    const lang = getUserLanguage(ctx);
    const userId = ctx.from.id.toString();
    const groupId = ctx.chat.id.toString();

    const rankData = await getUserRank(userId, groupId);

    let message;
    if (!rankData.rank) {
      message = lang === 'es'
        ? '📊 *Mi Rango*\n\nAún no tienes datos de actividad. ¡Empieza a participar!'
        : '📊 *My Rank*\n\nNo activity data yet. Start participating!';
    } else {
      const medal = rankData.rank <= 3 ? ['🥇', '🥈', '🥉'][rankData.rank - 1] : `#${rankData.rank}`;
      message = lang === 'es'
        ? `📊 *Mi Rango*\n\n${medal} **Rango:** ${rankData.rank}\n💯 **Puntuación:** ${rankData.score}\n📈 **Percentil:** ${rankData.percentile}%\n\n💬 **Mensajes:** ${rankData.messagesCount}\n📸 **Multimedia:** ${rankData.mediaCount}\n🎯 **Eventos:** ${rankData.eventsAttended}`
        : `📊 *My Rank*\n\n${medal} **Rank:** ${rankData.rank}\n💯 **Score:** ${rankData.score}\n📈 **Percentile:** ${rankData.percentile}%\n\n💬 **Messages:** ${rankData.messagesCount}\n📸 **Media:** ${rankData.mediaCount}\n🎯 **Events:** ${rankData.eventsAttended}`;
    }

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(
        lang === 'es' ? '🏆 Ver Tabla' : '🏆 View Leaderboard',
        'group:community:leaderboard'
      )],
      [Markup.button.callback(
        lang === 'es' ? '« Volver' : '« Back',
        'group:community:menu'
      )]
    ]);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error) {
    logger.error('Error showing my rank:', error);
    await ctx.answerCbQuery('Error loading rank.', true);
  }
}

/**
 * Format leaderboard message
 * @param {Array} users - Array of top users
 * @param {string} lang - Language code
 * @returns {string} Formatted message
 */
function formatLeaderboard(users, lang) {
  const header = lang === 'es'
    ? `🏆 **Tabla de Clasificación**\n\n**Top 10 Miembros Más Activos:**\n\n`
    : `🏆 **Leaderboard**\n\n**Top 10 Most Active Members:**\n\n`;

  let message = header;

  const medals = ['🥇', '🥈', '🥉'];

  users.forEach((user, index) => {
    const rank = index + 1;
    const medal = rank <= 3 ? medals[index] : `${rank}.`;
    const tierBadge = getTierBadge(user.tier);

    message += `${medal} **${user.name}** ${tierBadge}\n`;
    message += `   📊 Score: ${user.score} | 💬 ${user.messagesCount} msgs\n\n`;
  });

  return message;
}

export default {
  trackEngagement,
  getTopUsers,
  getUserRank,
  showLeaderboard,
  showMyRank,
  formatLeaderboard
};
