/**
 * Admin Dashboard Module
 * Displays real-time statistics and system health
 */

import { Markup } from 'telegraf';
import logger from '../../../../utils/logger.js';
import { getUserLanguage } from '../../../../utils/i18n.js';
import { db } from '../../../../config/firebase.js';
import { getPlanStatistics } from '../../../../services/membershipService.js';
import cache from '../../../../config/redis.js';

/**
 * Show dashboard with real-time stats
 */
export async function showDashboard(ctx, action, params) {
  const lang = getUserLanguage(ctx);

  try {
    await ctx.answerCbQuery();

    if (action === 'show' || !action) {
      // Main dashboard view
      const stats = await getDashboardStats();

      const message = lang === 'es'
        ? formatDashboardES(stats)
        : formatDashboardEN(stats);

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback(lang === 'es' ? '🔄 Actualizar' : '🔄 Refresh', 'admin:dashboard:show'),
          Markup.button.callback(lang === 'es' ? '📊 Detallado' : '📊 Detailed', 'admin:dashboard:detailed'),
        ],
        [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:back:home')],
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...keyboard,
      });
    } else if (action === 'detailed') {
      // Detailed statistics
      const stats = await getDetailedStats();

      const message = lang === 'es'
        ? formatDetailedStatsES(stats)
        : formatDetailedStatsEN(stats);

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:dashboard:show')],
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...keyboard,
      });
    }
  } catch (error) {
    logger.error('Error showing dashboard:', error);
    const errorMsg = lang === 'es'
      ? '❌ Error al cargar el dashboard'
      : '❌ Error loading dashboard';
    await ctx.answerCbQuery(errorMsg, true);
  }
}

/**
 * Get dashboard statistics
 */
async function getDashboardStats() {
  try {
    // Try to get cached stats first
    const cached = await cache.get('admin:dashboard:stats');
    if (cached) {
      return JSON.parse(cached);
    }

    const [
      totalUsers,
      activeUsers24h,
      planStats,
      recentPayments,
      systemHealth,
    ] = await Promise.all([
      getTotalUsers(),
      getActiveUsers24h(),
      getPlanStatistics(),
      getRecentPaymentsCount(),
      getSystemHealth(),
    ]);

    const stats = {
      totalUsers,
      activeUsers24h,
      membershipStats: planStats.byTier || {},
      recentPayments,
      systemHealth,
      lastUpdated: new Date().toISOString(),
    };

    // Cache for 5 minutes
    await cache.set('admin:dashboard:stats', JSON.stringify(stats), 300);

    return stats;
  } catch (error) {
    logger.error('Error getting dashboard stats:', error);
    return {
      totalUsers: 0,
      activeUsers24h: 0,
      membershipStats: { Free: 0, Basic: 0, Premium: 0 },
      recentPayments: 0,
      systemHealth: { status: 'unknown' },
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Get detailed statistics
 */
async function getDetailedStats() {
  try {
    const [
      userGrowth,
      revenueStats,
      topPlans,
      errorRate,
    ] = await Promise.all([
      getUserGrowth(),
      getRevenueStats(),
      getTopPlans(),
      getErrorRate(),
    ]);

    return {
      userGrowth,
      revenueStats,
      topPlans,
      errorRate,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Error getting detailed stats:', error);
    return {
      userGrowth: { daily: 0, weekly: 0, monthly: 0 },
      revenueStats: { total: 0, thisMonth: 0 },
      topPlans: [],
      errorRate: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Get total users count
 */
async function getTotalUsers() {
  const snapshot = await db.collection('users').count().get();
  return snapshot.data().count;
}

/**
 * Get active users in last 24h
 */
async function getActiveUsers24h() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const snapshot = await db.collection('users')
    .where('lastActive', '>=', oneDayAgo)
    .count()
    .get();
  return snapshot.data().count;
}

/**
 * Get recent payments count (last 7 days)
 */
async function getRecentPaymentsCount() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const snapshot = await db.collection('payments')
    .where('createdAt', '>=', sevenDaysAgo)
    .where('status', '==', 'completed')
    .count()
    .get();
  return snapshot.data().count;
}

/**
 * Get system health status
 */
async function getSystemHealth() {
  const health = {
    status: 'healthy',
    services: {},
  };

  // Check Redis
  try {
    await cache.ping();
    health.services.redis = 'up';
  } catch (error) {
    health.services.redis = 'down';
    health.status = 'degraded';
  }

  // Check Firestore
  try {
    await db.collection('users').limit(1).get();
    health.services.firestore = 'up';
  } catch (error) {
    health.services.firestore = 'down';
    health.status = 'degraded';
  }

  return health;
}

/**
 * Get user growth stats
 */
async function getUserGrowth() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [daily, weekly, monthly] = await Promise.all([
    db.collection('users').where('createdAt', '>=', oneDayAgo).count().get(),
    db.collection('users').where('createdAt', '>=', oneWeekAgo).count().get(),
    db.collection('users').where('createdAt', '>=', oneMonthAgo).count().get(),
  ]);

  return {
    daily: daily.data().count,
    weekly: weekly.data().count,
    monthly: monthly.data().count,
  };
}

/**
 * Get revenue statistics
 */
async function getRevenueStats() {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const payments = await db.collection('payments')
    .where('status', '==', 'completed')
    .get();

  let total = 0;
  let thisMonth = 0;

  payments.forEach(doc => {
    const payment = doc.data();
    const amount = payment.amount || 0;
    total += amount;

    if (payment.createdAt?.toDate() >= firstDayOfMonth) {
      thisMonth += amount;
    }
  });

  return {
    total: total.toFixed(2),
    thisMonth: thisMonth.toFixed(2),
  };
}

/**
 * Get top subscription plans
 */
async function getTopPlans() {
  const activations = await db.collection('plan_activations')
    .where('status', '==', 'active')
    .get();

  const planCounts = {};

  activations.forEach(doc => {
    const activation = doc.data();
    const planId = activation.planId;
    planCounts[planId] = (planCounts[planId] || 0) + 1;
  });

  return Object.entries(planCounts)
    .map(([planId, count]) => ({ planId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

/**
 * Get error rate from logs
 */
async function getErrorRate() {
  // This would integrate with your logging system
  // For now, return a placeholder
  return 0.01; // 1% error rate
}

/**
 * Format dashboard in English
 */
function formatDashboardEN(stats) {
  const statusEmoji = stats.systemHealth.status === 'healthy' ? '🟢' : '🟡';

  return `📊 *Admin Dashboard*

*System Status:* ${statusEmoji} ${stats.systemHealth.status}
*Last Updated:* ${new Date(stats.lastUpdated).toLocaleTimeString()}

*👥 Users*
• Total: ${stats.totalUsers}
• Active (24h): ${stats.activeUsers24h}

*💳 Memberships*
• Free: ${stats.membershipStats.Free || 0}
• Basic: ${stats.membershipStats.Basic || 0}
• Premium: ${stats.membershipStats.Premium || 0}

*💰 Payments*
• Last 7 days: ${stats.recentPayments}

*🔧 Services*
• Redis: ${stats.systemHealth.services.redis || 'unknown'}
• Firestore: ${stats.systemHealth.services.firestore || 'unknown'}`;
}

/**
 * Format dashboard in Spanish
 */
function formatDashboardES(stats) {
  const statusEmoji = stats.systemHealth.status === 'healthy' ? '🟢' : '🟡';

  return `📊 *Panel de Control*

*Estado del Sistema:* ${statusEmoji} ${stats.systemHealth.status}
*Última Actualización:* ${new Date(stats.lastUpdated).toLocaleTimeString()}

*👥 Usuarios*
• Total: ${stats.totalUsers}
• Activos (24h): ${stats.activeUsers24h}

*💳 Membresías*
• Gratis: ${stats.membershipStats.Free || 0}
• Básico: ${stats.membershipStats.Basic || 0}
• Premium: ${stats.membershipStats.Premium || 0}

*💰 Pagos*
• Últimos 7 días: ${stats.recentPayments}

*🔧 Servicios*
• Redis: ${stats.systemHealth.services.redis || 'desconocido'}
• Firestore: ${stats.systemHealth.services.firestore || 'desconocido'}`;
}

/**
 * Format detailed stats in English
 */
function formatDetailedStatsEN(stats) {
  const topPlansText = stats.topPlans.map((plan, i) =>
    `${i + 1}. ${plan.planId}: ${plan.count} users`
  ).join('\n');

  return `📈 *Detailed Statistics*

*User Growth*
• Daily: +${stats.userGrowth.daily}
• Weekly: +${stats.userGrowth.weekly}
• Monthly: +${stats.userGrowth.monthly}

*Revenue*
• Total: $${stats.revenueStats.total}
• This Month: $${stats.revenueStats.thisMonth}

*Top Plans*
${topPlansText || 'No data'}

*System Health*
• Error Rate: ${(stats.errorRate * 100).toFixed(2)}%

*Generated:* ${new Date(stats.timestamp).toLocaleString()}`;
}

/**
 * Format detailed stats in Spanish
 */
function formatDetailedStatsES(stats) {
  const topPlansText = stats.topPlans.map((plan, i) =>
    `${i + 1}. ${plan.planId}: ${plan.count} usuarios`
  ).join('\n');

  return `📈 *Estadísticas Detalladas*

*Crecimiento de Usuarios*
• Diario: +${stats.userGrowth.daily}
• Semanal: +${stats.userGrowth.weekly}
• Mensual: +${stats.userGrowth.monthly}

*Ingresos*
• Total: $${stats.revenueStats.total}
• Este Mes: $${stats.revenueStats.thisMonth}

*Planes Populares*
${topPlansText || 'Sin datos'}

*Salud del Sistema*
• Tasa de Errores: ${(stats.errorRate * 100).toFixed(2)}%

*Generado:* ${new Date(stats.timestamp).toLocaleString()}`;
}

export default {
  showDashboard,
};
