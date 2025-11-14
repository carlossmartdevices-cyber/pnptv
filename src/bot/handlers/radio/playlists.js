/**
 * Radio Playlists & Favorites Handler
 * Manages user playlists and favorites (Premium only)
 */

import { Markup } from 'telegraf';
import { getUserLanguage, t } from '../../../../utils/i18n.js';
import { getUserById } from '../../../services/userService.js';
import playlistService from '../../../services/radio/playlistService.js';
import radioService from '../../../services/radio/radioService.js';
import logger from '../../../../utils/logger.js';

/**
 * Show user playlists
 */
export async function showPlaylists(ctx) {
  try {
    const lang = getUserLanguage(ctx);
    const user = await getUserById(ctx.from.id);

    // Check Premium
    if (user?.subscriptionStatus !== 'active') {
      await ctx.editMessageText(
        lang === 'es'
          ? `📻 **Playlists - Premium**\n\n` +
            `Esta función está disponible solo para miembros Premium.\n\n` +
            `💎 Actualiza a Premium para crear y gestionar playlists.`
          : `📻 **Playlists - Premium**\n\n` +
            `This feature is available for Premium members only.\n\n` +
            `💎 Upgrade to Premium to create and manage playlists.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: lang === 'es' ? '💎 Ver Planes' : '💎 View Plans', callback_data: 'show_plans' },
            ], [
              { text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'radio:menu' },
            ]],
          },
        }
      );
      return;
    }

    // Get user playlists
    const playlists = await playlistService.getUserPlaylists(ctx.from.id.toString());

    let message = lang === 'es'
      ? `📻 **Mis Playlists**\n\n`
      : `📻 **My Playlists**\n\n`;

    if (playlists.length === 0) {
      message += lang === 'es'
        ? `No tienes playlists aún. ¡Crea una para comenzar!`
        : `You don't have any playlists yet. Create one to get started!`;
    } else {
      message += lang === 'es'
        ? `Tienes ${playlists.length} playlist(s):\n\n`
        : `You have ${playlists.length} playlist(s):\n\n`;

      playlists.forEach((playlist, index) => {
        const trackCount = playlist.trackIds?.length || 0;
        message += `${index + 1}. **${playlist.name}**\n`;
        message += `   🎵 ${trackCount} ${lang === 'es' ? 'canciones' : 'tracks'}\n\n`;
      });
    }

    // Build keyboard
    const buttons = playlists.slice(0, 5).map((playlist, index) => [{
      text: `${index + 1}. ${playlist.name}`,
      callback_data: `radio:playlist:${playlist.id}`,
    }]);

    buttons.push(
      [{ text: '➕ ' + (lang === 'es' ? 'Crear Playlist' : 'Create Playlist'), callback_data: 'radio:playlist:create' }],
      [{ text: '🔙 ' + (lang === 'es' ? 'Volver' : 'Back'), callback_data: 'radio:menu' }]
    );

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons },
    });

    await ctx.answerCbQuery();
  } catch (error) {
    logger.error('Error showing playlists:', error);
    await ctx.answerCbQuery(t('error', getUserLanguage(ctx)));
  }
}

/**
 * Show favorites
 */
export async function showFavorites(ctx) {
  try {
    const lang = getUserLanguage(ctx);
    const user = await getUserById(ctx.from.id);

    // Check Premium
    if (user?.subscriptionStatus !== 'active') {
      await ctx.editMessageText(
        lang === 'es'
          ? `❤️ **Favoritos - Premium**\n\n` +
            `Esta función está disponible solo para miembros Premium.\n\n` +
            `💎 Actualiza a Premium para guardar tus canciones favoritas.`
          : `❤️ **Favorites - Premium**\n\n` +
            `This feature is available for Premium members only.\n\n` +
            `💎 Upgrade to Premium to save your favorite tracks.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: lang === 'es' ? '💎 Ver Planes' : '💎 View Plans', callback_data: 'show_plans' },
            ], [
              { text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'radio:menu' },
            ]],
          },
        }
      );
      return;
    }

    // Get favorites
    const favoriteIds = await playlistService.getUserFavorites(ctx.from.id.toString());

    let message = lang === 'es'
      ? `❤️ **Mis Favoritos**\n\n`
      : `❤️ **My Favorites**\n\n`;

    if (favoriteIds.length === 0) {
      message += lang === 'es'
        ? `No tienes canciones favoritas aún.\n\nToca ❤️ en cualquier canción para agregarla.`
        : `You don't have any favorite tracks yet.\n\nTap ❤️ on any track to add it.`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: lang === 'es' ? '🔙 Volver' : '🔙 Back', callback_data: 'radio:menu' },
          ]],
        },
      });
      return;
    }

    message += lang === 'es'
      ? `Tienes ${favoriteIds.length} canción(es) favorita(s):\n\n`
      : `You have ${favoriteIds.length} favorite track(s):\n\n`;

    // Get track details
    const tracks = [];
    for (const trackId of favoriteIds.slice(0, 10)) {
      const track = await radioService.getTrackById(trackId);
      if (track) {
        tracks.push(track);
      }
    }

    tracks.forEach((track, index) => {
      const typeEmoji = track.type === 'podcast' ? '🎙️' : '🎶';
      message += `${index + 1}. ${typeEmoji} **${track.title}**\n`;
      message += `   👤 ${track.artist}\n\n`;
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
    logger.error('Error showing favorites:', error);
    await ctx.answerCbQuery(t('error', getUserLanguage(ctx)));
  }
}

/**
 * Toggle favorite
 */
export async function toggleFavorite(ctx) {
  try {
    const lang = getUserLanguage(ctx);
    const trackId = ctx.match[1];
    const userId = ctx.from.id.toString();

    // Check if already favorited
    const isFavorited = await playlistService.isTrackFavorited(userId, trackId);

    if (isFavorited) {
      // Remove from favorites
      await playlistService.removeFromFavorites(userId, trackId);
      await ctx.answerCbQuery(
        lang === 'es' ? '💔 Eliminado de favoritos' : '💔 Removed from favorites'
      );
    } else {
      // Add to favorites
      await playlistService.addToFavorites(userId, trackId);
      await ctx.answerCbQuery(
        lang === 'es' ? '❤️ Agregado a favoritos' : '❤️ Added to favorites'
      );
    }

    // Refresh track details view
    const track = await radioService.getTrackById(trackId);
    const user = await getUserById(ctx.from.id);
    const isPremium = user?.subscriptionStatus === 'active';

    const typeEmoji = track.type === 'podcast' ? '🎙️' : '🎶';

    let message = `${typeEmoji} **${track.title}**\n\n`;
    message += `👤 **${lang === 'es' ? 'Artista' : 'Artist'}:** ${track.artist}\n`;
    message += `🎯 **${lang === 'es' ? 'Género' : 'Genre'}:** ${track.genre}\n`;
    message += `🔥 **${lang === 'es' ? 'Reproducciones' : 'Plays'}:** ${track.playCount || 0}\n`;

    // Build keyboard with updated favorite status
    const buttons = [];

    if (track.url) {
      buttons.push([
        { text: '▶️ ' + (lang === 'es' ? 'Reproducir' : 'Play'), callback_data: `radio:play:${trackId}` },
      ]);
    }

    buttons.push([
      { text: '📤 ' + (lang === 'es' ? 'Compartir' : 'Share'), callback_data: `radio:share:${trackId}` },
    ]);

    if (isPremium) {
      const newFavoriteStatus = !isFavorited;
      const likeText = newFavoriteStatus
        ? '💔 ' + (lang === 'es' ? 'Quitar de Favoritos' : 'Unlike')
        : '❤️ ' + (lang === 'es' ? 'Me gusta' : 'Like');

      buttons.push([
        { text: likeText, callback_data: `radio:like:${trackId}` },
        { text: '➕ ' + (lang === 'es' ? 'Playlist' : 'Add to Playlist'), callback_data: `radio:addpl:${trackId}` },
      ]);
    }

    buttons.push([
      { text: '🔙 ' + (lang === 'es' ? 'Volver' : 'Back'), callback_data: 'radio:browse:0' },
    ]);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons },
    });
  } catch (error) {
    logger.error('Error toggling favorite:', error);
    await ctx.answerCbQuery(t('error', getUserLanguage(ctx)));
  }
}

/**
 * Start create playlist flow
 */
export async function startCreatePlaylist(ctx) {
  try {
    const lang = getUserLanguage(ctx);

    ctx.session.waitingFor = 'playlist_name';

    await ctx.editMessageText(
      lang === 'es'
        ? `➕ **Crear Playlist**\n\n` +
          `Envía un nombre para tu nueva playlist.`
        : `➕ **Create Playlist**\n\n` +
          `Send a name for your new playlist.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: lang === 'es' ? '❌ Cancelar' : '❌ Cancel', callback_data: 'radio:playlists' },
          ]],
        },
      }
    );

    await ctx.answerCbQuery();
  } catch (error) {
    logger.error('Error starting create playlist:', error);
    await ctx.answerCbQuery(t('error', getUserLanguage(ctx)));
  }
}

/**
 * Handle playlist name input
 */
export async function handlePlaylistNameInput(ctx) {
  try {
    const lang = getUserLanguage(ctx);
    const playlistName = ctx.message.text.trim();

    if (playlistName.length < 3) {
      await ctx.reply(
        lang === 'es'
          ? `⚠️ El nombre debe tener al menos 3 caracteres.`
          : `⚠️ Name must be at least 3 characters.`
      );
      return;
    }

    // Create playlist
    const result = await playlistService.createPlaylist(ctx.from.id.toString(), {
      name: playlistName,
      isPublic: false,
    });

    if (result.success) {
      ctx.session.waitingFor = null;

      await ctx.reply(
        lang === 'es'
          ? `✅ Playlist **${playlistName}** creada exitosamente!`
          : `✅ Playlist **${playlistName}** created successfully!`,
        { parse_mode: 'Markdown' }
      );

      // Show playlists
      await showPlaylists(ctx);
    } else {
      await ctx.reply(
        lang === 'es'
          ? `❌ Error al crear playlist. Intenta de nuevo.`
          : `❌ Error creating playlist. Please try again.`
      );
    }
  } catch (error) {
    logger.error('Error handling playlist name input:', error);
    await ctx.reply(t('error', getUserLanguage(ctx)));
  }
}

export default {
  showPlaylists,
  showFavorites,
  toggleFavorite,
  startCreatePlaylist,
  handlePlaylistNameInput,
};
