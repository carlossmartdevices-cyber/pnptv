# Admin Panel System - Modular Architecture

## Overview

The rebuilt admin panel provides a modular, maintainable system for managing PNPtv bot administration. It replaces a monolithic 5,000+ line file with organized, single-responsibility modules.

### Key Improvements

- **Modular Architecture**: 12+ focused modules instead of one massive file
- **Consistent UI**: Standardized callback patterns and menu layouts
- **Performance**: Pagination, caching, and efficient queries
- **Security**: Audit logging, input validation, rate limiting
- **Internationalization**: Full EN/ES support throughout
- **Error Handling**: Consistent, user-friendly error messages

## Directory Structure

```
src/bot/handlers/admin/
├── index.js                        # Entry point, middleware registration
├── router.js                       # Main routing logic
├── adminHandler.js                 # Legacy adapter (backward compatibility)
│
├── middleware/
│   ├── adminGuard.js              # Admin access control
│   └── rateLimiter.js             # Rate limiting for actions
│
├── utils/
│   ├── index.js                   # Utility exports
│   ├── callbacks.js               # Callback parsing & validation
│   ├── pagination.js              # Pagination helpers
│   ├── validation.js              # Input validation
│   ├── errorHandler.js            # Error handling & responses
│   ├── audit.js                   # Action logging
│   └── session.js                 # Session management
│
├── modules/                        # (To be implemented)
│   ├── dashboard.js               # Statistics & analytics
│   ├── users/                     # User management
│   │   ├── list.js
│   │   ├── search.js
│   │   ├── details.js
│   │   ├── actions.js
│   │   └── filters.js
│   ├── memberships/               # Membership activation
│   │   ├── activate.js
│   │   ├── extend.js
│   │   ├── modify.js
│   │   ├── expiring.js
│   │   └── tiers.js
│   ├── broadcasts/                # Broadcasting
│   │   ├── wizard.js
│   │   ├── segments.js
│   │   ├── schedule.js
│   │   ├── analytics.js
│   │   └── templates.js
│   ├── plans/                     # Plan management
│   │   ├── manager.js
│   │   ├── stats.js
│   │   └── pricing.js
│   ├── payments/                  # Payment management
│   │   ├── kyrrex.js
│   │   ├── pending.js
│   │   └── confirmations.js
│   ├── settings/                  # Configuration
│   │   ├── menus.js
│   │   ├── commands.js
│   │   └── notifications.js
│   └── tools/                     # Admin tools
│       ├── expiration.js
│       ├── export.js
│       └── cleanup.js
└── README.md                       # This file
```

## Callback Pattern

All admin callbacks follow a standardized pattern:

```
admin:section:action:param1:param2...
```

### Format Rules

- **Namespace**: Always `admin:`
- **Section**: Logical grouping (users, memberships, broadcasts, etc.)
- **Action**: Specific operation (list, create, edit, delete, etc.)
- **Params**: Up to 5 parameters (must fit within 64-byte Telegram limit)

### Examples

```javascript
// Valid callbacks
admin:dashboard:show
admin:users:list:1
admin:users:view:12345
admin:memberships:activate:single
admin:memberships:confirm:user-id:plan-id
admin:broadcasts:wizard:audience:premium
admin:plans:edit:plan-id:price

// Invalid (rejected)
admin:invalid:section
admin:users:list:param1:param2:param3:param4:param5:param6  // Too many params
user:something:else  // Wrong namespace
```

## Utility Modules

### Callbacks (`utils/callbacks.js`)

**Parse callback data safely**:
```javascript
import { parseCallback } from './utils/callbacks.js';

const { section, action, params } = parseCallback('admin:users:view:12345');
// { section: 'users', action: 'view', params: ['12345'] }
```

**Build callback safely**:
```javascript
import { buildCallback } from './utils/callbacks.js';

const callback = buildCallback('users', 'view', '12345');
// 'admin:users:view:12345'
```

**Validate callback**:
```javascript
import { isValidCallback } from './utils/callbacks.js';

if (isValidCallback(data)) {
  // Safe to process
}
```

### Pagination (`utils/pagination.js`)

**Calculate pagination**:
```javascript
import { calculatePagination, paginateArray } from './utils/pagination.js';

const pagination = calculatePagination(totalItems, currentPage, itemsPerPage);
// { total, currentPage, totalPages, offset, hasNextPage, hasPrevPage }

const items = paginateArray(allItems, page, perPage);
```

**Build pagination buttons**:
```javascript
import { buildPaginationButtons } from './utils/pagination.js';

const buttons = buildPaginationButtons(2, 10, 'admin:users:list');
// Returns formatted button row
```

### Validation (`utils/validation.js`)

```javascript
import {
  validateUserId,
  validatePlanId,
  validateDays,
  validateBroadcastMessage,
  sanitizeInput,
} from './utils/validation.js';

if (!validateUserId(userId)) throw new Error('Invalid user ID');
if (!validateDays(duration)) throw new Error('Invalid duration');
```

### Error Handling (`utils/errorHandler.js`)

**Admin-specific errors**:
```javascript
import { AdminError, handleAdminError } from './utils/errorHandler.js';

try {
  const user = await getUser(userId);
  if (!user) {
    throw new AdminError('USER_NOT_FOUND', `User ${userId} not found`, { userId });
  }
} catch (error) {
  await handleAdminError(ctx, error);
}
```

**Predefined errors**:
- `UNAUTHORIZED`: User lacks permission
- `USER_NOT_FOUND`: User doesn't exist
- `INVALID_INPUT`: Bad input data
- `VALIDATION_ERROR`: Failed validation
- `RATE_LIMITED`: Too many requests
- `DATABASE_ERROR`: DB operation failed
- `SESSION_EXPIRED`: Session timed out
- `OPERATION_TIMEOUT`: Operation took too long

### Audit Logging (`utils/audit.js`)

**Log admin actions**:
```javascript
import { logAdminAction, logMembershipActivation } from './utils/audit.js';

await logAdminAction(ctx, 'user_searched', {
  query: 'john',
  resultsCount: 5,
});

await logMembershipActivation(ctx, userId, planId, days);
```

### Session Management (`utils/session.js`)

**Manage admin session state**:
```javascript
import {
  initializeAdminSession,
  setWizardData,
  getWizardData,
  clearWizardData,
  cleanupAdminSession,
  isSessionExpired,
} from './utils/session.js';

// Initialize
initializeAdminSession(ctx);

// Store wizard data
setWizardData(ctx, 'broadcast', { audience: 'premium' });

// Retrieve
const data = getWizardData(ctx, 'broadcast');

// Cleanup
clearWizardData(ctx, 'broadcast');
cleanupAdminSession(ctx);

// Check timeout (15 min default)
if (isSessionExpired(ctx)) {
  cleanupAdminSession(ctx);
}
```

## Middleware

### Admin Guard (`middleware/adminGuard.js`)

Protects all admin operations:
```javascript
bot.command('admin',
  adminGuard(),  // Checks ADMIN_USER_IDS env var
  async (ctx) => { /* ... */ }
);
```

### Rate Limiting (`middleware/rateLimiter.js`)

Prevent abuse:
```javascript
bot.command('admin',
  adminRateLimit(5, 60000),  // 5 requests per 60 seconds
  async (ctx) => { /* ... */ }
);

// Custom limits per action
const limits = { maxRequests: 10, windowMs: 60000 };
await checkRateLimit(userId, 'broadcast', limits);
```

## Routing

### Main Router (`router.js`)

The router handles callback delegation:

```javascript
bot.action(/^admin:/, async (ctx) => {
  await routeAdminCallback(ctx);
});
```

Routes are dispatched to handler functions:
```javascript
const routes = {
  dashboard: handleDashboard,
  users: handleUsers,
  memberships: handleMemberships,
  broadcasts: handleBroadcasts,
  plans: handlePlans,
  payments: handlePayments,
  settings: handleSettings,
  tools: handleTools,
};
```

## Admin Panel Menu Structure

```
/admin → Main Admin Panel
├─ 📊 Dashboard
├─ 👥 Users
├─ 💳 Memberships
├─ 📢 Broadcasts
├─ 💰 Plans
├─ 💳 Payments
├─ ⚙️ Settings
└─ 🛠️ Tools
```

## Environment Variables

```bash
# Admin user IDs (comma-separated)
ADMIN_USER_IDS=8365312597,1234567890

# Optional: Admin roles (future)
ADMIN_ROLES=admin:super_admin,moderator:user_manage
```

## Security Considerations

### Rate Limiting
- Dashboard: 5 req/min
- Broadcasts: 5 req/min
- User edits: 10 req/min
- Searches: 30 req/min

### Session Timeouts
- Session TTL: 15 minutes
- Auto-cleanup on navigation
- Wizard data cleared on completion

### Audit Logging
All sensitive actions logged:
- Membership activations
- User modifications
- Broadcasts sent
- Configuration changes
- Failed access attempts

### Input Validation
All user inputs sanitized:
- User IDs: 5-15 digits
- Plan IDs: 3-50 alphanumeric + hyphens
- Days: 0-36500
- Messages: Max 4096 characters

## Internationaliza tion (i18n)

All UI text supports English (en) and Spanish (es):

```javascript
import { t, getUserLanguage } from '../../../utils/i18n.js';

const lang = getUserLanguage(ctx);
const message = lang === 'es'
  ? 'Selecciona una opción'
  : 'Select an option';

// Or use translation keys
const message = t('adminPanel', lang);
```

## Performance Optimizations

### Pagination
- 10 items per page by default
- Efficient Firestore queries
- Offset-based pagination

### Caching (To implement)
- Dashboard metrics: 5 min TTL
- User counts: 1 min TTL
- Plans list: 10 min TTL
- Redis-backed caching

### Async Operations
- Broadcasts queued for background processing
- Bulk operations batched
- No blocking calls in message handlers

## Testing

### Unit Tests
Test individual utilities:
```bash
npm test -- utils/callbacks.test.js
npm test -- middleware/rateLimiter.test.js
```

### Integration Tests
Test full workflows:
```bash
npm test -- admin.integration.test.js
```

## Migration from Old System

The old `adminHandler.js` (5,000+ lines) has been replaced with:
1. A modular architecture with single-responsibility modules
2. Consistent callback patterns
3. Better error handling
4. Audit logging
5. Rate limiting

**Legacy callback support**: The new router recognizes old callbacks (`admin_*`) and routes them to compatible handlers for gradual migration.

## Adding New Admin Features

### 1. Create Module File

```javascript
// src/bot/handlers/admin/modules/newfeature.js
export async function handleNewFeature(ctx, action, params) {
  const lang = getUserLanguage(ctx);

  if (action === 'list') {
    await ctx.editMessageText('New Feature List', { parse_mode: 'Markdown' });
  }
}
```

### 2. Register in Router

```javascript
// src/bot/handlers/admin/router.js
import { handleNewFeature } from './modules/newfeature.js';

const routes = {
  // ...
  newfeature: handleNewFeature,
};
```

### 3. Update i18n

```javascript
// src/utils/i18n.js
newFeatureOption: '✨ New Feature',
newFeatureTitle: '✨ *New Feature*',
```

### 4. Add to Main Menu

```javascript
// In showAdminPanel()
[Markup.button.callback('✨ New Feature', 'admin:newfeature:list')],
```

## Debugging

### Enable Debug Logging
```javascript
// In .env
DEBUG=admin:*
```

### Session State
```javascript
import { getSessionSummary } from './utils/session.js';
const summary = getSessionSummary(ctx);
console.log(summary);
```

### Audit Trail
```javascript
import { getAdminAuditLog } from './utils/audit.js';
const log = await getAdminAuditLog(adminId);
```

## Performance Benchmarks

Target metrics:
- Dashboard load: < 2 seconds
- User list (paginated): < 1 second
- Broadcast confirmation: < 500ms
- Callback processing: < 100ms

## Future Enhancements

1. **Admin Roles**: Differentiated permissions (super_admin, moderator, user_manager)
2. **Bulk Operations**: CSV upload for bulk activations/edits
3. **Scheduled Actions**: Defer broadcasts, maintenance tasks
4. **Analytics Dashboard**: Charts, trends, user metrics
5. **Templates**: Broadcast/message templates
6. **API Integration**: REST API for external tools
7. **Mobile App**: Dedicated admin mobile app
8. **Notification System**: Real-time alerts for important events

## Support & Troubleshooting

### Common Issues

**"Unknown admin section"**
- Check callback format: `admin:section:action:params`
- Verify section is in routes map
- Check middleware is registered

**"Rate limit exceeded"**
- Natural throttling mechanism
- Adjust limits in middleware if needed
- Check for rapid repeated actions

**"Session expired"**
- Default 15-minute timeout
- Complete actions within window
- Extend timeout if needed in session.js

**"Callback data too long"**
- Telegram limit is 64 bytes
- Use `buildCallback()` which validates
- Store long data in session instead

## Related Files

- Bot setup: `src/bot/core/bot.js`
- User models: `src/models/userModel.js`
- Translations: `src/utils/i18n.js`
- Logger: `src/utils/logger.js`
- Config: `.env.example`

---

**Version**: 2.0.0
**Last Updated**: November 2024
**Status**: Foundational phase complete, modules in development
