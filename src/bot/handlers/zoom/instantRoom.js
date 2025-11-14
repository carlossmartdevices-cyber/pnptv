/**
 * Instant Zoom Room Handler
 * Create instant Zoom rooms with one click (Premium only)
 */

import { Markup } from 'telegraf';
import { getUserLanguage, t } from '../../../utils/i18n.js';
import { getUserById } from '../../../services/userService.js';
import zoomService from '../../../services/zoomService.js';
import logger from '../../../utils/logger.js';

/**
 * Create instant Zoom room (Premium only)
 */
export async function createInstantRoom(ctx) {
  try {
    const lang = getUserLanguage(ctx);
    const user = await getUserById(ctx.from.id);

    // Check premium access
    if (user?.subscriptionStatus !== 'active') {
      await ctx.reply(
        lang === 'es'
          ? `📹 **Salas de Zoom - Premium**\n\n` +
            `Esta función está disponible solo para miembros Premium.\n\n` +
            `💎 **Beneficios Premium:**\n` +
            `• Crear salas Zoom instantáneas\n` +
            `• Programar videollamadas\n` +
            `• Sin límites de tiempo\n` +
            `• Grabación automática\n\n` +
            `Actualiza a Premium para desbloquear todas las funciones.`
          : `📹 **Zoom Rooms - Premium**\n\n` +
            `This feature is available for Premium members only.\n\n` +
            `💎 **Premium Benefits:**\n` +
            `• Create instant Zoom rooms\n` +
            `• Schedule video calls\n` +
            `• No time limits\n` +
            `• Auto recording\n\n` +
            `Upgrade to Premium to unlock all features.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: lang === 'es' ? '💎 Ver Planes' : '💎 View Plans', callback_data: 'show_plans' },
            ]],
          },
        }
      );
      return;
    }

    // Show creating message
    const creatingMsg = await ctx.reply(
      lang === 'es' ? '⏳ Creando sala Zoom...' : '⏳ Creating Zoom room...'
    );

    try {
      // Create instant meeting
      const meeting = await zoomService.createInstantMeeting({
        hostName: ctx.from.first_name || 'PNPtv Member',
        userId: ctx.from.id.toString(),
        waitingRoom: false,
        autoRecording: 'none',
      });

      // Delete creating message
      await ctx.telegram.deleteMessage(ctx.chat.id, creatingMsg.message_id);

      // Send success message with room details
      const message = lang === 'es'
        ? `✅ **¡Sala Zoom Creada!**\n\n` +
          `📹 **Sala Instantánea de ${ctx.from.first_name}**\n\n` +
          `🔗 **Enlace:**\n${meeting.join_url}\n\n` +
          `${meeting.password ? `🔒 **Contraseña:** ${meeting.password}\n\n` : ''}` +
          `📋 **Meeting ID:** ${meeting.id}\n\n` +
          `💡 Comparte el enlace con quienes quieras invitar.\n` +
          `⚡ La sala está lista - únete cuando quieras!`
        : `✅ **Zoom Room Created!**\n\n` +
          `📹 **${ctx.from.first_name}'s Instant Room**\n\n` +
          `🔗 **Join Link:**\n${meeting.join_url}\n\n` +
          `${meeting.password ? `🔒 **Password:** ${meeting.password}\n\n` : ''}` +
          `📋 **Meeting ID:** ${meeting.id}\n\n` +
          `💡 Share the link with anyone you want to invite.\n` +
          `⚡ Room is ready - join anytime!`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🎥 ' + (lang === 'es' ? 'Unirse Ahora' : 'Join Now'), url: meeting.join_url }],
          [
            {
              text: '📤 ' + (lang === 'es' ? 'Compartir Enlace' : 'Share Link'),
              callback_data: `zoom:share:${meeting.id}`,
            },
          ],
          [{ text: '🔙 ' + (lang === 'es' ? 'Volver' : 'Back'), callback_data: 'main_menu' }],
        ],
      };

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });

      logger.info(`User ${ctx.from.id} created instant Zoom room: ${meeting.id}`);
    } catch (error) {
      logger.error('Error creating instant Zoom room:', error);

      // Delete creating message
      await ctx.telegram.deleteMessage(ctx.chat.id, creatingMsg.message_id).catch(() => {});

      await ctx.reply(
        lang === 'es'
          ? `❌ **Error al Crear Sala**\n\n` +
            `No se pudo crear la sala Zoom. Por favor intenta de nuevo.\n\n` +
            `Si el problema persiste, contacta a soporte.`
          : `❌ **Error Creating Room**\n\n` +
            `Could not create Zoom room. Please try again.\n\n` +
            `If the problem persists, contact support.`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (error) {
    logger.error('Error in createInstantRoom handler:', error);
    await ctx.reply(t('error', getUserLanguage(ctx)));
  }
}

/**
 * Show Zoom menu
 */
export async function showZoomMenu(ctx) {
  try {
    const lang = getUserLanguage(ctx);
    const user = await getUserById(ctx.from.id);

    const isPremium = user?.subscriptionStatus === 'active';

    const message = lang === 'es'
      ? `📹 **Salas Zoom & Videollamadas**\n\n` +
        `${isPremium ? '💎 Miembro Premium\n\n' : '🆓 Actualiza a Premium para acceso completo\n\n'}` +
        `Crea salas instantáneas o programa videollamadas.`
      : `📹 **Zoom Rooms & Video Calls**\n\n` +
        `${isPremium ? '💎 Premium Member\n\n' : '🆓 Upgrade to Premium for full access\n\n'}` +
        `Create instant rooms or schedule video calls.`;

    const buttons = [];

    if (isPremium) {
      buttons.push(
        [{ text: '⚡ ' + (lang === 'es' ? 'Crear Sala Instantánea' : 'Create Instant Room'), callback_data: 'zoom:instant' }],
        [{ text: '📅 ' + (lang === 'es' ? 'Programar Llamada' : 'Schedule Call'), callback_data: 'zoom:schedule' }],
        [{ text: '📋 ' + (lang === 'es' ? 'Mis Eventos' : 'My Events'), callback_data: 'zoom:my_events' }]
      );
    } else {
      buttons.push([
        { text: '💎 ' + (lang === 'es' ? 'Ver Planes Premium' : 'View Premium Plans'), callback_data: 'show_plans' },
      ]);
    }

    buttons.push([{ text: '🔙 ' + (lang === 'es' ? 'Volver' : 'Back'), callback_data: 'main_menu' }]);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons },
      });
    } else {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons },
      });
    }
  } catch (error) {
    logger.error('Error showing Zoom menu:', error);
    await ctx.reply(t('error', getUserLanguage(ctx)));
  }
}

/**
 * Share Zoom link
 */
export async function shareZoomLink(ctx) {
  try {
    const lang = getUserLanguage(ctx);
    const meetingId = ctx.match[1];

    // Get meeting details
    const meeting = await zoomService.getMeetingDetails(meetingId);

    // Create shareable message
    const shareMessage = zoomService.createInvitationMessage(meeting, lang);

    // Send as a new message so user can forward it
    await ctx.reply(shareMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎥 ' + (lang === 'es' ? 'Unirse' : 'Join'), url: meeting.join_url }],
        ],
      },
    });

    await ctx.answerCbQuery(
      lang === 'es' ? '📤 Mensaje listo para compartir' : '📤 Message ready to share'
    );
  } catch (error) {
    logger.error('Error sharing Zoom link:', error);
    await ctx.answerCbQuery(t('error', getUserLanguage(ctx)));
  }
}

export default {
  createInstantRoom,
  showZoomMenu,
  shareZoomLink,
};
