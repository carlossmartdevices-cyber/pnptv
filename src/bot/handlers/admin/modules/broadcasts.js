/**
 * Admin Broadcasts Module
 * Send messages to users (all, by tier, by language)
 */

import { Markup } from 'telegraf';
import logger from '../../../../utils/logger.js';
import { getUserLanguage } from '../../../../utils/i18n.js';
import { db } from '../../../../config/firebase.js';

/**
 * Handle broadcast callbacks
 */
export async function handleBroadcasts(ctx, action, params) {
  const lang = getUserLanguage(ctx);

  try {
    await ctx.answerCbQuery();

    switch (action) {
      case 'wizard':
        await showBroadcastWizard(ctx, lang);
        break;
      case 'all':
        await confirmBroadcast(ctx, lang, 'all');
        break;
      case 'tier':
        await showTierSelection(ctx, lang);
        break;
      case 'language':
        await showLanguageSelection(ctx, lang);
        break;
      case 'send':
        if (params.length > 0) {
          await sendBroadcast(ctx, lang, params[0], params[1]);
        }
        break;
      default:
        await showBroadcastWizard(ctx, lang);
    }
  } catch (error) {
    logger.error('Error in broadcasts module:', error);
    const errorMsg = lang === 'es'
      ? '❌ Error en difusiones'
      : '❌ Error in broadcasts';
    await ctx.reply(errorMsg);
  }
}

/**
 * Show broadcast wizard
 */
async function showBroadcastWizard(ctx, lang) {
  const message = lang === 'es'
    ? '📢 *Difusiones*\n\n' +
      'Selecciona el tipo de difusión:\n\n' +
      '• *Todos* - Enviar a todos los usuarios\n' +
      '• *Por Nivel* - Enviar a usuarios de un nivel específico\n' +
      '• *Por Idioma* - Enviar a usuarios de un idioma'
    : '📢 *Broadcasts*\n\n' +
      'Select broadcast type:\n\n' +
      '• *All Users* - Send to all users\n' +
      '• *By Tier* - Send to specific membership tier\n' +
      '• *By Language* - Send to specific language';

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(lang === 'es' ? '👥 Todos' : '👥 All Users', 'admin:broadcasts:all')],
    [Markup.button.callback(lang === 'es' ? '💳 Por Nivel' : '💳 By Tier', 'admin:broadcasts:tier')],
    [Markup.button.callback(lang === 'es' ? '🌐 Por Idioma' : '🌐 By Language', 'admin:broadcasts:language')],
    [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:back:home')],
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard,
  });
}

/**
 * Show tier selection
 */
async function showTierSelection(ctx, lang) {
  const message = lang === 'es'
    ? '💳 *Selecciona Nivel de Membresía*'
    : '💳 *Select Membership Tier*';

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Free', 'admin:broadcasts:send:tier:Free')],
    [Markup.button.callback('Basic', 'admin:broadcasts:send:tier:Basic')],
    [Markup.button.callback('Premium', 'admin:broadcasts:send:tier:Premium')],
    [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:broadcasts:wizard')],
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard,
  });

  ctx.session.broadcastTarget = 'tier';
}

/**
 * Show language selection
 */
async function showLanguageSelection(ctx, lang) {
  const message = lang === 'es'
    ? '🌐 *Selecciona Idioma*'
    : '🌐 *Select Language*';

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('English', 'admin:broadcasts:send:language:en')],
    [Markup.button.callback('Español', 'admin:broadcasts:send:language:es')],
    [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:broadcasts:wizard')],
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard,
  });

  ctx.session.broadcastTarget = 'language';
}

/**
 * Confirm broadcast
 */
async function confirmBroadcast(ctx, lang, target) {
  const message = lang === 'es'
    ? `📢 *Confirmar Difusión*\n\nEnviar mensaje a: *${target}*\n\n` +
      'Escribe el mensaje que deseas enviar:'
    : `📢 *Confirm Broadcast*\n\nSend message to: *${target}*\n\n` +
      'Type the message you want to send:';

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(lang === 'es' ? '« Cancelar' : '« Cancel', 'admin:broadcasts:wizard')],
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard,
  });

  ctx.session.broadcastTarget = target;
  ctx.session.adminAction = 'broadcast_message';
}

/**
 * Send broadcast to users
 */
async function sendBroadcast(ctx, lang, filterType, filterValue) {
  try {
    let query = db.collection('users');

    // Apply filters
    if (filterType === 'tier' && filterValue) {
      query = query.where('tier', '==', filterValue);
    } else if (filterType === 'language' && filterValue) {
      query = query.where('language', '==', filterValue);
    }

    const snapshot = await query.get();
    const totalUsers = snapshot.size;

    // Get message from session
    const message = ctx.session.broadcastMessage;

    if (!message) {
      const errorMsg = lang === 'es'
        ? '❌ No hay mensaje para enviar'
        : '❌ No message to send';
      await ctx.reply(errorMsg);
      return;
    }

    const statusMsg = lang === 'es'
      ? `📤 Enviando mensaje a ${totalUsers} usuarios...`
      : `📤 Sending message to ${totalUsers} users...`;

    await ctx.reply(statusMsg);

    let sent = 0;
    let failed = 0;

    // Send in batches
    for (const doc of snapshot.docs) {
      const user = doc.data();
      try {
        await ctx.telegram.sendMessage(user.id, message, { parse_mode: 'Markdown' });
        sent++;
      } catch (error) {
        logger.error(`Error sending broadcast to user ${user.id}:`, error);
        failed++;
      }

      // Delay to avoid rate limits
      if (sent % 20 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Save broadcast record
    await db.collection('broadcasts').add({
      filterType,
      filterValue,
      message,
      totalUsers,
      sent,
      failed,
      sentBy: ctx.from.id,
      createdAt: new Date(),
    });

    const resultMsg = lang === 'es'
      ? `✅ *Difusión Completada*\n\n` +
        `• Enviados: ${sent}\n` +
        `• Fallidos: ${failed}\n` +
        `• Total: ${totalUsers}`
      : `✅ *Broadcast Completed*\n\n` +
        `• Sent: ${sent}\n` +
        `• Failed: ${failed}\n` +
        `• Total: ${totalUsers}`;

    await ctx.reply(resultMsg, { parse_mode: 'Markdown' });

    // Clean up session
    delete ctx.session.broadcastTarget;
    delete ctx.session.broadcastMessage;
    delete ctx.session.adminAction;
  } catch (error) {
    logger.error('Error sending broadcast:', error);
    throw error;
  }
}

export default {
  handleBroadcasts,
};
