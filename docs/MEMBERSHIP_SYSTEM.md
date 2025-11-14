# Membership Management System Documentation

## Overview

The PNPtv Membership System is a production-ready, 3-tier subscription management system with:

- **Transaction-safe operations** using Firestore atomic transactions
- **Automated expiration** with daily batch processing
- **Complete audit trail** for all membership changes
- **Invite link generation** for Premium tier users
- **Fail-safe defaults** to prevent data corruption
- **Comprehensive notifications** for warnings, reminders, and confirmations

---

## Architecture

### 3-Tier System

**Tiers** = Permission Levels (What users can access)

| Tier | Description | Channel Access | Invite Links |
|------|-------------|----------------|--------------|
| **Free** | Default tier | Free channel only | ❌ |
| **Basic** | Premium channel access | Free + Premium channel | ❌ |
| **Premium** | Full access + invite links | All channels | ✅ (Unlimited) |

### 5 Subscription Plans

**Plans** = Payment Wrappers (How users pay for tiers)

| Plan ID | Name | Tier | Price | Duration | Description |
|---------|------|------|-------|----------|-------------|
| `trial_week` | Trial Week | Basic | $14.99 | 7 days | Try premium channel |
| `pnp_member` | PNP Member | Basic | $24.99 | 30 days | Monthly premium channel |
| `crystal` | Crystal | Premium | $49.99 | 30 days | Monthly full access |
| `diamond` | Diamond | Premium | $99.99 | 90 days | Quarterly (40% savings) |
| `lifetime` | Lifetime | Premium | $249.99 | 100 years | One-time purchase |

---

## Core Files

### Services

1. **membershipService.js** (src/services/)
   - `activateMembership()` - Transaction-safe activation
   - `deactivateMembership()` - Safe downgrade to Free
   - `getMembershipStatus()` - Check current status
   - `extendMembership()` - Add days to existing membership
   - `batchExpireMemberships()` - Daily batch expiration (cron)
   - `getExpiringMemberships()` - Find expiring soon (for notifications)

2. **planService.js** (src/services/)
   - `getAllPlans()` - Get all plans with caching
   - `getPlanById()` - Get single plan
   - `getRecommendedPlan()` - AI recommendations
   - `getPlanAnalytics()` - Revenue and conversion stats
   - `syncDefaultPlansToFirestore()` - One-time setup

3. **membershipNotificationService.js** (src/services/)
   - `sendActivationConfirmation()` - Welcome message
   - `sendExpirationWarnings()` - 7 days before expiry
   - `sendExpirationReminders()` - 1 day before expiry
   - `sendDowngradeNotification()` - After expiration
   - `cleanupExpiredInviteLinks()` - Weekly cleanup (cron)

### Handlers

4. **membershipAdminHandler.js** (src/bot/handlers/admin/)
   - `/admin_membership` command
   - Activate/deactivate memberships
   - Extend memberships
   - View analytics
   - Audit log viewer
   - Bulk operations

### Cron Jobs

5. **cron.js** (src/utils/)
   - **Daily 2 AM UTC**: Batch expire memberships
   - **Daily 10 AM UTC**: Send expiration warnings (7 days)
   - **Daily 6 PM UTC**: Send expiration reminders (1 day)
   - **Weekly Sunday 3 AM UTC**: Cleanup expired invite links

### Database Schema

6. **Firestore Collections**:
   - `users` - User profiles with tier field
   - `membership_history` - Complete audit trail
   - `plan_activations` - Active subscriptions tracker
   - `invite_links` - Premium tier invite codes
   - `plans` - Plan definitions (optional, defaults to code)

See **FIRESTORE_SCHEMA.md** for detailed schema documentation.

---

## Usage

### For Developers

#### Activate a Membership

```javascript
import { activateMembership } from './src/services/membershipService.js';

const result = await activateMembership(userId, 'crystal', {
  triggeredBy: adminId,
  reason: 'payment_confirmed',
  paymentId: 'pay_12345',
});

// Returns:
// {
//   success: true,
//   tier: 'premium',
//   planId: 'crystal',
//   planName: 'Crystal',
//   expiryDate: Date,
//   inviteLink: 'INV-123-...',  // Only for Premium tier
//   features: [...]
// }
```

#### Check Membership Status

```javascript
import { getMembershipStatus } from './src/services/membershipService.js';

const status = await getMembershipStatus(userId);

// Returns:
// {
//   tier: 'premium',
//   planId: 'crystal',
//   planName: 'Crystal',
//   status: 'active',
//   expiryDate: Date,
//   daysRemaining: 25,
//   isExpired: false,
//   features: {...},
//   permissions: {
//     canAccessPremiumChannel: true,
//     canGenerateInvites: true,
//     maxInvites: -1  // Unlimited
//   }
// }
```

#### Check Feature Access

```javascript
import { canAccessFeature } from './src/services/planService.js';

const canAccess = canAccessFeature(user.tier, 'premiumChannel');
// Returns: true/false

// Available features:
// - premiumChannel
// - inviteLinks
// - liveStreams
// - videoRooms
// - nearbyUsers
// - adFree
```

#### Extend Membership (Admin)

```javascript
import { extendMembership } from './src/services/membershipService.js';

const result = await extendMembership(userId, 30, adminId);

// Returns:
// {
//   success: true,
//   expiryDate: Date,
//   daysAdded: 30
// }
```

### For Admins

#### Admin Commands

- `/admin_membership` - Open admin panel
- Activate membership wizard
- Deactivate membership
- Extend membership
- View user membership details
- View analytics dashboard
- View audit log
- Sync plans to Firestore

#### Admin Panel Features

1. **Activate Membership**
   - Format: `userId planId`
   - Example: `123456789 crystal`
   - Validates plan ID
   - Generates invite link for Premium
   - Creates full audit trail

2. **Deactivate Membership**
   - Format: `userId reason`
   - Example: `123456789 violation`
   - Downgrades to Free tier
   - Deactivates all invite links
   - Notifies user

3. **Extend Membership**
   - Format: `userId days`
   - Example: `123456789 30`
   - Extends current expiry date
   - Creates history record

4. **View Analytics**
   - User distribution by tier
   - Plan activation counts
   - Revenue by plan
   - Conversion rate

---

## Migration

### Migrating from Old System

Run the migration script:

```bash
# Migrate all users
node scripts/migrate-to-membership-system.js migrate

# Verify migration
node scripts/migrate-to-membership-system.js verify

# Rollback if needed
node scripts/migrate-to-membership-system.js rollback
```

### What the Migration Does

1. **Adds `tier` field to all users**
   - Active subscriptions → Mapped to tier (Basic/Premium)
   - Expired/no subscription → Free tier

2. **Creates membership history**
   - One record per user documenting migration

3. **Creates plan activations**
   - For all currently active subscriptions

4. **No data loss**
   - All existing fields preserved
   - Backward compatible

### Plan-to-Tier Mapping

```
trial_week  → Basic
pnp_member  → Basic
crystal     → Premium
diamond     → Premium
lifetime    → Premium

# Legacy plans
basic       → Basic
premium     → Premium
gold        → Premium
```

---

## Automated Jobs

### Daily Expiration (2 AM UTC)

```javascript
// Processes up to 1000 expired memberships
const result = await batchExpireMemberships(1000);

// Returns:
// {
//   total: 150,
//   processed: 150,
//   errors: 0,
//   errorDetails: []
// }
```

### Expiration Warnings (10 AM UTC)

```javascript
// Notifies users 7 days before expiry
const users = await getExpiringMemberships(7);
const result = await sendExpirationWarnings(users);

// Returns:
// {
//   total: 42,
//   sent: 42,
//   failed: 0
// }
```

### Expiration Reminders (6 PM UTC)

```javascript
// Notifies users 1 day before expiry
const users = await getExpiringMemberships(1);
const result = await sendExpirationReminders(users);
```

### Invite Links Cleanup (Weekly Sunday 3 AM UTC)

```javascript
// Deactivates expired invite links
const result = await cleanupExpiredInviteLinks();

// Returns:
// {
//   total: 25,
//   cleaned: 25
// }
```

---

## Firestore Indexes

Deploy required indexes:

```bash
firebase deploy --only firestore:indexes
```

Required indexes (see `firestore.indexes.json`):

1. `users`: `subscriptionStatus` + `planExpiry`
2. `users`: `tier` + `subscriptionStatus`
3. `membership_history`: `userId` + `createdAt`
4. `plan_activations`: `userId` + `status`
5. `plan_activations`: `status` + `expiryDate`
6. `invite_links`: `userId` + `status`

---

## Security

### Firestore Rules

See `firestore.rules` for complete rules.

Key rules:
- Users can read their own data
- Only system (backend) can write membership data
- Admins can read all data
- Invite links are publicly readable (for validation)

### Transaction Safety

All membership operations use Firestore transactions to ensure:

- **Atomicity**: All-or-nothing updates
- **Consistency**: Data integrity maintained
- **Isolation**: No race conditions
- **Durability**: Changes persist

Example:

```javascript
const result = await db.runTransaction(async (transaction) => {
  // 1. Read current user state
  const userDoc = await transaction.get(userRef);

  // 2. Update user tier
  transaction.update(userRef, { tier, planExpiry, ... });

  // 3. Create history record
  transaction.set(historyRef, { ... });

  // 4. Create activation record
  transaction.set(activationRef, { ... });

  // All succeed or all fail - no partial updates
});
```

### Fail-Safe Defaults

If any error occurs:

```javascript
try {
  await activateMembership(...);
} catch (error) {
  // Automatically set user to Free tier
  await collections.users().doc(userId).update({
    tier: MEMBERSHIP_TIERS.FREE,
    subscriptionStatus: 'error'
  });
}
```

This ensures users never lose access due to system errors.

---

## Monitoring

### Check Database Health

```javascript
import { getPlanStatistics } from './src/services/membershipService.js';

const stats = await getPlanStatistics();

// Returns:
// {
//   total: 1500,
//   active: 245,
//   expired: 89,
//   byTier: {
//     free: 1166,
//     basic: 123,
//     premium: 122
//   },
//   byPlan: {
//     crystal: 65,
//     diamond: 42,
//     pnp_member: 123,
//     ...
//   }
// }
```

### Revenue Analytics

```javascript
import { getPlanAnalytics } from './src/services/planService.js';

const analytics = await getPlanAnalytics();

// Returns:
// {
//   totalActivePlans: 245,
//   byPlan: { crystal: 65, ... },
//   byTier: { basic: 123, premium: 122 },
//   revenue: {
//     total: 12247.50,
//     byPlan: {
//       crystal: 3249.35,
//       ...
//     }
//   },
//   conversion: {
//     totalUsers: 1500,
//     paidUsers: 245,
//     conversionRate: '16.33%'
//   }
// }
```

### Audit Logs

```javascript
import { getMembershipHistory } from './src/services/membershipService.js';

const history = await getMembershipHistory(userId, 50);

// Returns array of:
// [
//   {
//     id: 'abc123',
//     userId: 123456789,
//     action: 'activation',
//     tier: 'premium',
//     planId: 'crystal',
//     previousTier: 'free',
//     triggeredBy: 'system',
//     reason: 'payment_confirmed',
//     createdAt: Date
//   },
//   ...
// ]
```

---

## Testing

### Manual Testing

1. **Activate a membership:**
   ```
   /admin_membership → Activate → Enter: userId planId
   ```

2. **Check status:**
   ```javascript
   const status = await getMembershipStatus(userId);
   console.log(status);
   ```

3. **Verify in Firestore:**
   - Check `users/{userId}` has `tier` field
   - Check `membership_history` has activation record
   - Check `plan_activations` has active record

### Test Expiration

```javascript
// Activate with short duration for testing
await activateMembership(testUserId, 'trial_week');

// Manually trigger expiration check
await batchExpireMemberships(10);
```

### Test Notifications

```javascript
// Get users expiring soon
const users = await getExpiringMemberships(7);

// Send test warning
await sendExpirationWarnings(users.slice(0, 1));
```

---

## Troubleshooting

### User has wrong tier

```javascript
// Check audit log
const history = await getMembershipHistory(userId);
console.log(history);

// Manually fix if needed
await activateMembership(userId, correctPlanId, {
  triggeredBy: 'admin',
  reason: 'manual_correction'
});
```

### Expired membership not processed

```bash
# Check cron logs
tail -f logs/combined-*.log | grep "batch expiration"

# Manually trigger
node -e "
import { batchExpireMemberships } from './src/services/membershipService.js';
await batchExpireMemberships();
"
```

### Invite link not working

```javascript
// Check invite link status
const inviteDoc = await collections.inviteLinks().doc(inviteCode).get();
console.log(inviteDoc.data());

// Valid invite must have:
// - status: 'active'
// - currentUses < maxUses
// - expiresAt > now
```

---

## Best Practices

1. **Always use service functions** - Never directly update Firestore
   ```javascript
   // ✅ GOOD
   await activateMembership(userId, planId);

   // ❌ BAD
   await collections.users().doc(userId).update({ tier: 'premium' });
   ```

2. **Check permissions before granting access**
   ```javascript
   const status = await getMembershipStatus(userId);
   if (!status.permissions.canAccessPremiumChannel) {
     return ctx.reply(t('notSubscribed', lang));
   }
   ```

3. **Use fail-safe defaults**
   ```javascript
   const tier = user.tier || MEMBERSHIP_TIERS.FREE;
   ```

4. **Log all admin actions**
   ```javascript
   logger.info(`Admin ${adminId} activated membership for ${userId}: ${planId}`);
   ```

5. **Invalidate cache after updates**
   ```javascript
   await cache.del(cacheKeys.user(userId));
   await cache.del(`membership:${userId}`);
   ```

---

## API Reference

See individual service files for complete JSDoc documentation:

- `src/services/membershipService.js`
- `src/services/planService.js`
- `src/services/membershipNotificationService.js`

---

## Support

For issues or questions:

1. Check logs: `tail -f logs/combined-*.log`
2. Verify Firestore indexes: Firebase Console → Firestore → Indexes
3. Run migration verification: `node scripts/migrate-to-membership-system.js verify`
4. Contact development team

---

## Changelog

### v1.0.0 (2025-01-14)

- Initial release
- 3-tier membership system
- 5 subscription plans
- Transaction-safe operations
- Automated expiration
- Invite link system
- Complete audit trail
- Admin management interface
- Migration scripts
- Comprehensive documentation
