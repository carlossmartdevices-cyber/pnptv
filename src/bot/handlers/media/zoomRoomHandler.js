/**
 * Zoom/Video Rooms Handler (using Daily.co)
 */

import { Markup } from 'telegraf';
import { t, getUserLanguage } from '../../../../utils/i18n.js';
import { requireSubscription } from '../../core/middleware/authMiddleware.js';
import axios from 'axios';
import logger from '../../../../utils/logger.js';

/**
 * Register zoom room handlers
 */
export function registerZoomRoomHandlers(bot) {
  bot.action('show_zoom', requireSubscription, async (ctx) => {
    await showZoomMenu(ctx);
  });

  bot.action('create_zoom_room', async (ctx) => {
    const lang = getUserLanguage(ctx);
    ctx.session.waitingFor = 'room_name';
    await ctx.editMessageText(t('enterRoomName', lang), Markup.inlineKeyboard([
      [Markup.button.callback(t('cancel', lang), 'show_zoom')],
    ]));
  });

  bot.action(/room_privacy_(public|private)/, async (ctx) => {
    const privacy = ctx.match[1];
    await createVideoRoom(ctx, ctx.session.temp?.roomName, privacy);
  });

  // Handle room name input
  bot.on('text', async (ctx, next) => {
    if (ctx.session.waitingFor === 'room_name') {
      await handleRoomNameInput(ctx, ctx.message.text);
    } else {
      return next();
    }
  });
}

/**
 * Show zoom menu
 */
async function showZoomMenu(ctx) {
  try {
    const lang = getUserLanguage(ctx);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(t('createRoom', lang), 'create_zoom_room')],
      [Markup.button.callback(t('back', lang), 'main_menu')],
    ]);

    await ctx.editMessageText(t('zoomRoomsIntro', lang), {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } catch (error) {
    logger.error('Error showing zoom menu:', error);
  }
}

/**
 * Handle room name input
 */
async function handleRoomNameInput(ctx, roomName) {
  try {
    const lang = getUserLanguage(ctx);

    ctx.session.temp = ctx.session.temp || {};
    ctx.session.temp.roomName = roomName;
    ctx.session.waitingFor = null;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(t('roomPublic', lang), 'room_privacy_public')],
      [Markup.button.callback(t('roomPrivate', lang), 'room_privacy_private')],
      [Markup.button.callback(t('cancel', lang), 'show_zoom')],
    ]);

    await ctx.reply(t('roomPrivacy', lang), keyboard);
  } catch (error) {
    logger.error('Error handling room name:', error);
  }
}

/**
 * Create video room using Daily.co
 */
async function createVideoRoom(ctx, roomName, privacy) {
  try {
    const lang = getUserLanguage(ctx);

    // Create Daily.co room (no host required)
    const dailyResponse = await axios.post(
      'https://api.daily.co/v1/rooms',
      {
        name: `pnptv_room_${ctx.from.id}_${Date.now()}`,
        privacy: privacy === 'public' ? 'public' : 'private',
        properties: {
          enable_screenshare: true,
          enable_chat: true,
          start_video_off: false,
          start_audio_off: false,
          owner_only_broadcast: false, // No host required
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
        },
      }
    );

    const roomUrl = dailyResponse.data.url;

    delete ctx.session.temp;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.url('🎥 Join Room', roomUrl)],
      [Markup.button.callback(t('back', lang), 'show_zoom')],
    ]);

    await ctx.editMessageText(t('roomCreated', lang, { link: roomUrl }), {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } catch (error) {
    logger.error('Error creating video room:', error);
    await ctx.reply(t('error', getUserLanguage(ctx)));
  }
}

export default registerZoomRoomHandlers;
