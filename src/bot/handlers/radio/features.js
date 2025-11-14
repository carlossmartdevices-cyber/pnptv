/**
 * Radio Advanced Features
 * Search, filter, share, and playlist management
 */

import { Markup } from 'telegraf';
import logger from '../../../utils/logger.js';
import { getUserLanguage } from '../../../utils/i18n.js';
import { db } from '../../../config/firebase.js';

/**
 * Show genre filter selection
 */
export async function showGenreFilter(ctx) {
  const lang = getUserLanguage(ctx);

  try {
    await ctx.answerCbQuery();

    // Get available genres from music collection
    const genres = await getAvailableGenres();

    const message = lang === 'es'
      ? '🎵 *Filtrar por Género*\n\nSelecciona un género:'
      : '🎵 *Filter by Genre*\n\nSelect a genre:';

    const buttons = genres.map(genre =>
      [Markup.button.callback(genre, `radio:genre:${genre}`)]
    );

    buttons.push([
      Markup.button.callback(lang === 'es' ? '🔄 Limpiar Filtro' : '🔄 Clear Filter', 'radio:filter:clear'),
    ]);
    buttons.push([
      Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'radio:menu'),
    ]);

    const keyboard = Markup.inlineKeyboard(buttons);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } catch (error) {
    logger.error('Error showing genre filter:', error);
    await ctx.answerCbQuery('Error loading genres', true);
  }
}

/**
 * Apply genre filter
 */
export async function applyGenreFilter(ctx) {
  const genre = ctx.match[1];
  const lang = getUserLanguage(ctx);

  try {
    await ctx.answerCbQuery(`Filter: ${genre}`);

    // Store filter in session
    ctx.session.radioFilters = ctx.session.radioFilters || {};
    ctx.session.radioFilters.genre = genre;

    // Redirect back to browse with filter applied
    const { default: browseHandlers } = await import('./browse.js');
    await browseHandlers.browseLibrary(ctx);
  } catch (error) {
    logger.error('Error applying genre filter:', error);
    await ctx.answerCbQuery('Error applying filter', true);
  }
}

/**
 * Show search interface
 */
export async function showSearch(ctx) {
  const lang = getUserLanguage(ctx);

  try {
    await ctx.answerCbQuery();

    const message = lang === 'es'
      ? '🔍 *Buscar Música*\n\n' +
        'Envía el nombre de la canción, artista o álbum que deseas buscar.\n\n' +
        'Ejemplos:\n' +
        '• "Summer vibes"\n' +
        '• "DJ Carlos"\n' +
        '• "House music"'
      : '🔍 *Search Music*\n\n' +
        'Send the name of the song, artist, or album you want to search.\n\n' +
        'Examples:\n' +
        '• "Summer vibes"\n' +
        '• "DJ Carlos"\n' +
        '• "House music"';

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(lang === 'es' ? '« Cancelar' : '« Cancel', 'radio:menu')],
    ]);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...keyboard,
    });

    // Set session state to wait for search query
    ctx.session.waitingFor = 'radio_search';
  } catch (error) {
    logger.error('Error showing search:', error);
    await ctx.answerCbQuery('Error opening search', true);
  }
}

/**
 * Handle search query input
 */
export async function handleSearchQuery(ctx) {
  const query = ctx.message.text.trim();
  const lang = getUserLanguage(ctx);

  try {
    // Clear waiting state
    delete ctx.session.waitingFor;

    if (query.length < 2) {
      await ctx.reply(lang === 'es'
        ? '⚠️ Ingresa al menos 2 caracteres'
        : '⚠️ Enter at least 2 characters'
      );
      return;
    }

    const searchingMsg = await ctx.reply(lang === 'es'
      ? `🔍 Buscando: "${query}"...`
      : `🔍 Searching for: "${query}"...`
    );

    // Search in music collection
    const results = await searchMusic(query);

    if (results.length === 0) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        searchingMsg.message_id,
        null,
        lang === 'es'
          ? `❌ No se encontraron resultados para: "${query}"`
          : `❌ No results found for: "${query}"`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Format results
    const resultsList = results.slice(0, 10).map((track, i) =>
      `${i + 1}. *${track.title}*${track.artist ? ` - ${track.artist}` : ''}`
    ).join('\n');

    const message = lang === 'es'
      ? `🔍 *Resultados* (${results.length})\n\n${resultsList}\n\nSelecciona una canción:`
      : `🔍 *Results* (${results.length})\n\n${resultsList}\n\nSelect a track:`;

    const buttons = results.slice(0, 10).map(track =>
      [Markup.button.callback(
        `🎵 ${track.title.substring(0, 30)}${track.title.length > 30 ? '...' : ''}`,
        `radio:track:${track.id}`
      )]
    );

    buttons.push([Markup.button.callback(lang === 'es' ? '« Volver' : '« Back', 'radio:menu')]);

    const keyboard = Markup.inlineKeyboard(buttons);

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      searchingMsg.message_id,
      null,
      message,
      { parse_mode: 'Markdown', ...keyboard }
    );
  } catch (error) {
    logger.error('Error handling search query:', error);
    await ctx.reply(lang === 'es'
      ? '❌ Error en la búsqueda'
      : '❌ Search error'
    );
  }
}

/**
 * Share track functionality
 */
export async function shareTrack(ctx) {
  const trackId = ctx.match[1];
  const lang = getUserLanguage(ctx);

  try {
    await ctx.answerCbQuery();

    // Get track details
    const trackDoc = await db.collection('music').doc(trackId).get();

    if (!trackDoc.exists) {
      await ctx.answerCbQuery('Track not found', true);
      return;
    }

    const track = trackDoc.data();

    // Generate share message
    const shareText = lang === 'es'
      ? `🎵 *${track.title}*${track.artist ? `\n🎤 ${track.artist}` : ''}${track.genre ? `\n🎼 ${track.genre}` : ''}\n\n` +
        `¡Escucha esta canción en PNPtv Radio!\n` +
        `Usa /radio para acceder a nuestra biblioteca musical.`
      : `🎵 *${track.title}*${track.artist ? `\n🎤 ${track.artist}` : ''}${track.genre ? `\n🎼 ${track.genre}` : ''}\n\n` +
        `Listen to this track on PNPtv Radio!\n` +
        `Use /radio to access our music library.`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.switchToChat(lang === 'es' ? '📤 Compartir' : '📤 Share', shareText)],
      [Markup.button.callback(lang === 'es' ? '« Volver' : '« Back', `radio:track:${trackId}`)],
    ]);

    const message = lang === 'es'
      ? `📤 *Compartir Canción*\n\n` +
        `${shareText}\n\n` +
        `Usa el botón de abajo para compartir en cualquier chat.`
      : `📤 *Share Track*\n\n` +
        `${shareText}\n\n` +
        `Use the button below to share in any chat.`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } catch (error) {
    logger.error('Error sharing track:', error);
    await ctx.answerCbQuery('Error sharing track', true);
  }
}

/**
 * Show playlist selection to add track
 */
export async function showAddToPlaylist(ctx) {
  const trackId = ctx.match[1];
  const userId = ctx.from.id;
  const lang = getUserLanguage(ctx);

  try {
    await ctx.answerCbQuery();

    // Get user's playlists
    const playlistsSnapshot = await db.collection('playlists')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    if (playlistsSnapshot.empty) {
      const message = lang === 'es'
        ? '📝 *Agregar a Playlist*\n\n' +
          'No tienes playlists creadas.\n' +
          'Crea una primero desde el menú de playlists.'
        : '📝 *Add to Playlist*\n\n' +
          'You don\'t have any playlists.\n' +
          'Create one first from the playlists menu.';

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback(lang === 'es' ? '➕ Crear Playlist' : '➕ Create Playlist', 'radio:playlist:create')],
          [Markup.button.callback(lang === 'es' ? '« Volver' : '« Back', `radio:track:${trackId}`)],
        ]),
      });
      return;
    }

    const playlists = [];
    playlistsSnapshot.forEach(doc => {
      playlists.push({ id: doc.id, ...doc.data() });
    });

    const message = lang === 'es'
      ? '📝 *Agregar a Playlist*\n\nSelecciona una playlist:'
      : '📝 *Add to Playlist*\n\nSelect a playlist:';

    const buttons = playlists.map(playlist =>
      [Markup.button.callback(
        `📁 ${playlist.name} (${playlist.trackCount || 0})`,
        `radio:addpl:${trackId}:${playlist.id}`
      )]
    );

    buttons.push([Markup.button.callback(lang === 'es' ? '« Volver' : '« Back', `radio:track:${trackId}`)]);

    const keyboard = Markup.inlineKeyboard(buttons);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } catch (error) {
    logger.error('Error showing playlist selection:', error);
    await ctx.answerCbQuery('Error loading playlists', true);
  }
}

/**
 * Add track to selected playlist
 */
export async function addTrackToPlaylist(ctx) {
  const [, trackId, playlistId] = ctx.match[0].split(':').slice(1);
  const lang = getUserLanguage(ctx);

  try {
    // Check if track already in playlist
    const existingTrack = await db.collection('playlists')
      .doc(playlistId)
      .collection('tracks')
      .doc(trackId)
      .get();

    if (existingTrack.exists) {
      await ctx.answerCbQuery(lang === 'es'
        ? '⚠️ La canción ya está en esta playlist'
        : '⚠️ Track already in this playlist',
        true
      );
      return;
    }

    // Add track to playlist
    await db.collection('playlists')
      .doc(playlistId)
      .collection('tracks')
      .doc(trackId)
      .set({
        trackId,
        addedAt: new Date(),
      });

    // Update playlist track count
    await db.collection('playlists')
      .doc(playlistId)
      .update({
        trackCount: db.FieldValue.increment(1),
        updatedAt: new Date(),
      });

    await ctx.answerCbQuery(lang === 'es'
      ? '✅ Agregado a la playlist'
      : '✅ Added to playlist',
      true
    );

    // Go back to track details
    const { default: browseHandlers } = await import('./browse.js');
    ctx.match = [null, trackId]; // Set match for track ID
    await browseHandlers.showTrackDetails(ctx);
  } catch (error) {
    logger.error('Error adding track to playlist:', error);
    await ctx.answerCbQuery(lang === 'es'
      ? '❌ Error al agregar'
      : '❌ Error adding track',
      true
    );
  }
}

/**
 * Search music in database
 */
async function searchMusic(query) {
  const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 1);

  try {
    // Search by title
    const titleResults = await db.collection('music')
      .where('searchTerms', 'array-contains-any', searchTerms.slice(0, 10))
      .limit(20)
      .get();

    const results = [];
    const seenIds = new Set();

    titleResults.forEach(doc => {
      if (!seenIds.has(doc.id)) {
        results.push({ id: doc.id, ...doc.data() });
        seenIds.add(doc.id);
      }
    });

    // If few results, try broader search
    if (results.length < 5) {
      const broadSearch = await db.collection('music')
        .orderBy('plays', 'desc')
        .limit(10)
        .get();

      broadSearch.forEach(doc => {
        const data = doc.data();
        const title = (data.title || '').toLowerCase();
        const artist = (data.artist || '').toLowerCase();

        if ((title.includes(query.toLowerCase()) || artist.includes(query.toLowerCase())) && !seenIds.has(doc.id)) {
          results.push({ id: doc.id, ...data });
          seenIds.add(doc.id);
        }
      });
    }

    return results;
  } catch (error) {
    logger.error('Error searching music:', error);
    return [];
  }
}

/**
 * Get available genres from music collection
 */
async function getAvailableGenres() {
  try {
    // Get distinct genres
    const musicSnapshot = await db.collection('music')
      .limit(100)
      .get();

    const genres = new Set();

    musicSnapshot.forEach(doc => {
      const track = doc.data();
      if (track.genre) {
        genres.add(track.genre);
      }
    });

    return Array.from(genres).sort();
  } catch (error) {
    logger.error('Error getting genres:', error);
    return ['Electronic', 'House', 'Techno', 'Dance', 'Chill'];
  }
}

export default {
  showGenreFilter,
  applyGenreFilter,
  showSearch,
  handleSearchQuery,
  shareTrack,
  showAddToPlaylist,
  addTrackToPlaylist,
};
