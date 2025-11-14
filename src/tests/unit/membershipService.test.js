/**
 * Membership Service Tests
 */

import {
  MEMBERSHIP_TIERS,
  SUBSCRIPTION_PLANS,
  getMembershipStatus,
  canAccessFeature,
} from '../../services/membershipService.js';

describe('Membership Service', () => {
  describe('SUBSCRIPTION_PLANS', () => {
    it('should have all required plans', () => {
      expect(SUBSCRIPTION_PLANS.trial_week).toBeDefined();
      expect(SUBSCRIPTION_PLANS.pnp_member).toBeDefined();
      expect(SUBSCRIPTION_PLANS.crystal).toBeDefined();
      expect(SUBSCRIPTION_PLANS.diamond).toBeDefined();
      expect(SUBSCRIPTION_PLANS.lifetime).toBeDefined();
    });

    it('should have valid plan structures', () => {
      Object.values(SUBSCRIPTION_PLANS).forEach(plan => {
        expect(plan).toHaveProperty('id');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('priceUSD');
        expect(plan).toHaveProperty('tier');
        expect(plan).toHaveProperty('durationDays');
        expect(['Free', 'Basic', 'Premium']).toContain(plan.tier);
      });
    });

    it('should have correct pricing', () => {
      expect(SUBSCRIPTION_PLANS.trial_week.priceUSD).toBe(0.99);
      expect(SUBSCRIPTION_PLANS.pnp_member.priceUSD).toBe(9.99);
      expect(SUBSCRIPTION_PLANS.crystal.priceUSD).toBe(24.99);
      expect(SUBSCRIPTION_PLANS.diamond.priceUSD).toBe(69.99);
      expect(SUBSCRIPTION_PLANS.lifetime.priceUSD).toBe(249.99);
    });

    it('should have trial flag set correctly', () => {
      expect(SUBSCRIPTION_PLANS.trial_week.isTrial).toBe(true);
      expect(SUBSCRIPTION_PLANS.pnp_member.isTrial).toBe(false);
    });

    it('should have lifetime flag set correctly', () => {
      expect(SUBSCRIPTION_PLANS.lifetime.isLifetime).toBe(true);
      expect(SUBSCRIPTION_PLANS.pnp_member.isLifetime).toBe(false);
    });
  });

  describe('MEMBERSHIP_TIERS', () => {
    it('should have all tiers', () => {
      expect(MEMBERSHIP_TIERS.FREE).toBe('Free');
      expect(MEMBERSHIP_TIERS.BASIC).toBe('Basic');
      expect(MEMBERSHIP_TIERS.PREMIUM).toBe('Premium');
    });
  });

  describe('canAccessFeature', () => {
    it('should allow free features for all tiers', () => {
      expect(canAccessFeature('Free', 'onboarding')).toBe(true);
      expect(canAccessFeature('Basic', 'onboarding')).toBe(true);
      expect(canAccessFeature('Premium', 'onboarding')).toBe(true);
    });

    it('should restrict basic features to Basic and Premium', () => {
      expect(canAccessFeature('Free', 'radio')).toBe(false);
      expect(canAccessFeature('Basic', 'radio')).toBe(true);
      expect(canAccessFeature('Premium', 'radio')).toBe(true);
    });

    it('should restrict premium features to Premium only', () => {
      expect(canAccessFeature('Free', 'premium_group')).toBe(false);
      expect(canAccessFeature('Basic', 'premium_group')).toBe(false);
      expect(canAccessFeature('Premium', 'premium_group')).toBe(true);
    });
  });
});
