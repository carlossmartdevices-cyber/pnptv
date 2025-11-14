/**
 * Group Community Handler
 *
 * Manages group community features like leaderboard, polls, and announcements.
 */

import { Markup } from 'telegraf';
import logger from '../../../utils/logger.js';
import { getUserLanguage } from '../../../utils/i18n.js';
import { showLeaderboard, showMyRank } from './leaderboard.js';

/**
 * Handle community menu actions
 * @param {object} ctx - Telegraf context
 * @param {string} action - Action type
 */
export async function handleCommunity(ctx, action) {
  try {
    switch (action) {
      case 'menu':
        await showCommunityMenu(ctx);
        break;
      case 'leaderboard':
        await showLeaderboard(ctx);
        break;
      case 'myrank':
        await showMyRank(ctx);
        break;
      case 'achievements':
        await showAchievements(ctx);
        break;
      case 'polls':
        await showPolls(ctx);
        break;
      case 'announcements':
        await showAnnouncements(ctx);
        break;
      case 'members':
        await showOnlineMembers(ctx);
        break;
      default:
        logger.warn(`Unknown community action: ${action}`);
    }
  } catch (error) {
    logger.error('Error in community handler:', error);
    await ctx.answerCbQuery('Error. Please try again.', true);
  }
}

/**
 * Show community menu
 * @param {object} ctx - Telegraf context
 */
export async function showCommunityMenu(ctx) {
  const lang = getUserLanguage(ctx);

  const message = lang === 'es'
    ? `🏆 **Comunidad**\n\nAccede a características comunitarias del grupo.`
    : `🏆 **Community**\n\nAccess community features for the group.`;

  const buttons = [
    [Markup.button.callback(
      '📊 ' + (lang === 'es' ? 'Tabla de Clasificación' : 'Leaderboard'),
      'group:community:leaderboard'
    )],
    [Markup.button.callback(
      '🎯 ' + (lang === 'es' ? 'Mis Logros' : 'My Achievements'),
      'group:community:achievements'
    )],
    [Markup.button.callback(
      '🗳️ ' + (lang === 'es' ? 'Encuestas' : 'Active Polls'),
      'group:community:polls'
    )],
    [Markup.button.callback(
      '📢 ' + (lang === 'es' ? 'Anuncios' : 'Announcements'),
      'group:community:announcements'
    )],
    [Markup.button.callback(
      '👥 ' + (lang === 'es' ? 'Miembros Activos' : 'Active Members'),
      'group:community:members'
    )],
    [Markup.button.callback(
      '« ' + (lang === 'es' ? 'Volver' : 'Back'),
      'group:menu'
    )]
  ];

  const keyboard = Markup.inlineKeyboard(buttons);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Show achievements
 * @param {object} ctx - Telegraf context
 */
export async function showAchievements(ctx) {
  const lang = getUserLanguage(ctx);

  const message = lang === 'es'
    ? `🎯 **Mis Logros**\n\nEsta funcionalidad está disponible pronto.`
    : `🎯 **My Achievements**\n\nThis feature is coming soon.`;

  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback(
      '« ' + (lang === 'es' ? 'Volver' : 'Back'),
      'group:community:menu'
    )
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Show polls
 * @param {object} ctx - Telegraf context
 */
export async function showPolls(ctx) {
  const lang = getUserLanguage(ctx);

  const message = lang === 'es'
    ? `🗳️ **Encuestas Activas**\n\nNo hay encuestas en este momento.`
    : `🗳️ **Active Polls**\n\nNo polls available at this time.`;

  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback(
      '« ' + (lang === 'es' ? 'Volver' : 'Back'),
      'group:community:menu'
    )
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Show announcements
 * @param {object} ctx - Telegraf context
 */
export async function showAnnouncements(ctx) {
  const lang = getUserLanguage(ctx);

  const message = lang === 'es'
    ? `📢 **Anuncios**\n\nNo hay anuncios en este momento.`
    : `📢 **Announcements**\n\nNo announcements at this time.`;

  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback(
      '« ' + (lang === 'es' ? 'Volver' : 'Back'),
      'group:community:menu'
    )
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Show online members
 * @param {object} ctx - Telegraf context
 */
export async function showOnlineMembers(ctx) {
  const lang = getUserLanguage(ctx);

  const message = lang === 'es'
    ? `👥 **Miembros Activos**\n\nEsta funcionalidad está disponible pronto.`
    : `👥 **Active Members**\n\nThis feature is coming soon.`;

  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback(
      '« ' + (lang === 'es' ? 'Volver' : 'Back'),
      'group:community:menu'
    )
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

export default {
  handleCommunity,
  showCommunityMenu,
  showAchievements,
  showPolls,
  showAnnouncements,
  showOnlineMembers
};
