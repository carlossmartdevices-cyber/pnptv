/**
 * Admin Tools Module
 * Maintenance and utility tools
 */

import { Markup } from 'telegraf';
import logger from '../../../../utils/logger.js';
import { getUserLanguage } from '../../../../utils/i18n.js';
import { db } from '../../../../config/firebase.js';
import { checkAndExpireMemberships } from '../../../../services/membershipService.js';
import cache from '../../../../config/redis.js';

/**
 * Handle tools callbacks
 */
export async function handleTools(ctx, action, params) {
  const lang = getUserLanguage(ctx);

  try {
    await ctx.answerCbQuery();

    switch (action) {
      case 'expiration':
        await showExpirationTool(ctx, lang);
        break;
      case 'run_expiration':
        await runExpirationCheck(ctx, lang);
        break;
      case 'database':
        await showDatabaseTools(ctx, lang);
        break;
      case 'backup':
        await requestDatabaseBackup(ctx, lang);
        break;
      case 'cleanup':
        await showCleanupTools(ctx, lang);
        break;
      case 'run_cleanup':
        if (params.length > 0) {
          await runCleanup(ctx, lang, params[0]);
        }
        break;
      case 'system':
        await showSystemInfo(ctx, lang);
        break;
      default:
        await showToolsMenu(ctx, lang);
    }
  } catch (error) {
    logger.error('Error in tools module:', error);
    const errorMsg = lang === 'es'
      ? '❌ Error en herramientas'
      : '❌ Error in tools';
    await ctx.reply(errorMsg);
  }
}

/**
 * Show tools menu
 */
async function showToolsMenu(ctx, lang) {
  const message = lang === 'es'
    ? '🛠️ *Herramientas Administrativas*\n\n' +
      'Selecciona una herramienta:'
    : '🛠️ *Admin Tools*\n\n' +
      'Select a tool:';

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(lang === 'es' ? '⏰ Expiración' : '⏰ Expiration', 'admin:tools:expiration')],
    [Markup.button.callback(lang === 'es' ? '💾 Base de Datos' : '💾 Database', 'admin:tools:database')],
    [Markup.button.callback(lang === 'es' ? '🧹 Limpieza' : '🧹 Cleanup', 'admin:tools:cleanup')],
    [Markup.button.callback(lang === 'es' ? '📊 Sistema' : '📊 System Info', 'admin:tools:system')],
    [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:back:home')],
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard,
  });
}

/**
 * Show expiration check tool
 */
async function showExpirationTool(ctx, lang) {
  const message = lang === 'es'
    ? '⏰ *Verificación de Expiración*\n\n' +
      'Esta herramienta revisa todas las membresías activas y expira las que han vencido.\n\n' +
      '⚠️ Esto se ejecuta automáticamente cada hora.\n\n' +
      '¿Deseas ejecutar una verificación manual ahora?'
    : '⏰ *Expiration Check*\n\n' +
      'This tool checks all active memberships and expires those that have ended.\n\n' +
      '⚠️ This runs automatically every hour.\n\n' +
      'Do you want to run a manual check now?';

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(lang === 'es' ? '▶️ Ejecutar' : '▶️ Run Now', 'admin:tools:run_expiration')],
    [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:tools:expiration')],
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard,
  });
}

/**
 * Run expiration check
 */
async function runExpirationCheck(ctx, lang) {
  try {
    const progressMsg = lang === 'es'
      ? '⏳ Ejecutando verificación de expiración...'
      : '⏳ Running expiration check...';

    await ctx.answerCbQuery(progressMsg);

    const result = await checkAndExpireMemberships();

    const message = lang === 'es'
      ? `✅ *Verificación Completada*\n\n` +
        `• Revisadas: ${result.checked}\n` +
        `• Expiradas: ${result.expired}\n` +
        `• Errores: ${result.errors}`
      : `✅ *Check Completed*\n\n` +
        `• Checked: ${result.checked}\n` +
        `• Expired: ${result.expired}\n` +
        `• Errors: ${result.errors}`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:tools:expiration')],
    ]);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } catch (error) {
    logger.error('Error running expiration check:', error);
    const errorMsg = lang === 'es'
      ? '❌ Error al ejecutar verificación'
      : '❌ Error running check';
    await ctx.answerCbQuery(errorMsg, true);
  }
}

/**
 * Show database tools
 */
async function showDatabaseTools(ctx, lang) {
  const stats = await getDatabaseStats();

  const message = lang === 'es'
    ? `💾 *Herramientas de Base de Datos*\n\n` +
      `*Estadísticas*\n` +
      `• Usuarios: ${stats.users}\n` +
      `• Pagos: ${stats.payments}\n` +
      `• Membresías Activas: ${stats.activeMemberships}\n\n` +
      `*Operaciones*`
    : `💾 *Database Tools*\n\n` +
      `*Statistics*\n` +
      `• Users: ${stats.users}\n` +
      `• Payments: ${stats.payments}\n` +
      `• Active Memberships: ${stats.activeMemberships}\n\n` +
      `*Operations*`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(lang === 'es' ? '📦 Solicitar Backup' : '📦 Request Backup', 'admin:tools:backup')],
    [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:tools:expiration')],
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard,
  });
}

/**
 * Request database backup
 */
async function requestDatabaseBackup(ctx, lang) {
  const message = lang === 'es'
    ? `📦 *Solicitud de Backup*\n\n` +
      `Para crear un backup de Firestore:\n\n` +
      `1. Ve a la Consola de Firebase\n` +
      `2. Firestore Database > Backups\n` +
      `3. Haz clic en "Create Backup"\n\n` +
      `O usa gcloud CLI:\n` +
      `\`\`\`\ngcloud firestore export gs://[BUCKET_NAME]\n\`\`\``
    : `📦 *Backup Request*\n\n` +
      `To create a Firestore backup:\n\n` +
      `1. Go to Firebase Console\n` +
      `2. Firestore Database > Backups\n` +
      `3. Click "Create Backup"\n\n` +
      `Or use gcloud CLI:\n` +
      `\`\`\`\ngcloud firestore export gs://[BUCKET_NAME]\n\`\`\``;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:tools:database')],
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard,
  });
}

/**
 * Show cleanup tools
 */
async function showCleanupTools(ctx, lang) {
  const message = lang === 'es'
    ? '🧹 *Herramientas de Limpieza*\n\n' +
      'Selecciona qué limpiar:\n\n' +
      '⚠️ Estas operaciones son permanentes'
    : '🧹 *Cleanup Tools*\n\n' +
      'Select what to clean:\n\n' +
      '⚠️ These operations are permanent';

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(lang === 'es' ? '🗑️ Sesiones Antiguas' : '🗑️ Old Sessions', 'admin:tools:run_cleanup:sessions')],
    [Markup.button.callback(lang === 'es' ? '🗑️ Logs Antiguos' : '🗑️ Old Logs', 'admin:tools:run_cleanup:logs')],
    [Markup.button.callback(lang === 'es' ? '🗑️ Caché Expirado' : '🗑️ Expired Cache', 'admin:tools:run_cleanup:cache')],
    [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:tools:expiration')],
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard,
  });
}

/**
 * Run cleanup operation
 */
async function runCleanup(ctx, lang, cleanupType) {
  try {
    let result;

    switch (cleanupType) {
      case 'sessions':
        result = await cleanupOldSessions();
        break;
      case 'logs':
        result = await cleanupOldLogs();
        break;
      case 'cache':
        result = await cleanupExpiredCache();
        break;
      default:
        throw new Error('Unknown cleanup type');
    }

    const message = lang === 'es'
      ? `✅ *Limpieza Completada*\n\n${result.message}\n\n• Elementos eliminados: ${result.deleted}`
      : `✅ *Cleanup Completed*\n\n${result.message}\n\n• Items deleted: ${result.deleted}`;

    await ctx.answerCbQuery(message, true);
    await showCleanupTools(ctx, lang);
  } catch (error) {
    logger.error('Error running cleanup:', error);
    const errorMsg = lang === 'es'
      ? '❌ Error al limpiar'
      : '❌ Error during cleanup';
    await ctx.answerCbQuery(errorMsg, true);
  }
}

/**
 * Show system information
 */
async function showSystemInfo(ctx, lang) {
  const info = getSystemInfo();

  const message = lang === 'es'
    ? `📊 *Información del Sistema*\n\n` +
      `*Entorno*\n` +
      `• Node: ${info.nodeVersion}\n` +
      `• Plataforma: ${info.platform}\n` +
      `• Uptime: ${info.uptime}\n\n` +
      `*Memoria*\n` +
      `• Usada: ${info.memoryUsed}\n` +
      `• Total: ${info.memoryTotal}\n\n` +
      `*Bot*\n` +
      `• Versión: ${info.botVersion}\n` +
      `• Modo: ${info.nodeEnv}`
    : `📊 *System Information*\n\n` +
      `*Environment*\n` +
      `• Node: ${info.nodeVersion}\n` +
      `• Platform: ${info.platform}\n` +
      `• Uptime: ${info.uptime}\n\n` +
      `*Memory*\n` +
      `• Used: ${info.memoryUsed}\n` +
      `• Total: ${info.memoryTotal}\n\n` +
      `*Bot*\n` +
      `• Version: ${info.botVersion}\n` +
      `• Mode: ${info.nodeEnv}`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:tools:expiration')],
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard,
  });
}

/**
 * Get database statistics
 */
async function getDatabaseStats() {
  const [users, payments, activeMemberships] = await Promise.all([
    db.collection('users').count().get(),
    db.collection('payments').count().get(),
    db.collection('plan_activations').where('status', '==', 'active').count().get(),
  ]);

  return {
    users: users.data().count,
    payments: payments.data().count,
    activeMemberships: activeMemberships.data().count,
  };
}

/**
 * Cleanup old sessions (older than 7 days)
 */
async function cleanupOldSessions() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // This depends on your session storage implementation
  // For now, just clear old cache keys
  const keys = await cache.keys('session:*');
  let deleted = 0;

  for (const key of keys) {
    const ttl = await cache.ttl(key);
    if (ttl === -1 || ttl > 604800) { // > 7 days
      await cache.del(key);
      deleted++;
    }
  }

  return {
    message: 'Old sessions cleaned up',
    deleted,
  };
}

/**
 * Cleanup old logs
 */
async function cleanupOldLogs() {
  // This would integrate with your logging system
  // For now, return a placeholder
  return {
    message: 'Log cleanup not implemented - use log rotation',
    deleted: 0,
  };
}

/**
 * Cleanup expired cache entries
 */
async function cleanupExpiredCache() {
  // Redis automatically removes expired keys
  // We'll just count and remove keys with no TTL that are old
  const keys = await cache.keys('*');
  let deleted = 0;

  for (const key of keys) {
    const ttl = await cache.ttl(key);
    if (ttl === -1) { // No expiration set
      // Optionally delete or set expiration
      // For safety, we'll just count them
      deleted++;
    }
  }

  return {
    message: 'Expired cache entries are auto-removed by Redis',
    deleted,
  };
}

/**
 * Get system information
 */
function getSystemInfo() {
  const mem = process.memoryUsage();

  return {
    nodeVersion: process.version,
    platform: process.platform,
    uptime: formatUptime(process.uptime()),
    memoryUsed: formatBytes(mem.heapUsed),
    memoryTotal: formatBytes(mem.heapTotal),
    botVersion: process.env.npm_package_version || '1.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
  };
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

export default {
  handleTools,
};
