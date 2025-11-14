/**
 * Settings Handler
 */

import { Markup } from 'telegraf';
import { t, getUserLanguage, setUserLanguage } from '../../../../utils/i18n.js';
import { updateUser } from '../../../models/userModel.js';
import logger from '../../../../utils/logger.js';

/**
 * Register settings handlers
 */
export function registerSettingsHandlers(bot) {
  bot.action('show_settings', async (ctx) => {
    await showSettingsMenu(ctx);
  });

  bot.action('change_language', async (ctx) => {
    await showLanguageOptions(ctx);
  });

  bot.action(/set_language_(en|es)/, async (ctx) => {
    const lang = ctx.match[1];
    await changeLanguage(ctx, lang);
  });

  bot.action('privacy_settings', async (ctx) => {
    await showPrivacySettings(ctx);
  });

  bot.action(/toggle_privacy_(.+)/, async (ctx) => {
    const setting = ctx.match[1];
    await togglePrivacySetting(ctx, setting);
  });
}

/**
 * Show settings menu
 */
async function showSettingsMenu(ctx) {
  try {
    const lang = getUserLanguage(ctx);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(t('changeLanguage', lang), 'change_language')],
      [Markup.button.callback(t('privacySettings', lang), 'privacy_settings')],
      [Markup.button.callback(t('back', lang), 'main_menu')],
    ]);

    await ctx.editMessageText(t('settingsIntro', lang), {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } catch (error) {
    logger.error('Error showing settings menu:', error);
  }
}

/**
 * Show language options
 */
async function showLanguageOptions(ctx) {
  try {
    const lang = getUserLanguage(ctx);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🇺🇸 English', 'set_language_en')],
      [Markup.button.callback('🇪🇸 Español', 'set_language_es')],
      [Markup.button.callback(t('back', lang), 'show_settings')],
    ]);

    await ctx.editMessageText(t('selectLanguage', lang), keyboard);
  } catch (error) {
    logger.error('Error showing language options:', error);
  }
}

/**
 * Change language
 */
async function changeLanguage(ctx, lang) {
  try {
    setUserLanguage(ctx, lang);

    await updateUser(ctx.from.id, { language: lang });

    await ctx.editMessageText(t('languageChanged', lang));
    await showSettingsMenu(ctx);
  } catch (error) {
    logger.error('Error changing language:', error);
  }
}

/**
 * Show privacy settings
 */
async function showPrivacySettings(ctx) {
  try {
    const lang = getUserLanguage(ctx);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(`✅ ${t('showProfile', lang)}`, 'toggle_privacy_showProfile')],
      [Markup.button.callback(`✅ ${t('showOnline', lang)}`, 'toggle_privacy_showOnline')],
      [Markup.button.callback(`✅ ${t('allowMessages', lang)}`, 'toggle_privacy_allowMessages')],
      [Markup.button.callback(t('back', lang), 'show_settings')],
    ]);

    await ctx.editMessageText(t('privacyIntro', lang), {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } catch (error) {
    logger.error('Error showing privacy settings:', error);
  }
}

/**
 * Toggle privacy setting
 */
async function togglePrivacySetting(ctx, setting) {
  try {
    const lang = getUserLanguage(ctx);

    // This is simplified - in production, you'd fetch current settings first
    const updates = {
      [`privacySettings.${setting}`]: true, // Toggle logic here
    };

    await updateUser(ctx.from.id, updates);

    await ctx.answerCbQuery(t('settingsSaved', lang));
    await showPrivacySettings(ctx);
  } catch (error) {
    logger.error('Error toggling privacy setting:', error);
  }
}

export default registerSettingsHandlers;
