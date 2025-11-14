/**
 * Admin Plans Module
 * Manage subscription plans and pricing
 */

import { Markup } from 'telegraf';
import logger from '../../../../utils/logger.js';
import { getUserLanguage } from '../../../../utils/i18n.js';
import { SUBSCRIPTION_PLANS } from '../../../../services/membershipService.js';
import { db } from '../../../../config/firebase.js';

/**
 * Handle plans callbacks
 */
export async function handlePlans(ctx, action, params) {
  const lang = getUserLanguage(ctx);

  try {
    await ctx.answerCbQuery();

    switch (action) {
      case 'list':
        await showPlansList(ctx, lang);
        break;
      case 'view':
        if (params.length > 0) {
          await showPlanDetails(ctx, lang, params[0]);
        } else {
          await showPlansList(ctx, lang);
        }
        break;
      case 'stats':
        await showPlanStatistics(ctx, lang);
        break;
      default:
        await showPlansList(ctx, lang);
    }
  } catch (error) {
    logger.error('Error in plans module:', error);
    const errorMsg = lang === 'es'
      ? '❌ Error al gestionar planes'
      : '❌ Error managing plans';
    await ctx.reply(errorMsg);
  }
}

/**
 * Show plans list
 */
async function showPlansList(ctx, lang) {
  const plans = Object.values(SUBSCRIPTION_PLANS);

  const plansList = plans.map((plan, i) =>
    `${i + 1}. *${plan.name}*\n` +
    `   • Price: $${plan.priceUSD}\n` +
    `   • Duration: ${plan.durationDays} days\n` +
    `   • Tier: ${plan.tier}`
  ).join('\n\n');

  const message = lang === 'es'
    ? `💰 *Planes de Suscripción*\n\n${plansList}\n\nTotal: ${plans.length} planes`
    : `💰 *Subscription Plans*\n\n${plansList}\n\nTotal: ${plans.length} plans`;

  const buttons = plans.map(plan =>
    [Markup.button.callback(`View ${plan.name}`, `admin:plans:view:${plan.id}`)]
  );

  buttons.push([Markup.button.callback(lang === 'es' ? '📊 Estadísticas' : '📊 Statistics', 'admin:plans:stats')]);
  buttons.push([Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:back:home')]);

  const keyboard = Markup.inlineKeyboard(buttons);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard,
  });
}

/**
 * Show plan details
 */
async function showPlanDetails(ctx, lang, planId) {
  const plan = SUBSCRIPTION_PLANS[planId];

  if (!plan) {
    const message = lang === 'es' ? '❌ Plan no encontrado' : '❌ Plan not found';
    await ctx.editMessageText(message, {
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:plans:list')],
      ]),
    });
    return;
  }

  // Get active subscriptions count
  const activeCount = await db.collection('plan_activations')
    .where('planId', '==', planId)
    .where('status', '==', 'active')
    .count()
    .get();

  const message = lang === 'es'
    ? formatPlanDetailsES(plan, activeCount.data().count)
    : formatPlanDetailsEN(plan, activeCount.data().count);

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:plans:list')],
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard,
  });
}

/**
 * Show plan statistics
 */
async function showPlanStatistics(ctx, lang) {
  const stats = await getPlanStatistics();

  const message = lang === 'es'
    ? formatPlanStatsES(stats)
    : formatPlanStatsEN(stats);

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:plans:list')],
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard,
  });
}

/**
 * Get plan statistics
 */
async function getPlanStatistics() {
  const activations = await db.collection('plan_activations')
    .where('status', '==', 'active')
    .get();

  const planCounts = {};
  let totalRevenue = 0;

  activations.forEach(doc => {
    const activation = doc.data();
    const planId = activation.planId;
    planCounts[planId] = (planCounts[planId] || 0) + 1;

    const plan = SUBSCRIPTION_PLANS[planId];
    if (plan) {
      totalRevenue += plan.priceUSD;
    }
  });

  return {
    planCounts,
    totalActive: activations.size,
    totalRevenue,
  };
}

/**
 * Format plan details in English
 */
function formatPlanDetailsEN(plan, activeCount) {
  return `💰 *Plan Details*

*${plan.name}*

*Pricing*
• USD: $${plan.priceUSD}
• Crypto: ${plan.priceCrypto || 'N/A'}

*Details*
• Duration: ${plan.durationDays} days
• Tier: ${plan.tier}
• Trial: ${plan.isTrial ? 'Yes' : 'No'}
• Lifetime: ${plan.isLifetime ? 'Yes' : 'No'}

*Features*
${plan.features?.join('\n') || 'Standard features'}

*Statistics*
• Active Subscriptions: ${activeCount}
• Potential MRR: $${(plan.priceUSD * activeCount * 30 / plan.durationDays).toFixed(2)}`;
}

/**
 * Format plan details in Spanish
 */
function formatPlanDetailsES(plan, activeCount) {
  return `💰 *Detalles del Plan*

*${plan.name}*

*Precios*
• USD: $${plan.priceUSD}
• Crypto: ${plan.priceCrypto || 'N/A'}

*Detalles*
• Duración: ${plan.durationDays} días
• Nivel: ${plan.tier}
• Prueba: ${plan.isTrial ? 'Sí' : 'No'}
• Vitalicio: ${plan.isLifetime ? 'Sí' : 'No'}

*Características*
${plan.features?.join('\n') || 'Características estándar'}

*Estadísticas*
• Suscripciones Activas: ${activeCount}
• MRR Potencial: $${(plan.priceUSD * activeCount * 30 / plan.durationDays).toFixed(2)}`;
}

/**
 * Format plan statistics in English
 */
function formatPlanStatsEN(stats) {
  const planDetails = Object.entries(stats.planCounts)
    .map(([planId, count]) => {
      const plan = SUBSCRIPTION_PLANS[planId];
      return `• ${plan?.name || planId}: ${count}`;
    })
    .join('\n');

  return `📊 *Plan Statistics*

*Active Subscriptions by Plan*
${planDetails || 'No active subscriptions'}

*Overview*
• Total Active: ${stats.totalActive}
• Estimated Revenue: $${stats.totalRevenue.toFixed(2)}
• Average per User: $${(stats.totalRevenue / Math.max(stats.totalActive, 1)).toFixed(2)}`;
}

/**
 * Format plan statistics in Spanish
 */
function formatPlanStatsES(stats) {
  const planDetails = Object.entries(stats.planCounts)
    .map(([planId, count]) => {
      const plan = SUBSCRIPTION_PLANS[planId];
      return `• ${plan?.name || planId}: ${count}`;
    })
    .join('\n');

  return `📊 *Estadísticas de Planes*

*Suscripciones Activas por Plan*
${planDetails || 'Sin suscripciones activas'}

*Resumen*
• Total Activas: ${stats.totalActive}
• Ingresos Estimados: $${stats.totalRevenue.toFixed(2)}
• Promedio por Usuario: $${(stats.totalRevenue / Math.max(stats.totalActive, 1)).toFixed(2)}`;
}

export default {
  handlePlans,
};
