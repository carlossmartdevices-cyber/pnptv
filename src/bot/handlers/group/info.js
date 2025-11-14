/**
 * Group Info & Rules Handler
 *
 * Displays group rules, help information, and settings.
 */

import { Markup } from 'telegraf';
import logger from '../../../utils/logger.js';
import { getUserLanguage } from '../../../utils/i18n.js';

/**
 * Handle info menu actions
 * @param {object} ctx - Telegraf context
 * @param {string} action - Action type
 */
export async function handleInfo(ctx, action) {
  try {
    switch (action) {
      case 'menu':
        await showInfoMenu(ctx);
        break;
      case 'rules':
        await showRules(ctx);
        break;
      case 'help':
        await showHelp(ctx);
        break;
      case 'notifications':
        await showNotifications(ctx);
        break;
      case 'settings':
        await showSettings(ctx);
        break;
      default:
        logger.warn(`Unknown info action: ${action}`);
    }
  } catch (error) {
    logger.error('Error in info handler:', error);
    await ctx.answerCbQuery('Error. Please try again.', true);
  }
}

/**
 * Show info menu
 * @param {object} ctx - Telegraf context
 */
export async function showInfoMenu(ctx) {
  const lang = getUserLanguage(ctx);

  const message = lang === 'es'
    ? `📋 **Información y Reglas**\n\nAccede a información importante del grupo.`
    : `📋 **Info & Rules**\n\nAccess important group information.`;

  const buttons = [
    [Markup.button.callback(
      '📖 ' + (lang === 'es' ? 'Reglas de la Comunidad' : 'Community Rules'),
      'group:info:rules'
    )],
    [Markup.button.callback(
      '❓ ' + (lang === 'es' ? 'Ayuda y Comandos' : 'Help & Commands'),
      'group:info:help'
    )],
    [Markup.button.callback(
      '🔔 ' + (lang === 'es' ? 'Notificaciones' : 'Notifications'),
      'group:info:notifications'
    )],
    [Markup.button.callback(
      '⚙️ ' + (lang === 'es' ? 'Mis Configuraciones' : 'My Settings'),
      'group:info:settings'
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

/**
 * Show community rules
 * @param {object} ctx - Telegraf context
 */
export async function showRules(ctx) {
  const lang = getUserLanguage(ctx);

  const message = lang === 'es'
    ? `📖 **Reglas de la Comunidad PNPtv**\n\n` +
      `1. **Respeto**: Trata a todos con respeto\n` +
      `2. **Sin Spam**: No envíes spam o contenido repetitivo\n` +
      `3. **Sin NSFW**: Contenido adulto prohibido\n` +
      `4. **Sin Advertising**: No promuevas otros negocios\n` +
      `5. **Sé Amable**: Mantén un ambiente positivo\n\n` +
      `Violaciones pueden resultar en restricciones o expulsión.`
    : `📖 **PNPtv Community Rules**\n\n` +
      `1. **Respect**: Treat everyone with respect\n` +
      `2. **No Spam**: Don't send spam or repetitive content\n` +
      `3. **No NSFW**: Adult content prohibited\n` +
      `4. **No Advertising**: Don't promote other businesses\n` +
      `5. **Be Kind**: Keep a positive environment\n\n` +
      `Violations may result in restrictions or removal.`;

  const buttons = [
    [Markup.button.callback(
      '« ' + (lang === 'es' ? 'Volver' : 'Back'),
      'group:info:menu'
    )]
  ];

  const keyboard = Markup.inlineKeyboard(buttons);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Show help and commands
 * @param {object} ctx - Telegraf context
 */
export async function showHelp(ctx) {
  const lang = getUserLanguage(ctx);

  const message = lang === 'es'
    ? `❓ **Ayuda y Comandos**\n\n` +
      `**/menu** - Abre el menú principal\n` +
      `**/rules** - Ver reglas de la comunidad\n` +
      `**/help** - Este mensaje\n` +
      `**/profile** - Ver mi perfil\n` +
      `**/subscribe** - Ver planes premium\n\n` +
      `¿Necesitas ayuda? Escribe /support para contactar al equipo.`
    : `❓ **Help & Commands**\n\n` +
      `**/menu** - Open main menu\n` +
      `**/rules** - View community rules\n` +
      `**/help** - This message\n` +
      `**/profile** - View my profile\n` +
      `**/subscribe** - View premium plans\n\n` +
      `Need help? Type /support to contact our team.`;

  const buttons = [
    [Markup.button.callback(
      '« ' + (lang === 'es' ? 'Volver' : 'Back'),
      'group:info:menu'
    )]
  ];

  const keyboard = Markup.inlineKeyboard(buttons);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Show notification preferences
 * @param {object} ctx - Telegraf context
 */
export async function showNotifications(ctx) {
  const lang = getUserLanguage(ctx);

  const message = lang === 'es'
    ? `🔔 **Notificaciones**\n\nEsta funcionalidad está disponible pronto.`
    : `🔔 **Notifications**\n\nThis feature is coming soon.`;

  const buttons = [
    [Markup.button.callback(
      '« ' + (lang === 'es' ? 'Volver' : 'Back'),
      'group:info:menu'
    )]
  ];

  const keyboard = Markup.inlineKeyboard(buttons);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Show user settings
 * @param {object} ctx - Telegraf context
 */
export async function showSettings(ctx) {
  const lang = getUserLanguage(ctx);

  const message = lang === 'es'
    ? `⚙️ **Mis Configuraciones**\n\nEsta funcionalidad está disponible pronto.`
    : `⚙️ **My Settings**\n\nThis feature is coming soon.`;

  const buttons = [
    [Markup.button.callback(
      '« ' + (lang === 'es' ? 'Volver' : 'Back'),
      'group:info:menu'
    )]
  ];

  const keyboard = Markup.inlineKeyboard(buttons);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

export default {
  handleInfo,
  showInfoMenu,
  showRules,
  showHelp,
  showNotifications,
  showSettings
};
