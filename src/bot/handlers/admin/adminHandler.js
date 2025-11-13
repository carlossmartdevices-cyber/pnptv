/**
 * Admin Panel Handler
 */

import { Markup } from 'telegraf';
import { t, getUserLanguage } from '../../../utils/i18n.js';
import { requireAdmin } from '../../core/middleware/authMiddleware.js';
import {
  getAllActiveUsers,
  getUsersByLanguage,
  getUsersBySubscriptionStatus,
  searchUserByUsername,
  updateUser,
} from '../../../models/userModel.js';
import { extendSubscription } from '../../../services/subscriptionService.js';
import { bot } from '../../core/bot.js';
import logger from '../../../utils/logger.js';

/**
 * Register admin handlers
 */
export function registerAdminHandlers(bot) {
  bot.command('admin', requireAdmin, async (ctx) => {
    await showAdminPanel(ctx);
  });

  bot.action('admin_panel', requireAdmin, async (ctx) => {
    await showAdminPanel(ctx);
  });

  bot.action('admin_broadcast', requireAdmin, async (ctx) => {
    await showBroadcastWizard(ctx);
  });

  bot.action(/broadcast_audience_(.+)/, requireAdmin, async (ctx) => {
    const audience = ctx.match[1];
    ctx.session.broadcast = { audience };
    const lang = getUserLanguage(ctx);
    ctx.session.waitingFor = 'broadcast_message';

    await ctx.editMessageText(t('broadcastMessagePrompt', lang), Markup.inlineKeyboard([
      [Markup.button.callback(t('cancel', lang), 'admin_panel')],
    ]));
  });

  bot.action(/broadcast_confirm_(yes|no)/, requireAdmin, async (ctx) => {
    if (ctx.match[1] === 'yes') {
      await sendBroadcast(ctx);
    } else {
      const lang = getUserLanguage(ctx);
      await ctx.editMessageText(t('broadcastCancelled', lang));
    }
  });

  bot.action('admin_users', requireAdmin, async (ctx) => {
    const lang = getUserLanguage(ctx);
    ctx.session.waitingFor = 'user_search';

    await ctx.editMessageText(t('userSearch', lang), Markup.inlineKeyboard([
      [Markup.button.callback(t('cancel', lang), 'admin_panel')],
    ]));
  });

  bot.action(/user_action_extend_(\d+)/, requireAdmin, async (ctx) => {
    const userId = parseInt(ctx.match[1]);
    await handleExtendSubscription(ctx, userId);
  });

  bot.action(/user_action_deactivate_(\d+)/, requireAdmin, async (ctx) => {
    const userId = parseInt(ctx.match[1]);
    await handleDeactivateUser(ctx, userId);
  });

  // Handle broadcast message
  bot.on(['text', 'photo', 'video'], async (ctx, next) => {
    if (ctx.session.waitingFor === 'broadcast_message') {
      await handleBroadcastMessage(ctx);
    } else if (ctx.session.waitingFor === 'user_search') {
      await handleUserSearch(ctx, ctx.message.text);
    } else {
      return next();
    }
  });
}

/**
 * Show admin panel
 */
async function showAdminPanel(ctx) {
  try {
    const lang = getUserLanguage(ctx);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(t('adminBroadcast', lang), 'admin_broadcast')],
      [Markup.button.callback(t('adminUsers', lang), 'admin_users')],
      [Markup.button.callback(t('back', lang), 'main_menu')],
    ]);

    const message = t('adminPanel', lang);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
    } else {
      await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
    }
  } catch (error) {
    logger.error('Error showing admin panel:', error);
  }
}

/**
 * Show broadcast wizard
 */
async function showBroadcastWizard(ctx) {
  try {
    const lang = getUserLanguage(ctx);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(t('broadcastAllUsers', lang), 'broadcast_audience_all')],
      [Markup.button.callback(t('broadcastPremiumOnly', lang), 'broadcast_audience_premium')],
      [Markup.button.callback(t('broadcastFreeOnly', lang), 'broadcast_audience_free')],
      [Markup.button.callback(t('broadcastEnglish', lang), 'broadcast_audience_english')],
      [Markup.button.callback(t('broadcastSpanish', lang), 'broadcast_audience_spanish')],
      [Markup.button.callback(t('cancel', lang), 'admin_panel')],
    ]);

    await ctx.editMessageText(t('broadcastWizard', lang), {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } catch (error) {
    logger.error('Error showing broadcast wizard:', error);
  }
}

/**
 * Handle broadcast message
 */
async function handleBroadcastMessage(ctx) {
  try {
    const lang = getUserLanguage(ctx);

    // Store message
    ctx.session.broadcast.message = ctx.message.text || ctx.message.caption;
    ctx.session.broadcast.photo = ctx.message.photo?.[ctx.message.photo.length - 1]?.file_id;
    ctx.session.broadcast.video = ctx.message.video?.file_id;
    ctx.session.waitingFor = null;

    // Get target audience count
    const users = await getTargetAudience(ctx.session.broadcast.audience);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(t('confirm', lang), 'broadcast_confirm_yes')],
      [Markup.button.callback(t('cancel', lang), 'broadcast_confirm_no')],
    ]);

    await ctx.reply(t('broadcastConfirm', lang, { count: users.length }), keyboard);
  } catch (error) {
    logger.error('Error handling broadcast message:', error);
  }
}

/**
 * Send broadcast
 */
async function sendBroadcast(ctx) {
  try {
    const lang = getUserLanguage(ctx);
    const broadcast = ctx.session.broadcast;

    const users = await getTargetAudience(broadcast.audience);

    let sentCount = 0;

    for (const user of users) {
      try {
        if (broadcast.photo) {
          await bot.telegram.sendPhoto(user.userId, broadcast.photo, {
            caption: broadcast.message,
          });
        } else if (broadcast.video) {
          await bot.telegram.sendVideo(user.userId, broadcast.video, {
            caption: broadcast.message,
          });
        } else {
          await bot.telegram.sendMessage(user.userId, broadcast.message);
        }
        sentCount++;

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        logger.error(`Failed to send broadcast to user ${user.userId}:`, error);
      }
    }

    delete ctx.session.broadcast;

    await ctx.editMessageText(t('broadcastSent', lang, { count: sentCount }));
  } catch (error) {
    logger.error('Error sending broadcast:', error);
  }
}

/**
 * Get target audience
 */
async function getTargetAudience(audience) {
  switch (audience) {
    case 'all':
      return await getAllActiveUsers();
    case 'premium':
      return await getUsersBySubscriptionStatus('active');
    case 'free':
      return await getUsersBySubscriptionStatus('free');
    case 'english':
      return await getUsersByLanguage('en');
    case 'spanish':
      return await getUsersByLanguage('es');
    default:
      return await getAllActiveUsers();
  }
}

/**
 * Handle user search
 */
async function handleUserSearch(ctx, query) {
  try {
    const lang = getUserLanguage(ctx);
    const user = await searchUserByUsername(query.replace('@', ''));

    if (!user) {
      return ctx.reply(t('userNotFound', lang));
    }

    ctx.session.waitingFor = null;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(t('extendSubscription', lang), `user_action_extend_${user.userId}`)],
      [Markup.button.callback(t('deactivateUser', lang), `user_action_deactivate_${user.userId}`)],
      [Markup.button.callback(t('back', lang), 'admin_panel')],
    ]);

    await ctx.reply(t('userActions', lang, { username: user.username || user.firstName }), keyboard);
  } catch (error) {
    logger.error('Error handling user search:', error);
  }
}

/**
 * Handle extend subscription
 */
async function handleExtendSubscription(ctx, userId) {
  try {
    const lang = getUserLanguage(ctx);

    await extendSubscription(userId, 30); // Extend by 30 days

    await ctx.editMessageText(t('userUpdated', lang));
  } catch (error) {
    logger.error('Error extending subscription:', error);
  }
}

/**
 * Handle deactivate user
 */
async function handleDeactivateUser(ctx, userId) {
  try {
    const lang = getUserLanguage(ctx);

    await updateUser(userId, { isActive: false });

    await ctx.editMessageText(t('userUpdated', lang));
  } catch (error) {
    logger.error('Error deactivating user:', error);
  }
}

export default registerAdminHandlers;
