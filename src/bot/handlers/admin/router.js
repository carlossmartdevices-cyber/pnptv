/**
 * Admin Panel Router
 * Central routing for all admin actions
 */

import { Markup } from 'telegraf';
import logger from '../../../utils/logger.js';
import { getUserLanguage, t } from '../../../utils/i18n.js';
import { parseCallback, isValidCallback } from './utils/callbacks.js';
import { handleAdminError, AdminError } from './utils/errorHandler.js';
import { logAdminAction } from './utils/audit.js';
import { cleanupAdminSession, markAdminAction } from './utils/session.js';
import { showDashboard } from './modules/dashboard.js';
import { handleUsers } from './modules/users.js';
import { handleBroadcasts } from './modules/broadcasts.js';
import { handlePlans } from './modules/plans.js';
import { handlePayments } from './modules/payments.js';
import { handleSettings } from './modules/settings.js';
import { handleTools } from './modules/tools.js';

/**
 * Main admin panel - shows top-level menu
 */
export async function showAdminPanel(ctx) {
  try {
    const lang = getUserLanguage(ctx);

    const message = lang === 'es'
      ? '⚙️ *Panel de Administración*\n\nBienvenido, Admin. Selecciona una opción:'
      : '⚙️ *Admin Panel*\n\nWelcome, Admin. Select an option:';

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(lang === 'es' ? '📊 Panel' : '📊 Dashboard', 'admin:dashboard:show')],
      [Markup.button.callback(lang === 'es' ? '👥 Usuarios' : '👥 Users', 'admin:users:list')],
      [Markup.button.callback(lang === 'es' ? '💳 Membresías' : '💳 Memberships', 'admin:memberships:activate')],
      [Markup.button.callback(lang === 'es' ? '📢 Difusiones' : '📢 Broadcasts', 'admin:broadcasts:wizard')],
      [Markup.button.callback(lang === 'es' ? '💰 Planes' : '💰 Plans', 'admin:plans:list')],
      [Markup.button.callback(lang === 'es' ? '⚙️ Configuración' : '⚙️ Settings', 'admin:settings:menus')],
      [Markup.button.callback(lang === 'es' ? '🛠️ Herramientas' : '🛠️ Tools', 'admin:tools:expiration')],
      [Markup.button.callback(lang === 'es' ? 'Menú Principal' : 'Main Menu', 'main_menu')],
    ]);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
    } else {
      await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
    }

    // Mark action
    markAdminAction(ctx, 'admin_panel');
    await logAdminAction(ctx, 'admin_panel_opened');
  } catch (error) {
    logger.error('Error showing admin panel:', error);
    await handleAdminError(ctx, error);
  }
}

/**
 * Route admin callbacks to appropriate handlers
 */
export async function routeAdminCallback(ctx) {
  try {
    if (!ctx.callbackQuery?.data) {
      return;
    }

    const data = ctx.callbackQuery.data;

    // Validate callback format
    if (!isValidCallback(data)) {
      logger.warn('Invalid callback format', { data });
      await ctx.answerCbQuery('⚠️ Invalid action', true);
      return;
    }

    // Parse callback
    const { section, action, params } = parseCallback(data);

    // Mark action in session
    markAdminAction(ctx, `${section}:${action}`);

    // Route to appropriate handler
    const routes = {
      dashboard: handleDashboard,
      users: handleUsers,
      memberships: handleMemberships,
      broadcasts: handleBroadcasts,
      plans: handlePlans,
      payments: handlePayments,
      settings: handleSettings,
      tools: handleTools,
      back: handleNavigation,
    };

    const handler = routes[section];

    if (!handler) {
      logger.warn(`Unknown admin section: ${section}`);
      await ctx.answerCbQuery('⚠️ Unknown action', true);
      return;
    }

    // Call handler
    await handler(ctx, action, params);
  } catch (error) {
    logger.error('Error routing admin callback:', error);

    if (error instanceof AdminError) {
      await handleAdminError(ctx, error, { answerCbQuery: true });
    } else {
      await ctx.answerCbQuery('❌ Error occurred', true);
    }
  }
}

/**
 * Handle dashboard callbacks
 */
async function handleDashboard(ctx, action, params) {
  await showDashboard(ctx, action, params);
}

/**
 * Handle membership callbacks
 */
async function handleMemberships(ctx, action, params) {
  // Use existing membership admin handler
  // This is already implemented in membershipAdminHandler.js
  const lang = getUserLanguage(ctx);
  const message = lang === 'es'
    ? '💳 Membresías - Use /admin_membership para gestión completa'
    : '💳 Memberships - Use /admin_membership for full management';

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:back:home')],
    ]),
  });
}

/**
 * Handle navigation callbacks
 */
async function handleNavigation(ctx, action, params) {
  if (action === 'home') {
    cleanupAdminSession(ctx);
    await showAdminPanel(ctx);
  } else if (action === 'section' && params.length > 0) {
    // Navigate back to specific section
    // Implement as needed
    await showAdminPanel(ctx);
  }
}

/**
 * Register admin handlers with bot
 */
export function registerAdminRoutes(bot) {
  // Admin command
  bot.command('admin', async (ctx) => {
    await showAdminPanel(ctx);
  });

  // Admin button
  bot.action('admin_panel', async (ctx) => {
    await showAdminPanel(ctx);
  });

  // All admin callbacks
  bot.action(/^admin:/, async (ctx) => {
    await routeAdminCallback(ctx);
  });

  // Legacy callback support
  bot.action(/^admin_/, async (ctx) => {
    logger.debug('Legacy admin callback detected', { data: ctx.callbackQuery.data });
    // TODO: Implement migration handler for legacy callbacks
  });

  logger.info('Admin routes registered');
}

export default {
  showAdminPanel,
  routeAdminCallback,
  registerAdminRoutes,
};
