/**
 * Live Stream Handler (using Daily.co for video)
 */

import { Markup } from 'telegraf';
import { t, getUserLanguage } from '../../../../utils/i18n.js';
import { requireSubscription } from '../../core/middleware/authMiddleware.js';
import { collections } from '../../../config/firebase.js';
import axios from 'axios';
import logger from '../../../../utils/logger.js';

/**
 * Register live stream handlers
 */
export function registerLiveStreamHandlers(bot) {
  bot.action('show_live', async (ctx) => {
    await showLiveStreamMenu(ctx);
  });

  bot.action('start_live_stream', requireSubscription, async (ctx) => {
    const lang = getUserLanguage(ctx);
    ctx.session.waitingFor = 'stream_title';
    await ctx.editMessageText(t('enterStreamTitle', lang), Markup.inlineKeyboard([
      [Markup.button.callback(t('cancel', lang), 'show_live')],
    ]));
  });

  bot.action('view_live_streams', async (ctx) => {
    await showActiveStreams(ctx);
  });

  bot.action(/join_stream_(.+)/, async (ctx) => {
    const streamId = ctx.match[1];
    await joinStream(ctx, streamId);
  });

  // Handle stream title input
  bot.on('text', async (ctx, next) => {
    if (ctx.session.waitingFor === 'stream_title') {
      await createLiveStream(ctx, ctx.message.text);
    } else {
      return next();
    }
  });
}

/**
 * Show live stream menu
 */
async function showLiveStreamMenu(ctx) {
  try {
    const lang = getUserLanguage(ctx);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(t('startLive', lang), 'start_live_stream')],
      [Markup.button.callback(t('viewLive', lang), 'view_live_streams')],
      [Markup.button.callback(t('back', lang), 'main_menu')],
    ]);

    await ctx.editMessageText(t('liveStreamsIntro', lang), {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } catch (error) {
    logger.error('Error showing live stream menu:', error);
  }
}

/**
 * Create live stream using Daily.co
 */
async function createLiveStream(ctx, title) {
  try {
    const lang = getUserLanguage(ctx);

    // Create Daily.co room
    const dailyResponse = await axios.post(
      'https://api.daily.co/v1/rooms',
      {
        name: `pnptv_${ctx.from.id}_${Date.now()}`,
        privacy: 'public',
        properties: {
          enable_screenshare: true,
          enable_chat: true,
          start_video_off: false,
          start_audio_off: false,
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

    // Save stream to Firestore
    const streamRef = collections.liveStreams().doc();
    await streamRef.set({
      streamId: streamRef.id,
      userId: ctx.from.id,
      username: ctx.from.username || ctx.from.first_name,
      title,
      roomUrl,
      isActive: true,
      viewerCount: 0,
      createdAt: new Date(),
    });

    ctx.session.waitingFor = null;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.url('🎥 Join Your Stream', roomUrl)],
      [Markup.button.callback(t('back', lang), 'show_live')],
    ]);

    await ctx.reply(t('streamCreated', lang, { link: roomUrl }), {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } catch (error) {
    logger.error('Error creating live stream:', error);
    await ctx.reply(t('error', getUserLanguage(ctx)));
  }
}

/**
 * Show active streams
 */
async function showActiveStreams(ctx) {
  try {
    const lang = getUserLanguage(ctx);

    const snapshot = await collections
      .liveStreams()
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    if (snapshot.empty) {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback(t('back', lang), 'show_live')],
      ]);

      return ctx.editMessageText(t('noActiveStreams', lang), keyboard);
    }

    const streams = snapshot.docs.map((doc) => doc.data());

    const buttons = streams.map((stream) => [
      Markup.button.callback(
        `🎤 ${stream.title} - @${stream.username}`,
        `join_stream_${stream.streamId}`
      ),
    ]);

    buttons.push([Markup.button.callback(t('back', lang), 'show_live')]);

    await ctx.editMessageText(
      t('activeStreams', lang, { count: streams.length }),
      Markup.inlineKeyboard(buttons)
    );
  } catch (error) {
    logger.error('Error showing active streams:', error);
  }
}

/**
 * Join stream
 */
async function joinStream(ctx, streamId) {
  try {
    const lang = getUserLanguage(ctx);
    const streamDoc = await collections.liveStreams().doc(streamId).get();

    if (!streamDoc.exists) {
      return ctx.reply(t('error', lang));
    }

    const stream = streamDoc.data();

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.url(t('joinStream', lang), stream.roomUrl)],
      [Markup.button.callback(t('back', lang), 'view_live_streams')],
    ]);

    await ctx.editMessageText(
      `🎤 **${stream.title}**\\n\\nBy: @${stream.username}\\n\\n${t('viewerCount', lang, { count: stream.viewerCount })}`,
      { parse_mode: 'Markdown', ...keyboard }
    );
  } catch (error) {
    logger.error('Error joining stream:', error);
  }
}

export default registerLiveStreamHandlers;
