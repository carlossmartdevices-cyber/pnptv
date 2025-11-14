/**
 * Group Music Library Handler
 *
 * Manages group music library and track access.
 */

import { Markup } from 'telegraf';
import logger from '../../../utils/logger.js';
import { getUserLanguage } from '../../../utils/i18n.js';
import { getUserTier } from '../../helpers/group/tierSync.js';
import { MEMBERSHIP_TIERS } from '../../../services/membershipService.js';

/**
 * Handle library menu actions
 * @param {object} ctx - Telegraf context
 * @param {string} action - Action type
 */
export async function handleLibrary(ctx, action) {
  try {
    const lang = getUserLanguage(ctx);

    switch (action) {
      case 'menu':
        await showLibraryMenu(ctx);
        break;
      case 'top':
        await showTopTracks(ctx);
        break;
      case 'search':
        await showSearchPrompt(ctx);
        break;
      case 'add':
        await showAddTrackPrompt(ctx);
        break;
      case 'stats':
        await showLibraryStats(ctx);
        break;
      default:
        logger.warn(`Unknown library action: ${action}`);
    }
  } catch (error) {
    logger.error('Error in library handler:', error);
    await ctx.answerCbQuery('Error. Please try again.', true);
  }
}

/**
 * Show music library menu
 * @param {object} ctx - Telegraf context
 */
export async function showLibraryMenu(ctx) {
  const lang = getUserLanguage(ctx);
  const userId = ctx.from.id.toString();
  const { tier } = await getUserTier(userId);
  const isPremium = tier !== MEMBERSHIP_TIERS.FREE;

  const message = lang === 'es'
    ? `📚 **Biblioteca de Música**\n\nAccede a la colección de música del grupo.`
    : `📚 **Music Library**\n\nAccess the group music collection.`;

  const buttons = [
    [Markup.button.callback(
      '🎵 ' + (lang === 'es' ? 'Pistas Populares' : 'Top Tracks'),
      'group:library:top'
    )],
    [Markup.button.callback(
      '🔍 ' + (lang === 'es' ? 'Buscar' : 'Search'),
      'group:library:search'
    )],
    [Markup.button.callback(
      '📊 ' + (lang === 'es' ? 'Estadísticas' : 'Statistics'),
      'group:library:stats'
    )]
  ];

  if (isPremium) {
    buttons.splice(2, 0, [Markup.button.callback(
      '➕ ' + (lang === 'es' ? 'Agregar Canción' : 'Add Track'),
      'group:library:add'
    )]);
  }

  buttons.push([Markup.button.callback(
    '« ' + (lang === 'es' ? 'Volver' : 'Back'),
    'group:menu'
  )]);

  const keyboard = Markup.inlineKeyboard(buttons);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Show top tracks
 * @param {object} ctx - Telegraf context
 */
export async function showTopTracks(ctx) {
  const lang = getUserLanguage(ctx);

  const message = lang === 'es'
    ? `🎵 **Pistas Populares**\n\nPróximamente: Top tracks del grupo`
    : `🎵 **Top Tracks**\n\nComing soon: Group top tracks`;

  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback(
      '« ' + (lang === 'es' ? 'Volver' : 'Back'),
      'group:library:menu'
    )
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Show search prompt
 * @param {object} ctx - Telegraf context
 */
export async function showSearchPrompt(ctx) {
  const lang = getUserLanguage(ctx);

  const message = lang === 'es'
    ? `🔍 **Buscar en la Biblioteca**\n\nEsta funcionalidad está disponible pronto.`
    : `🔍 **Search Library**\n\nThis feature is coming soon.`;

  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback(
      '« ' + (lang === 'es' ? 'Volver' : 'Back'),
      'group:library:menu'
    )
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Show add track prompt (premium only)
 * @param {object} ctx - Telegraf context
 */
export async function showAddTrackPrompt(ctx) {
  const lang = getUserLanguage(ctx);

  const message = lang === 'es'
    ? `➕ **Agregar Canción**\n\nEsta funcionalidad está disponible pronto.`
    : `➕ **Add Track**\n\nThis feature is coming soon.`;

  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback(
      '« ' + (lang === 'es' ? 'Volver' : 'Back'),
      'group:library:menu'
    )
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Show library statistics
 * @param {object} ctx - Telegraf context
 */
export async function showLibraryStats(ctx) {
  const lang = getUserLanguage(ctx);

  const message = lang === 'es'
    ? `📊 **Estadísticas de la Biblioteca**\n\nPróximamente: Estadísticas detalladas`
    : `📊 **Library Statistics**\n\nComing soon: Detailed statistics`;

  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback(
      '« ' + (lang === 'es' ? 'Volver' : 'Back'),
      'group:library:menu'
    )
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

export default {
  handleLibrary,
  showLibraryMenu,
  showTopTracks,
  showSearchPrompt,
  showAddTrackPrompt,
  showLibraryStats
};
