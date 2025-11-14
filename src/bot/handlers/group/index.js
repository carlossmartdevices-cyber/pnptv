/**
 * Group Menu Handler - Main Router
 *
 * Central routing for all group menu actions with tier awareness.
 * Handles /menu command and all callback queries related to group features.
 */

import { Markup } from 'telegraf';
import logger from '../../../utils/logger.js';
import { t, getUserLanguage } from '../../../utils/i18n.js';
import { getUserTier, syncGroupPermissions, getTierBadge, getTierName, trackUserInGroup } from '../../helpers/group/tierSync.js';
import { trackEngagement } from './leaderboard.js';
import { MEMBERSHIP_TIERS } from '../../../services/membershipService.js';

// Import sub-handlers
import * as libraryHandler from './library.js';
import * as eventsHandler from './events.js';
import * as communityHandler from './community.js';
import * as premiumHandler from './premium.js';
import * as infoHandler from './info.js';
import * as linksHandler from './links.js';

/**
 * Register group menu handlers
 */
export function registerGroupMenuHandlers(bot) {
  // Main /menu command
  bot.command('menu', async (ctx) => {
    // Only process in groups
    if (!ctx.chat || (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')) {
      return;
    }

    await showGroupMenu(ctx);
  });

  // Route all group callback queries
  bot.action(/^group:/, async (ctx) => {
    try {
      await routeGroupCallback(ctx);
    } catch (error) {
      logger.error('Error routing group callback:', error);
      await ctx.answerCbQuery('Error processing action. Please try again.', true);
    }
  });

  // Handle callback for opening menu from callback
  bot.action('group:menu', async (ctx) => {
    await showGroupMenu(ctx, true);
  });

  // Handle close menu
  bot.action('group:close', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.deleteMessage().catch(() => {});
  });

  logger.info('Group menu handlers registered');
}

/**
 * Show main group menu with tier-aware options
 * @param {object} ctx - Telegraf context
 * @param {boolean} edit - Whether to edit existing message (true) or send new (false)
 */
export async function showGroupMenu(ctx, edit = false) {
  try {
    const userId = ctx.from.id.toString();
    const lang = getUserLanguage(ctx);

    // Get user tier and sync permissions
    const { tier, isActive } = await getUserTier(userId);
    await syncGroupPermissions(ctx, userId, tier);

    // Track user in group
    await trackUserInGroup(userId, ctx.chat.id, ctx.chat.title);

    const isPremium = tier !== MEMBERSHIP_TIERS.FREE && isActive;

    // Build message
    const tierBadge = getTierBadge(tier);
    const tierName = getTierName(tier, lang);

    const message = lang === 'es'
      ? `🎯 **Menú de la Comunidad PNPtv**\n\n${tierBadge} *${tierName}*\n\nSelecciona una opción:`
      : `🎯 **PNPtv Community Menu**\n\n${tierBadge} *${tierName}*\n\nSelect an option:`;

    const keyboard = buildMainMenu(isPremium, lang);

    // Track menu access
    await trackEngagement(userId, ctx.chat.id, 'menu_opened', 1);

    if (edit) {
      try {
        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } catch (error) {
        // If edit fails, send new message
        if (error.message.includes('message not modified')) {
          await ctx.answerCbQuery();
        } else {
          throw error;
        }
      }
    } else {
      const sentMessage = await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      // Auto-cleanup after 5 minutes
      scheduleMessageCleanup(ctx, sentMessage.message_id, 300000);
    }

    await ctx.answerCbQuery();
  } catch (error) {
    logger.error('Error showing group menu:', error);
    await ctx.answerCbQuery('Error loading menu. Please try again.', true);
  }
}

/**
 * Build main menu keyboard based on tier
 * @param {boolean} isPremium - Whether user has premium access
 * @param {string} lang - Language code
 * @returns {Object} Inline keyboard markup
 */
function buildMainMenu(isPremium, lang) {
  const buttons = [
    [
      Markup.button.callback(
        '📚 ' + (lang === 'es' ? 'Biblioteca' : 'Library'),
        'group:library:menu'
      )
    ],
    [
      Markup.button.callback(
        '📅 ' + (lang === 'es' ? 'Salas y Eventos' : 'Rooms & Events'),
        'group:events:menu'
      )
    ],
    [
      Markup.button.callback(
        '🏆 ' + (lang === 'es' ? 'Comunidad' : 'Community'),
        'group:community:menu'
      )
    ]
  ];

  if (!isPremium) {
    // Show premium benefits for free users
    buttons.push([
      Markup.button.callback(
        '💎 ' + (lang === 'es' ? 'Ver Beneficios Premium' : 'View Premium Benefits'),
        'group:premium:benefits'
      )
    ]);
  }

  buttons.push(
    [
      Markup.button.callback(
        '📋 ' + (lang === 'es' ? 'Info y Reglas' : 'Info & Rules'),
        'group:info:menu'
      )
    ],
    [
      Markup.button.callback(
        '🔗 ' + (lang === 'es' ? 'Enlaces Rápidos' : 'Quick Links'),
        'group:links:menu'
      )
    ],
    [
      Markup.button.callback(
        '🔙 ' + (lang === 'es' ? 'Cerrar' : 'Close'),
        'group:close'
      )
    ]
  );

  return Markup.inlineKeyboard(buttons);
}

/**
 * Route group callback queries to appropriate handlers
 * Callback format: group:section:action
 * Examples: group:library:menu, group:premium:benefits, etc.
 * @param {object} ctx - Telegraf context
 */
async function routeGroupCallback(ctx) {
  const data = ctx.callbackQuery.data;
  const [namespace, section, action] = data.split(':');

  if (namespace !== 'group') return;

  logger.debug(`Routing group callback: section=${section}, action=${action}`);

  // Answer callback to show "processing" state
  await ctx.answerCbQuery().catch(() => {});

  const routes = {
    library: libraryHandler.handleLibrary,
    events: eventsHandler.handleEvents,
    community: communityHandler.handleCommunity,
    premium: premiumHandler.handlePremium,
    info: infoHandler.handleInfo,
    links: linksHandler.handleLinks,
    menu: () => showGroupMenu(ctx, true),
    close: async () => {
      await ctx.deleteMessage().catch(() => {});
    }
  };

  const handler = routes[section];
  if (!handler) {
    logger.warn(`Unknown group section: ${section}`);
    return;
  }

  try {
    await handler(ctx, action);
  } catch (error) {
    logger.error(`Error in group handler ${section}:${action}:`, error);
    await ctx.answerCbQuery('Error. Please try again.', true);
  }
}

/**
 * Schedule message cleanup after delay
 * @param {object} ctx - Telegraf context
 * @param {number} messageId - Message ID to delete
 * @param {number} delayMs - Delay in milliseconds
 */
function scheduleMessageCleanup(ctx, messageId, delayMs = 300000) {
  setTimeout(() => {
    ctx.deleteMessage(messageId).catch(() => {
      logger.debug(`Could not delete message ${messageId}`);
    });
  }, delayMs);
}

/**
 * Send menu via inline button (called from other handlers)
 * Used to provide access to main menu from any context
 * @param {object} ctx - Telegraf context
 * @param {string} message - Message text
 * @returns {Promise<Object>} Sent message object
 */
export async function sendMenuButton(ctx, message) {
  const lang = getUserLanguage(ctx);
  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback(
      '🎯 ' + (lang === 'es' ? 'Abrir Menú' : 'Open Menu'),
      'group:menu'
    )
  ]);

  return await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

export default {
  registerGroupMenuHandlers,
  showGroupMenu,
  buildMainMenu,
  sendMenuButton
};
