/**
 * Group Video Rooms & Events Handler
 *
 * Manages group video rooms, events, and scheduling.
 */

import { Markup } from 'telegraf';
import logger from '../../../../utils/logger.js';
import { getUserLanguage } from '../../../../utils/i18n.js';
import { getUserTier } from '../../helpers/group/tierSync.js';
import { MEMBERSHIP_TIERS } from '../../../services/membershipService.js';

/**
 * Handle events menu actions
 * @param {object} ctx - Telegraf context
 * @param {string} action - Action type
 */
export async function handleEvents(ctx, action) {
  try {
    const lang = getUserLanguage(ctx);

    switch (action) {
      case 'menu':
        await showEventsMenu(ctx);
        break;
      case 'room:open':
        await openVideoRoom(ctx);
        break;
      case 'room:schedule':
        await scheduleRoom(ctx);
        break;
      case 'upcoming':
        await showUpcomingEvents(ctx);
        break;
      case 'timezone':
        await setTimezone(ctx);
        break;
      default:
        logger.warn(`Unknown events action: ${action}`);
    }
  } catch (error) {
    logger.error('Error in events handler:', error);
    await ctx.answerCbQuery('Error. Please try again.', true);
  }
}

/**
 * Show events menu
 * @param {object} ctx - Telegraf context
 */
export async function showEventsMenu(ctx) {
  const lang = getUserLanguage(ctx);
  const userId = ctx.from.id.toString();
  const { tier } = await getUserTier(userId);
  const isPremium = tier !== MEMBERSHIP_TIERS.FREE;

  const message = lang === 'es'
    ? `📅 **Salas y Eventos**\n\nCrea y accede a salas de video del grupo.`
    : `📅 **Rooms & Events**\n\nCreate and access group video rooms.`;

  const buttons = [];

  if (isPremium) {
    buttons.push([Markup.button.callback(
      '🎥 ' + (lang === 'es' ? 'Abrir Sala Ahora' : 'Open Room Now'),
      'group:events:room:open'
    )]);
  } else {
    buttons.push([Markup.button.callback(
      '🎥 ' + (lang === 'es' ? 'Abrir Sala (Premium)' : 'Open Room (Premium)'),
      'group:premium:benefits'
    )]);
  }

  buttons.push(
    [Markup.button.callback(
      '📅 ' + (lang === 'es' ? 'Programar Sala' : 'Schedule Room'),
      'group:events:room:schedule'
    )],
    [Markup.button.callback(
      '🗓️ ' + (lang === 'es' ? 'Eventos Próximos' : 'Upcoming Events'),
      'group:events:upcoming'
    )],
    [Markup.button.callback(
      '⏰ ' + (lang === 'es' ? 'Mi Zona Horaria' : 'My Timezone'),
      'group:events:timezone'
    )],
    [Markup.button.callback(
      '« ' + (lang === 'es' ? 'Volver' : 'Back'),
      'group:menu'
    )]
  );

  const keyboard = Markup.inlineKeyboard(buttons);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Open video room (premium only)
 * @param {object} ctx - Telegraf context
 */
export async function openVideoRoom(ctx) {
  const lang = getUserLanguage(ctx);

  const message = lang === 'es'
    ? `🎥 **Abrir Sala de Video**\n\nEsta funcionalidad está disponible pronto.`
    : `🎥 **Open Video Room**\n\nThis feature is coming soon.`;

  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback(
      '« ' + (lang === 'es' ? 'Volver' : 'Back'),
      'group:events:menu'
    )
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Schedule video room
 * @param {object} ctx - Telegraf context
 */
export async function scheduleRoom(ctx) {
  const lang = getUserLanguage(ctx);

  const message = lang === 'es'
    ? `📅 **Programar Sala**\n\nEsta funcionalidad está disponible pronto.`
    : `📅 **Schedule Room**\n\nThis feature is coming soon.`;

  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback(
      '« ' + (lang === 'es' ? 'Volver' : 'Back'),
      'group:events:menu'
    )
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Show upcoming events
 * @param {object} ctx - Telegraf context
 */
export async function showUpcomingEvents(ctx) {
  const lang = getUserLanguage(ctx);

  const message = lang === 'es'
    ? `🗓️ **Eventos Próximos**\n\nNo hay eventos programados aún.`
    : `🗓️ **Upcoming Events**\n\nNo events scheduled yet.`;

  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback(
      '« ' + (lang === 'es' ? 'Volver' : 'Back'),
      'group:events:menu'
    )
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Set user timezone
 * @param {object} ctx - Telegraf context
 */
export async function setTimezone(ctx) {
  const lang = getUserLanguage(ctx);

  const message = lang === 'es'
    ? `⏰ **Mi Zona Horaria**\n\nEsta funcionalidad está disponible pronto.`
    : `⏰ **My Timezone**\n\nThis feature is coming soon.`;

  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback(
      '« ' + (lang === 'es' ? 'Volver' : 'Back'),
      'group:events:menu'
    )
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

export default {
  handleEvents,
  showEventsMenu,
  openVideoRoom,
  scheduleRoom,
  showUpcomingEvents,
  setTimezone
};
