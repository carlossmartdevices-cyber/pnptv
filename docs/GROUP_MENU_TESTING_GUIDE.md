# Group Menu System - Testing & Quick Start Guide

## ✅ Implementation Complete

The PNPtv Group Menu System has been successfully implemented with all core features functional and ready for testing.

---

## 🚀 Quick Start - For Developers

### 1. **Environment Setup**

Ensure these environment variables are set in `.env`:

```bash
# Already configured
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_BOT_USERNAME=PNPtvBot
CHANNEL_ID=-1002997324714
FREE_CHANNEL_ID=-1003159260496
FREE_GROUP_ID=-1003291737499
```

### 2. **Database Setup**

Create Firestore indexes for optimal performance:

```javascript
// In Firestore Console, create these composite indexes:

Collection: group_engagement
- Index 1: groupId (ASC), score (DESC)
- Index 2: groupId (ASC), lastActive (DESC)

Collection: user_groups
- Index 1: userId (ASC), lastSeen (DESC)
```

### 3. **Start the Bot**

```bash
npm run dev
```

You should see:
```
[INFO] Tier change listener setup complete
[INFO] Bot initialized with all handlers including group menu system
[INFO] Bot @PNPtvBot started successfully
```

---

## 🧪 Testing Procedures

### Phase 1: Core Menu Testing (5 minutes)

#### Test 1.1: Menu Access
1. Add bot to test group
2. Send `/menu` command
3. **Expected**: Main menu appears with 7 options
4. **Languages**: Test both /menu and verify Spanish (if bilingual)

#### Test 1.2: Navigation
1. Click each main menu button
2. Verify submenu appears
3. Click "Back" button
4. **Expected**: Returns to main menu

#### Test 1.3: Premium Benefits Display
1. As free user, send `/menu`
2. Look for "💎 View Premium Benefits" button
3. Click it
4. **Expected**: Shows Premium tier benefits

---

### Phase 2: Tier Synchronization (10 minutes)

#### Test 2.1: Initial Tier Detection
1. Create test user with tier='free' in Firestore
2. Add user to group
3. Send `/menu` command
4. **Expected**: Shows "🆓 Free" badge

#### Test 2.2: Permission Enforcement
1. With free user, try to upload a photo
2. **Expected**:
   - Photo deleted
   - Notification sent: "Free users can't send photos"
   - Notification auto-deletes after 10 seconds

#### Test 2.3: Tier Upgrade Sync
1. Have free user in group
2. Update user's tier in Firestore: tier='premium'
3. Wait 30 seconds
4. Free user tries to upload photo
5. **Expected**: Photo sends successfully (permissions updated)

#### Test 2.4: Batch Sync (Admin)
1. Add admin user to group
2. Run `/admin sync_group` (if implemented)
3. **Expected**: All users' permissions synced
4. **Logs**: Should show "Batch sync complete"

---

### Phase 3: Welcome System (5 minutes)

#### Test 3.1: New Member Welcome
1. Add new user to group
2. **Expected**:
   - Welcome message with tier badge
   - Rules button
   - Menu button
   - Message auto-deletes after 3 minutes

#### Test 3.2: Channel Invites (DM)
1. Have new member in group
2. **Expected**: DM with channel invite links
3. **Verify**:
   - Free channel link present
   - Premium channel link (if premium user)
   - Links unique and expire after 24h

#### Test 3.3: Welcome for Different Tiers
1. Test with free user → Shows "View Premium"
2. Test with premium user → Shows full access message
3. **Expected**: Personalized messages for each tier

---

### Phase 4: Engagement & Leaderboard (10 minutes)

#### Test 4.1: Message Tracking
1. Send messages in group
2. Wait a few seconds
3. Check Firestore: `group_engagement/{groupId}_{userId}`
4. **Expected**: Document created with messagesCount += 1

#### Test 4.2: Media Tracking
1. Free user tries photo → Rejected (tracked as media attempt)
2. Premium user sends photo → Succeeds (tracked as media)
3. **Expected**: mediaCount incremented for premium user

#### Test 4.3: Leaderboard Display
1. After 5+ messages in group, click `/menu` → 🏆 Community
2. Click 📊 Leaderboard
3. **Expected**:
   - Shows top users (if 2+ active users)
   - Shows score and message count
   - Users ranked by score

#### Test 4.4: Personal Rank
1. User clicks `/menu` → 🏆 Community → 🏆 My Rank
2. **Expected**:
   - Shows rank, score, percentile
   - Shows message/media/event counts
   - Shows comparison to others

---

### Phase 5: Premium Features (5 minutes)

#### Test 5.1: Premium Benefits Display
1. Free user: `/menu` → 💎 Premium Benefits
2. **Expected**: Full list of premium features with explanations

#### Test 5.2: Free vs Premium Comparison
1. Click 🆚 Compare Plans button
2. **Expected**: Side-by-side comparison table

#### Test 5.3: Upgrade Link
1. Click upgrade button
2. **Expected**: Opens bot with `/subscribe` command

---

### Phase 6: Multi-Language Support (5 minutes)

#### Test 6.1: English Menu
1. User with language='en' sends `/menu`
2. **Expected**: All text in English

#### Test 6.2: Spanish Menu
1. User with language='es' sends `/menu`
2. **Expected**: All text in Spanish

#### Test 6.3: Language Detection
1. Set user's language preference
2. Send `/menu`
3. **Expected**: Correct language used

---

### Phase 7: Error Handling (5 minutes)

#### Test 7.1: Bot Not Admin
1. Remove bot admin permissions from group
2. Add new member
3. **Expected**: Graceful handling, no errors in logs

#### Test 7.2: DM Blocked
1. Block bot DM
2. Add new member
3. **Expected**: Welcome message in group (DM skipped gracefully)

#### Test 7.3: Database Errors
1. Temporarily disconnect Firebase
2. Try `/menu`
3. **Expected**: Error message shown to user, logged properly

#### Test 7.4: Rate Limiting
1. Spam `/menu` command repeatedly
2. **Expected**: Rate limiter prevents abuse

---

## 📊 Test Data Setup

### Sample Users (Create in Firestore)

```javascript
// User 1: Free
{
  userId: 123456789,
  tier: 'free',
  subscriptionStatus: 'inactive',
  firstName: 'TestFree',
  username: 'test_free'
}

// User 2: Premium (Active)
{
  userId: 987654321,
  tier: 'premium',
  subscriptionStatus: 'active',
  planExpiry: Timestamp(future date),
  firstName: 'TestPremium',
  username: 'test_premium'
}

// User 3: Premium (Expired)
{
  userId: 555555555,
  tier: 'premium',
  subscriptionStatus: 'active',
  planExpiry: Timestamp(past date),
  firstName: 'TestExpired',
  username: 'test_expired'
}
```

### Sample Group Document

```javascript
// group_settings/{groupId}
{
  groupId: -1003291737499,
  groupName: 'Test Group',
  language: 'en',
  rules: 'Be respectful...'
}
```

---

## 🔍 Debugging Tips

### Check Logs

```bash
# Real-time logs
tail -f logs/pnptv.log | grep "group"

# Specific user
tail -f logs/pnptv.log | grep "123456789"

# Tier sync
tail -f logs/pnptv.log | grep "tierSync\|permissions"
```

### Inspect Database

```javascript
// Check user engagement
db.collection('group_engagement')
  .where('groupId', '==', -1003291737499)
  .orderBy('score', 'desc')
  .get()

// Check user group membership
db.collection('user_groups')
  .where('userId', '==', 123456789)
  .get()
```

### Test Specific Functions

```javascript
// In any handler file:
import { getUserTier, syncGroupPermissions } from '../../helpers/group/tierSync.js';

// Test tier fetch
const tier = await getUserTier('123456789');
console.log('User tier:', tier);

// Test engagement tracking
import { trackEngagement } from '../../handlers/group/leaderboard.js';
await trackEngagement('123456789', '-1003291737499', 'message', 5);
```

---

## 📈 Performance Benchmarks

Expected performance metrics:

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| Menu load | < 1s | Includes tier check + permission sync |
| Leaderboard display | < 500ms | Firestore query with index |
| Permission sync | < 100ms | Per-user Telegram API call |
| Batch sync (50 users) | < 10s | With 100ms delays to avoid rate limits |
| Engagement track | < 50ms | Async, non-blocking |
| Message filter | < 100ms | Per-message processing |

---

## ✨ Features Ready for Use

### ✅ Fully Implemented

- [x] Automatic tier synchronization
- [x] Permission management for free/premium
- [x] Group menu router with 7 sub-menus
- [x] Welcome system with tier detection
- [x] Engagement tracking and leaderboard
- [x] Premium benefits display
- [x] Media filter for free users
- [x] Bilingual support (English/Spanish)
- [x] Firestore integration
- [x] Error handling and logging

### 🔄 Partially Implemented (Extensible)

These are placeholder handlers ready for full implementation:

- [ ] Music Library (basic structure, no DB integration)
- [ ] Video Rooms (placeholder, needs Zoom integration)
- [ ] Events System (placeholder, needs calendar)
- [ ] Polls Feature (placeholder, needs voting logic)
- [ ] Achievements System (placeholder, needs rule engine)

### 📋 Configuration Ready

All handlers automatically use:
- User's language preference
- User's tier for permission checks
- Group's language setting
- Timezone for events (placeholder)

---

## 🚨 Known Limitations & Notes

### Current Limitations

1. **Music Library**: Shows placeholder - actual library not implemented
2. **Video Rooms**: Shows placeholder - requires Zoom API integration
3. **Events Calendar**: Shows placeholder - requires event storage
4. **Polls**: Shows placeholder - requires voting logic
5. **Achievements**: Shows placeholder - needs achievement rules

### Workarounds

These can be incrementally added:
- Events: Add scheduled room reminders
- Polls: Use Telegram native polls
- Achievements: Create point-based rewards
- Library: Integrate with Spotify/music API

---

## 🎯 Next Steps After Testing

1. **Verify Core Features** - Run through all test phases
2. **Performance Testing** - Monitor logs for bottlenecks
3. **Load Testing** - Test with 50+ concurrent group members
4. **Security Audit** - Review permission enforcement
5. **User Feedback** - Get feedback from actual users
6. **Production Rollout** - Gradual deployment

---

## 📞 Support Commands

Built-in commands for testing:

```bash
# Main menu (in groups)
/menu

# Admin commands (if implemented)
/admin sync_group              # Sync all members' permissions
/admin reset_engagement        # Reset leaderboard

# User commands
/rules                         # View community rules
/help                          # Get command help
/subscribe                     # View subscription plans
```

---

## 📝 Checklist for Deployment

- [ ] All tests pass (7 phases)
- [ ] Firestore indexes created
- [ ] Environment variables set
- [ ] Bot admin in all groups
- [ ] DM permissions verified
- [ ] Channel invite permissions verified
- [ ] Logs monitored for 24 hours
- [ ] User feedback collected
- [ ] Performance metrics within benchmarks
- [ ] Security review completed

---

## 🎓 Additional Resources

- Main Documentation: `docs/GROUP_MENU_SYSTEM.md`
- API Reference: See "API Reference" section in main docs
- Code Comments: All handlers well-commented
- Example Usage: See imports in `src/bot/core/bot.js`

---

**Status**: ✅ Ready for Testing
**Last Updated**: November 2024
**Branch**: `claude/rebuild-group-menu-system-01HBtoc6eyXqkApFEJ8sHFrm`
