/**
 * Main Menu Handler
 */

import { Markup } from 'telegraf';
import { t, getUserLanguage } from '../../../utils/i18n.js';
import { getUserById } from '../../../services/userService.js';
import logger from '../../../utils/logger.js';

/**
 * Register main menu handlers
 */
export function registerMainMenuHandlers(bot) {
  // Menu command
  bot.command('menu', async (ctx) => {
    await showMainMenu(ctx);
  });

  // Main menu callback
  bot.action('main_menu', async (ctx) => {
    await showMainMenu(ctx, true);
  });

  // Back to main menu (used throughout the app)
  bot.action('back_to_main', async (ctx) => {
    await showMainMenu(ctx, true);
  });
}

/**
 * Show main menu
 */
export async function showMainMenu(ctx, edit = false) {
  try {
    const lang = getUserLanguage(ctx);
    const user = await getUserById(ctx.from.id);

    if (!user || !user.onboardingCompleted) {
      return ctx.reply(t('welcome', lang));
    }

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(t('subscribe', lang), 'show_subscription_plans'),
        Markup.button.callback(t('myProfile', lang), 'show_profile'),
      ],
      [
        Markup.button.callback(t('nearbyUsers', lang), 'show_nearby'),
        Markup.button.callback(t('liveStreams', lang), 'show_live'),
      ],
      [
        Markup.button.callback(t('radio', lang), 'show_radio'),
        Markup.button.callback(t('zoomRooms', lang), 'show_zoom'),
      ],
      [
        Markup.button.callback(t('support', lang), 'show_support'),
        Markup.button.callback(t('settings', lang), 'show_settings'),
      ],
    ]);

    if (edit && ctx.callbackQuery) {
      await ctx.editMessageText(t('mainMenuIntro', lang), {
        parse_mode: 'Markdown',
        ...keyboard,
      });
    } else {
      await ctx.reply(t('mainMenuIntro', lang), {
        parse_mode: 'Markdown',
        ...keyboard,
      });
    }
  } catch (error) {
    logger.error('Error showing main menu:', error);
    await ctx.reply(t('error', getUserLanguage(ctx)));
  }
}

export default registerMainMenuHandlers;
