/**
 * Migration Script: Old Subscription System → New Membership System
 *
 * This script migrates existing user subscriptions to the new 3-tier membership system.
 *
 * Run with: node scripts/migrate-to-membership-system.js
 */

import 'dotenv/config';
import { initializeFirebase, collections, getDb } from '../src/config/firebase.js';
import { initializeRedis } from '../src/config/redis.js';
import logger from '../src/utils/logger.js';
import { SUBSCRIPTION_PLANS, MEMBERSHIP_TIERS } from '../src/services/membershipService.js';

/**
 * Plan ID to Tier mapping
 */
const PLAN_TIER_MAP = {
  trial_week: MEMBERSHIP_TIERS.BASIC,
  pnp_member: MEMBERSHIP_TIERS.BASIC,
  crystal: MEMBERSHIP_TIERS.PREMIUM,
  diamond: MEMBERSHIP_TIERS.PREMIUM,
  lifetime: MEMBERSHIP_TIERS.PREMIUM,
  // Legacy plan IDs
  basic: MEMBERSHIP_TIERS.BASIC,
  premium: MEMBERSHIP_TIERS.PREMIUM,
  gold: MEMBERSHIP_TIERS.PREMIUM,
};

/**
 * Main migration function
 */
async function migrateToMembershipSystem() {
  console.log('🚀 Starting migration to new membership system...\n');

  try {
    // Initialize Firebase and Redis
    await initializeFirebase();
    await initializeRedis();

    const stats = {
      total: 0,
      migrated: 0,
      skipped: 0,
      errors: 0,
      byTier: {
        [MEMBERSHIP_TIERS.FREE]: 0,
        [MEMBERSHIP_TIERS.BASIC]: 0,
        [MEMBERSHIP_TIERS.PREMIUM]: 0,
      },
    };

    // Get all users
    const usersSnapshot = await collections.users().get();
    stats.total = usersSnapshot.size;

    console.log(`📊 Found ${stats.total} users to migrate\n`);

    // Process each user
    for (const doc of usersSnapshot.docs) {
      const userId = doc.id;
      const user = doc.data();

      try {
        // Skip if user already has a tier (already migrated)
        if (user.tier) {
          console.log(`⏭️  Skipping user ${userId} - already migrated (tier: ${user.tier})`);
          stats.skipped++;
          continue;
        }

        // Determine tier from existing data
        let tier = MEMBERSHIP_TIERS.FREE;
        let planId = null;
        const now = new Date();

        if (user.subscriptionStatus === 'active' && user.planId) {
          // User has an active subscription
          planId = user.planId;
          tier = PLAN_TIER_MAP[planId] || MEMBERSHIP_TIERS.BASIC;

          // Check if actually expired
          if (user.planExpiry && user.planExpiry.toDate() < now) {
            tier = MEMBERSHIP_TIERS.FREE;
            planId = null;
          }
        }

        // Update user with tier
        await doc.ref.update({
          tier,
          updatedAt: new Date(),
        });

        // Create membership history record
        await collections.membershipHistory().add({
          userId: user.userId,
          action: 'migration',
          tier,
          planId,
          previousTier: null,
          previousPlanId: null,
          expiryDate: user.planExpiry || null,
          triggeredBy: 'migration',
          reason: 'system_migration_v1',
          createdAt: new Date(),
        });

        // Create plan activation record if applicable
        if (tier !== MEMBERSHIP_TIERS.FREE && planId) {
          await collections.planActivations().add({
            userId: user.userId,
            planId,
            tier,
            activatedAt: user.createdAt || new Date(),
            expiryDate: user.planExpiry,
            status: 'active',
            triggeredBy: 'migration',
            paymentId: null,
          });
        }

        stats.byTier[tier]++;
        stats.migrated++;

        console.log(`✅ Migrated user ${userId} → ${tier.toUpperCase()}`);
      } catch (error) {
        stats.errors++;
        console.error(`❌ Error migrating user ${userId}:`, error.message);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Users:      ${stats.total}`);
    console.log(`Migrated:         ${stats.migrated} ✅`);
    console.log(`Already Migrated: ${stats.skipped} ⏭️`);
    console.log(`Errors:           ${stats.errors} ❌`);
    console.log('\nUsers by Tier:');
    console.log(`  Free:     ${stats.byTier[MEMBERSHIP_TIERS.FREE]}`);
    console.log(`  Basic:    ${stats.byTier[MEMBERSHIP_TIERS.BASIC]}`);
    console.log(`  Premium:  ${stats.byTier[MEMBERSHIP_TIERS.PREMIUM]}`);
    console.log('='.repeat(60));

    if (stats.errors > 0) {
      console.log('\n⚠️  Some users failed to migrate. Please review errors above.');
      process.exit(1);
    } else {
      console.log('\n✅ Migration completed successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

/**
 * Rollback migration (revert to old system)
 */
async function rollbackMigration() {
  console.log('⚠️  Starting rollback of membership system migration...\n');

  try {
    await initializeFirebase();
    await initializeRedis();

    const stats = {
      total: 0,
      rolledBack: 0,
      errors: 0,
    };

    // Get all users with tier field
    const usersSnapshot = await collections.users().get();
    stats.total = usersSnapshot.size;

    console.log(`📊 Found ${stats.total} users\n`);

    for (const doc of usersSnapshot.docs) {
      const userId = doc.id;
      const user = doc.data();

      try {
        // Remove tier field
        if (user.tier) {
          await doc.ref.update({
            tier: null,
            updatedAt: new Date(),
          });
          stats.rolledBack++;
          console.log(`✅ Rolled back user ${userId}`);
        }
      } catch (error) {
        stats.errors++;
        console.error(`❌ Error rolling back user ${userId}:`, error.message);
      }
    }

    // Delete migration history
    const historySnapshot = await collections.membershipHistory()
      .where('action', '==', 'migration')
      .get();

    console.log(`\nDeleting ${historySnapshot.size} migration history records...`);

    const batch = getDb().batch();
    historySnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Delete migration activations
    const activationsSnapshot = await collections.planActivations()
      .where('triggeredBy', '==', 'migration')
      .get();

    console.log(`Deleting ${activationsSnapshot.size} migration activation records...`);

    const batch2 = getDb().batch();
    activationsSnapshot.docs.forEach(doc => {
      batch2.delete(doc.ref);
    });
    await batch2.commit();

    console.log('\n' + '='.repeat(60));
    console.log('📊 ROLLBACK SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Users:  ${stats.total}`);
    console.log(`Rolled Back:  ${stats.rolledBack} ✅`);
    console.log(`Errors:       ${stats.errors} ❌`);
    console.log('='.repeat(60));

    if (stats.errors > 0) {
      console.log('\n⚠️  Some users failed to rollback. Please review errors above.');
      process.exit(1);
    } else {
      console.log('\n✅ Rollback completed successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Rollback failed:', error);
    process.exit(1);
  }
}

/**
 * Verify migration (check data integrity)
 */
async function verifyMigration() {
  console.log('🔍 Verifying migration data integrity...\n');

  try {
    await initializeFirebase();
    await initializeRedis();

    const issues = [];

    // Check 1: All users have tier field
    const usersWithoutTier = await collections.users()
      .where('tier', '==', null)
      .get();

    if (!usersWithoutTier.empty) {
      issues.push(`❌ ${usersWithoutTier.size} users missing tier field`);
    } else {
      console.log('✅ All users have tier field');
    }

    // Check 2: Active subscriptions have valid tier
    const activeUsers = await collections.users()
      .where('subscriptionStatus', '==', 'active')
      .get();

    let invalidTiers = 0;
    activeUsers.docs.forEach(doc => {
      const user = doc.data();
      if (user.tier === MEMBERSHIP_TIERS.FREE) {
        invalidTiers++;
      }
    });

    if (invalidTiers > 0) {
      issues.push(`⚠️  ${invalidTiers} active users have FREE tier`);
    } else {
      console.log('✅ All active users have paid tiers');
    }

    // Check 3: History records exist
    const historySnapshot = await collections.membershipHistory()
      .where('action', '==', 'migration')
      .get();

    if (historySnapshot.size === 0) {
      issues.push('❌ No migration history records found');
    } else {
      console.log(`✅ Found ${historySnapshot.size} migration history records`);
    }

    // Check 4: Plan activations match active users
    const activationsSnapshot = await collections.planActivations()
      .where('status', '==', 'active')
      .get();

    console.log(`✅ Found ${activationsSnapshot.size} active plan activations`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🔍 VERIFICATION SUMMARY');
    console.log('='.repeat(60));

    if (issues.length === 0) {
      console.log('✅ All checks passed! Migration data is valid.');
    } else {
      console.log('⚠️  Issues found:');
      issues.forEach(issue => console.log(`  ${issue}`));
    }

    console.log('='.repeat(60));

    process.exit(issues.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
}

/**
 * Main CLI
 */
const command = process.argv[2] || 'migrate';

switch (command) {
  case 'migrate':
    migrateToMembershipSystem();
    break;

  case 'rollback':
    console.log('⚠️  WARNING: This will revert all membership migrations!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    setTimeout(rollbackMigration, 5000);
    break;

  case 'verify':
    verifyMigration();
    break;

  default:
    console.log('Usage: node scripts/migrate-to-membership-system.js [command]');
    console.log('\nCommands:');
    console.log('  migrate  - Migrate to new membership system (default)');
    console.log('  rollback - Rollback migration');
    console.log('  verify   - Verify migration data integrity');
    process.exit(1);
}
