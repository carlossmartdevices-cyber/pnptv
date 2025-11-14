/**
 * Nearby Service
 * Manages nearby member searches with limits and filters
 */

import { collections } from '../../config/firebase.js';
import logger from '../../utils/logger.js';
import admin from 'firebase-admin';

const FREE_SEARCHES_PER_WEEK = 3;

/**
 * Check search limits for user
 */
export async function checkSearchLimit(userId, tier) {
  try {
    if (tier === 'active' || tier === 'Premium') {
      // Premium users have unlimited searches
      return {
        allowed: true,
        unlimited: true,
        remaining: Infinity,
      };
    }

    // Get searches in the last 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const snapshot = await collections.nearbySearches()
      .where('userId', '==', userId)
      .where('searchedAt', '>=', admin.firestore.Timestamp.fromDate(oneWeekAgo))
      .get();

    const searchCount = snapshot.size;
    const remaining = Math.max(0, FREE_SEARCHES_PER_WEEK - searchCount);

    return {
      allowed: remaining > 0,
      unlimited: false,
      remaining,
      used: searchCount,
      limit: FREE_SEARCHES_PER_WEEK,
      resetDate: getNextWeekReset(),
    };
  } catch (error) {
    logger.error('Error checking search limit:', error);
    return {
      allowed: false,
      error: error.message,
    };
  }
}

/**
 * Record a nearby search
 */
export async function recordSearch(userId, tier) {
  try {
    // Don't record for premium users
    if (tier === 'active' || tier === 'Premium') {
      return { success: true };
    }

    await collections.nearbySearches().add({
      userId,
      searchedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`Nearby search recorded for user ${userId}`);

    return { success: true };
  } catch (error) {
    logger.error('Error recording search:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get next week reset date
 */
function getNextWeekReset() {
  const now = new Date();
  const daysUntilReset = 7 - ((now.getDay() + 6) % 7);
  const resetDate = new Date(now);
  resetDate.setDate(now.getDate() + daysUntilReset);
  resetDate.setHours(0, 0, 0, 0);

  return resetDate.toLocaleDateString();
}

/**
 * Find nearby users with filters
 */
export async function findNearbyUsers(userId, userLocation, filters = {}) {
  try {
    const {
      distanceKm = 25,
      tier,
      onlineOnly = false,
    } = filters;

    // Get all users with locations (in production, use geohash for better performance)
    let query = collections.users()
      .where('location', '!=', null)
      .where('isActive', '==', true);

    // Apply tier filter if specified
    if (tier) {
      query = query.where('subscriptionStatus', '==', tier);
    }

    const snapshot = await query.get();

    const nearbyUsers = [];

    snapshot.forEach((doc) => {
      const otherUser = doc.data();

      // Skip self and users who don't want to be shown
      if (
        otherUser.userId === userId ||
        !otherUser.privacySettings?.showProfile
      ) {
        return;
      }

      // Filter by online status if requested
      if (onlineOnly && !otherUser.isOnline) {
        return;
      }

      // Calculate distance
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        otherUser.location.lat,
        otherUser.location.lng
      );

      if (distance <= distanceKm) {
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
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

export default {
  checkSearchLimit,
  recordSearch,
  findNearbyUsers,
  calculateDistance,
};
