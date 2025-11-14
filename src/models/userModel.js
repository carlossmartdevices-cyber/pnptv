/**
 * User Data Model
 */

import { collections } from '../config/firebase.js';
import { cache, cacheKeys } from '../config/redis.js';
import logger from '../utils/logger.js';

/**
 * Create a new user
 */
export async function createUser(userData) {
  try {
    const userRef = collections.users().doc(userData.userId.toString());

    const now = new Date();
    const ageVerificationExpiresAt = new Date(now.getTime() + 168 * 60 * 60 * 1000); // 7 days

    const user = {
      userId: userData.userId,
      username: userData.username || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      language: userData.language || 'en',
      email: null,
      emailVerified: false,

      // Onboarding tracking
      onboardingComplete: false,
      createdAt: now,
      lastActive: now,

      // Age verification (7-day interval)
      ageVerified: false,
      ageVerifiedAt: null,
      ageVerificationExpiresAt: null,
      ageVerificationIntervalHours: 168, // 7 days

      // Legal compliance
      termsAccepted: false,
      privacyAccepted: false,

      // Membership
      tier: 'Free',
      membershipExpiresAt: null,

      // Profile (optional fields)
      bio: null,
      location: null,
      photoUrl: null,
      interests: [],

      // Legacy fields (deprecated but kept for backwards compatibility)
      subscriptionStatus: 'free',
      planId: null,
      planExpiry: null,
      isActive: true,
      isAdmin: false,
      privacySettings: {
        showProfile: true,
        showOnline: true,
        allowMessages: true,
      },
      updatedAt: now,
    };

    await userRef.set(user);
    logger.info(`User created: ${userData.userId}`);

    // Cache the user
    await cache.set(cacheKeys.user(userData.userId), user);

    return user;
  } catch (error) {
    logger.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId) {
  try {
    // Check cache first
    const cached = await cache.get(cacheKeys.user(userId));
    if (cached) {
      return cached;
    }

    const userRef = collections.users().doc(userId.toString());
    const doc = await userRef.get();

    if (!doc.exists) {
      return null;
    }

    const user = doc.data();

    // Cache the user
    await cache.set(cacheKeys.user(userId), user);

    return user;
  } catch (error) {
    logger.error('Error getting user:', error);
    throw error;
  }
}

/**
 * Update user data
 */
export async function updateUser(userId, updates) {
  try {
    const userRef = collections.users().doc(userId.toString());

    const data = {
      ...updates,
      updatedAt: new Date(),
    };

    await userRef.update(data);

    // Invalidate cache
    await cache.del(cacheKeys.user(userId));

    logger.info(`User updated: ${userId}`);

    return data;
  } catch (error) {
    logger.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Update user subscription
 */
export async function updateUserSubscription(userId, planId, expiryDate) {
  try {
    const updates = {
      subscriptionStatus: 'active',
      planId,
      planExpiry: expiryDate,
      updatedAt: new Date(),
    };

    await updateUser(userId, updates);

    logger.info(`Subscription updated for user ${userId}: ${planId}`);

    return updates;
  } catch (error) {
    logger.error('Error updating subscription:', error);
    throw error;
  }
}

/**
 * Deactivate expired subscriptions
 */
export async function deactivateExpiredSubscription(userId) {
  try {
    const updates = {
      subscriptionStatus: 'expired',
      updatedAt: new Date(),
    };

    await updateUser(userId, updates);

    logger.info(`Subscription expired for user ${userId}`);

    return updates;
  } catch (error) {
    logger.error('Error deactivating subscription:', error);
    throw error;
  }
}

/**
 * Get users by subscription status
 */
export async function getUsersBySubscriptionStatus(status) {
  try {
    const snapshot = await collections
      .users()
      .where('subscriptionStatus', '==', status)
      .get();

    return snapshot.docs.map((doc) => doc.data());
  } catch (error) {
    logger.error('Error getting users by subscription:', error);
    throw error;
  }
}

/**
 * Get users by language
 */
export async function getUsersByLanguage(language) {
  try {
    const snapshot = await collections
      .users()
      .where('language', '==', language)
      .get();

    return snapshot.docs.map((doc) => doc.data());
  } catch (error) {
    logger.error('Error getting users by language:', error);
    throw error;
  }
}

/**
 * Get all active users
 */
export async function getAllActiveUsers() {
  try {
    const snapshot = await collections
      .users()
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map((doc) => doc.data());
  } catch (error) {
    logger.error('Error getting all users:', error);
    throw error;
  }
}

/**
 * Search users by username
 */
export async function searchUserByUsername(username) {
  try {
    const snapshot = await collections
      .users()
      .where('username', '==', username)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data();
  } catch (error) {
    logger.error('Error searching user:', error);
    throw error;
  }
}

export default {
  createUser,
  getUserById,
  updateUser,
  updateUserSubscription,
  deactivateExpiredSubscription,
  getUsersBySubscriptionStatus,
  getUsersByLanguage,
  getAllActiveUsers,
  searchUserByUsername,
};
