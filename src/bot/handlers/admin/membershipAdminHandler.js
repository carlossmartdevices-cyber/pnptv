/**
 * Admin Membership Management Handler
 *
 * Features:
 * - Activate/deactivate memberships
 * - Extend memberships
 * - View membership analytics
 * - Bulk operations (CSV import)
 * - Audit log viewer
 */

import { Markup } from 'telegraf';
import { t } from '../../../../utils/i18n.js';
import logger from '../../../../utils/logger.js';
import {
  activateMembership,
  deactivateMembership,
  getMembershipStatus,
  extendMembership,
  getMembershipHistory,
  getPlanStatistics,
  SUBSCRIPTION_PLANS,
  MEMBERSHIP_TIERS,
} from '../../../services/membershipService.js';
import {
  getAllPlans,
  getPlanAnalytics,
  syncDefaultPlansToFirestore,
} from '../../../services/planService.js';
import { getUserById } from '../../../models/userModel.js';

/**
 * Check if user is admin
 */
function isAdmin(ctx) {
  const adminIds = process.env.ADMIN_USER_IDS?.split(',').map(id => parseInt(id.trim())) || [];
  return adminIds.includes(ctx.from.id);
}

/**
 * Admin menu
 */
export function registerMembershipAdminHandlers(bot) {
  // Admin command: /admin_membership
  bot.command('admin_membership', async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply('⛔️ Access denied. Admin only.');
    }

    await showAdminMenu(ctx);
  });

  // Show admin menu
  bot.action('admin_membership_menu', async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.answerCbQuery('Access denied');
    }

    await ctx.answerCbQuery();
    await showAdminMenu(ctx);
  });

  // Activate membership wizard
  bot.action('admin_activate_membership', async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.answerCbQuery('Access denied');
    }

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '📋 *Activate Membership*\n\n' +
      'Please enter the user ID and plan ID:\n\n' +
      'Format: `userId planId`\n' +
      'Example: `123456789 crystal`\n\n' +
      'Available plans:\n' +
      Object.values(SUBSCRIPTION_PLANS).map(p => `• \`${p.id}\` - ${p.name} ($${p.priceUSD})`).join('\n'),
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('« Back', 'admin_membership_menu')],
        ]),
      }
    );

    // Set state to wait for input
    ctx.session.adminAction = 'activate_membership';
  });

  // Deactivate membership wizard
  bot.action('admin_deactivate_membership', async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.answerCbQuery('Access denied');
    }

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '🚫 *Deactivate Membership*\n\n' +
      'Please enter the user ID and reason:\n\n' +
      'Format: `userId reason`\n' +
      'Example: `123456789 admin_action`\n\n' +
      'Common reasons:\n' +
      '• `admin_action` - Manual admin deactivation\n' +
      '• `violation` - Terms violation\n' +
      '• `refund` - Payment refunded',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('« Back', 'admin_membership_menu')],
        ]),
      }
    );

    ctx.session.adminAction = 'deactivate_membership';
  });

  // Extend membership wizard
  bot.action('admin_extend_membership', async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.answerCbQuery('Access denied');
    }

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '⏰ *Extend Membership*\n\n' +
      'Please enter the user ID and days to add:\n\n' +
      'Format: `userId days`\n' +
      'Example: `123456789 30`',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('« Back', 'admin_membership_menu')],
        ]),
      }
    );

    ctx.session.adminAction = 'extend_membership';
  });

  // View user membership
  bot.action('admin_view_membership', async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.answerCbQuery('Access denied');
    }

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '👤 *View User Membership*\n\n' +
      'Please enter the user ID:\n\n' +
      'Format: `userId`\n' +
      'Example: `123456789`',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('« Back', 'admin_membership_menu')],
        ]),
      }
    );

    ctx.session.adminAction = 'view_membership';
  });

  // View analytics
  bot.action('admin_membership_analytics', async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.answerCbQuery('Access denied');
    }

    await ctx.answerCbQuery();
    await showAnalytics(ctx);
  });

  // View audit log
  bot.action('admin_audit_log', async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.answerCbQuery('Access denied');
    }

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '📜 *View Audit Log*\n\n' +
      'Please enter the user ID to view their membership history:\n\n' +
      'Format: `userId`\n' +
      'Example: `123456789`',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('« Back', 'admin_membership_menu')],
        ]),
      }
    );

    ctx.session.adminAction = 'view_audit_log';
  });

  // Sync default plans
  bot.action('admin_sync_plans', async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.answerCbQuery('Access denied');
    }

    await ctx.answerCbQuery('Syncing plans...');

    try {
      await syncDefaultPlansToFirestore();

      await ctx.editMessageText(
        '✅ *Plans Synced Successfully*\n\n' +
        'All default plans have been synced to Firestore.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('« Back to Menu', 'admin_membership_menu')],
          ]),
        }
      );

      logger.info(`Plans synced by admin: ${ctx.from.id}`);
    } catch (error) {
      logger.error('Error syncing plans:', error);

      await ctx.editMessageText(
        '❌ *Error Syncing Plans*\n\n' +
        `Error: ${error.message}`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('« Back to Menu', 'admin_membership_menu')],
          ]),
        }
      );
    }
  });

  // Handle text input for admin actions
  bot.on('text', async (ctx) => {
    if (!isAdmin(ctx) || !ctx.session.adminAction) {
      return;
    }

    const action = ctx.session.adminAction;
    const input = ctx.message.text.trim();

    try {
      switch (action) {
        case 'activate_membership':
          await handleActivateMembership(ctx, input);
          break;

        case 'deactivate_membership':
          await handleDeactivateMembership(ctx, input);
          break;

        case 'extend_membership':
          await handleExtendMembership(ctx, input);
          break;

        case 'view_membership':
          await handleViewMembership(ctx, input);
          break;

        case 'view_audit_log':
          await handleViewAuditLog(ctx, input);
          break;
      }

      // Clear action
      delete ctx.session.adminAction;
    } catch (error) {
      logger.error(`Error handling admin action ${action}:`, error);

      await ctx.reply(
        `❌ Error: ${error.message}`,
        Markup.inlineKeyboard([
          [Markup.button.callback('« Back to Menu', 'admin_membership_menu')],
        ])
      );

      delete ctx.session.adminAction;
    }
  });
}

/**
 * Show admin menu
 */
async function showAdminMenu(ctx) {
  const stats = await getPlanStatistics();

  const message =
    '⚙️ *Membership Administration*\n\n' +
    '📊 *Quick Stats:*\n' +
    `• Total Users: ${stats.total}\n` +
    `• Active Memberships: ${stats.active}\n` +
    `• Free Tier: ${stats.byTier.free || 0}\n` +
    `• Basic Tier: ${stats.byTier.basic || 0}\n` +
    `• Premium Tier: ${stats.byTier.premium || 0}\n\n` +
    'Select an action:';

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('✅ Activate Membership', 'admin_activate_membership')],
    [Markup.button.callback('🚫 Deactivate Membership', 'admin_deactivate_membership')],
    [Markup.button.callback('⏰ Extend Membership', 'admin_extend_membership')],
    [Markup.button.callback('👤 View User Membership', 'admin_view_membership')],
    [Markup.button.callback('📊 Analytics', 'admin_membership_analytics')],
    [Markup.button.callback('📜 Audit Log', 'admin_audit_log')],
    [Markup.button.callback('🔄 Sync Plans to Firestore', 'admin_sync_plans')],
  ]);

  if (ctx.callbackQuery) {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } else {
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  }
}

/**
 * Handle activate membership
 */
async function handleActivateMembership(ctx, input) {
  const parts = input.split(' ');

  if (parts.length < 2) {
    throw new Error('Invalid format. Use: userId planId');
  }

  const userId = parseInt(parts[0]);
  const planId = parts[1];

  // Validate plan
  const plan = Object.values(SUBSCRIPTION_PLANS).find(p => p.id === planId);
  if (!plan) {
    throw new Error(`Invalid plan ID: ${planId}`);
  }

  // Activate membership
  const result = await activateMembership(userId, planId, {
    triggeredBy: ctx.from.id,
    reason: 'admin_activation',
  });

  let message =
    '✅ *Membership Activated Successfully*\n\n' +
    `👤 User ID: \`${userId}\`\n` +
    `📦 Plan: ${result.planName}\n` +
    `🎯 Tier: ${result.tier}\n` +
    `📅 Expires: ${result.expiryDate.toLocaleDateString()}\n`;

  if (result.inviteLink) {
    message += `\n🔗 Invite Code: \`${result.inviteLink}\`\n`;
  }

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('« Back to Menu', 'admin_membership_menu')],
    ]),
  });

  logger.info(`Admin ${ctx.from.id} activated membership for user ${userId}: ${planId}`);
}

/**
 * Handle deactivate membership
 */
async function handleDeactivateMembership(ctx, input) {
  const parts = input.split(' ');

  if (parts.length < 2) {
    throw new Error('Invalid format. Use: userId reason');
  }

  const userId = parseInt(parts[0]);
  const reason = parts.slice(1).join(' ');

  // Deactivate membership
  const result = await deactivateMembership(userId, reason, ctx.from.id);

  const message =
    '✅ *Membership Deactivated Successfully*\n\n' +
    `👤 User ID: \`${userId}\`\n` +
    `🎯 New Tier: ${result.tier}\n` +
    `📝 Reason: ${reason}`;

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('« Back to Menu', 'admin_membership_menu')],
    ]),
  });

  logger.info(`Admin ${ctx.from.id} deactivated membership for user ${userId}: ${reason}`);
}

/**
 * Handle extend membership
 */
async function handleExtendMembership(ctx, input) {
  const parts = input.split(' ');

  if (parts.length < 2) {
    throw new Error('Invalid format. Use: userId days');
  }

  const userId = parseInt(parts[0]);
  const days = parseInt(parts[1]);

  if (isNaN(days) || days <= 0) {
    throw new Error('Days must be a positive number');
  }

  // Extend membership
  const result = await extendMembership(userId, days, ctx.from.id);

  const message =
    '✅ *Membership Extended Successfully*\n\n' +
    `👤 User ID: \`${userId}\`\n` +
    `➕ Days Added: ${days}\n` +
    `📅 New Expiry: ${result.expiryDate.toLocaleDateString()}`;

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('« Back to Menu', 'admin_membership_menu')],
    ]),
  });

  logger.info(`Admin ${ctx.from.id} extended membership for user ${userId} by ${days} days`);
}

/**
 * Handle view membership
 */
async function handleViewMembership(ctx, input) {
  const userId = parseInt(input.trim());

  if (isNaN(userId)) {
    throw new Error('Invalid user ID');
  }

  // Get user and membership status
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const status = await getMembershipStatus(userId);

  let message =
    '👤 *User Membership Details*\n\n' +
    `*User Info:*\n` +
    `• ID: \`${userId}\`\n` +
    `• Username: @${user.username || 'none'}\n` +
    `• Language: ${user.language}\n\n` +
    `*Membership:*\n` +
    `• Tier: *${status.tier.toUpperCase()}*\n` +
    `• Status: ${status.status}\n`;

  if (status.planId) {
    message +=
      `• Plan: ${status.planName}\n` +
      `• Expires: ${status.expiryDate.toLocaleDateString()}\n` +
      `• Days Remaining: ${status.daysRemaining}\n`;
  }

  message += `\n*Permissions:*\n`;
  message += `• Premium Channel: ${status.permissions.canAccessPremiumChannel ? '✅' : '❌'}\n`;
  message += `• Invite Links: ${status.permissions.canGenerateInvites ? '✅' : '❌'}\n`;

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('📜 View History', `admin_show_history_${userId}`)],
      [Markup.button.callback('« Back to Menu', 'admin_membership_menu')],
    ]),
  });
}

/**
 * Handle view audit log
 */
async function handleViewAuditLog(ctx, input) {
  const userId = parseInt(input.trim());

  if (isNaN(userId)) {
    throw new Error('Invalid user ID');
  }

  const history = await getMembershipHistory(userId, 10);

  if (history.length === 0) {
    await ctx.reply(
      `📜 *Audit Log*\n\n` +
      `No membership history found for user \`${userId}\`.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('« Back to Menu', 'admin_membership_menu')],
        ]),
      }
    );
    return;
  }

  let message = `📜 *Audit Log for User ${userId}*\n\n`;

  history.forEach((entry, index) => {
    const date = entry.createdAt.toLocaleDateString();
    const action = entry.action.toUpperCase();

    message += `${index + 1}. *${action}* (${date})\n`;
    message += `   Tier: ${entry.tier}\n`;

    if (entry.planId) {
      message += `   Plan: ${entry.planName || entry.planId}\n`;
    }

    message += `   By: ${entry.triggeredBy}\n`;
    message += `   Reason: ${entry.reason}\n\n`;
  });

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('« Back to Menu', 'admin_membership_menu')],
    ]),
  });
}

/**
 * Show analytics
 */
async function showAnalytics(ctx) {
  const [planStats, planAnalytics] = await Promise.all([
    getPlanStatistics(),
    getPlanAnalytics(),
  ]);

  let message =
    '📊 *Membership Analytics*\n\n' +
    `*User Distribution:*\n` +
    `• Total Users: ${planStats.total}\n` +
    `• Active Memberships: ${planStats.active}\n` +
    `• Expired: ${planStats.expired}\n\n` +
    `*By Tier:*\n`;

  Object.entries(planStats.byTier).forEach(([tier, count]) => {
    message += `• ${tier.charAt(0).toUpperCase() + tier.slice(1)}: ${count}\n`;
  });

  message += `\n*By Plan:*\n`;

  Object.entries(planStats.byPlan).forEach(([planId, count]) => {
    const plan = Object.values(SUBSCRIPTION_PLANS).find(p => p.id === planId);
    message += `• ${plan?.name || planId}: ${count}\n`;
  });

  message +=
    `\n*Revenue:*\n` +
    `• Total: $${planAnalytics.revenue.total.toFixed(2)}\n`;

  Object.entries(planAnalytics.revenue.byPlan).forEach(([planId, revenue]) => {
    const plan = Object.values(SUBSCRIPTION_PLANS).find(p => p.id === planId);
    message += `• ${plan?.name || planId}: $${revenue.toFixed(2)}\n`;
  });

  message +=
    `\n*Conversion:*\n` +
    `• Total Users: ${planAnalytics.conversion.totalUsers}\n` +
    `• Paid Users: ${planAnalytics.conversion.paidUsers}\n` +
    `• Conversion Rate: ${planAnalytics.conversion.conversionRate}`;

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Refresh', 'admin_membership_analytics')],
      [Markup.button.callback('« Back to Menu', 'admin_membership_menu')],
    ]),
  });
}

export default {
  registerMembershipAdminHandlers,
};
