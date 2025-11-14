/**
 * Zoom Handlers Registration
 * Main entry point for all Zoom features
 */

import instantRoomHandlers from './instantRoom.js';
import scheduleHandlers from './schedule.js';
import logger from '../../../utils/logger.js';

/**
 * Register all Zoom handlers
 */
export function registerEnhancedZoomHandlers(bot) {
  // Zoom menu
  bot.command('zoom', instantRoomHandlers.showZoomMenu);
  bot.action('show_zoom', instantRoomHandlers.showZoomMenu);
  bot.action('zoom:menu', instantRoomHandlers.showZoomMenu);

  // Instant room
  bot.action('zoom:instant', instantRoomHandlers.createInstantRoom);
  bot.command('openroom', instantRoomHandlers.createInstantRoom);

  // Scheduling
  bot.action('zoom:schedule', scheduleHandlers.startScheduling);

  // Handle scheduling input
  bot.on('text', scheduleHandlers.handleSchedulingInput);

  // Share link
  bot.action(/^zoom:share:(.+)$/, instantRoomHandlers.shareZoomLink);

  // My events
  bot.action('zoom:my_events', async (ctx) => {
    // TODO: Implement my events view
    await ctx.answerCbQuery('My events coming soon!');
  });

  logger.info('Enhanced Zoom handlers registered successfully');
}

export default registerEnhancedZoomHandlers;
