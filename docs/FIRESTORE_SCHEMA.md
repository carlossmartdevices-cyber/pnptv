# Firestore Schema Documentation

## Collections Overview

This document describes the Firestore database schema for the PNPtv Telegram bot membership system.

---

## 1. `users` Collection

**Purpose**: Store user profiles and membership data

### Document Structure

```typescript
{
  userId: number,              // Telegram user ID (primary key)
  username: string | null,     // Telegram username
  firstName: string | null,    // User's first name
  lastName: string | null,     // User's last name
  language: string,            // 'en' | 'es'

  // Onboarding
  age18Plus: boolean,
  termsAccepted: boolean,
  email: string | null,
  onboardingCompleted: boolean,

  // Profile
  bio: string | null,
  photoUrl: string | null,
  location: {
    latitude: number,
    longitude: number
  } | null,
  interests: string[],

  // Membership (NEW)
  tier: string,                // 'free' | 'basic' | 'premium'
  planId: string | null,       // Current plan ID
  planExpiry: Timestamp | null,
  subscriptionStatus: string,  // 'active' | 'expired' | 'cancelled' | 'error'

  // Privacy
  privacySettings: {
    showProfile: boolean,
    showOnline: boolean,
    allowMessages: boolean
  },

  // Meta
  isActive: boolean,
  isAdmin: boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Indexes Required

1. **Expiration Query**
   ```
   subscriptionStatus (ASC) + planExpiry (ASC)
   ```
   - Used by cron to find expired memberships

2. **Tier Query**
   ```
   tier (ASC) + subscriptionStatus (ASC)
   ```
   - Used for analytics and admin filtering

3. **Language Query**
   ```
   language (ASC) + subscriptionStatus (ASC)
   ```
   - Used for targeted broadcasts

---

## 2. `membership_history` Collection (NEW)

**Purpose**: Complete audit trail of all membership changes

### Document Structure

```typescript
{
  userId: number,              // User ID
  action: string,              // 'activation' | 'deactivation' | 'extension' | 'upgrade' | 'downgrade'

  // Current state after action
  tier: string,                // New tier
  planId: string | null,       // New plan ID
  planName: string | null,     // Plan display name

  // Previous state (for tracking changes)
  previousTier: string | null,
  previousPlanId: string | null,
  previousExpiry: Timestamp | null,

  // New state
  expiryDate: Timestamp | null,
  newExpiry: Timestamp | null, // For extensions
  daysAdded: number | null,    // For extensions

  // Metadata
  triggeredBy: string,         // User ID or 'system' or 'admin'
  reason: string,              // 'plan_purchase' | 'expired' | 'admin_extension' | etc.
  paymentId: string | null,    // Associated payment ID

  createdAt: Timestamp
}
```

### Indexes Required

1. **User History**
   ```
   userId (ASC) + createdAt (DESC)
   ```
   - Get all history for a user

2. **Action Timeline**
   ```
   action (ASC) + createdAt (DESC)
   ```
   - Admin analytics by action type

### Query Examples

```javascript
// Get user's membership history
await collections.membershipHistory()
  .where('userId', '==', userId)
  .orderBy('createdAt', 'desc')
  .limit(50)
  .get();

// Get all activations in last 30 days
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

await collections.membershipHistory()
  .where('action', '==', 'activation')
  .where('createdAt', '>', thirtyDaysAgo)
  .get();
```

---

## 3. `plan_activations` Collection (NEW)

**Purpose**: Track active plan subscriptions for analytics

### Document Structure

```typescript
{
  userId: number,
  planId: string,              // Plan ID
  tier: string,                // Tier level

  // Activation details
  activatedAt: Timestamp,
  expiryDate: Timestamp,
  status: string,              // 'active' | 'deactivated' | 'expired'

  // Deactivation (if applicable)
  deactivatedAt: Timestamp | null,
  deactivationReason: string | null,

  // Metadata
  triggeredBy: string,         // Who activated
  paymentId: string | null     // Associated payment
}
```

### Indexes Required

1. **User Activations**
   ```
   userId (ASC) + status (ASC)
   ```
   - Get user's active plans

2. **Active Plans by Expiry**
   ```
   status (ASC) + expiryDate (ASC)
   ```
   - Find plans expiring soon

3. **Plan Analytics**
   ```
   planId (ASC) + activatedAt (DESC)
   ```
   - Track plan popularity over time

### Query Examples

```javascript
// Get all active plan activations
await collections.planActivations()
  .where('status', '==', 'active')
  .get();

// Get user's current activation
await collections.planActivations()
  .where('userId', '==', userId)
  .where('status', '==', 'active')
  .limit(1)
  .get();

// Get plans expiring in next 7 days
const sevenDaysFromNow = new Date();
sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

await collections.planActivations()
  .where('status', '==', 'active')
  .where('expiryDate', '>', new Date())
  .where('expiryDate', '<', sevenDaysFromNow)
  .get();
```

---

## 4. `invite_links` Collection (NEW)

**Purpose**: Manage Premium tier invite links

### Document Structure

```typescript
{
  code: string,                // Unique invite code (e.g., "INV-123-1234567890-ABC")
  userId: number,              // Owner user ID

  // Validity
  createdAt: Timestamp,
  expiresAt: Timestamp,        // Links expire with user's membership
  status: string,              // 'active' | 'deactivated' | 'expired'

  // Usage tracking
  maxUses: number,             // Max number of uses (e.g., 5)
  currentUses: number,         // Current usage count
  usedBy: number[],            // Array of user IDs who used this link

  // Deactivation
  deactivatedAt: Timestamp | null,
  deactivationReason: string | null
}
```

### Indexes Required

1. **User's Invite Links**
   ```
   userId (ASC) + status (ASC)
   ```
   - Get user's active invite links

2. **Expiring Links**
   ```
   status (ASC) + expiresAt (ASC)
   ```
   - Find and clean up expired links

### Query Examples

```javascript
// Get user's active invite links
await collections.inviteLinks()
  .where('userId', '==', userId)
  .where('status', '==', 'active')
  .get();

// Validate invite code
const inviteDoc = await collections.inviteLinks()
  .doc(inviteCode)
  .get();

if (inviteDoc.exists) {
  const invite = inviteDoc.data();
  const isValid = invite.status === 'active'
    && invite.currentUses < invite.maxUses
    && invite.expiresAt.toDate() > new Date();
}
```

---

## 5. `plans` Collection

**Purpose**: Store subscription plan definitions (can override defaults)

### Document Structure

```typescript
{
  id: string,                  // Plan ID (e.g., 'trial_week')
  name: string,                // Display name
  tier: string,                // Associated tier

  // Pricing
  priceUSD: number,
  durationDays: number,

  // Details
  description: string,
  features: string[],

  // Status
  isActive: boolean,

  // Meta
  createdAt: Timestamp,
  updatedAt: Timestamp,
  deactivatedAt: Timestamp | null
}
```

### Default Plans

```javascript
{
  trial_week: {
    name: "Trial Week",
    tier: "basic",
    priceUSD: 14.99,
    durationDays: 7
  },
  pnp_member: {
    name: "PNP Member",
    tier: "basic",
    priceUSD: 24.99,
    durationDays: 30
  },
  crystal: {
    name: "Crystal",
    tier: "premium",
    priceUSD: 49.99,
    durationDays: 30
  },
  diamond: {
    name: "Diamond",
    tier: "premium",
    priceUSD: 99.99,
    durationDays: 90
  },
  lifetime: {
    name: "Lifetime",
    tier: "premium",
    priceUSD: 249.99,
    durationDays: 36500
  }
}
```

---

## 6. `payments` Collection (Existing)

**Purpose**: Track payment transactions

### Document Structure

```typescript
{
  paymentId: string,
  userId: number,
  planId: string,

  // Amount
  amount: number,
  currency: string,            // 'USD' | 'USDC'

  // Gateway
  gateway: string,             // 'daimo' | 'epayco'
  transactionId: string | null,

  // Status
  status: string,              // 'pending' | 'confirmed' | 'failed'

  // Meta
  createdAt: Timestamp,
  updatedAt: Timestamp,
  confirmedAt: Timestamp | null
}
```

---

## Security Rules

### Basic Security Rules Template

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Membership history (read-only for users, write for system)
    match /membership_history/{historyId} {
      allow read: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow write: if false; // Only system can write
    }

    // Plan activations (read-only for users)
    match /plan_activations/{activationId} {
      allow read: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow write: if false; // Only system can write
    }

    // Invite links (users can read their own)
    match /invite_links/{code} {
      allow read: if request.auth != null;
      allow write: if false; // Only system can write
    }

    // Plans (read-only for all)
    match /plans/{planId} {
      allow read: if true;
      allow write: if false; // Only admin via backend
    }

    // Payments (read own only)
    match /payments/{paymentId} {
      allow read: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow write: if false; // Only system can write
    }
  }
}
```

---

## Migration Strategy

### Step 1: Create New Collections

```bash
# Deploy indexes
firebase deploy --only firestore:indexes
```

### Step 2: Add New Fields to Users Collection

```javascript
// Migration script
const users = await collections.users().get();

for (const doc of users.docs) {
  await doc.ref.update({
    tier: 'free', // Default all users to free tier
    // Keep existing planId and planExpiry
  });
}
```

### Step 3: Backfill Membership History

```javascript
// For existing active subscriptions, create activation records
const activeUsers = await collections.users()
  .where('subscriptionStatus', '==', 'active')
  .get();

for (const doc of activeUsers.docs) {
  const user = doc.data();

  // Create membership history record
  await collections.membershipHistory().add({
    userId: user.userId,
    action: 'activation',
    tier: user.tier || 'basic', // Infer from existing data
    planId: user.planId,
    previousTier: 'free',
    expiryDate: user.planExpiry,
    triggeredBy: 'migration',
    reason: 'backfill',
    createdAt: user.createdAt || new Date(),
  });

  // Create plan activation record
  await collections.planActivations().add({
    userId: user.userId,
    planId: user.planId,
    tier: user.tier || 'basic',
    activatedAt: user.createdAt || new Date(),
    expiryDate: user.planExpiry,
    status: 'active',
    triggeredBy: 'migration',
  });
}
```

---

## Backup and Restore

### Export Data

```bash
# Export all collections
gcloud firestore export gs://pnptv-backups/$(date +%Y%m%d)

# Export specific collections
gcloud firestore export gs://pnptv-backups/$(date +%Y%m%d) \
  --collection-ids=users,membership_history,plan_activations
```

### Import Data

```bash
gcloud firestore import gs://pnptv-backups/20250114
```

---

## Monitoring Queries

### Check Database Health

```javascript
// Count active memberships by tier
const activeUsers = await collections.users()
  .where('subscriptionStatus', '==', 'active')
  .get();

const tierCounts = {};
activeUsers.docs.forEach(doc => {
  const tier = doc.data().tier;
  tierCounts[tier] = (tierCounts[tier] || 0) + 1;
});

// Check for orphaned records
const activations = await collections.planActivations()
  .where('status', '==', 'active')
  .get();

const userActivations = {};
activations.docs.forEach(doc => {
  const userId = doc.data().userId;
  userActivations[userId] = (userActivations[userId] || 0) + 1;
});

// Users with multiple active plans (should be 0 or 1)
const duplicates = Object.entries(userActivations)
  .filter(([_, count]) => count > 1);
```

---

## Cost Optimization

### Read Optimization

1. **Use caching** for frequently accessed data (plans, user status)
2. **Limit queries** to necessary fields only
3. **Use composite indexes** to avoid multiple queries

### Write Optimization

1. **Batch operations** where possible
2. **Update only changed fields**
3. **Clean up old history** periodically (keep last 6 months)

### Storage Optimization

```javascript
// Archive old membership history (>6 months)
const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

const oldHistory = await collections.membershipHistory()
  .where('createdAt', '<', sixMonthsAgo)
  .get();

// Move to archive collection or export to Cloud Storage
```

---

## Testing Queries

See `src/tests/firestore/schema.test.js` for comprehensive query tests.

---

## References

- [Firestore Data Model](https://firebase.google.com/docs/firestore/data-model)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Composite Indexes](https://firebase.google.com/docs/firestore/query-data/index-overview)
