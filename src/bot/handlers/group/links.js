/**
 * Quick Links Handler
 *
 * Provides quick access to channels, website, and support.
 */

import { Markup } from 'telegraf';
import logger from '../../../../utils/logger.js';
import { getUserLanguage } from '../../../../utils/i18n.js';

/**
 * Handle links menu actions
 * @param {object} ctx - Telegraf context
 * @param {string} action - Action type
 */
export async function handleLinks(ctx, action) {
  try {
    switch (action) {
      case 'menu':
        await showLinksMenu(ctx);
        break;
      default:
        logger.warn(`Unknown links action: ${action}`);
    }
  } catch (error) {
    logger.error('Error in links handler:', error);
    await ctx.answerCbQuery('Error. Please try again.', true);
  }
}

/**
 * Show quick links menu
 * @param {object} ctx - Telegraf context
 */
export async function showLinksMenu(ctx) {
  const lang = getUserLanguage(ctx);
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'PNPtvBot';
  const websiteUrl = process.env.BOT_URL || 'https://pnptv.app';
  const supportUrl = process.env.SUPPORT_URL || 'https://pnptv.app/support';

  const message = lang === 'es'
    ? `🔗 **Enlaces Rápidos**\n\nAcceso rápido a recursos importantes.`
    : `🔗 **Quick Links**\n\nQuick access to important resources.`;

  const buttons = [
    [Markup.button.url(
      '📺 ' + (lang === 'es' ? 'Canal Premium' : 'Premium Channel'),
      `https://t.me/${process.env.CHANNEL_ID?.replace('-100', '') || 'channel'}`
    )],
    [Markup.button.url(
      '🆓 ' + (lang === 'es' ? 'Canal Gratuito' : 'Free Channel'),
      `https://t.me/${process.env.FREE_CHANNEL_ID?.replace('-100', '') || 'channel'}`
    )],
    [Markup.button.url(
      '🌐 ' + (lang === 'es' ? 'Sitio Web' : 'Website'),
      websiteUrl
    )],
    [Markup.button.url(
      '💬 ' + (lang === 'es' ? 'Soporte' : 'Support'),
      supportUrl
    )],
    [Markup.button.url(
      '📱 ' + (lang === 'es' ? 'Bot Principal' : 'Main Bot'),
      `https://t.me/${botUsername}`
    )],
    [Markup.button.callback(
      '« ' + (lang === 'es' ? 'Volver' : 'Back'),
      'group:menu'
    )]
  ];

  const keyboard = Markup.inlineKeyboard(buttons);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

export default {
  handleLinks,
  showLinksMenu
};
