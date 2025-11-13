/**
 * Radio Handler
 */

import { Markup } from 'telegraf';
import { t, getUserLanguage } from '../../../utils/i18n.js';
import { cache, cacheKeys } from '../../../config/redis.js';
import logger from '../../../utils/logger.js';

/**
 * Register radio handlers
 */
export function registerRadioHandlers(bot) {
  bot.action('show_radio', async (ctx) => {
    await showRadioMenu(ctx);
  });

  bot.action('radio_listen', async (ctx) => {
    await playRadio(ctx);
  });

  bot.action('radio_request', async (ctx) => {
    const lang = getUserLanguage(ctx);
    ctx.session.waitingFor = 'song_request';
    await ctx.editMessageText(t('songRequestPrompt', lang), Markup.inlineKeyboard([
      [Markup.button.callback(t('cancel', lang), 'show_radio')],
    ]));
  });

  // Handle song request
  bot.on('text', async (ctx, next) => {
    if (ctx.session.waitingFor === 'song_request') {
      await handleSongRequest(ctx, ctx.message.text);
    } else {
      return next();
    }
  });
}

/**
 * Show radio menu
 */
async function showRadioMenu(ctx) {
  try {
    const lang = getUserLanguage(ctx);

    // Get now playing from cache or API
    const nowPlaying = await cache.get(cacheKeys.radioNowPlaying()) || 'PNPtv Radio';

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(t('listenNow', lang), 'radio_listen')],
      [Markup.button.callback(t('requestSong', lang), 'radio_request')],
      [Markup.button.callback(t('back', lang), 'main_menu')],
    ]);

    await ctx.editMessageText(
      `${t('radioIntro', lang)}\\n\\n${t('nowPlaying', lang, { song: nowPlaying })}`,
      { parse_mode: 'Markdown', ...keyboard }
    );
  } catch (error) {
    logger.error('Error showing radio menu:', error);
  }
}

/**
 * Play radio
 */
async function playRadio(ctx) {
  try {
    const lang = getUserLanguage(ctx);
    const streamUrl = process.env.RADIO_STREAM_URL || 'http://stream.pnptv.com:8000/live';

    // Send audio stream (Telegram supports streaming)
    await ctx.replyWithAudio(
      { url: streamUrl },
      {
        title: 'PNPtv Radio',
        performer: 'PNPtv',
        caption: t('radioPlaying', lang),
      }
    );

    await showRadioMenu(ctx);
  } catch (error) {
    logger.error('Error playing radio:', error);
    await ctx.reply(t('error', getUserLanguage(ctx)));
  }
}

/**
 * Handle song request
 */
async function handleSongRequest(ctx, songName) {
  try {
    const lang = getUserLanguage(ctx);

    // Save request to database (implementation depends on radio system)
    // For now, just confirm
    ctx.session.waitingFor = null;

    await ctx.reply(t('songRequestAdded', lang));
    await showRadioMenu(ctx);
  } catch (error) {
    logger.error('Error handling song request:', error);
  }
}

export default registerRadioHandlers;
