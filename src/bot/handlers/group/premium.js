/**
 * Premium Benefits Handler
 *
 * Shows premium benefits and upgrade path from group context.
 */

import { Markup } from 'telegraf';
import logger from '../../../utils/logger.js';
import { getUserLanguage } from '../../../utils/i18n.js';

/**
 * Handle premium menu actions
 * @param {object} ctx - Telegraf context
 * @param {string} action - Action type
 */
export async function handlePremium(ctx, action) {
  try {
    switch (action) {
      case 'benefits':
        await showPremiumBenefits(ctx);
        break;
      case 'compare':
        await showComparison(ctx);
        break;
      case 'upgrade':
        await startUpgrade(ctx);
        break;
      default:
        logger.warn(`Unknown premium action: ${action}`);
    }
  } catch (error) {
    logger.error('Error in premium handler:', error);
    await ctx.answerCbQuery('Error. Please try again.', true);
  }
}

/**
 * Show premium benefits
 * @param {object} ctx - Telegraf context
 */
export async function showPremiumBenefits(ctx) {
  const lang = getUserLanguage(ctx);
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'PNPtvBot';

  const message = lang === 'es'
    ? `💎 **Beneficios Premium de PNPtv**\n\n` +
      `🎥 **Salas de Video Ilimitadas**\n` +
      `Crea salas Zoom instantáneas desde el grupo\n\n` +
      `📸 **Enviar Multimedia**\n` +
      `Fotos, videos, documentos, stickers\n\n` +
      `📺 **Canal Premium Exclusivo**\n` +
      `Contenido VIP y acceso anticipado\n\n` +
      `📍 **Encuentra Miembros Cercanos**\n` +
      `Conecta con la comunidad localmente\n\n` +
      `🏆 **Insignia Premium**\n` +
      `Destacate en la tabla de clasificación\n\n` +
      `💬 **Soporte Prioritario**\n` +
      `Respuestas más rápidas y dedicadas\n\n` +
      `**Planes desde $14.99/mes**`
    : `💎 **PNPtv Premium Benefits**\n\n` +
      `🎥 **Unlimited Video Rooms**\n` +
      `Create instant Zoom rooms from the group\n\n` +
      `📸 **Send Media**\n` +
      `Photos, videos, documents, stickers\n\n` +
      `📺 **Exclusive Premium Channel**\n` +
      `VIP content and early access\n\n` +
      `📍 **Find Nearby Members**\n` +
      `Connect with the community locally\n\n` +
      `🏆 **Premium Badge**\n` +
      `Stand out on the leaderboard\n\n` +
      `💬 **Priority Support**\n` +
      `Faster and dedicated responses\n\n` +
      `**Plans from $14.99/month**`;

  const buttons = [
    [Markup.button.url(
      lang === 'es' ? '💳 Ver Planes' : '💳 View Plans',
      `https://t.me/${botUsername}?start=subscribe`
    )],
    [Markup.button.callback(
      lang === 'es' ? '🆚 Comparar Planes' : '🆚 Compare Plans',
      'group:premium:compare'
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
 * Show comparison between free and premium
 * @param {object} ctx - Telegraf context
 */
export async function showComparison(ctx) {
  const lang = getUserLanguage(ctx);

  const message = lang === 'es'
    ? `🆚 **Comparativa: Gratuito vs Premium**\n\n` +
      `*Gratuito (🆓)*\n` +
      `• Acceso a la comunidad\n` +
      `• Solo mensajes de texto\n` +
      `• Canal gratuito\n` +
      `• Soporte básico\n\n` +
      `*Premium (👑)*\n` +
      `✅ Todo lo anterior, más:\n` +
      `✅ Enviar fotos, videos y documentos\n` +
      `✅ Salas de video ilimitadas\n` +
      `✅ Canal premium con contenido VIP\n` +
      `✅ Insignia premium en el grupo\n` +
      `✅ Soporte prioritario\n` +
      `✅ Acceso a funciones exclusivas\n\n` +
      `¡Actualiza ahora para desbloquear todo!`
    : `🆚 **Comparison: Free vs Premium**\n\n` +
      `*Free (🆓)*\n` +
      `• Access to community\n` +
      `• Text messages only\n` +
      `• Free channel\n` +
      `• Basic support\n\n` +
      `*Premium (👑)*\n` +
      `✅ Everything above, plus:\n` +
      `✅ Send photos, videos, documents\n` +
      `✅ Unlimited video rooms\n` +
      `✅ Premium channel with VIP content\n` +
      `✅ Premium badge in group\n` +
      `✅ Priority support\n` +
      `✅ Access to exclusive features\n\n` +
      `Upgrade now to unlock everything!`;

  const buttons = [
    [Markup.button.callback(
      lang === 'es' ? '💎 Ver Beneficios' : '💎 View Benefits',
      'group:premium:benefits'
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
 * Start upgrade flow
 * @param {object} ctx - Telegraf context
 */
export async function startUpgrade(ctx) {
  const lang = getUserLanguage(ctx);
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'PNPtvBot';

  const message = lang === 'es'
    ? `🎉 **¡Actualiza a Premium!**\n\nHaz clic en el botón de abajo para ver nuestros planes.`
    : `🎉 **Upgrade to Premium!**\n\nClick the button below to view our plans.`;

  const buttons = [
    [Markup.button.url(
      lang === 'es' ? '💳 Ver Planes' : '💳 View Plans',
      `https://t.me/${botUsername}?start=subscribe`
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
  handlePremium,
  showPremiumBenefits,
  showComparison,
  startUpgrade
};
