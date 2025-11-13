/**
 * Subscription Management Service
 */

import { collections } from '../config/firebase.js';
import * as userModel from '../models/userModel.js';
import logger from '../utils/logger.js';
import { bot } from '../bot/core/bot.js';
import { t } from '../utils/i18n.js';

/**
 * Subscription plans configuration
 */
export const PLANS = {
  basic: {
    id: 'basic',
    name: 'Basic',
    priceUSD: parseFloat(process.env.PLAN_BASIC_PRICE_USD) || 9.99,
    duration: 30, // days
    features: ['Radio access', 'Basic profile', 'Limited live streams'],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    priceUSD: parseFloat(process.env.PLAN_PREMIUM_PRICE_USD) || 19.99,
    duration: 30,
    features: [
      'All Basic features',
      'Unlimited live streams',
      'Video rooms',
      'Priority support',
    ],
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    priceUSD: parseFloat(process.env.PLAN_GOLD_PRICE_USD) || 29.99,
    duration: 30,
    features: [
      'All Premium features',
      'Nearby users map',
      'Ad-free experience',
      'VIP badge',
    ],
  },
};

/**
 * Activate subscription
 */
export async function activateSubscription(userId, planId) {
  try {
    const plan = PLANS[planId];

    if (!plan) {
      throw new Error(`Invalid plan: ${planId}`);
    }

    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.duration);

    // Update user subscription
    await userModel.updateUserSubscription(userId, planId, expiryDate);

    logger.info(`Subscription activated for user ${userId}: ${planId}`);

    return {
      planId,
      expiryDate,
      status: 'active',
    };
  } catch (error) {
    logger.error('Error activating subscription:', error);
    throw error;
  }
}

/**
 * Check expired subscriptions (run daily)
 */
export async function checkExpiredSubscriptions() {
  try {
    const now = new Date();
    let expiredCount = 0;

    // Query users with active subscriptions
    const snapshot = await collections
      .users()
      .where('subscriptionStatus', '==', 'active')
      .get();

    for (const doc of snapshot.docs) {
      const user = doc.data();

      if (user.planExpiry && new Date(user.planExpiry.toDate()) < now) {
        // Subscription has expired
        await userModel.deactivateExpiredSubscription(user.userId);

        // Notify user
        try {
          await bot.telegram.sendMessage(
            user.userId,
            t('subscriptionExpired', user.language || 'en'),
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: t('subscribe', user.language || 'en'),
                      callback_data: 'show_subscription_plans',
                    },
                  ],
                ],
              },
            }
          );
        } catch (notifyError) {
          logger.error(`Failed to notify user ${user.userId} about expiration:`, notifyError);
        }

        expiredCount++;
      }
    }

    logger.info(`Expired ${expiredCount} subscriptions`);
    return expiredCount;
  } catch (error) {
    logger.error('Error checking expired subscriptions:', error);
    throw error;
  }
}

/**
 * Extend subscription (admin function)
 */
export async function extendSubscription(userId, days) {
  try {
    const user = await userModel.getUserById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    let expiryDate;

    if (user.subscriptionStatus === 'active' && user.planExpiry) {
      // Extend from current expiry
      expiryDate = new Date(user.planExpiry.toDate());
      expiryDate.setDate(expiryDate.getDate() + days);
    } else {
      // Create new expiry from now
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);
    }

    await userModel.updateUser(userId, {
      subscriptionStatus: 'active',
      planExpiry: expiryDate,
    });

    logger.info(`Subscription extended for user ${userId} by ${days} days`);

    return { expiryDate };
  } catch (error) {
    logger.error('Error extending subscription:', error);
    throw error;
  }
}

/**
 * Get subscription info
 */
export async function getSubscriptionInfo(userId) {
  try {
    const user = await userModel.getUserById(userId);

    if (!user) {
      return null;
    }

    return {
      status: user.subscriptionStatus,
      planId: user.planId,
      plan: user.planId ? PLANS[user.planId] : null,
      expiryDate: user.planExpiry ? user.planExpiry.toDate() : null,
    };
  } catch (error) {
    logger.error('Error getting subscription info:', error);
    throw error;
  }
}

export default {
  PLANS,
  activateSubscription,
  checkExpiredSubscriptions,
  extendSubscription,
  getSubscriptionInfo,
};
