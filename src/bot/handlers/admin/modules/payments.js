/**
 * Admin Payments Module
 * View and manage payment transactions
 */

import { Markup } from 'telegraf';
import logger from '../../../../utils/logger.js';
import { getUserLanguage } from '../../../../utils/i18n.js';
import { db } from '../../../../config/firebase.js';

/**
 * Handle payments callbacks
 */
export async function handlePayments(ctx, action, params) {
  const lang = getUserLanguage(ctx);

  try {
    await ctx.answerCbQuery();

    switch (action) {
      case 'list':
        await showPaymentsList(ctx, lang, parseInt(params[0]) || 0);
        break;
      case 'view':
        if (params.length > 0) {
          await showPaymentDetails(ctx, lang, params[0]);
        } else {
          await showPaymentsList(ctx, lang, 0);
        }
        break;
      case 'stats':
        await showPaymentStatistics(ctx, lang);
        break;
      default:
        await showPaymentsList(ctx, lang, 0);
    }
  } catch (error) {
    logger.error('Error in payments module:', error);
    const errorMsg = lang === 'es'
      ? '❌ Error al gestionar pagos'
      : '❌ Error managing payments';
    await ctx.reply(errorMsg);
  }
}

/**
 * Show payments list with pagination
 */
async function showPaymentsList(ctx, lang, page = 0) {
  const pageSize = 10;
  const offset = page * pageSize;

  const paymentsSnapshot = await db.collection('payments')
    .orderBy('createdAt', 'desc')
    .limit(pageSize + 1)
    .offset(offset)
    .get();

  const payments = [];
  const hasMore = paymentsSnapshot.size > pageSize;

  paymentsSnapshot.docs.slice(0, pageSize).forEach(doc => {
    payments.push({ id: doc.id, ...doc.data() });
  });

  const paymentsList = payments.map((payment, i) => {
    const date = payment.createdAt?.toDate().toLocaleDateString() || 'N/A';
    const status = payment.status === 'completed' ? '✅' : payment.status === 'pending' ? '⏳' : '❌';
    return `${offset + i + 1}. ${status} $${payment.amount} - ${payment.gateway} (${date})`;
  }).join('\n');

  const message = lang === 'es'
    ? `💳 *Pagos Recientes*\n\nPágina ${page + 1}\n\n${paymentsList || 'Sin pagos'}`
    : `💳 *Recent Payments*\n\nPage ${page + 1}\n\n${paymentsList || 'No payments'}`;

  const buttons = [];

  // Navigation buttons
  const navButtons = [];
  if (page > 0) {
    navButtons.push(Markup.button.callback('« Previous', `admin:payments:list:${page - 1}`));
  }
  if (hasMore) {
    navButtons.push(Markup.button.callback('Next »', `admin:payments:list:${page + 1}`));
  }
  if (navButtons.length > 0) {
    buttons.push(navButtons);
  }

  buttons.push([Markup.button.callback(lang === 'es' ? '📊 Estadísticas' : '📊 Statistics', 'admin:payments:stats')]);
  buttons.push([Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:back:home')]);

  const keyboard = Markup.inlineKeyboard(buttons);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard,
  });
}

/**
 * Show payment details
 */
async function showPaymentDetails(ctx, lang, paymentId) {
  const paymentDoc = await db.collection('payments').doc(paymentId).get();

  if (!paymentDoc.exists) {
    const message = lang === 'es' ? '❌ Pago no encontrado' : '❌ Payment not found';
    await ctx.editMessageText(message, {
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:payments:list')],
      ]),
    });
    return;
  }

  const payment = paymentDoc.data();

  const message = lang === 'es'
    ? formatPaymentDetailsES(payment, paymentId)
    : formatPaymentDetailsEN(payment, paymentId);

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:payments:list')],
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard,
  });
}

/**
 * Show payment statistics
 */
async function showPaymentStatistics(ctx, lang) {
  const stats = await getPaymentStatistics();

  const message = lang === 'es'
    ? formatPaymentStatsES(stats)
    : formatPaymentStatsEN(stats);

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:payments:list')],
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard,
  });
}

/**
 * Get payment statistics
 */
async function getPaymentStatistics() {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const allPayments = await db.collection('payments')
    .where('status', '==', 'completed')
    .get();

  let totalRevenue = 0;
  let thisMonth = 0;
  let lastMonth = 0;
  const gatewayStats = {};

  allPayments.forEach(doc => {
    const payment = doc.data();
    const amount = payment.amount || 0;
    totalRevenue += amount;

    const paymentDate = payment.createdAt?.toDate();
    if (paymentDate >= firstDayOfMonth) {
      thisMonth += amount;
    } else if (paymentDate >= firstDayOfLastMonth && paymentDate < firstDayOfMonth) {
      lastMonth += amount;
    }

    // Gateway statistics
    const gateway = payment.gateway || 'unknown';
    gatewayStats[gateway] = (gatewayStats[gateway] || 0) + amount;
  });

  return {
    totalRevenue,
    thisMonth,
    lastMonth,
    totalTransactions: allPayments.size,
    gatewayStats,
  };
}

/**
 * Format payment details in English
 */
function formatPaymentDetailsEN(payment, paymentId) {
  const statusEmoji = payment.status === 'completed' ? '✅' : payment.status === 'pending' ? '⏳' : '❌';

  return `💳 *Payment Details*

*ID:* \`${paymentId}\`
*Status:* ${statusEmoji} ${payment.status}

*Amount*
• Total: $${payment.amount || 0}
• Currency: ${payment.currency || 'USD'}

*Gateway*
• Provider: ${payment.gateway || 'N/A'}
• Transaction ID: \`${payment.transactionId || 'N/A'}\`

*User*
• User ID: ${payment.userId}
• Plan: ${payment.planId || 'N/A'}

*Dates*
• Created: ${payment.createdAt?.toDate().toLocaleString() || 'N/A'}
• Updated: ${payment.updatedAt?.toDate().toLocaleString() || 'N/A'}

*Metadata*
${payment.metadata ? JSON.stringify(payment.metadata, null, 2) : 'None'}`;
}

/**
 * Format payment details in Spanish
 */
function formatPaymentDetailsES(payment, paymentId) {
  const statusEmoji = payment.status === 'completed' ? '✅' : payment.status === 'pending' ? '⏳' : '❌';

  return `💳 *Detalles del Pago*

*ID:* \`${paymentId}\`
*Estado:* ${statusEmoji} ${payment.status}

*Monto*
• Total: $${payment.amount || 0}
• Moneda: ${payment.currency || 'USD'}

*Pasarela*
• Proveedor: ${payment.gateway || 'N/A'}
• ID de Transacción: \`${payment.transactionId || 'N/A'}\`

*Usuario*
• ID de Usuario: ${payment.userId}
• Plan: ${payment.planId || 'N/A'}

*Fechas*
• Creado: ${payment.createdAt?.toDate().toLocaleString() || 'N/A'}
• Actualizado: ${payment.updatedAt?.toDate().toLocaleString() || 'N/A'}

*Metadata*
${payment.metadata ? JSON.stringify(payment.metadata, null, 2) : 'Ninguno'}`;
}

/**
 * Format payment statistics in English
 */
function formatPaymentStatsEN(stats) {
  const gatewayDetails = Object.entries(stats.gatewayStats)
    .map(([gateway, amount]) => `• ${gateway}: $${amount.toFixed(2)}`)
    .join('\n');

  const growth = stats.lastMonth > 0
    ? ((stats.thisMonth - stats.lastMonth) / stats.lastMonth * 100).toFixed(1)
    : 0;

  return `📊 *Payment Statistics*

*Revenue*
• Total All-Time: $${stats.totalRevenue.toFixed(2)}
• This Month: $${stats.thisMonth.toFixed(2)}
• Last Month: $${stats.lastMonth.toFixed(2)}
• Growth: ${growth}%

*Transactions*
• Total Completed: ${stats.totalTransactions}

*By Gateway*
${gatewayDetails || 'No data'}`;
}

/**
 * Format payment statistics in Spanish
 */
function formatPaymentStatsES(stats) {
  const gatewayDetails = Object.entries(stats.gatewayStats)
    .map(([gateway, amount]) => `• ${gateway}: $${amount.toFixed(2)}`)
    .join('\n');

  const growth = stats.lastMonth > 0
    ? ((stats.thisMonth - stats.lastMonth) / stats.lastMonth * 100).toFixed(1)
    : 0;

  return `📊 *Estadísticas de Pagos*

*Ingresos*
• Total Histórico: $${stats.totalRevenue.toFixed(2)}
• Este Mes: $${stats.thisMonth.toFixed(2)}
• Mes Pasado: $${stats.lastMonth.toFixed(2)}
• Crecimiento: ${growth}%

*Transacciones*
• Total Completadas: ${stats.totalTransactions}

*Por Pasarela*
${gatewayDetails || 'Sin datos'}`;
}

export default {
  handlePayments,
};
