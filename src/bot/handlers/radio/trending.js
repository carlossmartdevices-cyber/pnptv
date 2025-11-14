/**
 * Radio Trending Handler
 * Shows trending and recently added tracks
 */

import { Markup } from 'telegraf';
import { getUserLanguage } from '../../../utils/i18n.js';
import radioService from '../../../services/radio/radioService.js';
import logger from '../../../utils/logger.js';

/**
 * Show trending tracks
 */
export async function showTrending(ctx) {
  try {
    const lang = getUserLanguage(ctx);

    // Get trending tracks
    const trending = await radioService.getTrendingTracks(10, 'week');

    if (trending.length === 0) {
      await ctx.editMessageText(
        lang === 'es'
          ? `🔥 **Tendencias**\n\nNo hay canciones en tendencia aún.`
          : `🔥 **Trending Now**\n\nNo trending tracks yet.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'radio:menu' },
            ]],
          },
        }
      );
      return;
    }

    let message = lang === 'es'
      ? `🔥 **Tendencias de la Semana**\n\nLas canciones más populares:\n\n`
      : `🔥 **Trending This Week**\n\nMost popular tracks:\n\n`;

    trending.forEach((track, index) => {
      const typeEmoji = track.type === 'podcast' ? '🎙️' : '🎶';
      message += `${index + 1}. ${typeEmoji} **${track.title}**\n`;
      message += `   👤 ${track.artist} • 🔥 ${track.recentPlays} recent plays\n\n`;
    });

    // Build keyboard with track buttons
    const buttons = trending.slice(0, 5).map((track, index) => [{
      text: `${index + 1}. ${track.title.substring(0, 30)}${track.title.length > 30 ? '...' : ''}`,
      callback_data: `radio:track:${track.id}`,
    }]);

    buttons.push(
      [
        { text: '📅 ' + (lang === 'es' ? 'Hoy' : 'Today'), callback_data: 'radio:trending:day' },
        { text: '📅 ' + (lang === 'es' ? 'Mes' : 'Month'), callback_data: 'radio:trending:month' },
      ],
      [{ text: '🔙 ' + (lang === 'es' ? 'Volver' : 'Back'), callback_data: 'radio:menu' }]
    );

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons },
    });

    await ctx.answerCbQuery();
  } catch (error) {
    logger.error('Error showing trending:', error);
    await ctx.answerCbQuery('Error');
  }
}

/**
 * Show trending with timeframe
 */
export async function showTrendingTimeframe(ctx) {
  try {
    const lang = getUserLanguage(ctx);
    const timeframe = ctx.match[1]; // day, week, month

    // Get trending tracks
    const trending = await radioService.getTrendingTracks(10, timeframe);

    if (trending.length === 0) {
      await ctx.answerCbQuery(
        lang === 'es' ? 'No hay canciones en tendencia' : 'No trending tracks'
      );
      return;
    }

    const timeframeText = {
      day: lang === 'es' ? 'Hoy' : 'Today',
      week: lang === 'es' ? 'Esta Semana' : 'This Week',
      month: lang === 'es' ? 'Este Mes' : 'This Month',
    };

    let message = lang === 'es'
      ? `🔥 **Tendencias: ${timeframeText[timeframe]}**\n\nLas canciones más populares:\n\n`
      : `🔥 **Trending: ${timeframeText[timeframe]}**\n\nMost popular tracks:\n\n`;

    trending.forEach((track, index) => {
      const typeEmoji = track.type === 'podcast' ? '🎙️' : '🎶';
      message += `${index + 1}. ${typeEmoji} **${track.title}**\n`;
      message += `   👤 ${track.artist} • 🔥 ${track.recentPlays} plays\n\n`;
    });

    // Build keyboard
    const buttons = trending.slice(0, 5).map((track, index) => [{
      text: `${index + 1}. ${track.title.substring(0, 30)}${track.title.length > 30 ? '...' : ''}`,
      callback_data: `radio:track:${track.id}`,
    }]);

    buttons.push(
      [
        { text: '📅 ' + (lang === 'es' ? 'Hoy' : 'Today'), callback_data: 'radio:trending:day' },
        { text: '📅 ' + (lang === 'es' ? 'Semana' : 'Week'), callback_data: 'radio:trending:week' },
        { text: '📅 ' + (lang === 'es' ? 'Mes' : 'Month'), callback_data: 'radio:trending:month' },
      ],
      [{ text: '🔙 ' + (lang === 'es' ? 'Volver' : 'Back'), callback_data: 'radio:menu' }]
    );

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons },
    });

    await ctx.answerCbQuery();
  } catch (error) {
    logger.error('Error showing trending timeframe:', error);
    await ctx.answerCbQuery('Error');
  }
}

/**
 * Show recently added tracks
 */
export async function showRecentlyAdded(ctx) {
  try {
    const lang = getUserLanguage(ctx);

    // Get recently added tracks
    const tracks = await radioService.getRecentlyAddedTracks(10);

    if (tracks.length === 0) {
      await ctx.editMessageText(
        lang === 'es'
          ? `🆕 **Recién Agregadas**\n\nNo hay canciones nuevas.`
          : `🆕 **Recently Added**\n\nNo recent tracks.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'radio:menu' },
            ]],
          },
        }
      );
      return;
    }

    let message = lang === 'es'
      ? `🆕 **Recién Agregadas**\n\nNuevas canciones en la biblioteca:\n\n`
      : `🆕 **Recently Added**\n\nNew tracks in the library:\n\n`;

    tracks.forEach((track, index) => {
      const typeEmoji = track.type === 'podcast' ? '🎙️' : '🎶';
      const addedDate = track.createdAt
        ? new Date(track.createdAt._seconds * 1000).toLocaleDateString()
        : 'N/A';

      message += `${index + 1}. ${typeEmoji} **${track.title}**\n`;
      message += `   👤 ${track.artist} • 📅 ${addedDate}\n\n`;
    });

    // Build keyboard
    const buttons = tracks.slice(0, 5).map((track, index) => [{
      text: `${index + 1}. ${track.title.substring(0, 30)}${track.title.length > 30 ? '...' : ''}`,
      callback_data: `radio:track:${track.id}`,
    }]);

    buttons.push([{ text: '🔙 ' + (lang === 'es' ? 'Volver' : 'Back'), callback_data: 'radio:menu' }]);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons },
    });

    await ctx.answerCbQuery();
  } catch (error) {
    logger.error('Error showing recently added:', error);
    await ctx.answerCbQuery('Error');
  }
}

export default {
  showTrending,
  showTrendingTimeframe,
  showRecentlyAdded,
};
