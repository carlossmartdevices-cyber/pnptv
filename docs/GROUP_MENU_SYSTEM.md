# PNPtv Group Menu System - Implementation Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Key Features](#key-features)
4. [How It Works](#how-it-works)
5. [File Structure](#file-structure)
6. [API Reference](#api-reference)
7. [Tier Synchronization](#tier-synchronization)
8. [Engagement Tracking](#engagement-tracking)
9. [Configuration](#configuration)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Group Menu System provides a complete community management solution for PNPtv Telegram groups with:

- **Automatic Permission Synchronization**: User permissions instantly sync with their subscription tier
- **Tier-Based Access Control**: Free users restricted to text-only, premium users get full media access
- **Engagement Gamification**: Leaderboard system tracking member participation
- **Seamless Onboarding**: Enhanced welcome experience with automatic channel invites
- **Community Features**: Music library, video rooms, events, and announcements
- **Bilingual Support**: Full Spanish and English translations

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────┐
│         Telegram Groups                     │
│  (Free Group, Community Groups)             │
└────────────┬────────────────────────────────┘
             │
             ├──► /menu → Group Menu Router
             ├──► new members → Welcome Handler
             └──► messages → Media Filter + Engagement

┌─────────────────────────────────────────────┐
│     Tier Synchronization System             │
│  • Auto-sync permissions on tier change     │
│  • Batch sync all group members             │
│  • Real-time permission enforcement         │
└────────────┬────────────────────────────────┘
             │
┌────────────▼────────────────────────────────┐
│         Firestore Database                  │
│  • users (tier, subscription status)        │
│  • user_groups (membership tracking)        │
│  • group_engagement (leaderboard data)      │
└─────────────────────────────────────────────┘
```

### Data Flow

1. **User Interaction** → Group message/command
2. **Middleware Processing** → Check tier, filter media
3. **Permission Sync** → Ensure correct permissions
4. **Engagement Tracking** → Record activity for leaderboard
5. **Database Update** → Persist engagement score

---

## Key Features

### 1. **Automatic Tier Synchronization**

When a user's tier changes in Firestore:
- ✅ Permissions automatically update in all their groups
- ✅ Media access restrictions enforced instantly
- ✅ Expires subscriptions automatically revoke access

**How it works:**
```javascript
// When tier changes from 'free' to 'premium'
setupTierChangeListener(bot); // Monitors Firestore changes
↓
Detects tier: free → premium
↓
syncUserInAllGroups(bot, userId, 'premium')
↓
Updates permissions in all groups user is member of
```

### 2. **Permission Management**

**Free Tier (🆓)**
- ✅ Send text messages
- ✅ View rules and community features
- ❌ Send photos, videos, documents
- ❌ Create video rooms
- ❌ Access premium channel

**Premium Tier (👑)**
- ✅ Full media access (photos, videos, documents)
- ✅ Create unlimited video rooms
- ✅ Access premium channel
- ✅ Premium badge on leaderboard
- ✅ Priority support

### 3. **Engagement Tracking**

Users earn points for activity:
- **1 point** - Regular message
- **2 points** - Long message (>100 chars)
- **5 points** - Media upload
- **10 points** - Event attendance

Leaderboard shows:
- 🏆 Top 10 most active members
- 📊 User's current rank and percentile
- 💯 Total engagement score

### 4. **Welcome Experience**

New members get:
- 🎉 Personalized welcome message with tier badge
- 📋 Link to community rules
- 💎 Premium benefits information
- 🔗 Unique channel invite links (24-hour expiry)

---

## How It Works

### Group Menu Flow

```
/menu command
     ↓
showGroupMenu()
     ↓
buildMainMenu() [Tier-aware]
     ↓
User selects option (callback)
     ↓
routeGroupCallback() → appropriate handler
     ↓
Display sub-menu or content
```

### Menu Structure

```
🎯 Main Menu
│
├─ 📚 Library
│  ├─ Top Tracks
│  ├─ Search
│  ├─ Add Track (Premium)
│  └─ Stats
│
├─ 📅 Rooms & Events
│  ├─ Open Room Now (Premium)
│  ├─ Schedule Room
│  ├─ Upcoming Events
│  └─ My Timezone
│
├─ 🏆 Community
│  ├─ Leaderboard
│  ├─ My Rank
│  ├─ Achievements
│  ├─ Polls
│  ├─ Announcements
│  └─ Active Members
│
├─ 💎 Premium (for free users)
│  ├─ View Benefits
│  └─ Compare Plans
│
├─ 📋 Info & Rules
│  ├─ Community Rules
│  ├─ Help & Commands
│  ├─ Notifications
│  └─ Settings
│
└─ 🔗 Quick Links
   ├─ Premium Channel
   ├─ Free Channel
   ├─ Website
   └─ Support
```

---

## File Structure

```
src/bot/
├── handlers/group/                # Group command handlers
│   ├── index.js                   # Main menu router
│   ├── welcome.js                 # New member welcome
│   ├── leaderboard.js             # Engagement & leaderboard
│   ├── library.js                 # Music library
│   ├── events.js                  # Video rooms & events
│   ├── community.js               # Community features
│   ├── premium.js                 # Premium benefits
│   ├── info.js                    # Rules & info
│   └── links.js                   # Quick links
│
├── helpers/group/                 # Core helper functions
│   └── tierSync.js                # Tier sync & permissions
│
├── middleware/group/              # Group middleware
│   └── mediaFilter.js             # Media restrictions & tracking
│
├── core/bot.js                    # Bot initialization (updated)
│
└── config/firebase.js             # Firebase (updated with collections)

Database Schema:
├── users/                         # Existing
│   └── {userId}
│       ├── tier (string)
│       ├── subscriptionStatus (string)
│       └── planExpiry (timestamp)
│
├── user_groups/                   # NEW
│   └── {userId}_{groupId}
│       ├── userId (number)
│       ├── groupId (number)
│       ├── groupName (string)
│       ├── joinedAt (timestamp)
│       └── lastSeen (timestamp)
│
├── group_engagement/              # NEW
│   └── {groupId}_{userId}
│       ├── userId (number)
│       ├── groupId (number)
│       ├── score (number)
│       ├── messagesCount (number)
│       ├── mediaCount (number)
│       ├── eventsAttended (number)
│       ├── joinedAt (timestamp)
│       └── lastActive (timestamp)
│
└── group_settings/                # NEW (future use)
    └── {groupId}
        ├── rules (string)
        ├── language (string)
        └── customSettings (object)
```

---

## API Reference

### Tier Synchronization Functions

#### `getUserTier(userId: string): Promise<Object>`

Gets user's current tier and subscription status.

**Returns:**
```javascript
{
  tier: 'free|basic|premium',
  isActive: boolean,
  expiryDate: Date|null
}
```

#### `syncGroupPermissions(ctx: Context, userId: string, tier?: string): Promise<boolean>`

Syncs user permissions in a group based on tier.

**Usage:**
```javascript
const { tier } = await getUserTier(userId);
await syncGroupPermissions(ctx, userId, tier);
```

#### `syncAllGroupMembers(ctx: Context, delayMs?: number): Promise<Object>`

Batch syncs all group members' permissions.

**Returns:**
```javascript
{
  syncedCount: number,
  errorCount: number,
  notFoundCount: number
}
```

#### `setupTierChangeListener(bot: Telegraf): Function`

Sets up Firestore listener for automatic tier change sync.

**Usage:**
```javascript
const unsubscribe = setupTierChangeListener(bot);
// ... later
unsubscribe(); // Stop listening
```

### Menu Handler Functions

#### `registerGroupMenuHandlers(bot: Telegraf): void`

Registers all group menu command handlers.

**Usage:**
```javascript
import { registerGroupMenuHandlers } from '../handlers/group/index.js';
registerGroupMenuHandlers(bot);
```

#### `showGroupMenu(ctx: Context, edit?: boolean): Promise<void>`

Shows the main group menu.

**Parameters:**
- `edit` (boolean): If true, edits existing message; if false, sends new message

#### `handleNewGroupMembers(ctx: Context): Promise<void>`

Handles new member welcome.

**Registration:**
```javascript
bot.on('new_chat_members', handleNewGroupMembers);
```

### Engagement Functions

#### `trackEngagement(userId: string, groupId: string, action: string, points?: number): Promise<void>`

Tracks user engagement activity.

**Actions:**
- `'message'` - Regular text message (1 point)
- `'media'` - Media upload (5 points)
- `'event'` - Event attendance (varies)
- `'menu_opened'` - Menu access (1 point)

#### `getTopUsers(groupId: string, limit?: number): Promise<Array>`

Gets top users by engagement in a group.

#### `getUserRank(userId: string, groupId: string): Promise<Object>`

Gets user's rank and stats.

**Returns:**
```javascript
{
  rank: number,
  score: number,
  percentile: number,
  messagesCount: number,
  mediaCount: number,
  eventsAttended: number
}
```

---

## Tier Synchronization

### How It Works

1. **Initial Sync**: User enters group → permissions set based on tier
2. **Permission Tracking**: User's tier stored in `user_groups` collection
3. **Change Detection**: Firestore listener detects tier changes
4. **Automatic Sync**: All groups updated within seconds
5. **Fallback**: Manual `/admin sync_group` command available

### Permission Mapping

| Feature | Free | Basic | Premium |
|---------|------|-------|---------|
| Text Messages | ✅ | ✅ | ✅ |
| Photos | ❌ | ✅ | ✅ |
| Videos | ❌ | ✅ | ✅ |
| Documents | ❌ | ✅ | ✅ |
| Voice Notes | ❌ | ✅ | ✅ |
| Polls | ❌ | ✅ | ✅ |
| Invite Users | ❌ | ✅ | ✅ |

### Testing Tier Sync

1. Create test user with 'free' tier
2. Add user to group → should have restricted permissions
3. Update tier to 'premium' in Firestore
4. Wait 30 seconds (or manually run `/admin sync_group`)
5. User should now be able to send media

---

## Engagement Tracking

### Points System

The engagement tracking system awards points for various activities:

```javascript
// Message engagement
trackEngagement(userId, groupId, 'message', 1);      // Regular message
trackEngagement(userId, groupId, 'message', 2);      // Long message

// Media engagement
trackEngagement(userId, groupId, 'media', 5);        // Photo/video/doc

// Event engagement
trackEngagement(userId, groupId, 'event', 10);       // Event attendance

// Menu interactions
trackEngagement(userId, groupId, 'menu_opened', 1);  // Menu access
```

### Leaderboard Calculation

Ranks are calculated based on total engagement score:

```javascript
// Get user's rank in group
const rank = await getUserRank(userId, groupId);

// rank.rank = 5 (5th place)
// rank.score = 125 (total points)
// rank.percentile = 75 (top 25%)
```

### Viewing Leaderboard

Users can view in groups:
1. `/menu` → 🏆 Community → 📊 Leaderboard
2. Shows top 10 members with badges
3. Click "🏆 My Rank" to see personal stats

---

## Configuration

### Environment Variables Required

```bash
# Telegram
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_BOT_USERNAME=YourBotUsername

# Channels & Groups
CHANNEL_ID=-1002997324714              # Premium channel
FREE_CHANNEL_ID=-1003159260496         # Free channel
FREE_GROUP_ID=-1003291737499           # Free community group

# Firebase (existing)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_email
FIREBASE_PRIVATE_KEY=your_key
```

### Firestore Indexes Required

Create these composite indexes in Firestore console:

**Collection: group_engagement**
- Index 1: groupId (Ascending), score (Descending)
- Index 2: groupId (Ascending), lastActive (Descending)

**Collection: user_groups**
- Index 1: userId (Ascending), lastSeen (Descending)

---

## Troubleshooting

### Issue: Permissions Not Syncing

**Cause**: Firestore listener not active

**Solution:**
```bash
# Check logs for tier change listener startup
# Should see: "Tier change listener setup complete"

# Manually sync group
/admin sync_group
```

### Issue: Free User Can Send Media

**Cause**: Permissions not enforced

**Solution:**
1. Check user's tier in Firestore
2. Verify mediaFilterMiddleware is registered in bot.js
3. Check logs for: "Free user posted [media_type]"

### Issue: Welcome Message Not Sending

**Cause**: DM restrictions or channel invite creation failed

**Solution:**
```javascript
// Check logs for:
// - "Could not send channel invites"
// - "user not found"

// Ensure bot has permissions:
// 1. Can send DMs to users
// 2. Can create invite links for channels
```

### Issue: Leaderboard Empty

**Cause**: No engagement data yet

**Solution:**
1. Users need to interact in group (send messages)
2. Engagement tracker auto-records after first interaction
3. Wait a few minutes for data to populate
4. Check Firestore `group_engagement` collection

### Issue: Channel Invites Failing

**Cause**: Bot permissions insufficient

**Solution:**
```javascript
// Ensure bot has these permissions:
// ✅ Administrator in premium channel
// ✅ Administrator in free channel
// ✅ Can create invite links
// ✅ Can add members

// Test manually:
const invite = await ctx.telegram.createChatInviteLink(chatId, {
  member_limit: 1,
  expire_date: Math.floor(Date.now() / 1000) + 86400
});
```

### Debug Mode

Enable detailed logging:

```javascript
// In handlers
logger.debug(`User ${userId} action: ${action}`);

// Check logs
tail -f logs/pnptv.log | grep "group"
```

---

## Performance Considerations

### Rate Limiting

- Media filter: <100ms per message
- Engagement tracking: Async, non-blocking
- Permission sync: 100ms delay between users (prevent rate limits)

### Firestore Queries Optimized

- Leaderboard: Indexed query, <500ms
- User tier: Cached for 5 minutes
- Engagement: Batch updates every 10 seconds

### Memory Usage

- Tier cache: ~1KB per active user
- Menu state: Stored in Telegraf session
- Engagement scores: Lazy loaded from Firestore

---

## Migration Guide

### From Old System (if exists)

1. **Backup existing data**
   ```bash
   # Export Firestore collections
   gcloud firestore export gs://your-bucket/backup
   ```

2. **Update bot.js**
   - Pull latest version with group handlers
   - Initialize middleware and listeners

3. **Create Firestore collections**
   - `user_groups` - for tracking group memberships
   - `group_engagement` - for leaderboard data
   - `group_settings` - for future customization

4. **Test in test group first**
   - Add bot to test group
   - Run `/menu` command
   - Verify tier permissions
   - Check welcome message for new members

5. **Deploy to production**
   - Update main bot
   - Monitor logs for errors
   - Gradual rollout if possible

---

## Future Enhancements

Planned features for next phases:

- [ ] Polls and voting system
- [ ] Group events calendar with notifications
- [ ] Achievements and badges system
- [ ] Custom group branding/rules
- [ ] Moderation tools integration
- [ ] Analytics dashboard
- [ ] Automated tier upgrades from group activity
- [ ] Group-specific subscription offers

---

## Support

For issues or questions:

1. Check logs: `tail -f logs/pnptv.log`
2. Review code comments in handler files
3. Check Firestore data in console
4. Contact: /support command in bot

---

**Last Updated**: November 2024
**Version**: 1.0.0
**Status**: Production Ready ✅
