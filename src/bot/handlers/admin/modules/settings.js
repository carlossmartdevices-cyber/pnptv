/**
 * Admin Settings Module
 * Configure bot settings, features, and toggles
 */

import { Markup } from 'telegraf';
import logger from '../../../../utils/logger.js';
import { getUserLanguage } from '../../../../utils/i18n.js';
import { db } from '../../../../config/firebase.js';
import cache from '../../../../config/redis.js';

/**
 * Handle settings callbacks
 */
export async function handleSettings(ctx, action, params) {
  const lang = getUserLanguage(ctx);

  try {
    await ctx.answerCbQuery();

    switch (action) {
      case 'menus':
        await showSettingsMenu(ctx, lang);
        break;
      case 'features':
        await showFeatureToggles(ctx, lang);
        break;
      case 'toggle':
        if (params.length > 0) {
          await toggleFeature(ctx, lang, params[0]);
        }
        break;
      case 'cache':
        await showCacheSettings(ctx, lang);
        break;
      case 'clear_cache':
        await clearCache(ctx, lang);
        break;
      default:
        await showSettingsMenu(ctx, lang);
    }
  } catch (error) {
    logger.error('Error in settings module:', error);
    const errorMsg = lang === 'es'
      ? '❌ Error en configuración'
      : '❌ Error in settings';
    await ctx.reply(errorMsg);
  }
}

/**
 * Show settings menu
 */
async function showSettingsMenu(ctx, lang) {
  const message = lang === 'es'
    ? '⚙️ *Configuración del Bot*\n\n' +
      'Selecciona una opción para configurar:'
    : '⚙️ *Bot Settings*\n\n' +
      'Select an option to configure:';

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(lang === 'es' ? '🎛️ Características' : '🎛️ Features', 'admin:settings:features')],
    [Markup.button.callback(lang === 'es' ? '💾 Caché' : '💾 Cache', 'admin:settings:cache')],
    [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:back:home')],
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard,
  });
}

/**
 * Show feature toggles
 */
async function showFeatureToggles(ctx, lang) {
  const features = await getFeatureToggles();

  const featuresList = Object.entries(features)
    .map(([key, enabled]) => {
      const emoji = enabled ? '✅' : '❌';
      return `${emoji} ${formatFeatureName(key)}`;
    })
    .join('\n');

  const message = lang === 'es'
    ? `🎛️ *Características*\n\n${featuresList}\n\nToca para activar/desactivar`
    : `🎛️ *Features*\n\n${featuresList}\n\nTap to toggle`;

  const buttons = Object.keys(features).map(key =>
    [Markup.button.callback(
      `${features[key] ? '✅' : '❌'} ${formatFeatureName(key)}`,
      `admin:settings:toggle:${key}`
    )]
  );

  buttons.push([Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:settings:menus')]);

  const keyboard = Markup.inlineKeyboard(buttons);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard,
  });
}

/**
 * Toggle feature on/off
 */
async function toggleFeature(ctx, lang, featureKey) {
  try {
    const features = await getFeatureToggles();
    const currentValue = features[featureKey];
    const newValue = !currentValue;

    // Save to database
    await db.collection('settings').doc('features').set({
      [featureKey]: newValue,
      updatedAt: new Date(),
      updatedBy: ctx.from.id,
    }, { merge: true });

    // Clear cache
    await cache.del('admin:feature_toggles');

    const message = lang === 'es'
      ? `✅ ${formatFeatureName(featureKey)} ${newValue ? 'activado' : 'desactivado'}`
      : `✅ ${formatFeatureName(featureKey)} ${newValue ? 'enabled' : 'disabled'}`;

    await ctx.answerCbQuery(message, true);
    await showFeatureToggles(ctx, lang);
  } catch (error) {
    logger.error('Error toggling feature:', error);
    throw error;
  }
}

/**
 * Show cache settings
 */
async function showCacheSettings(ctx, lang) {
  const cacheInfo = await getCacheInfo();

  const message = lang === 'es'
    ? `💾 *Configuración de Caché*\n\n` +
      `*Estado*\n` +
      `• Servidor: ${cacheInfo.connected ? '🟢 Conectado' : '🔴 Desconectado'}\n` +
      `• Claves: ${cacheInfo.keys}\n` +
      `• Memoria Usada: ${cacheInfo.memory}\n\n` +
      `*Operaciones*\n` +
      `Limpiar caché eliminará todas las claves en cache.`
    : `💾 *Cache Settings*\n\n` +
      `*Status*\n` +
      `• Server: ${cacheInfo.connected ? '🟢 Connected' : '🔴 Disconnected'}\n` +
      `• Keys: ${cacheInfo.keys}\n` +
      `• Memory Used: ${cacheInfo.memory}\n\n` +
      `*Operations*\n` +
      `Clear cache will remove all cached keys.`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(lang === 'es' ? '🗑️ Limpiar Caché' : '🗑️ Clear Cache', 'admin:settings:clear_cache')],
    [Markup.button.callback(lang === 'es' ? '« Atrás' : '« Back', 'admin:settings:menus')],
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard,
  });
}

/**
 * Clear all cache
 */
async function clearCache(ctx, lang) {
  try {
    await cache.flushall();

    const message = lang === 'es'
      ? '✅ Caché limpiado exitosamente'
      : '✅ Cache cleared successfully';

    await ctx.answerCbQuery(message, true);
    await showCacheSettings(ctx, lang);
  } catch (error) {
    logger.error('Error clearing cache:', error);
    const errorMsg = lang === 'es'
      ? '❌ Error al limpiar caché'
      : '❌ Error clearing cache';
    await ctx.answerCbQuery(errorMsg, true);
  }
}

/**
 * Get feature toggles from database
 */
async function getFeatureToggles() {
  try {
    // Try cache first
    const cached = await cache.get('admin:feature_toggles');
    if (cached) {
      return JSON.parse(cached);
    }

    const doc = await db.collection('settings').doc('features').get();

    const features = doc.exists ? doc.data() : {
      enablePayments: true,
      enableZoom: true,
      enableRadio: true,
      enableNearby: true,
      enableEvents: true,
      enableGroups: true,
      maintenanceMode: false,
      allowNewRegistrations: true,
    };

    // Cache for 5 minutes
    await cache.set('admin:feature_toggles', JSON.stringify(features), 300);

    return features;
  } catch (error) {
    logger.error('Error getting feature toggles:', error);
    // Return defaults on error
    return {
      enablePayments: true,
      enableZoom: true,
      enableRadio: true,
      enableNearby: true,
      enableEvents: true,
      enableGroups: true,
      maintenanceMode: false,
      allowNewRegistrations: true,
    };
  }
}

/**
 * Get cache information
 */
async function getCacheInfo() {
  try {
    const info = await cache.info('memory');
    const dbSize = await cache.dbsize();

    return {
      connected: true,
      keys: dbSize,
      memory: parseMemoryInfo(info),
    };
  } catch (error) {
    logger.error('Error getting cache info:', error);
    return {
      connected: false,
      keys: 0,
      memory: 'N/A',
    };
  }
}

/**
 * Parse memory info from Redis INFO command
 */
function parseMemoryInfo(info) {
  const match = info.match(/used_memory_human:(.+)/);
  return match ? match[1].trim() : 'N/A';
}

/**
 * Format feature name for display
 */
function formatFeatureName(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace('Enable ', '');
}

export default {
  handleSettings,
};
