# Admin Panel Rebuild - Implementation Guide

## Project Status: Phase 1 Complete ✅

### Phase 1: Foundation (COMPLETE)
- [x] Modular folder structure
- [x] Callback validation and parsing
- [x] Pagination helper
- [x] Input validation utilities
- [x] Audit logging system
- [x] Error handling framework
- [x] Session management
- [x] Admin guard middleware
- [x] Rate limiting middleware
- [x] Main router with delegation
- [x] Documentation

**Commit**: `71a236b` - "feat: Build modular admin panel foundation with new architecture"

---

## Upcoming: Phase 2-4 Implementation

### Phase 2: Core Modules (Next)

#### Module 1: Dashboard (`src/bot/handlers/admin/modules/dashboard.js`)
**Purpose**: Real-time statistics and metrics
**Features**:
- User count (total, premium, free)
- Revenue summary (last 30 days)
- Activity metrics (last 7 days)
- Quick stats (inline display)
- Performance charts (if supported)

**Implementation Steps**:
```javascript
// 1. Create dashboard.js
export async function handleDashboard(ctx, action, params) {
  switch (action) {
    case 'show':
      await showDashboard(ctx);
      break;
    case 'refresh':
      await showDashboard(ctx, true); // Force refresh
      break;
  }
}

// 2. Implement showDashboard()
// 3. Add caching (5-min TTL)
// 4. Query user stats
// 5. Format message
// 6. Update router
```

**Required queries**:
- `getAllActiveUsers()` - count
- `getUsersBySubscriptionStatus('active')` - premium count
- Filter by createdAt date ranges
- Sum revenue from orders

#### Module 2: Users (`src/bot/handlers/admin/modules/users/`)
**Purpose**: User management and searching
**Files needed**:
- `list.js` - Paginated user list
- `search.js` - Search functionality
- `details.js` - User profile view
- `actions.js` - Ban, unban, message
- `filters.js` - Premium, new, active

**Key Features**:
```javascript
// Paginated list
- Show 10 users per page
- Sort by: name, join date, tier
- Filters: all, premium, new (7d), active (today)

// Search
- By username or ID
- Case-insensitive

// User details
- Profile info
- Subscription status
- Actions: message, ban, unban, extend, modify
```

#### Module 3: Memberships (`src/bot/handlers/admin/modules/memberships/`)
**Purpose**: Subscription management
**Files needed**:
- `activate.js` - Wizard for new activations
- `extend.js` - Extend existing subscriptions
- `modify.js` - Change expiry dates
- `expiring.js` - View expiring soon
- `tiers.js` - Manage subscription tiers

**Activation Wizard Flow**:
```
1. Choose method (single user / bulk CSV)
2. Enter user ID(s)
3. Select plan (with duration preview)
4. Confirm activation details
5. Execute & notify user
6. Log audit trail
```

#### Module 4: Broadcasts (`src/bot/handlers/admin/modules/broadcasts/`)
**Purpose**: Message distribution
**Files needed**:
- `wizard.js` - Creation wizard
- `segments.js` - Audience targeting
- `schedule.js` - Scheduled sends
- `analytics.js` - Delivery stats
- `templates.js` - Message templates

**Broadcast Wizard Steps**:
```
1. Select audience (all, premium, free, by language, custom)
2. Show audience size preview
3. Compose message (text/media)
4. Add optional buttons
5. Preview
6. Confirm & send / schedule for later
7. Show delivery stats
```

#### Module 5: Plans (`src/bot/handlers/admin/modules/plans/`)
**Purpose**: Subscription plan management
**Files needed**:
- `manager.js` - CRUD operations
- `stats.js` - Plan statistics
- `pricing.js` - Price management

**Operations**:
- List all plans
- Create new plan
- Edit plan (price, duration, tier)
- View plan statistics
- Delete plan

#### Module 6: Payments (Optional for Phase 2)
**Purpose**: Payment processing
**Integration with**:
- Kyrrex
- ePayco
- Payment history

#### Module 7: Settings (Optional for Phase 2)
**Purpose**: Configuration
**Features**:
- Menu customization
- Command management
- Notification settings
- Admin management

#### Module 8: Tools (Optional for Phase 2)
**Purpose**: Maintenance utilities
**Features**:
- Run expiration check
- Export users to CSV
- Generate reports
- Cleanup sessions

---

## Architecture Patterns

### Module Structure Template

```javascript
/**
 * Admin Module Template: [Feature Name]
 */

import { Markup } from 'telegraf';
import logger from '../../../../utils/logger.js';
import { getUserLanguage } from '../../../../utils/i18n.js';
import { handleAdminError, AdminError } from '../utils/errorHandler.js';
import { logAdminAction } from '../utils/audit.js';
import { markAdminAction } from '../utils/session.js';

/**
 * Main handler for this module
 */
export async function handleFeature(ctx, action, params) {
  try {
    const lang = getUserLanguage(ctx);

    // Route to specific action handler
    switch (action) {
      case 'list':
        await handleList(ctx, params);
        break;
      case 'view':
        await handleView(ctx, params);
        break;
      case 'create':
        await handleCreate(ctx, params);
        break;
      default:
        throw new AdminError('INVALID_INPUT', `Unknown action: ${action}`);
    }
  } catch (error) {
    logger.error(`Error in feature handler: ${error.message}`);
    await handleAdminError(ctx, error);
  }
}

/**
 * Handle list action
 */
async function handleList(ctx, params) {
  try {
    const lang = getUserLanguage(ctx);
    const page = parseInt(params[0] || '1');

    // Validate input
    if (isNaN(page) || page < 1) {
      throw new AdminError('INVALID_INPUT', 'Invalid page number');
    }

    // Mark action
    markAdminAction(ctx, 'feature:list');

    // Fetch data
    // Build pagination
    // Create message
    // Send with buttons

    await logAdminAction(ctx, 'feature_listed', { page });
  } catch (error) {
    await handleAdminError(ctx, error);
  }
}

// Export all handlers
export default { handleFeature, handleList };
```

### Error Handling Pattern

```javascript
try {
  // Validate input
  if (!valid) {
    throw new AdminError('VALIDATION_ERROR', 'Invalid input', { field });
  }

  // Execute operation
  const result = await operation();

  // Log success
  await logAdminAction(ctx, 'operation_success', { result });

  // Send response
  await ctx.editMessageText('Success!');
} catch (error) {
  if (error instanceof AdminError) {
    await handleAdminError(ctx, error);
  } else {
    logger.error('Unexpected error:', error);
    await handleAdminError(ctx, new AdminError('DATABASE_ERROR'));
  }
}
```

### Pagination Pattern

```javascript
import {
  calculatePagination,
  buildPaginationButtons,
  formatPaginationInfo,
  paginateArray,
} from '../utils/pagination.js';

const pagination = calculatePagination(total, page, perPage);
const items = paginateArray(allItems, page, perPage);
const info = formatPaginationInfo(pagination, lang);

const keyboard = Markup.inlineKeyboard([
  ...itemButtons,
  buildPaginationButtons(page, totalPages, 'admin:feature:list'),
  [Markup.button.callback('Back', 'admin:back:home')],
]);

await ctx.editMessageText(message, { reply_markup: keyboard });
```

### Validation Pattern

```javascript
import {
  validateUserId,
  validateDays,
  validateBroadcastMessage,
} from '../utils/validation.js';

if (!validateUserId(userId)) {
  throw new AdminError('VALIDATION_ERROR', 'Invalid user ID', { userId });
}

if (!validateDays(duration)) {
  throw new AdminError('VALIDATION_ERROR', 'Invalid duration', { duration });
}

if (!validateBroadcastMessage(message)) {
  throw new AdminError('VALIDATION_ERROR', 'Message too long or empty');
}
```

---

## Database Operations

### Querying Users

```javascript
import { getAllActiveUsers, getUsersBySubscriptionStatus } from '../../../../models/userModel.js';

// All active users
const users = await getAllActiveUsers();

// By subscription status
const premium = await getUsersBySubscriptionStatus('active');
const free = await getUsersBySubscriptionStatus('free');

// With pagination
const { offset } = calculatePagination(total, page, perPage);
const paginated = users.slice(offset, offset + perPage);
```

### Updating Users

```javascript
import { updateUser, updateUserSubscription } from '../../../../models/userModel.js';

// Simple update
await updateUser(userId, { isActive: false });

// Subscription update
await updateUserSubscription(userId, planId, expiryDate);
```

### Getting Plans

```javascript
// TODO: Create planModel.js
// import { getPlanById, getAllPlans, createPlan, updatePlan, deletePlan } from '../../../../models/planModel.js';
```

---

## Translation Keys Needed

Add to `src/utils/i18n.js`:

```javascript
// Dashboard
dashboardTitle: '📊 Admin Dashboard',
dashboardStats: 'Total Users: {total}\nPremium: {premium}\nFree: {free}',
dashboardRevenueLabel: '💰 Revenue (30 days)',

// Users
userListTitle: '👥 Users',
userListEmpty: 'No users found',
userSearchPrompt: 'Enter username or user ID:',
userDetailsTitle: '👤 User Profile',
userDetailsFormat: '*{firstName}* (@{username})\nID: {userId}\nJoined: {joinDate}\nStatus: {subscriptionStatus}',

// Memberships
membershipActivateTitle: '💳 Activate Membership',
membershipActivateMethod: 'How do you want to activate?',
membershipActivateSingle: '👤 Single User',
membershipActivateBulk: '📄 Bulk CSV Upload',
membershipExtendTitle: '⏱️ Extend Subscription',
membershipExtendDays: 'How many days?',
membershipExtendOptions: [
  { text: '+7 days', value: 7 },
  { text: '+30 days', value: 30 },
  { text: '+90 days', value: 90 },
  { text: 'Custom days', value: 'custom' },
],

// Broadcasts
broadcastTitle: '📢 New Broadcast',
broadcastAudience: 'Select target audience:',
broadcastMessageTitle: '📝 Compose Message',
broadcastPreviewTitle: '👁️ Preview',
broadcastConfirmFormat: 'Send to {count} users?',
broadcastSentFormat: '✅ Broadcast sent to {count} users',
broadcastSchedulePrompt: 'Send now or schedule?',
broadcastScheduleNow: '📤 Send Now',
broadcastScheduleLater: '⏰ Schedule for Later',

// Plans
planListTitle: '💰 Subscription Plans',
planCreateTitle: '➕ Create New Plan',
planEditTitle: '✏️ Edit Plan',
planDeleteTitle: '🗑️ Delete Plan',
planPriceLabel: 'Price: ${price}',
planDurationLabel: 'Duration: {days} days',

// Tools
toolsExportPrompt: 'Export users as CSV?',
toolsExportSize: 'Exporting {count} users...',
toolsExportComplete: 'Export complete: {filename}',
toolsCleanupPrompt: 'Clean up abandoned sessions?',
toolsCleanupComplete: 'Cleaned up {count} sessions',
```

---

## Testing Strategy

### Unit Tests (Priority)
```bash
tests/admin/utils/
├── callbacks.test.js          # Callback parsing
├── validation.test.js         # Input validation
├── pagination.test.js         # Pagination math
├── errorHandler.test.js       # Error creation
└── session.test.js            # Session management
```

### Integration Tests
```bash
tests/admin/integration/
├── dashboard.test.js          # Dashboard workflow
├── users.test.js              # User management
├── memberships.test.js        # Membership activation
├── broadcasts.test.js         # Broadcasting
└── admin.e2e.test.js          # End-to-end
```

### Test Template
```javascript
import { parseCallback, buildCallback } from '../src/bot/handlers/admin/utils/callbacks.js';

describe('Callback Parsing', () => {
  it('should parse valid callback', () => {
    const result = parseCallback('admin:users:view:12345');
    expect(result.section).toBe('users');
    expect(result.action).toBe('view');
    expect(result.params).toEqual(['12345']);
  });

  it('should reject invalid namespace', () => {
    expect(() => parseCallback('user:view:12345')).toThrow('Invalid namespace');
  });

  it('should build valid callback', () => {
    const callback = buildCallback('users', 'view', '12345');
    expect(callback).toBe('admin:users:view:12345');
  });

  it('should reject too long callback', () => {
    const longParam = 'a'.repeat(100);
    expect(() => buildCallback('users', 'view', longParam)).toThrow();
  });
});
```

---

## Performance Targets

| Operation | Target | Current |
|-----------|--------|---------|
| Dashboard load | < 2s | TBD |
| User list (page) | < 1s | TBD |
| User search | < 500ms | TBD |
| Broadcast confirm | < 500ms | TBD |
| Callback processing | < 100ms | TBD |

### Optimization Techniques

1. **Database Queries**
   - Use indexes on frequently queried fields
   - Limit result sets with `.limit()`
   - Use `.select()` to get only needed fields

2. **Caching**
   - Dashboard metrics: 5-min cache
   - User counts: 1-min cache
   - Plans list: 10-min cache
   - User profiles: 2-min cache (invalidate on update)

3. **Pagination**
   - Max 100 items per page
   - Offset-based for accuracy
   - Show page count

4. **Async Operations**
   - Queue broadcasts for background processing
   - Batch user operations
   - Use Promise.all() for parallel queries

---

## Security Checklist

- [x] Admin access guard
- [x] Rate limiting
- [x] Input validation
- [x] Session timeout (15 min)
- [x] Audit logging
- [ ] CSRF protection (if applicable)
- [ ] XSS prevention (handled by Telegraf)
- [ ] SQL injection prevention (Firestore is not SQL)
- [ ] Permission system (role-based)
- [ ] Encrypted sensitive data

---

## Rollout Plan

### Week 1: Core Modules
- Dashboard
- Users (list, search, details)
- Memberships (activate, extend)

### Week 2: Advanced Features
- Broadcasts (wizard, schedule)
- Plans management
- Settings

### Week 3: Polish & Testing
- Unit tests
- Integration tests
- Performance testing
- Bug fixes

### Week 4: Deployment
- Staging deployment
- Admin training
- Gradual rollout
- Monitoring

---

## Quick Reference: Common Operations

### Add New Admin Feature

1. Create module in `modules/featurename.js`
2. Implement `handleFeature()` function
3. Register in `router.js` routes map
4. Add i18n keys to `utils/i18n.js`
5. Update main admin panel menu in `router.js`
6. Test with `/admin` command

### Handle Callback

```javascript
// In your module
const { section, action, params } = parseCallback(data);
// section = 'feature'
// action = 'list'
// params = ['1', 'filter']
```

### Validate User Input

```javascript
import { validateUserId, AdminError } from '../utils';

if (!validateUserId(userId)) {
  throw new AdminError('VALIDATION_ERROR', 'Invalid user ID');
}
```

### Send Paginated List

```javascript
const { currentPage, totalPages } = calculatePagination(total, page, 10);
const items = paginateArray(allItems, page, 10);

const keyboard = Markup.inlineKeyboard([
  ...itemButtons,
  ...buildPaginationButtons(currentPage, totalPages, 'admin:feature:list'),
]);
```

### Log Admin Action

```javascript
import { logAdminAction } from '../utils/audit.js';

await logAdminAction(ctx, 'user_activated', {
  userId,
  planId,
  duration,
});
```

---

## File Sizes (Before/After)

| File | Before | After |
|------|--------|-------|
| Total Admin Code | ~5,000 lines | ~2,000 lines |
| adminHandler.js | 282 lines | 14 lines |
| utils/ | 0 | ~1,200 lines |
| Modules | 0 | ~1,000 lines (to implement) |

**Improvement**: Better organization, reusable components, easier maintenance

---

## Next Steps

1. **Implement Dashboard Module** (`modules/dashboard.js`)
   - Fetch user statistics
   - Query Firestore for counts
   - Implement caching
   - Add refresh button

2. **Implement Users Module** (`modules/users/`)
   - List with pagination
   - Search functionality
   - User details view
   - Action buttons

3. **Implement Memberships Module** (`modules/memberships/`)
   - Activation wizard
   - Extension functionality
   - Manual expiry modification
   - Bulk CSV support

4. **Add Comprehensive Tests**
   - Unit tests for all utilities
   - Integration tests for workflows
   - Performance benchmarks

5. **Prepare Migration**
   - Support old callback patterns
   - Gradual rollout strategy
   - Fallback mechanisms

---

**Last Updated**: November 2024
**Version**: 2.0.0 (Foundation phase)
**Status**: Ready for module development
