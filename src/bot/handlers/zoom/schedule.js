/**
 * Zoom Scheduling Handler
 * Schedule video calls with interactive wizard
 */

import { Markup } from 'telegraf';
import { getUserLanguage, t } from '../../../../utils/i18n.js';
import { getUserById } from '../../../services/userService.js';
import zoomService from '../../../services/zoomService.js';
import eventService from '../../../services/events/eventService.js';
import logger from '../../../../utils/logger.js';

/**
 * Start scheduling wizard
 */
export async function startScheduling(ctx) {
  try {
    const lang = getUserLanguage(ctx);
    const user = await getUserById(ctx.from.id);

    // Check premium access
    if (user?.subscriptionStatus !== 'active') {
      await ctx.editMessageText(
        lang === 'es'
          ? `📅 **Programar Llamada - Premium**\n\n` +
            `Esta función requiere membresía Premium.\n\n` +
            `💎 Actualiza para programar videollamadas ilimitadas.`
          : `📅 **Schedule Call - Premium**\n\n` +
            `This feature requires Premium membership.\n\n` +
            `💎 Upgrade to schedule unlimited video calls.`,
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

    // Initialize session data
    ctx.session.schedulingData = {
      step: 'title',
    };

    await ctx.editMessageText(
      lang === 'es'
        ? `📅 **Programar Videollamada**\n\n` +
          `Paso 1 de 3: Título\n\n` +
          `Envía un título para tu videollamada.`
        : `📅 **Schedule Video Call**\n\n` +
          `Step 1 of 3: Title\n\n` +
          `Send a title for your video call.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: lang === 'es' ? '❌ Cancelar' : '❌ Cancel', callback_data: 'zoom:menu' },
          ]],
        },
      }
    );

    await ctx.answerCbQuery();
  } catch (error) {
    logger.error('Error starting scheduling:', error);
    await ctx.answerCbQuery(t('error', getUserLanguage(ctx)));
  }
}

/**
 * Handle scheduling input
 */
export async function handleSchedulingInput(ctx, next) {
  try {
    if (!ctx.session?.schedulingData) {
      return next();
    }

    const lang = getUserLanguage(ctx);
    const step = ctx.session.schedulingData.step;
    const text = ctx.message.text.trim();

    if (step === 'title') {
      if (text.length < 3) {
        await ctx.reply(
          lang === 'es'
            ? `⚠️ El título debe tener al menos 3 caracteres.`
            : `⚠️ Title must be at least 3 characters.`
        );
        return;
      }

      ctx.session.schedulingData.title = text;
      ctx.session.schedulingData.step = 'datetime';

      await ctx.reply(
        lang === 'es'
          ? `✅ Título guardado: **${text}**\n\n` +
            `Paso 2 de 3: Fecha y Hora\n\n` +
            `Envía la fecha y hora en formato:\n` +
            `YYYY-MM-DD HH:MM\n\n` +
            `Ejemplo: 2025-11-15 14:30`
          : `✅ Title saved: **${text}**\n\n` +
            `Step 2 of 3: Date and Time\n\n` +
            `Send the date and time in format:\n` +
            `YYYY-MM-DD HH:MM\n\n` +
            `Example: 2025-11-15 14:30`,
        { parse_mode: 'Markdown' }
      );
    } else if (step === 'datetime') {
      // Parse datetime
      const dateTimeRegex = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/;
      const match = text.match(dateTimeRegex);

      if (!match) {
        await ctx.reply(
          lang === 'es'
            ? `⚠️ Formato inválido. Usa: YYYY-MM-DD HH:MM\n\nEjemplo: 2025-11-15 14:30`
            : `⚠️ Invalid format. Use: YYYY-MM-DD HH:MM\n\nExample: 2025-11-15 14:30`
        );
        return;
      }

      const [, year, month, day, hour, minute] = match;
      const dateTime = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);

      if (dateTime < new Date()) {
        await ctx.reply(
          lang === 'es'
            ? `⚠️ La fecha debe ser en el futuro.`
            : `⚠️ Date must be in the future.`
        );
        return;
      }

      ctx.session.schedulingData.dateTime = dateTime.toISOString();
      ctx.session.schedulingData.step = 'duration';

      await ctx.reply(
        lang === 'es'
          ? `✅ Fecha guardada: ${dateTime.toLocaleString('es-ES')}\n\n` +
            `Paso 3 de 3: Duración\n\n` +
            `¿Cuántos minutos durará la llamada?\n\n` +
            `Envía un número (15, 30, 60, etc.)`
          : `✅ Date saved: ${dateTime.toLocaleString('en-US')}\n\n` +
            `Step 3 of 3: Duration\n\n` +
            `How many minutes will the call last?\n\n` +
            `Send a number (15, 30, 60, etc.)`,
        { parse_mode: 'Markdown' }
      );
    } else if (step === 'duration') {
      const duration = parseInt(text);

      if (isNaN(duration) || duration < 15 || duration > 480) {
        await ctx.reply(
          lang === 'es'
            ? `⚠️ Duración inválida. Debe ser entre 15 y 480 minutos.`
            : `⚠️ Invalid duration. Must be between 15 and 480 minutes.`
        );
        return;
      }

      ctx.session.schedulingData.duration = duration;

      // Create the meeting
      await createScheduledMeeting(ctx);
    }
  } catch (error) {
    logger.error('Error handling scheduling input:', error);
    await ctx.reply(t('error', getUserLanguage(ctx)));
  }
}

/**
 * Create scheduled meeting
 */
async function createScheduledMeeting(ctx) {
  const lang = getUserLanguage(ctx);
  const data = ctx.session.schedulingData;

  const waitingMsg = await ctx.reply(
    lang === 'es' ? '⏳ Creando videollamada programada...' : '⏳ Creating scheduled call...'
  );

  try {
    // Create Zoom meeting
    const meeting = await zoomService.scheduleZoomMeeting({
      topic: data.title,
      startTime: data.dateTime,
      duration: data.duration,
      timezone: 'America/Bogota',
      waitingRoom: true,
      autoRecording: 'cloud',
    });

    // Save to events
    await eventService.createEvent({
      title: data.title,
      type: 'zoom_call',
      creatorId: ctx.from.id.toString(),
      startTime: admin.firestore.Timestamp.fromDate(new Date(data.dateTime)),
      duration: data.duration,
      zoomMeetingId: meeting.id.toString(),
      joinUrl: meeting.join_url,
      password: meeting.password,
      isPublic: false,
      status: 'scheduled',
    });

    // Delete waiting message
    await ctx.telegram.deleteMessage(ctx.chat.id, waitingMsg.message_id);

    // Clear session
    delete ctx.session.schedulingData;

    // Send success message
    const successMessage = lang === 'es'
      ? `✅ **¡Videollamada Programada!**\n\n` +
        `📹 **${data.title}**\n\n` +
        `🕐 **Fecha:** ${new Date(data.dateTime).toLocaleString('es-ES')}\n` +
        `⏱️ **Duración:** ${data.duration} minutos\n` +
        `🔒 **Contraseña:** ${meeting.password}\n\n` +
        `**Enlace:**\n${meeting.join_url}\n\n` +
        `💡 Recibirás recordatorios antes de la llamada.`
      : `✅ **Video Call Scheduled!**\n\n` +
        `📹 **${data.title}**\n\n` +
        `🕐 **Date:** ${new Date(data.dateTime).toLocaleString('en-US')}\n` +
        `⏱️ **Duration:** ${data.duration} minutes\n` +
        `🔒 **Password:** ${meeting.password}\n\n` +
        `**Join Link:**\n${meeting.join_url}\n\n` +
        `💡 You'll receive reminders before the call.`;

    await ctx.reply(successMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎥 ' + (lang === 'es' ? 'Ver Detalles' : 'View Details'), callback_data: `zoom:event:${meeting.id}` }],
          [{ text: '📤 ' + (lang === 'es' ? 'Compartir' : 'Share'), callback_data: `zoom:share:${meeting.id}` }],
        ],
      },
    });

    logger.info(`User ${ctx.from.id} scheduled Zoom call: ${meeting.id}`);
  } catch (error) {
    logger.error('Error creating scheduled meeting:', error);

    await ctx.telegram.deleteMessage(ctx.chat.id, waitingMsg.message_id).catch(() => {});

    await ctx.reply(
      lang === 'es'
        ? `❌ Error al programar la llamada. Por favor intenta de nuevo.`
        : `❌ Error scheduling call. Please try again.`
    );

    delete ctx.session.schedulingData;
  }
}

export default {
  startScheduling,
  handleSchedulingInput,
};
