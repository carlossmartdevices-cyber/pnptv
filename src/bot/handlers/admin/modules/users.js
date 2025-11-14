/**
 * Admin Users Module
 * User management, search, and moderation
 */

import { Markup } from 'telegraf';
import logger from '../../../../utils/logger.js';
import { getUserLanguage } from '../../../../utils/i18n.js';
import { db } from '../../../../config/firebase.js';
import { getUserById, updateUser } from '../../../../models/userModel.js';
import { getMembershipStatus } from '../../../../services/membershipService.js';

/**
 * Handle user management callbacks
 */
export async function handleUsers(ctx, action, params) {
  const lang = getUserLanguage(ctx);

  try {
    await ctx.answerCbQuery();

    switch (action) {
      case 'list':
        await showUsersList(ctx, lang);
        break;
      case 'search':
        await showUserSearch(ctx, lang);
        break;
      case 'view':
        if (params.length > 0) {
          await showUserDetails(ctx, lang, params[0]);
        } else {
          await showUsersList(ctx, lang);
        }
        break;
      case 'ban':
        if (params.length > 0) {
          await banUser(ctx, lang, params[0]);
        }
        break;
      case 'unban':
        if (params.length > 0) {
          await unbanUser(ctx, lang, params[0]);
        }
        break;
      default:
        await showUsersList(ctx, lang);
    }
  } catch (error) {
    logger.error('Error in users module:', error);
    const errorMsg = lang === 'es'
      ? '❌ Error al gestionar usuarios'
      : '❌ Error managing users';
    await ctx.reply(errorMsg);
  }
}

/**
 * Show users list with pagination
 */
async function showUsersList(ctx, lang, page = 0) {
  const pageSize = 10;
  const offset = page * pageSize;

  const usersSnapshot = await db.collection('users')
    .orderBy('createdAt', 'desc')
    .limit(pageSize + 1)
    .offset(offset)
    .get();

  const users = [];
  const hasMore = usersSnapshot.size > pageSize;

  usersSnapshot.docs.slice(0, pageSize).forEach(doc => {
    users.push({ id: doc.id, ...doc.data() });
  });

  const userList = users.map((user, i) =>
    `${offset + i + 1}. ${user.firstName || 'N/A'} (${user.id}) - ${user.tier || 'Free'}`
  ).join('\n');

  const message = lang === 'es'
    ? `👥 *Gestión de Usuarios*\n\nPágina ${page + 1}\n\n${userList || 'Sin usuarios'}\n\n` +
      'Usa /admin_user <ID> para ver detalles'
    : `👥 *User Management*\n\nPage ${page + 1}\n\n${userList || 'No users'}\n\n` +
      'Use /admin_user <ID> to view details';

  const buttons = [];

  // Navigation buttons
  const navButtons = [];
  if (page > 0) {
    navButtons.push(Markup.button.callback('« Previous', `admin:users:list:${page - 1}`));
  }
  if (hasMore) {
    navButtons.push(Markup.button.callback('Next »', `admin:users:list:${page + 1}`));
  }
  if (navButtons.length > 0) {
    buttons.push(navButtons);
  }

  buttons.push([Markup.button.callback(lang === 'es' ? '🔍 Buscar' : '🔍 Search', 'admin:users:search')]);
  buttons.push([Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:back:home')]);

  const keyboard = Markup.inlineKeyboard(buttons);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard,
  });
}

/**
 * Show user search interface
 */
async function showUserSearch(ctx, lang) {
  const message = lang === 'es'
    ? '🔍 *Buscar Usuario*\n\n' +
      'Envía el ID de usuario o nombre de usuario para buscar.\n\n' +
      'Ejemplo: `123456789` o `@username`'
    : '🔍 *Search User*\n\n' +
      'Send user ID or username to search.\n\n' +
      'Example: `123456789` or `@username`';

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:users:list')],
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard,
  });

  // Set session state to wait for user input
  ctx.session.adminAction = 'search_user';
}

/**
 * Show user details
 */
async function showUserDetails(ctx, lang, userId) {
  try {
    const user = await getUserById(userId);

    if (!user) {
      const message = lang === 'es' ? '❌ Usuario no encontrado' : '❌ User not found';
      await ctx.editMessageText(message, {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:users:list')],
        ]),
      });
      return;
    }

    const membership = await getMembershipStatus(userId);

    const message = lang === 'es'
      ? formatUserDetailsES(user, membership)
      : formatUserDetailsEN(user, membership);

    const buttons = [
      [
        Markup.button.callback(lang === 'es' ? '💳 Membresía' : '💳 Membership', `admin:memberships:view:${userId}`),
        Markup.button.callback(lang === 'es' ? '📊 Stats' : '📊 Stats', `admin:users:stats:${userId}`),
      ],
    ];

    if (user.banned) {
      buttons.push([Markup.button.callback(lang === 'es' ? '✅ Desbanear' : '✅ Unban', `admin:users:unban:${userId}`)]);
    } else {
      buttons.push([Markup.button.callback(lang === 'es' ? '🚫 Banear' : '🚫 Ban', `admin:users:ban:${userId}`)]);
    }

    buttons.push([Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:users:list')]);

    const keyboard = Markup.inlineKeyboard(buttons);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } catch (error) {
    logger.error('Error showing user details:', error);
    throw error;
  }
}

/**
 * Ban user
 */
async function banUser(ctx, lang, userId) {
  try {
    await updateUser(userId, {
      banned: true,
      bannedAt: new Date(),
      bannedBy: ctx.from.id,
    });

    const message = lang === 'es'
      ? `✅ Usuario ${userId} ha sido baneado`
      : `✅ User ${userId} has been banned`;

    await ctx.answerCbQuery(message, true);
    await showUserDetails(ctx, lang, userId);
  } catch (error) {
    logger.error('Error banning user:', error);
    const errorMsg = lang === 'es'
      ? '❌ Error al banear usuario'
      : '❌ Error banning user';
    await ctx.answerCbQuery(errorMsg, true);
  }
}

/**
 * Unban user
 */
async function unbanUser(ctx, lang, userId) {
  try {
    await updateUser(userId, {
      banned: false,
      bannedAt: null,
      bannedBy: null,
    });

    const message = lang === 'es'
      ? `✅ Usuario ${userId} ha sido desbaneado`
      : `✅ User ${userId} has been unbanned`;

    await ctx.answerCbQuery(message, true);
    await showUserDetails(ctx, lang, userId);
  } catch (error) {
    logger.error('Error unbanning user:', error);
    const errorMsg = lang === 'es'
      ? '❌ Error al desbanear usuario'
      : '❌ Error unbanning user';
    await ctx.answerCbQuery(errorMsg, true);
  }
}

/**
 * Format user details in English
 */
function formatUserDetailsEN(user, membership) {
  const status = user.banned ? '🚫 Banned' : '✅ Active';

  return `👤 *User Details*

*ID:* \`${user.id}\`
*Name:* ${user.firstName || 'N/A'} ${user.lastName || ''}
*Username:* ${user.username ? '@' + user.username : 'N/A'}
*Language:* ${user.language || 'en'}
*Status:* ${status}

*Membership*
• Tier: ${membership.tier || 'Free'}
• Plan: ${membership.currentPlan || 'None'}
• Expires: ${membership.expiresAt ? new Date(membership.expiresAt).toLocaleDateString() : 'N/A'}

*Verification*
• Age Verified: ${user.ageVerified ? '✅' : '❌'}
• Email: ${user.email || 'N/A'}
• Terms Accepted: ${user.termsAccepted ? '✅' : '❌'}

*Activity*
• Created: ${user.createdAt?.toDate().toLocaleDateString() || 'N/A'}
• Last Active: ${user.lastActive?.toDate().toLocaleDateString() || 'N/A'}`;
}

/**
 * Format user details in Spanish
 */
function formatUserDetailsES(user, membership) {
  const status = user.banned ? '🚫 Baneado' : '✅ Activo';

  return `👤 *Detalles del Usuario*

*ID:* \`${user.id}\`
*Nombre:* ${user.firstName || 'N/A'} ${user.lastName || ''}
*Usuario:* ${user.username ? '@' + user.username : 'N/A'}
*Idioma:* ${user.language || 'es'}
*Estado:* ${status}

*Membresía*
• Nivel: ${membership.tier || 'Gratis'}
• Plan: ${membership.currentPlan || 'Ninguno'}
• Expira: ${membership.expiresAt ? new Date(membership.expiresAt).toLocaleDateString() : 'N/A'}

*Verificación*
• Edad Verificada: ${user.ageVerified ? '✅' : '❌'}
• Email: ${user.email || 'N/A'}
• Términos Aceptados: ${user.termsAccepted ? '✅' : '❌'}

*Actividad*
• Creado: ${user.createdAt?.toDate().toLocaleDateString() || 'N/A'}
• Última Actividad: ${user.lastActive?.toDate().toLocaleDateString() || 'N/A'}`;
}

export default {
  handleUsers,
};
