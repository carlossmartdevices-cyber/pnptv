/**
 * Plan Service - Enhanced with Caching and Analytics
 *
 * Manages subscription plans with:
 * - Redis caching for performance
 * - Plan versioning support
 * - Analytics and recommendations
 * - Dynamic plan retrieval from Firestore
 */

import { collections } from '../config/firebase.js';
import { cache, cacheKeys } from '../config/redis.js';
import logger from '../utils/logger.js';
import { MEMBERSHIP_TIERS, SUBSCRIPTION_PLANS, TIER_FEATURES } from './membershipService.js';

/**
 * Cache TTL for plans (1 hour)
 */
const PLAN_CACHE_TTL = 3600;

/**
 * Get all subscription plans (with caching)
 *
 * @param {boolean} forceRefresh - Force refresh from Firestore
 * @returns {Promise<Array>} All plans
 */
export async function getAllPlans(forceRefresh = false) {
  try {
    const cacheKey = 'plans:all';

    // Check cache first
    if (!forceRefresh) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        logger.debug('Plans fetched from cache');
        return cached;
      }
    }

    // Fetch from Firestore
    const snapshot = await collections.plans().where('isActive', '==', true).get();

    let plans = [];

    if (snapshot.empty) {
      // No plans in Firestore, use default SUBSCRIPTION_PLANS
      logger.info('No plans in Firestore, using default configuration');
      plans = Object.values(SUBSCRIPTION_PLANS);
    } else {
      plans = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    }

    // Cache the result
    await cache.set(cacheKey, plans, PLAN_CACHE_TTL);

    logger.debug(`Fetched ${plans.length} plans from Firestore`);

    return plans;
  } catch (error) {
    logger.error('Error getting all plans:', error);

    // Fallback to default plans on error
    return Object.values(SUBSCRIPTION_PLANS);
  }
}

/**
 * Get plan by ID (with caching)
 *
 * @param {string} planId - Plan ID
 * @returns {Promise<Object>} Plan details
 */
export async function getPlanById(planId) {
  try {
    const cacheKey = cacheKeys.plan(planId);

    // Check cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Try Firestore first
    const planDoc = await collections.plans().doc(planId).get();

    let plan;

    if (planDoc.exists) {
      plan = {
        id: planDoc.id,
        ...planDoc.data(),
      };
    } else {
      // Fallback to default SUBSCRIPTION_PLANS
      const defaultPlan = Object.values(SUBSCRIPTION_PLANS).find(p => p.id === planId);

      if (!defaultPlan) {
        throw new Error(`Plan ${planId} not found`);
      }

      plan = defaultPlan;
    }

    // Cache the result
    await cache.set(cacheKey, plan, PLAN_CACHE_TTL);

    return plan;
  } catch (error) {
    logger.error(`Error getting plan ${planId}:`, error);
    throw error;
  }
}

/**
 * Get plans by tier (with caching)
 *
 * @param {string} tier - Membership tier
 * @returns {Promise<Array>} Plans for tier
 */
export async function getPlansByTier(tier) {
  try {
    const cacheKey = `plans:tier:${tier}`;

    // Check cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const allPlans = await getAllPlans();
    const filteredPlans = allPlans.filter(plan => plan.tier === tier);

    // Cache the result
    await cache.set(cacheKey, filteredPlans, PLAN_CACHE_TTL);

    return filteredPlans;
  } catch (error) {
    logger.error(`Error getting plans for tier ${tier}:`, error);
    return [];
  }
}

/**
 * Get recommended plan for user
 *
 * @param {Object} userContext - User context
 * @param {number} userContext.userId - User ID
 * @param {string} userContext.currentTier - Current tier
 * @param {number} userContext.daysRemaining - Days remaining
 * @returns {Promise<Object>} Recommended plan
 */
export async function getRecommendedPlan(userContext) {
  try {
    const { currentTier, daysRemaining } = userContext;

    // If free user, recommend Trial Week
    if (currentTier === MEMBERSHIP_TIERS.FREE) {
      return await getPlanById(SUBSCRIPTION_PLANS.TRIAL_WEEK.id);
    }

    // If basic user with <7 days, recommend renewal
    if (currentTier === MEMBERSHIP_TIERS.BASIC && daysRemaining < 7) {
      return await getPlanById(SUBSCRIPTION_PLANS.PNP_MEMBER.id);
    }

    // If basic user, recommend upgrade to Premium
    if (currentTier === MEMBERSHIP_TIERS.BASIC) {
      return await getPlanById(SUBSCRIPTION_PLANS.CRYSTAL.id);
    }

    // If premium user with <7 days, recommend Diamond (better value)
    if (currentTier === MEMBERSHIP_TIERS.PREMIUM && daysRemaining < 7) {
      return await getPlanById(SUBSCRIPTION_PLANS.DIAMOND.id);
    }

    // Default recommendation: PNP Member
    return await getPlanById(SUBSCRIPTION_PLANS.PNP_MEMBER.id);
  } catch (error) {
    logger.error('Error getting recommended plan:', error);
    return SUBSCRIPTION_PLANS.PNP_MEMBER;
  }
}

/**
 * Calculate plan value (price per day)
 *
 * @param {string} planId - Plan ID
 * @returns {Promise<number>} Price per day
 */
export async function calculatePlanValue(planId) {
  try {
    const plan = await getPlanById(planId);
    return (plan.priceUSD / plan.durationDays).toFixed(2);
  } catch (error) {
    logger.error(`Error calculating plan value for ${planId}:`, error);
    return 0;
  }
}

/**
 * Get plan comparison data
 *
 * @returns {Promise<Array>} Plan comparison matrix
 */
export async function getPlanComparison() {
  try {
    const cacheKey = 'plans:comparison';

    // Check cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const allPlans = await getAllPlans();

    const comparison = allPlans.map(plan => {
      const pricePerDay = (plan.priceUSD / plan.durationDays).toFixed(2);
      const tierFeatures = TIER_FEATURES[plan.tier];

      return {
        planId: plan.id,
        name: plan.name,
        tier: plan.tier,
        price: plan.priceUSD,
        duration: plan.durationDays,
        pricePerDay: parseFloat(pricePerDay),
        savings: plan.id === 'lifetime' ? '90%' : plan.id === 'diamond' ? '40%' : '0%',
        features: tierFeatures.features,
        bestValue: plan.id === 'diamond', // Mark Diamond as best value
        popular: plan.id === 'pnp_member', // Mark PNP Member as most popular
      };
    });

    // Sort by tier (Premium first) then by duration
    comparison.sort((a, b) => {
      if (a.tier !== b.tier) {
        return b.tier.localeCompare(a.tier); // Premium > Basic
      }
      return b.duration - a.duration; // Longer duration first
    });

    // Cache the result
    await cache.set(cacheKey, comparison, PLAN_CACHE_TTL);

    return comparison;
  } catch (error) {
    logger.error('Error getting plan comparison:', error);
    return [];
  }
}

/**
 * Get plan analytics
 *
 * @returns {Promise<Object>} Plan analytics
 */
export async function getPlanAnalytics() {
  try {
    const cacheKey = 'plans:analytics';

    // Check cache first (shorter TTL - 5 minutes)
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get plan activation data
    const activationsSnapshot = await collections.planActivations()
      .where('status', '==', 'active')
      .get();

    const analytics = {
      totalActivePlans: activationsSnapshot.size,
      byPlan: {},
      byTier: {},
      revenue: {
        total: 0,
        byPlan: {},
      },
    };

    // Count activations and calculate revenue
    for (const doc of activationsSnapshot.docs) {
      const activation = doc.data();
      const planId = activation.planId;
      const tier = activation.tier;

      // Count by plan
      analytics.byPlan[planId] = (analytics.byPlan[planId] || 0) + 1;

      // Count by tier
      analytics.byTier[tier] = (analytics.byTier[tier] || 0) + 1;

      // Calculate revenue
      try {
        const plan = await getPlanById(planId);
        analytics.revenue.byPlan[planId] = (analytics.revenue.byPlan[planId] || 0) + plan.priceUSD;
        analytics.revenue.total += plan.priceUSD;
      } catch (error) {
        logger.error(`Error calculating revenue for plan ${planId}:`, error);
      }
    }

    // Calculate conversion metrics
    const totalUsersSnapshot = await collections.users().get();
    const totalUsers = totalUsersSnapshot.size;

    analytics.conversion = {
      totalUsers,
      paidUsers: activationsSnapshot.size,
      conversionRate: ((activationsSnapshot.size / totalUsers) * 100).toFixed(2) + '%',
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, analytics, 300);

    return analytics;
  } catch (error) {
    logger.error('Error getting plan analytics:', error);
    return {
      totalActivePlans: 0,
      byPlan: {},
      byTier: {},
      revenue: { total: 0, byPlan: {} },
      conversion: { totalUsers: 0, paidUsers: 0, conversionRate: '0%' },
    };
  }
}

/**
 * Create or update plan in Firestore (Admin)
 *
 * @param {Object} planData - Plan data
 * @returns {Promise<Object>} Created/updated plan
 */
export async function createOrUpdatePlan(planData) {
  try {
    const {
      id,
      name,
      tier,
      priceUSD,
      durationDays,
      description,
      features,
      isActive = true,
    } = planData;

    const planRef = collections.plans().doc(id);

    const plan = {
      id,
      name,
      tier,
      priceUSD,
      durationDays,
      description,
      features,
      isActive,
      updatedAt: new Date(),
    };

    // Check if plan exists
    const existing = await planRef.get();

    if (existing.exists) {
      await planRef.update(plan);
      logger.info(`Plan updated: ${id}`);
    } else {
      plan.createdAt = new Date();
      await planRef.set(plan);
      logger.info(`Plan created: ${id}`);
    }

    // Invalidate cache
    await invalidatePlanCache(id);

    return plan;
  } catch (error) {
    logger.error('Error creating/updating plan:', error);
    throw error;
  }
}

/**
 * Deactivate plan (Admin)
 *
 * @param {string} planId - Plan ID
 * @returns {Promise<void>}
 */
export async function deactivatePlan(planId) {
  try {
    const planRef = collections.plans().doc(planId);

    await planRef.update({
      isActive: false,
      deactivatedAt: new Date(),
    });

    // Invalidate cache
    await invalidatePlanCache(planId);

    logger.info(`Plan deactivated: ${planId}`);
  } catch (error) {
    logger.error(`Error deactivating plan ${planId}:`, error);
    throw error;
  }
}

/**
 * Invalidate plan cache
 *
 * @param {string} planId - Plan ID (optional)
 * @returns {Promise<void>}
 */
export async function invalidatePlanCache(planId = null) {
  try {
    // Clear all plans cache
    await cache.del('plans:all');
    await cache.del('plans:comparison');
    await cache.del('plans:analytics');

    // Clear specific plan cache
    if (planId) {
      await cache.del(cacheKeys.plan(planId));
    }

    // Clear tier caches
    await cache.delPattern('plans:tier:*');

    logger.debug('Plan cache invalidated');
  } catch (error) {
    logger.error('Error invalidating plan cache:', error);
  }
}

/**
 * Sync default plans to Firestore (One-time setup)
 *
 * @returns {Promise<void>}
 */
export async function syncDefaultPlansToFirestore() {
  try {
    logger.info('Syncing default plans to Firestore...');

    const batch = [];

    for (const plan of Object.values(SUBSCRIPTION_PLANS)) {
      batch.push(createOrUpdatePlan({
        ...plan,
        isActive: true,
      }));
    }

    await Promise.all(batch);

    logger.info('Default plans synced successfully');
  } catch (error) {
    logger.error('Error syncing default plans:', error);
    throw error;
  }
}

/**
 * Get tier information
 *
 * @param {string} tier - Tier name
 * @returns {Object} Tier features
 */
export function getTierInfo(tier) {
  return TIER_FEATURES[tier] || TIER_FEATURES[MEMBERSHIP_TIERS.FREE];
}

/**
 * Check if user can access feature based on tier
 *
 * @param {string} userTier - User's tier
 * @param {string} feature - Feature name
 * @returns {boolean} Can access
 */
export function canAccessFeature(userTier, feature) {
  const tierInfo = TIER_FEATURES[userTier] || TIER_FEATURES[MEMBERSHIP_TIERS.FREE];

  const featurePermissions = {
    premiumChannel: tierInfo.channelAccess.premium,
    inviteLinks: tierInfo.inviteLinks,
    liveStreams: userTier !== MEMBERSHIP_TIERS.FREE,
    videoRooms: userTier === MEMBERSHIP_TIERS.PREMIUM,
    nearbyUsers: userTier === MEMBERSHIP_TIERS.PREMIUM,
    adFree: userTier === MEMBERSHIP_TIERS.PREMIUM,
  };

  return featurePermissions[feature] || false;
}

export default {
  getAllPlans,
  getPlanById,
  getPlansByTier,
  getRecommendedPlan,
  calculatePlanValue,
  getPlanComparison,
  getPlanAnalytics,
  createOrUpdatePlan,
  deactivatePlan,
  invalidatePlanCache,
  syncDefaultPlansToFirestore,
  getTierInfo,
  canAccessFeature,
};
