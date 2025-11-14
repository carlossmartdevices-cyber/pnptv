/**
 * Nearby Users Handler
 */

import { Markup } from 'telegraf';
import { t, getUserLanguage } from '../../../../utils/i18n.js';
import { getUserById } from '../../../services/userService.js';
import { requireLocation } from '../../core/middleware/authMiddleware.js';
import { collections } from '../../../config/firebase.js';
import { cache, cacheKeys } from '../../../config/redis.js';
import { getDistance } from 'geolib';
import logger from '../../../../utils/logger.js';

/**
 * Register nearby users handlers
 */
export function registerNearbyUsersHandlers(bot) {
  // Show nearby users (requires location and active subscription)
  bot.action('show_nearby', requireLocation, async (ctx) => {
    await showRadiusSelection(ctx);
  });

  // Select radius
  bot.action(/nearby_radius_(\d+)/, async (ctx) => {
    const radius = parseInt(ctx.match[1]);
    await showNearbyUsers(ctx, radius);
  });

  // View user profile
  bot.action(/view_user_(\d+)/, async (ctx) => {
    const userId = parseInt(ctx.match[1]);
    await showUserProfile(ctx, userId);
  });
}

/**
 * Show radius selection
 */
async function showRadiusSelection(ctx) {
  try {
    const lang = getUserLanguage(ctx);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(t('radius5km', lang), 'nearby_radius_5')],
      [Markup.button.callback(t('radius10km', lang), 'nearby_radius_10')],
      [Markup.button.callback(t('radius25km', lang), 'nearby_radius_25')],
      [Markup.button.callback(t('back', lang), 'main_menu')],
    ]);

    await ctx.editMessageText(t('nearbyUsersIntro', lang), {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } catch (error) {
    logger.error('Error showing radius selection:', error);
  }
}

/**
 * Show nearby users
 */
async function showNearbyUsers(ctx, radius) {
  try {
    const lang = getUserLanguage(ctx);
    const user = await getUserById(ctx.from.id);

    if (!user || !user.location) {
      return ctx.reply(t('locationRequired', lang));
    }

    // Check cache first
    const cacheKey = cacheKeys.nearbyUsers(
      user.location.lat,
      user.location.lng,
      radius
    );
    let nearbyUsers = await cache.get(cacheKey);

    if (!nearbyUsers) {
      // Query Firestore for nearby users
      nearbyUsers = await findNearbyUsers(user, radius);

      // Cache for 5 minutes
      await cache.set(cacheKey, nearbyUsers, 300);
    }

    if (nearbyUsers.length === 0) {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback(t('back', lang), 'show_nearby')],
      ]);

      return ctx.editMessageText(t('noNearbyUsers', lang), keyboard);
    }

    // Show users
    const message = t('nearbyUsersFound', lang, { count: nearbyUsers.length, radius });

    // Create buttons for each user
    const buttons = nearbyUsers.slice(0, 10).map((u) => {
      const distance = (u.distance / 1000).toFixed(1);
      return [
        Markup.button.callback(
          `👤 ${u.username || u.firstName} (${distance}km)`,
          `view_user_${u.userId}`
        ),
      ];
    });

    buttons.push([Markup.button.callback(t('back', lang), 'show_nearby')]);

    await ctx.editMessageText(message, Markup.inlineKeyboard(buttons));
  } catch (error) {
    logger.error('Error showing nearby users:', error);
  }
}

/**
 * Find nearby users
 */
async function findNearbyUsers(user, radiusKm) {
  try {
    // Get all users with locations (in production, use geohash queries for better performance)
    const snapshot = await collections
      .users()
      .where('location', '!=', null)
      .where('isActive', '==', true)
      .get();

    const nearbyUsers = [];

    snapshot.forEach((doc) => {
      const otherUser = doc.data();

      // Skip self and users who don't want to be shown
      if (
        otherUser.userId === user.userId ||
        !otherUser.privacySettings?.showProfile
      ) {
        return;
      }

      // Calculate distance
      const distance = getDistance(
        { latitude: user.location.lat, longitude: user.location.lng },
        { latitude: otherUser.location.lat, longitude: otherUser.location.lng }
      );

      if (distance <= radiusKm * 1000) {
        nearbyUsers.push({
          ...otherUser,
          distance,
        });
      }
    });

    // Sort by distance
    nearbyUsers.sort((a, b) => a.distance - b.distance);

    return nearbyUsers;
  } catch (error) {
    logger.error('Error finding nearby users:', error);
    return [];
  }
}

/**
 * Show user profile
 */
async function showUserProfile(ctx, userId) {
  try {
    const lang = getUserLanguage(ctx);
    const user = await getUserById(userId);

    if (!user) {
      return ctx.reply(t('userNotFound', lang));
    }

    const profileText = `👤 **${user.username || user.firstName}**\\n\\n` +
      `${user.bio || 'No bio'}\\n\\n` +
      `Status: ${user.subscriptionStatus === 'active' ? '💎 Premium' : '🆓 Free'}`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(t('sendMessage', lang), `message_user_${userId}`)],
      [Markup.button.callback(t('back', lang), 'show_nearby')],
    ]);

    await ctx.editMessageText(profileText, { parse_mode: 'Markdown', ...keyboard });
  } catch (error) {
    logger.error('Error showing user profile:', error);
  }
}

export default registerNearbyUsersHandlers;
