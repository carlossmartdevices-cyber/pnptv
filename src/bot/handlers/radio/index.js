/**
 * PNPtv! Radio Handlers Registration
 * Main entry point for all radio features
 */

import browseHandlers from './browse.js';
import trendingHandlers from './trending.js';
import playlistHandlers from './playlists.js';
import logger from '../../../utils/logger.js';

/**
 * Register all radio handlers
 */
export function registerRadioHandlers(bot) {
  // Main radio menu
  bot.command('radio', browseHandlers.showRadioMenu);
  bot.command('library', browseHandlers.showRadioMenu); // Alias
  bot.action('radio:menu', browseHandlers.showRadioMenu);
  bot.action('show_radio', browseHandlers.showRadioMenu);

  // Browse library with pagination
  bot.action(/^radio:browse:(\d+)$/, browseHandlers.browseLibrary);

  // Track details and play
  bot.action(/^radio:track:(.+)$/, browseHandlers.showTrackDetails);
  bot.action(/^radio:play:(.+)$/, browseHandlers.handleTrackPlay);

  // Trending
  bot.action('radio:trending', trendingHandlers.showTrending);
  bot.action(/^radio:trending:(day|week|month)$/, trendingHandlers.showTrendingTimeframe);

  // Recently added
  bot.action('radio:recent', trendingHandlers.showRecentlyAdded);

  // Playlists (Premium)
  bot.action('radio:playlists', playlistHandlers.showPlaylists);
  bot.action('radio:playlist:create', playlistHandlers.startCreatePlaylist);

  // Handle playlist name input
  bot.on('text', async (ctx, next) => {
    if (ctx.session?.waitingFor === 'playlist_name') {
      await playlistHandlers.handlePlaylistNameInput(ctx);
    } else {
      return next();
    }
  });

  // Favorites (Premium)
  bot.action('radio:favorites', playlistHandlers.showFavorites);
  bot.action(/^radio:like:(.+)$/, playlistHandlers.toggleFavorite);

  // Filters
  bot.action('radio:filter:genre', async (ctx) => {
    // TODO: Implement genre filter selection
    await ctx.answerCbQuery('Genre filter coming soon!');
  });

  bot.action('radio:filter:clear', async (ctx) => {
    ctx.session.radioFilters = {};
    await ctx.answerCbQuery('Filters cleared');
    await browseHandlers.browseLibrary(ctx);
  });

  // Search
  bot.action('radio:search', async (ctx) => {
    // TODO: Implement search
    await ctx.answerCbQuery('Search coming soon!');
  });

  // Share track
  bot.action(/^radio:share:(.+)$/, async (ctx) => {
    // TODO: Implement share functionality
    await ctx.answerCbQuery('Share coming soon!');
  });

  // Add to playlist
  bot.action(/^radio:addpl:(.+)$/, async (ctx) => {
    // TODO: Implement add to playlist selection
    await ctx.answerCbQuery('Add to playlist coming soon!');
  });

  // Page info (just acknowledge)
  bot.action('radio:page:info', async (ctx) => {
    await ctx.answerCbQuery();
  });

  logger.info('PNPtv! Radio handlers registered successfully');
}

export default registerRadioHandlers;
