/**
 * User Business Logic Service
 */

import * as userModel from '../models/userModel.js';
import { cache, cacheKeys } from '../config/redis.js';
import logger from '../utils/logger.js';
import { sanitizeBio, sanitizeUsername, isValidEmail } from '../utils/validation.js';

/**
 * Get or create user
 */
export async function getOrCreateUser(telegramUser) {
  try {
    let user = await userModel.getUserById(telegramUser.id);

    if (!user) {
      user = await userModel.createUser({
        userId: telegramUser.id,
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        language: telegramUser.language_code?.split('-')[0] || 'en',
      });
    }

    return user;
  } catch (error) {
    logger.error('Error in getOrCreateUser:', error);
    throw error;
  }
}

/**
 * Complete user onboarding
 */
export async function completeOnboarding(userId, onboardingData) {
  try {
    const now = new Date();
    const ageVerificationExpiresAt = new Date(now.getTime() + 168 * 60 * 60 * 1000); // 7 days

    const updates = {
      language: onboardingData.language,
      email: onboardingData.email && isValidEmail(onboardingData.email) ? onboardingData.email : null,
      emailVerified: false,

      // Age verification
      ageVerified: onboardingData.ageVerified || onboardingData.age18Plus || false,
      ageVerifiedAt: onboardingData.ageVerified ? now : null,
      ageVerificationExpiresAt: onboardingData.ageVerified ? ageVerificationExpiresAt : null,

      // Legal compliance
      termsAccepted: onboardingData.termsAccepted || false,
      privacyAccepted: onboardingData.privacyAccepted || false,

      // Mark onboarding complete (both fields for backwards compatibility)
      onboardingComplete: true,
      onboardingCompleted: true,

      lastActive: now,
    };

    await userModel.updateUser(userId, updates);

    logger.info(`Onboarding completed for user ${userId}`);

    return updates;
  } catch (error) {
    logger.error('Error completing onboarding:', error);
    throw error;
  }
}

/**
 * Update user profile
 */
export async function updateProfile(userId, profileData) {
  try {
    const updates = {};

    if (profileData.bio !== undefined) {
      updates.bio = sanitizeBio(profileData.bio);
    }

    if (profileData.photoUrl) {
      updates.photoUrl = profileData.photoUrl;
    }

    if (profileData.location) {
      updates.location = {
        lat: profileData.location.latitude,
        lng: profileData.location.longitude,
      };
    }

    if (profileData.interests) {
      updates.interests = profileData.interests;
    }

    await userModel.updateUser(userId, updates);

    logger.info(`Profile updated for user ${userId}`);

    return updates;
  } catch (error) {
    logger.error('Error updating profile:', error);
    throw error;
  }
}

/**
 * Update privacy settings
 */
export async function updatePrivacySettings(userId, settings) {
  try {
    const updates = {
      privacySettings: settings,
    };

    await userModel.updateUser(userId, updates);

    logger.info(`Privacy settings updated for user ${userId}`);

    return updates;
  } catch (error) {
    logger.error('Error updating privacy settings:', error);
    throw error;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId) {
  return await userModel.getUserById(userId);
}

/**
 * Search user
 */
export async function searchUser(query) {
  try {
    const username = sanitizeUsername(query);
    return await userModel.searchUserByUsername(username);
  } catch (error) {
    logger.error('Error searching user:', error);
    throw error;
  }
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(userId) {
  try {
    const user = await userModel.getUserById(userId);
    return user && user.subscriptionStatus === 'active';
  } catch (error) {
    logger.error('Error checking subscription:', error);
    return false;
  }
}

export default {
  getOrCreateUser,
  completeOnboarding,
  updateProfile,
  updatePrivacySettings,
  getUserById,
  searchUser,
  hasActiveSubscription,
};
