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
  const lang = getUserLanguage(ctx);

  // TODO: Implement dashboard module
  const message = lang === 'es'
    ? '📊 Dashboard - Próximamente\n\nEsta sección mostrará estadísticas en tiempo real.'
    : '📊 Dashboard - Coming Soon\n\nThis section will show real-time statistics.';

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:back:home')],
    ]),
  });
}

/**
 * Handle user management callbacks
 */
async function handleUsers(ctx, action, params) {
  const lang = getUserLanguage(ctx);

  // TODO: Implement users module
  const message = lang === 'es'
    ? '👥 Gestión de Usuarios - Próximamente\n\nEsta sección permitirá gestionar usuarios.'
    : '👥 User Management - Coming Soon\n\nThis section will allow managing users.';

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:back:home')],
    ]),
  });
}

/**
 * Handle membership callbacks
 */
async function handleMemberships(ctx, action, params) {
  const lang = getUserLanguage(ctx);

  // TODO: Implement memberships module
  const message = lang === 'es'
    ? '💳 Membresías - Próximamente\n\nEsta sección permitirá activar membresías.'
    : '💳 Memberships - Coming Soon\n\nThis section will allow activating memberships.';

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:back:home')],
    ]),
  });
}

/**
 * Handle broadcast callbacks
 */
async function handleBroadcasts(ctx, action, params) {
  const lang = getUserLanguage(ctx);

  // TODO: Implement broadcasts module
  const message = lang === 'es'
    ? '📢 Difusiones - Próximamente\n\nEsta sección permitirá enviar mensajes a usuarios.'
    : '📢 Broadcasts - Coming Soon\n\nThis section will allow sending messages to users.';

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:back:home')],
    ]),
  });
}

/**
 * Handle plan management callbacks
 */
async function handlePlans(ctx, action, params) {
  const lang = getUserLanguage(ctx);

  // TODO: Implement plans module
  const message = lang === 'es'
    ? '💰 Planes - Próximamente\n\nEsta sección permitirá gestionar planes.'
    : '💰 Plans - Coming Soon\n\nThis section will allow managing plans.';

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:back:home')],
    ]),
  });
}

/**
 * Handle payment callbacks
 */
async function handlePayments(ctx, action, params) {
  const lang = getUserLanguage(ctx);

  // TODO: Implement payments module
  const message = lang === 'es'
    ? '💳 Pagos - Próximamente\n\nEsta sección mostrará información de pagos.'
    : '💳 Payments - Coming Soon\n\nThis section will show payment information.';

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:back:home')],
    ]),
  });
}

/**
 * Handle settings callbacks
 */
async function handleSettings(ctx, action, params) {
  const lang = getUserLanguage(ctx);

  // TODO: Implement settings module
  const message = lang === 'es'
    ? '⚙️ Configuración - Próximamente\n\nEsta sección permitirá configurar el panel.'
    : '⚙️ Settings - Coming Soon\n\nThis section will allow configuring the panel.';

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:back:home')],
    ]),
  });
}

/**
 * Handle tools callbacks
 */
async function handleTools(ctx, action, params) {
  const lang = getUserLanguage(ctx);

  // TODO: Implement tools module
  const message = lang === 'es'
    ? '🛠️ Herramientas - Próximamente\n\nEsta sección contendrá herramientas administrativas.'
    : '🛠️ Tools - Coming Soon\n\nThis section will contain administrative tools.';

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
