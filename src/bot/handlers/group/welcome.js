/**
 * Group Welcome Handler
 *
 * Enhanced welcome experience for new group members with tier detection.
 */

import { Markup } from 'telegraf';
import { collections } from '../../../config/firebase.js';
import logger from '../../../../utils/logger.js';
import { getUserLanguage } from '../../../../utils/i18n.js';
import { getUserTier, syncGroupPermissions, getTierBadge, getTierName } from '../../helpers/group/tierSync.js';

/**
 * Handle new group member
 * Register this with: bot.on('new_chat_members', handleNewGroupMembers)
 * @param {object} ctx - Telegraf context
 */
export async function handleNewGroupMembers(ctx) {
  try {
    const members = ctx.message.new_chat_members;

    for (const member of members) {
      // Skip bot additions
      if (member.is_bot) continue;

      // Skip if it's just the bot itself
      if (member.id === ctx.botInfo.id) continue;

      // Delay slightly to let other handlers process
      await new Promise(resolve => setTimeout(resolve, 500));

      await welcomeNewMember(ctx, member);
    }
  } catch (error) {
    logger.error('Error handling new group members:', error);
  }
}

/**
 * Send enhanced welcome message for new member
 * @param {object} ctx - Telegraf context
 * @param {object} member - Telegram user object
 */
export async function welcomeNewMember(ctx, member) {
  try {
    const userId = member.id.toString();
    const lang = await getUserLanguage({ from: { language_code: member.language_code } });

    // Get user tier
    const { tier, isActive } = await getUserTier(userId);

    // Sync permissions immediately
    await syncGroupPermissions(ctx, userId, tier);

    // Generate welcome message
    const message = generateWelcomeMessage(member, tier, isActive, lang);

    // Send welcome with inline menu
    const keyboard = getWelcomeKeyboard(tier, isActive, lang);

    const welcomeMsg = await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

    // Auto-delete after 3 minutes
    setTimeout(() => {
      ctx.deleteMessage(welcomeMsg.message_id).catch(() => {});
    }, 180000);

    // Send channel invites in DM
    await sendChannelInvites(ctx, userId, tier, isActive, lang).catch(() => {
      logger.debug(`Could not send channel invites to ${userId}`);
    });

    // Log new member
    await logGroupActivity(userId, ctx.chat.id, 'member_joined');

    logger.info(`Welcomed new member ${userId} in group ${ctx.chat.id}`);
  } catch (error) {
    logger.error(`Error welcoming new member:`, error);
  }
}

/**
 * Generate welcome message based on tier
 * @param {object} member - Telegram user object
 * @param {string} tier - User tier
 * @param {boolean} isActive - Is tier active
 * @param {string} lang - Language code
 * @returns {string} Welcome message
 */
function generateWelcomeMessage(member, tier, isActive, lang) {
  const name = member.first_name || member.username || 'User';
  const tierBadge = getTierBadge(tier);
  const tierName = getTierName(tier, lang);

  if (lang === 'es') {
    return `🎉 **¡Bienvenido ${name}!**\n\n` +
      `${tierBadge} *${tierName}*\n\n` +
      getTierWelcome(tier, isActive, 'es') + `\n\n` +
      `📋 *Comienza aquí:*\n` +
      `• Lee las reglas: /rules\n` +
      `• Abre el menú: /menu\n` +
      `• Obtén ayuda: /help`;
  }

  return `🎉 **Welcome ${name}!**\n\n` +
    `${tierBadge} *${tierName}*\n\n` +
    getTierWelcome(tier, isActive, 'en') + `\n\n` +
    `📋 *Get Started:*\n` +
    `• Read the rules: /rules\n` +
    `• Open the menu: /menu\n` +
    `• Get help: /help`;
}

/**
 * Get tier-specific welcome text
 * @param {string} tier - Membership tier
 * @param {boolean} isActive - Is tier active
 * @param {string} lang - Language code
 * @returns {string} Tier-specific welcome message
 */
function getTierWelcome(tier, isActive, lang) {
  if (tier === 'free' || !isActive) {
    return lang === 'es'
      ? `Tienes acceso **gratuito** a la comunidad.\n\n` +
        `💎 **¿Sabías?** Los miembros Premium pueden:\n` +
        `• 📸 Enviar fotos y videos\n` +
        `• 🎥 Crear salas de video\n` +
        `• 📺 Acceder al canal premium\n\n` +
        `Escribe /subscribe para ver nuestros planes.`
      : `You have **free** access to the community.\n\n` +
        `💎 **Did you know?** Premium members can:\n` +
        `• 📸 Send photos and videos\n` +
        `• 🎥 Create video rooms\n` +
        `• 📺 Access premium channel\n\n` +
        `Type /subscribe to see our plans.`;
  }

  return lang === 'es'
    ? `¡Eres un miembro **${tier.charAt(0).toUpperCase() + tier.slice(1)}**! 🌟\n\n` +
      `Tienes acceso **completo** a todas las funciones premium del grupo.`
    : `You're a **${tier.charAt(0).toUpperCase() + tier.slice(1)}** member! 🌟\n\n` +
      `You have **full access** to all premium features.`;
}

/**
 * Get welcome keyboard
 * @param {string} tier - User tier
 * @param {boolean} isActive - Is tier active
 * @param {string} lang - Language code
 * @returns {Object} Inline keyboard
 */
function getWelcomeKeyboard(tier, isActive, lang) {
  const buttons = [
    [Markup.button.callback(
      '📋 ' + (lang === 'es' ? 'Ver Reglas' : 'View Rules'),
      'group:info:rules'
    )],
    [Markup.button.callback(
      '🎯 ' + (lang === 'es' ? 'Abrir Menú' : 'Open Menu'),
      'group:menu'
    )]
  ];

  if ((tier === 'free' || !isActive) && tier !== 'premium') {
    buttons.push([
      Markup.button.callback(
        '💎 ' + (lang === 'es' ? 'Ver Premium' : 'View Premium'),
        'group:premium:benefits'
      )
    ]);
  }

  return Markup.inlineKeyboard(buttons);
}

/**
 * Send channel invite links via DM
 * @param {object} ctx - Telegraf context
 * @param {string} userId - Telegram user ID
 * @param {string} tier - User tier
 * @param {boolean} isActive - Is tier active
 * @param {string} lang - Language code
 */
export async function sendChannelInvites(ctx, userId, tier, isActive, lang) {
  try {
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'PNPtvBot';

    let message = lang === 'es'
      ? `🎉 **¡Bienvenido a PNPtv!**\n\n` +
        `Aquí están tus enlaces a los canales:\n\n`
      : `🎉 **Welcome to PNPtv!**\n\n` +
        `Here are your channel links:\n\n`;

    // Always send free channel invite
    const freeChannelId = process.env.FREE_CHANNEL_ID;
    if (freeChannelId) {
      try {
        const freeInvite = await ctx.telegram.createChatInviteLink(freeChannelId, {
          member_limit: 1,
          name: `Free - User ${userId}`,
          expire_date: Math.floor(Date.now() / 1000) + 86400 // 24 hours
        });

        message += lang === 'es'
          ? `🆓 **Canal Gratuito:**\n${freeInvite.invite_link}\n\n`
          : `🆓 **Free Channel:**\n${freeInvite.invite_link}\n\n`;
      } catch (error) {
        logger.warn(`Could not create free channel invite:`, error.message);
      }
    }

    // Send premium channel invite if applicable
    if ((tier !== 'free' && isActive) || tier === 'premium') {
      const premiumChannelId = process.env.CHANNEL_ID;
      if (premiumChannelId) {
        try {
          const premiumInvite = await ctx.telegram.createChatInviteLink(premiumChannelId, {
            member_limit: 1,
            name: `${tier} - User ${userId}`,
            expire_date: Math.floor(Date.now() / 1000) + 86400 // 24 hours
          });

          message += lang === 'es'
            ? `💎 **Canal Premium:**\n${premiumInvite.invite_link}\n\n`
            : `💎 **Premium Channel:**\n${premiumInvite.invite_link}\n\n`;
        } catch (error) {
          logger.warn(`Could not create premium channel invite:`, error.message);
        }
      }
    }

    message += lang === 'es'
      ? `⚠️ Estos enlaces son únicos y solo funcionan una vez. No los compartas.\n\n` +
        `Si tienes problemas, escribe /support`
      : `⚠️ These links are unique and work only once. Don't share them.\n\n` +
        `If you have issues, type /support`;

    const keyboard = Markup.inlineKeyboard([
      Markup.button.url(
        lang === 'es' ? '📱 Abrir en Bot' : '📱 Open in Bot',
        `https://t.me/${botUsername}?start=home`
      )
    ]);

    await ctx.telegram.sendMessage(parseInt(userId), message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

    logger.info(`Sent channel invites to user ${userId}`);
  } catch (error) {
    logger.warn(`Could not send channel invites:`, error.message);
    throw error;
  }
}

/**
 * Log group activity
 * @param {string} userId - Telegram user ID
 * @param {string} groupId - Telegram group ID
 * @param {string} activityType - Type of activity
 */
async function logGroupActivity(userId, groupId, activityType) {
  try {
    await collections.groupEngagement().doc(`${groupId}_${userId}`).set({
      userId: parseInt(userId),
      groupId: parseInt(groupId),
      score: 0,
      messagesCount: 0,
      mediaCount: 0,
      eventsAttended: 0,
      joinedAt: new Date(),
      lastSeen: new Date()
    }, { merge: true });

    logger.debug(`Logged activity ${activityType} for user ${userId} in group ${groupId}`);
  } catch (error) {
    logger.warn(`Could not log activity:`, error.message);
  }
}

export default {
  handleNewGroupMembers,
  welcomeNewMember,
  sendChannelInvites,
  generateWelcomeMessage
};
