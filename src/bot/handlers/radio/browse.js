/**
 * Radio Browse Handler
 * Handles music library browsing with pagination and filters
 */

import { Markup } from 'telegraf';
import { t, getUserLanguage } from '../../../../utils/i18n.js';
import { getUserById } from '../../../services/userService.js';
import radioService from '../../../services/radio/radioService.js';
import playlistService from '../../../services/radio/playlistService.js';
import logger from '../../../../utils/logger.js';

/**
 * Show PNPtv! Radio main menu
 */
export async function showRadioMenu(ctx) {
  try {
    const lang = getUserLanguage(ctx);
    const user = await getUserById(ctx.from.id);

    const isPremium = user?.subscriptionStatus === 'active';
    const trackCount = await radioService.getTrackCount();

    const message = lang === 'es'
      ? `🎵 **PNPtv! Radio**\n\n` +
        `Tu biblioteca de música comunitaria con ${trackCount} canciones.\n\n` +
        `${isPremium ? '💎 **Miembro Premium** - Acceso completo\n\n' : '🆓 **Acceso Gratuito** - Escucha todas las canciones\n\n'}` +
        `¿Qué te gustaría hacer?`
      : `🎵 **PNPtv! Radio**\n\n` +
        `Your community music library with ${trackCount} tracks.\n\n` +
        `${isPremium ? '💎 **Premium Member** - Full Access\n\n' : '🆓 **Free Access** - Listen to all tracks\n\n'}` +
        `What would you like to do?`;

    const keyboard = buildRadioMenuKeyboard(isPremium, lang);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    } else {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    }
  } catch (error) {
    logger.error('Error showing radio menu:', error);
    await ctx.reply(t('error', getUserLanguage(ctx)));
  }
}

/**
 * Build radio menu keyboard
 */
function buildRadioMenuKeyboard(isPremium, lang) {
  const buttons = [
    [{ text: '🎧 ' + (lang === 'es' ? 'Explorar Biblioteca' : 'Browse Library'), callback_data: 'radio:browse:0' }],
    [{ text: '🔥 ' + (lang === 'es' ? 'Tendencias' : 'Trending Now'), callback_data: 'radio:trending' }],
    [{ text: '🔍 ' + (lang === 'es' ? 'Buscar' : 'Search'), callback_data: 'radio:search' }],
  ];

  if (isPremium) {
    buttons.push([{
      text: '📻 ' + (lang === 'es' ? 'Mis Playlists' : 'My Playlists'),
      callback_data: 'radio:playlists',
    }]);
    buttons.push([{
      text: '❤️ ' + (lang === 'es' ? 'Favoritos' : 'Favorites'),
      callback_data: 'radio:favorites',
    }]);
  } else {
    buttons.push([{
      text: '💎 ' + (lang === 'es' ? 'Desbloquear Premium' : 'Unlock Premium Features'),
      callback_data: 'show_plans',
    }]);
  }

  buttons.push([{
    text: '🔙 ' + (lang === 'es' ? 'Volver' : 'Back'),
    callback_data: 'main_menu',
  }]);

  return { inline_keyboard: buttons };
}

/**
 * Browse library with pagination and filters
 */
export async function browseLibrary(ctx) {
  try {
    const lang = getUserLanguage(ctx);

    // Parse page from callback data
    const page = parseInt(ctx.match[1]) || 0;

    // Get filters from session (if any)
    const filters = ctx.session?.radioFilters || {};

    const TRACKS_PER_PAGE = 10;

    // Get filtered tracks
    const { tracks, totalCount, totalPages } = await radioService.getTracksWithFilters(
      filters,
      page,
      TRACKS_PER_PAGE
    );

    if (tracks.length === 0) {
      await ctx.editMessageText(
        lang === 'es'
          ? `🎵 **No se encontraron canciones**\n\nIntenta ajustar tus filtros.`
          : `🎵 **No tracks found**\n\nTry adjusting your filters.`,
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

    // Build header
    const pageDisplay = `${page + 1}/${totalPages}`;

    let message = lang === 'es'
      ? `🎧 **Explorar Biblioteca** (Página ${pageDisplay})\n\n` +
        `Total: ${totalCount} canciones\n\n`
      : `🎧 **Browse Library** (Page ${pageDisplay})\n\n` +
        `Total: ${totalCount} tracks\n\n`;

    if (filters.genre) {
      message += (lang === 'es' ? `🎯 Género: ${filters.genre}\n` : `🎯 Genre: ${filters.genre}\n`);
    }
    if (filters.type) {
      message += (lang === 'es' ? `📻 Tipo: ${filters.type}\n` : `📻 Type: ${filters.type}\n`);
    }

    message += '\n';

    // List tracks (compact format for pagination)
    tracks.forEach((track, index) => {
      const globalIndex = (page * TRACKS_PER_PAGE) + index + 1;
      const typeEmoji = track.type === 'podcast' ? '🎙️' : '🎶';
      message += `${globalIndex}. ${typeEmoji} **${track.title}**\n`;
      message += `   👤 ${track.artist} • 🔥 ${track.playCount || 0} plays\n\n`;
    });

    // Build pagination keyboard
    const keyboard = buildBrowseKeyboard(page, totalPages, filters, tracks, lang);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });

    await ctx.answerCbQuery();
  } catch (error) {
    logger.error('Error browsing library:', error);
    await ctx.answerCbQuery(t('error', getUserLanguage(ctx)));
  }
}

/**
 * Build browse keyboard with pagination and filters
 */
function buildBrowseKeyboard(currentPage, totalPages, filters, tracks, lang) {
  const buttons = [];

  // Track selection buttons (first 5 for compact view)
  const trackButtons = tracks.slice(0, 5).map((track, index) => {
    const globalIndex = (currentPage * 10) + index + 1;
    return [{
      text: `${globalIndex}. ${track.title.substring(0, 30)}${track.title.length > 30 ? '...' : ''}`,
      callback_data: `radio:track:${track.id}`,
    }];
  });
  buttons.push(...trackButtons);

  // Filter buttons
  buttons.push([
    { text: '🎯 ' + (lang === 'es' ? 'Género' : 'Genre'), callback_data: 'radio:filter:genre' },
    { text: '🔄 ' + (lang === 'es' ? 'Limpiar' : 'Clear'), callback_data: 'radio:filter:clear' },
  ]);

  // Pagination
  const pageButtons = [];
  if (currentPage > 0) {
    pageButtons.push({
      text: '⬅️ ' + (lang === 'es' ? 'Anterior' : 'Prev'),
      callback_data: `radio:browse:${currentPage - 1}`,
    });
  }

  pageButtons.push({
    text: `${currentPage + 1}/${totalPages}`,
    callback_data: 'radio:page:info',
  });

  if (currentPage < totalPages - 1) {
    pageButtons.push({
      text: (lang === 'es' ? 'Siguiente' : 'Next') + ' ➡️',
      callback_data: `radio:browse:${currentPage + 1}`,
    });
  }

  buttons.push(pageButtons);

  // Action buttons
  buttons.push([
    { text: '🔍 ' + (lang === 'es' ? 'Buscar' : 'Search'), callback_data: 'radio:search' },
    { text: '🔙 ' + (lang === 'es' ? 'Menú' : 'Menu'), callback_data: 'radio:menu' },
  ]);

  return { inline_keyboard: buttons };
}

/**
 * Show track details
 */
export async function showTrackDetails(ctx) {
  try {
    const lang = getUserLanguage(ctx);
    const trackId = ctx.match[1];

    // Get track data
    const track = await radioService.getTrackById(trackId);

    if (!track) {
      await ctx.answerCbQuery(lang === 'es' ? '❌ Canción no encontrada' : '❌ Track not found');
      return;
    }

    const typeEmoji = track.type === 'podcast' ? '🎙️' : '🎶';

    let message = `${typeEmoji} **${track.title}**\n\n`;
    message += `👤 **${lang === 'es' ? 'Artista' : 'Artist'}:** ${track.artist}\n`;
    message += `🎯 **${lang === 'es' ? 'Género' : 'Genre'}:** ${track.genre}\n`;
    message += `🔥 **${lang === 'es' ? 'Reproducciones' : 'Plays'}:** ${track.playCount || 0}\n`;

    if (track.duration) {
      const minutes = Math.floor(track.duration / 60);
      const seconds = track.duration % 60;
      message += `⏱️ **${lang === 'es' ? 'Duración' : 'Duration'}:** ${minutes}:${seconds.toString().padStart(2, '0')}\n`;
    }

    if (track.createdAt) {
      const addedDate = new Date(track.createdAt._seconds * 1000).toLocaleDateString();
      message += `📅 **${lang === 'es' ? 'Agregado' : 'Added'}:** ${addedDate}\n`;
    }

    message += `\n🆔 \`${trackId}\``;

    // Build action keyboard
    const user = await getUserById(ctx.from.id);
    const isPremium = user?.subscriptionStatus === 'active';

    const keyboard = await buildTrackDetailsKeyboard(trackId, track, isPremium, lang, ctx.from.id);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });

    await ctx.answerCbQuery();
  } catch (error) {
    logger.error('Error showing track details:', error);
    await ctx.answerCbQuery(t('error', getUserLanguage(ctx)));
  }
}

/**
 * Build track details keyboard
 */
async function buildTrackDetailsKeyboard(trackId, track, isPremium, lang, userId) {
  const buttons = [];

  // Play button (if URL exists)
  if (track.url) {
    buttons.push([
      { text: '▶️ ' + (lang === 'es' ? 'Reproducir' : 'Play'), callback_data: `radio:play:${trackId}` },
    ]);
  }

  // Share button
  buttons.push([
    { text: '📤 ' + (lang === 'es' ? 'Compartir' : 'Share'), callback_data: `radio:share:${trackId}` },
  ]);

  // Premium features
  if (isPremium) {
    const isFavorited = await playlistService.isTrackFavorited(userId.toString(), trackId);
    const likeText = isFavorited
      ? '💔 ' + (lang === 'es' ? 'Quitar de Favoritos' : 'Unlike')
      : '❤️ ' + (lang === 'es' ? 'Me gusta' : 'Like');

    buttons.push([
      { text: likeText, callback_data: `radio:like:${trackId}` },
      { text: '➕ ' + (lang === 'es' ? 'Playlist' : 'Add to Playlist'), callback_data: `radio:addpl:${trackId}` },
    ]);
  }

  // Back button
  buttons.push([
    { text: '🔙 ' + (lang === 'es' ? 'Volver' : 'Back'), callback_data: 'radio:browse:0' },
  ]);

  return { inline_keyboard: buttons };
}

/**
 * Handle track play
 */
export async function handleTrackPlay(ctx) {
  try {
    const lang = getUserLanguage(ctx);
    const trackId = ctx.match[1];
    const userId = ctx.from.id.toString();

    // Track the play
    const playResult = await radioService.trackPlay(trackId, userId);

    if (!playResult.success) {
      await ctx.answerCbQuery(lang === 'es' ? '❌ Error al reproducir' : '❌ Error playing track');
      return;
    }

    const track = playResult.track;

    // Send play message with URL
    const playMessage = lang === 'es'
      ? `🎵 **Reproduciendo ahora**\n\n` +
        `**${track.title}** por ${track.artist}\n` +
        `🔥 ${playResult.newPlayCount} reproducciones\n\n` +
        `[🎧 Abrir en SoundCloud](${track.url})`
      : `🎵 **Now Playing**\n\n` +
        `**${track.title}** by ${track.artist}\n` +
        `🔥 ${playResult.newPlayCount} plays\n\n` +
        `[🎧 Open in SoundCloud](${track.url})`;

    await ctx.editMessageText(playMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎧 ' + (lang === 'es' ? 'Abrir en App' : 'Open in App'), url: track.url }],
          [{ text: '🔙 ' + (lang === 'es' ? 'Volver' : 'Back'), callback_data: `radio:track:${trackId}` }],
        ],
      },
    });

    await ctx.answerCbQuery(`🎵 ${track.title} (${playResult.newPlayCount} plays)`);
  } catch (error) {
    logger.error('Error handling track play:', error);
    await ctx.answerCbQuery(t('error', getUserLanguage(ctx)));
  }
}

export default {
  showRadioMenu,
  browseLibrary,
  showTrackDetails,
  handleTrackPlay,
};
