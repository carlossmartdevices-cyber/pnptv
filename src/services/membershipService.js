/**
 * Membership Management Service
 *
 * 3-Tier System:
 * - Free: Default tier, access to free content
 * - Basic: Access to premium channel
 * - Premium: Full access to all features + invite links
 *
 * Transaction-safe operations with complete audit trail
 */

import { getDb, collections } from '../config/firebase.js';
import { cache, cacheKeys } from '../config/redis.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

/**
 * Membership Tiers (Permission Levels)
 */
export const MEMBERSHIP_TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
};

/**
 * Tier Features
 */
export const TIER_FEATURES = {
  [MEMBERSHIP_TIERS.FREE]: {
    tier: 'free',
    name: 'Free',
    features: [
      'Access to free content',
      'Basic profile',
      'Community access',
    ],
    channelAccess: {
      free: true,
      premium: false,
    },
    inviteLinks: false,
    maxInvites: 0,
  },
  [MEMBERSHIP_TIERS.BASIC]: {
    tier: 'basic',
    name: 'Basic',
    features: [
      'All Free features',
      'Access to premium channel',
      'Enhanced profile',
      'Priority support',
    ],
    channelAccess: {
      free: true,
      premium: true,
    },
    inviteLinks: false,
    maxInvites: 0,
  },
  [MEMBERSHIP_TIERS.PREMIUM]: {
    tier: 'premium',
    name: 'Premium',
    features: [
      'All Basic features',
      'Unlimited live streams',
      'Video rooms',
      'Nearby users map',
      'Ad-free experience',
      'VIP badge',
      'Generate invite links',
      'Priority features',
    ],
    channelAccess: {
      free: true,
      premium: true,
    },
    inviteLinks: true,
    maxInvites: -1, // Unlimited
  },
};

/**
 * Subscription Plans (Payment Wrappers)
 */
export const SUBSCRIPTION_PLANS = {
  TRIAL_WEEK: {
    id: 'trial_week',
    name: 'Trial Week',
    tier: MEMBERSHIP_TIERS.BASIC,
    priceUSD: 14.99,
    durationDays: 7,
    description: 'Try premium channel access for 1 week',
    features: TIER_FEATURES[MEMBERSHIP_TIERS.BASIC].features,
  },
  PNP_MEMBER: {
    id: 'pnp_member',
    name: 'PNP Member',
    tier: MEMBERSHIP_TIERS.BASIC,
    priceUSD: 24.99,
    durationDays: 30,
    description: 'Monthly access to premium channel',
    features: TIER_FEATURES[MEMBERSHIP_TIERS.BASIC].features,
  },
  CRYSTAL: {
    id: 'crystal',
    name: 'Crystal',
    tier: MEMBERSHIP_TIERS.PREMIUM,
    priceUSD: 49.99,
    durationDays: 30,
    description: 'Full premium access for 1 month',
    features: TIER_FEATURES[MEMBERSHIP_TIERS.PREMIUM].features,
  },
  DIAMOND: {
    id: 'diamond',
    name: 'Diamond',
    tier: MEMBERSHIP_TIERS.PREMIUM,
    priceUSD: 99.99,
    durationDays: 90,
    description: 'Full premium access for 3 months',
    features: TIER_FEATURES[MEMBERSHIP_TIERS.PREMIUM].features,
  },
  LIFETIME: {
    id: 'lifetime',
    name: 'Lifetime',
    tier: MEMBERSHIP_TIERS.PREMIUM,
    priceUSD: 249.99,
    durationDays: 36500, // 100 years (effectively lifetime)
    description: 'Lifetime premium access',
    features: TIER_FEATURES[MEMBERSHIP_TIERS.PREMIUM].features,
  },
};

/**
 * Activate membership (Transaction-Safe)
 *
 * @param {number} userId - User ID
 * @param {string} planId - Plan ID from SUBSCRIPTION_PLANS
 * @param {Object} options - Additional options
 * @param {string} options.triggeredBy - Who triggered this (userId or 'system')
 * @param {string} options.reason - Reason for activation
 * @param {string} options.paymentId - Associated payment ID
 * @returns {Promise<Object>} Activation result
 */
export async function activateMembership(userId, planId, options = {}) {
  const db = getDb();
  const {
    triggeredBy = 'system',
    reason = 'plan_purchase',
    paymentId = null
  } = options;

  try {
    // Validate plan
    const plan = Object.values(SUBSCRIPTION_PLANS).find(p => p.id === planId);
    if (!plan) {
      throw new Error(`Invalid plan ID: ${planId}`);
    }

    const tier = plan.tier;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

    // Use Firestore transaction for atomicity
    const result = await db.runTransaction(async (transaction) => {
      const userRef = collections.users().doc(userId.toString());
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error(`User ${userId} not found`);
      }

      const currentUser = userDoc.data();
      const now = new Date();

      // Prepare membership data
      const membershipData = {
        tier,
        planId,
        planName: plan.name,
        activatedAt: now,
        expiryDate,
        status: 'active',
        isLifetime: planId === 'lifetime',
        triggeredBy,
        reason,
        paymentId,
      };

      // Update user document
      transaction.update(userRef, {
        tier,
        planId,
        planExpiry: expiryDate,
        subscriptionStatus: 'active',
        updatedAt: now,
      });

      // Create membership history record
      const historyRef = collections.membershipHistory().doc();
      transaction.set(historyRef, {
        userId,
        action: 'activation',
        tier,
        planId,
        planName: plan.name,
        previousTier: currentUser.tier || MEMBERSHIP_TIERS.FREE,
        previousPlanId: currentUser.planId || null,
        expiryDate,
        triggeredBy,
        reason,
        paymentId,
        createdAt: now,
      });

      // Create plan activation record
      const activationRef = collections.planActivations().doc();
      transaction.set(activationRef, {
        userId,
        planId,
        tier,
        activatedAt: now,
        expiryDate,
        status: 'active',
        triggeredBy,
        paymentId,
      });

      // Generate invite link if Premium tier
      let inviteLink = null;
      if (tier === MEMBERSHIP_TIERS.PREMIUM) {
        const inviteCode = generateInviteCode(userId);
        const inviteLinkRef = collections.inviteLinks().doc(inviteCode);

        transaction.set(inviteLinkRef, {
          code: inviteCode,
          userId,
          createdAt: now,
          expiresAt: expiryDate,
          maxUses: 5, // Default max uses
          currentUses: 0,
          status: 'active',
        });

        inviteLink = inviteCode;
      }

      return { membershipData, inviteLink };
    });

    // Invalidate cache
    await cache.del(cacheKeys.user(userId));
    await cache.del(`membership:${userId}`);

    logger.info(`Membership activated for user ${userId}:`, {
      planId,
      tier,
      expiryDate,
      triggeredBy,
    });

    return {
      success: true,
      tier,
      planId,
      planName: plan.name,
      expiryDate,
      inviteLink: result.inviteLink,
      features: TIER_FEATURES[tier].features,
    };
  } catch (error) {
    logger.error('Error activating membership:', error);

    // Fail-safe: Ensure user defaults to Free tier on error
    try {
      await collections.users().doc(userId.toString()).update({
        tier: MEMBERSHIP_TIERS.FREE,
        subscriptionStatus: 'error',
        updatedAt: new Date(),
      });
    } catch (fallbackError) {
      logger.error('Failed to set fail-safe tier:', fallbackError);
    }

    throw error;
  }
}

/**
 * Deactivate membership (Transaction-Safe)
 *
 * @param {number} userId - User ID
 * @param {string} reason - Reason for deactivation
 * @param {string} triggeredBy - Who triggered this
 * @returns {Promise<Object>} Deactivation result
 */
export async function deactivateMembership(userId, reason = 'expired', triggeredBy = 'system') {
  const db = getDb();

  try {
    // Use Firestore transaction for atomicity
    const result = await db.runTransaction(async (transaction) => {
      const userRef = collections.users().doc(userId.toString());
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error(`User ${userId} not found`);
      }

      const currentUser = userDoc.data();
      const now = new Date();

      // Downgrade to Free tier
      transaction.update(userRef, {
        tier: MEMBERSHIP_TIERS.FREE,
        planId: null,
        planExpiry: null,
        subscriptionStatus: reason === 'expired' ? 'expired' : 'cancelled',
        updatedAt: now,
      });

      // Create membership history record
      const historyRef = collections.membershipHistory().doc();
      transaction.set(historyRef, {
        userId,
        action: 'deactivation',
        tier: MEMBERSHIP_TIERS.FREE,
        planId: null,
        previousTier: currentUser.tier || MEMBERSHIP_TIERS.FREE,
        previousPlanId: currentUser.planId || null,
        expiryDate: null,
        triggeredBy,
        reason,
        createdAt: now,
      });

      // Deactivate all active invite links
      const inviteLinksSnapshot = await collections.inviteLinks()
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .get();

      inviteLinksSnapshot.docs.forEach((doc) => {
        transaction.update(doc.ref, {
          status: 'deactivated',
          deactivatedAt: now,
          deactivationReason: reason,
        });
      });

      // Update plan activation status
      const activationsSnapshot = await collections.planActivations()
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .get();

      activationsSnapshot.docs.forEach((doc) => {
        transaction.update(doc.ref, {
          status: 'deactivated',
          deactivatedAt: now,
          deactivationReason: reason,
        });
      });

      return {
        previousTier: currentUser.tier,
        previousPlanId: currentUser.planId
      };
    });

    // Invalidate cache
    await cache.del(cacheKeys.user(userId));
    await cache.del(`membership:${userId}`);

    logger.info(`Membership deactivated for user ${userId}:`, {
      reason,
      triggeredBy,
      previousTier: result.previousTier,
    });

    return {
      success: true,
      tier: MEMBERSHIP_TIERS.FREE,
      message: 'Membership deactivated successfully',
    };
  } catch (error) {
    logger.error('Error deactivating membership:', error);

    // Fail-safe: Ensure user defaults to Free tier on error
    try {
      await collections.users().doc(userId.toString()).update({
        tier: MEMBERSHIP_TIERS.FREE,
        subscriptionStatus: 'error',
        updatedAt: new Date(),
      });
    } catch (fallbackError) {
      logger.error('Failed to set fail-safe tier:', fallbackError);
    }

    throw error;
  }
}

/**
 * Get membership status
 *
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Membership status
 */
export async function getMembershipStatus(userId) {
  try {
    // Check cache first
    const cacheKey = `membership:${userId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const userRef = collections.users().doc(userId.toString());
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return {
        tier: MEMBERSHIP_TIERS.FREE,
        status: 'inactive',
        features: TIER_FEATURES[MEMBERSHIP_TIERS.FREE],
      };
    }

    const user = userDoc.data();
    const tier = user.tier || MEMBERSHIP_TIERS.FREE;
    const expiryDate = user.planExpiry ? user.planExpiry.toDate() : null;
    const now = new Date();

    // Calculate days remaining
    let daysRemaining = 0;
    let isExpired = false;

    if (expiryDate) {
      const diffTime = expiryDate - now;
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      isExpired = diffTime < 0;
    }

    const status = {
      tier,
      planId: user.planId || null,
      planName: user.planId ? SUBSCRIPTION_PLANS[user.planId.toUpperCase()]?.name : null,
      status: isExpired ? 'expired' : (tier !== MEMBERSHIP_TIERS.FREE ? 'active' : 'inactive'),
      expiryDate,
      daysRemaining: Math.max(0, daysRemaining),
      isExpired,
      features: TIER_FEATURES[tier],
      permissions: {
        canAccessPremiumChannel: TIER_FEATURES[tier].channelAccess.premium,
        canGenerateInvites: TIER_FEATURES[tier].inviteLinks,
        maxInvites: TIER_FEATURES[tier].maxInvites,
      },
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, status, 300);

    return status;
  } catch (error) {
    logger.error('Error getting membership status:', error);

    // Fail-safe: Return Free tier on error
    return {
      tier: MEMBERSHIP_TIERS.FREE,
      status: 'error',
      features: TIER_FEATURES[MEMBERSHIP_TIERS.FREE],
    };
  }
}

/**
 * Extend membership (Admin function)
 *
 * @param {number} userId - User ID
 * @param {number} additionalDays - Days to add
 * @param {string} triggeredBy - Admin user ID
 * @returns {Promise<Object>} Extension result
 */
export async function extendMembership(userId, additionalDays, triggeredBy = 'admin') {
  const db = getDb();

  try {
    const result = await db.runTransaction(async (transaction) => {
      const userRef = collections.users().doc(userId.toString());
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error(`User ${userId} not found`);
      }

      const user = userDoc.data();
      const now = new Date();
      let newExpiryDate;

      if (user.planExpiry) {
        const currentExpiry = user.planExpiry.toDate();
        newExpiryDate = new Date(currentExpiry);
        newExpiryDate.setDate(newExpiryDate.getDate() + additionalDays);
      } else {
        newExpiryDate = new Date();
        newExpiryDate.setDate(newExpiryDate.getDate() + additionalDays);
      }

      // Update user
      transaction.update(userRef, {
        planExpiry: newExpiryDate,
        subscriptionStatus: 'active',
        updatedAt: now,
      });

      // Create history record
      const historyRef = collections.membershipHistory().doc();
      transaction.set(historyRef, {
        userId,
        action: 'extension',
        tier: user.tier,
        planId: user.planId,
        previousExpiry: user.planExpiry || null,
        newExpiry: newExpiryDate,
        daysAdded: additionalDays,
        triggeredBy,
        reason: 'admin_extension',
        createdAt: now,
      });

      return { newExpiryDate };
    });

    // Invalidate cache
    await cache.del(cacheKeys.user(userId));
    await cache.del(`membership:${userId}`);

    logger.info(`Membership extended for user ${userId} by ${additionalDays} days`, {
      newExpiryDate: result.newExpiryDate,
      triggeredBy,
    });

    return {
      success: true,
      expiryDate: result.newExpiryDate,
      daysAdded: additionalDays,
    };
  } catch (error) {
    logger.error('Error extending membership:', error);
    throw error;
  }
}

/**
 * Batch expire memberships (For cron job)
 *
 * @param {number} limit - Max memberships to process
 * @returns {Promise<Object>} Expiration results
 */
export async function batchExpireMemberships(limit = 100) {
  try {
    const now = new Date();
    let processedCount = 0;
    let errorCount = 0;
    const errors = [];

    // Query expired active memberships
    const snapshot = await collections.users()
      .where('subscriptionStatus', '==', 'active')
      .where('planExpiry', '<', now)
      .limit(limit)
      .get();

    logger.info(`Found ${snapshot.size} expired memberships to process`);

    // Process each expiration
    for (const doc of snapshot.docs) {
      const user = doc.data();

      try {
        await deactivateMembership(user.userId, 'expired', 'system');
        processedCount++;
      } catch (error) {
        errorCount++;
        errors.push({
          userId: user.userId,
          error: error.message,
        });
        logger.error(`Failed to expire membership for user ${user.userId}:`, error);
      }
    }

    const result = {
      total: snapshot.size,
      processed: processedCount,
      errors: errorCount,
      errorDetails: errors,
      timestamp: now,
    };

    logger.info('Batch expiration completed:', result);

    return result;
  } catch (error) {
    logger.error('Error in batch expiration:', error);
    throw error;
  }
}

/**
 * Get expiring memberships (For notifications)
 *
 * @param {number} daysThreshold - Days before expiry
 * @returns {Promise<Array>} Expiring memberships
 */
export async function getExpiringMemberships(daysThreshold = 7) {
  try {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const snapshot = await collections.users()
      .where('subscriptionStatus', '==', 'active')
      .where('planExpiry', '>', now)
      .where('planExpiry', '<', thresholdDate)
      .get();

    const expiringUsers = snapshot.docs.map(doc => {
      const user = doc.data();
      const expiryDate = user.planExpiry.toDate();
      const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

      return {
        userId: user.userId,
        username: user.username,
        language: user.language,
        tier: user.tier,
        planId: user.planId,
        expiryDate,
        daysRemaining,
      };
    });

    logger.info(`Found ${expiringUsers.length} memberships expiring within ${daysThreshold} days`);

    return expiringUsers;
  } catch (error) {
    logger.error('Error getting expiring memberships:', error);
    throw error;
  }
}

/**
 * Check if membership is expired
 *
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} Is expired
 */
export async function checkExpiration(userId) {
  try {
    const status = await getMembershipStatus(userId);
    return status.isExpired;
  } catch (error) {
    logger.error('Error checking expiration:', error);
    return false;
  }
}

/**
 * Generate invite code
 *
 * @param {number} userId - User ID
 * @returns {string} Invite code
 */
function generateInviteCode(userId) {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `INV-${userId}-${timestamp}-${random}`.toUpperCase();
}

/**
 * Get membership history
 *
 * @param {number} userId - User ID
 * @param {number} limit - Results limit
 * @returns {Promise<Array>} Membership history
 */
export async function getMembershipHistory(userId, limit = 50) {
  try {
    const snapshot = await collections.membershipHistory()
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
    }));
  } catch (error) {
    logger.error('Error getting membership history:', error);
    throw error;
  }
}

/**
 * Get plan statistics (Admin)
 *
 * @returns {Promise<Object>} Plan statistics
 */
export async function getPlanStatistics() {
  try {
    const stats = {
      byTier: {},
      byPlan: {},
      total: 0,
      active: 0,
      expired: 0,
    };

    // Get all users
    const snapshot = await collections.users().get();
    stats.total = snapshot.size;

    snapshot.docs.forEach(doc => {
      const user = doc.data();
      const tier = user.tier || MEMBERSHIP_TIERS.FREE;
      const planId = user.planId;
      const status = user.subscriptionStatus;

      // Count by tier
      stats.byTier[tier] = (stats.byTier[tier] || 0) + 1;

      // Count by plan
      if (planId) {
        stats.byPlan[planId] = (stats.byPlan[planId] || 0) + 1;
      }

      // Count by status
      if (status === 'active') {
        stats.active++;
      } else if (status === 'expired') {
        stats.expired++;
      }
    });

    return stats;
  } catch (error) {
    logger.error('Error getting plan statistics:', error);
    throw error;
  }
}

export default {
  MEMBERSHIP_TIERS,
  TIER_FEATURES,
  SUBSCRIPTION_PLANS,
  activateMembership,
  deactivateMembership,
  getMembershipStatus,
  extendMembership,
  batchExpireMemberships,
  getExpiringMemberships,
  checkExpiration,
  getMembershipHistory,
  getPlanStatistics,
};
