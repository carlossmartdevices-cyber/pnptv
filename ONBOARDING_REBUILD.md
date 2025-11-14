# PNPtv Onboarding System Rebuild - Implementation Summary

## Overview
Complete rebuild of the PNPtv Telegram bot onboarding flow to create a seamless, error-free user registration experience with proper session management, Firestore integration, multi-language support, and age re-verification.

## Changes Implemented

### 1. New Files Created

#### `/src/utils/membershipManager.js`
Utility for managing user memberships and tier activation.

**Functions:**
- `activateMembership(userId, tier, activatedBy, durationDays, telegram)` - Activate membership for a user
- `isMembershipActive(userId)` - Check if user's membership is active
- `upgradeMembership(userId, newTier, durationDays, upgradedBy)` - Upgrade user membership
- `getUserTier(userId)` - Get user's current membership tier

**Features:**
- Supports Free, Silver, and Golden tiers
- Auto-notification via Telegram when membership is activated
- Proper expiration tracking for paid tiers
- Free tier never expires

### 2. Files Modified

#### `/src/bot/handlers/user/onboardingHandler.js` (Complete Rebuild)
Complete rewrite of the onboarding flow with all required steps.

**Flow Steps:**
1. **Language Selection** - English or Spanish
2. **Age Verification** - 18+ confirmation (re-verified every 7 days)
3. **Terms & Conditions** - Accept/decline with link to read
4. **Email Collection** - Text input with validation
5. **Free Channel Invite** - One-time link generation for channel and group
6. **Privacy Policy** - Accept/decline with link to read
7. **Onboarding Complete** - Profile creation + main menu

**Handler Functions:**
- `handleStartCommand()` - Entry point, routes based on user state
- `handleLanguageSelection()` - Language choice (en/es)
- `handleAgeConfirmation()` - Age verification with 7-day expiration
- `handleTermsAcceptance()` / `handleTermsDecline()` - Terms acceptance flow
- `handleEmailSubmission()` - Email validation and storage
- `sendChannelInvites()` - Generate channel/group invite links
- `handlePrivacyAcceptance()` / `handlePrivacyDecline()` - Privacy policy flow

**Key Features:**
- Age re-verification every 7 days for compliance
- Returning users skip to main menu if onboarding complete
- Channel invite generation with error handling (non-blocking)
- Auto-activation of Free tier membership (if enabled)
- Comprehensive error handling with fallbacks
- Session state tracking throughout flow

#### `/src/models/userModel.js`
Updated user schema to support new onboarding fields.

**New Fields:**
- `onboardingComplete` - Boolean flag for onboarding completion
- `emailVerified` - Boolean flag for email verification status
- `ageVerified` - Boolean flag for age verification
- `ageVerifiedAt` - Timestamp of last age verification
- `ageVerificationExpiresAt` - Timestamp when age verification expires (7 days)
- `ageVerificationIntervalHours` - Interval for re-verification (168 hours = 7 days)
- `termsAccepted` - Boolean flag for terms acceptance
- `privacyAccepted` - Boolean flag for privacy policy acceptance
- `tier` - User membership tier (Free, Silver, Golden)
- `membershipExpiresAt` - Timestamp when membership expires (null for Free tier)
- `lastActive` - Timestamp of last activity

#### `/src/utils/i18n.js`
Added comprehensive translation keys for new onboarding flow.

**New Translation Keys (English & Spanish):**
- `welcome` - Updated welcome message
- `languageEnglish` / `languageSpanish` - Language selection buttons
- `ageVerification` - Age verification prompt
- `confirmAge` - Age confirmation button
- `ageVerificationReminder` - Re-verification reminder (every 7 days)
- `ageVerificationSuccess` - Age verification success message
- `terms` - Terms & conditions with link
- `privacy` - Privacy policy with link
- `accept` / `decline` - Accept/decline buttons
- `termsDeclined` / `privacyDeclined` - Decline messages
- `emailPrompt` - Email collection prompt
- `emailInvalid` - Invalid email error
- `emailConfirmed` - Email confirmation message
- `freeChannelInvite` - Channel invite message
- `freeChannelInviteError` - Fallback if invite fails
- `profileCreated` - Profile creation success
- `onboardingComplete` - Onboarding completion message

#### `/src/services/userService.js`
Updated `completeOnboarding()` function to support new fields.

**Changes:**
- Added age verification tracking
- Added email verification flag
- Added terms and privacy acceptance tracking
- Sets `onboardingComplete` and `onboardingCompleted` (backwards compatibility)
- Updates `lastActive` timestamp

#### `/src/bot/handlers/user/mainMenuHandler.js`
Updated to check both `onboardingCompleted` and `onboardingComplete` for backwards compatibility.

#### `/.env.example`
Added new environment variable:
- `AUTO_ACTIVATE_FREE_USERS=true` - Enable/disable auto-activation of Free tier

## User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          /start Command                         │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │   User Exists?        │
                    └───────┬───────────────┘
                    ┌───────┴───────┐
                    │               │
                   Yes             No
                    │               │
        ┌───────────┴────────┐     │
        │ Onboarding         │     │
        │ Complete?          │     └────────┐
        └────┬───────────────┘              │
        ┌────┴────┐                         │
       Yes       No                         │
        │         │                         │
        │    ┌────┴─────────────────┐       │
        │    │  Resume Onboarding   │       │
        │    │  at last step        │       │
        │    └──────────────────────┘       │
        │                                   │
   ┌────┴────────────┐            ┌─────────┴──────────┐
   │ Age Verified?   │            │ 1. Create User     │
   │ (< 7 days)      │            │ 2. Language Select │
   └────┬────────────┘            └─────────┬──────────┘
   ┌────┴────┐                              │
  Yes       No                              │
   │         │                              │
   │    ┌────┴──────────────┐               │
   │    │ Re-verify Age     │               │
   │    └────┬──────────────┘               │
   │         │                              │
   │    ┌────┴──────────────┐               │
   │    │ Update Expiration │               │
   │    └────┬──────────────┘               │
   │         │                              │
   └─────────┴──────────────────────────────┤
                                           │
                                  ┌────────┴────────┐
                                  │ 3. Age Verify   │
                                  └────────┬────────┘
                                           │
                                  ┌────────┴────────┐
                                  │ 4. Terms Accept │
                                  └────────┬────────┘
                                           │
                                  ┌────────┴────────┐
                                  │ 5. Email Input  │
                                  └────────┬────────┘
                                           │
                                  ┌────────┴────────┐
                                  │ 6. Channel      │
                                  │    Invites      │
                                  └────────┬────────┘
                                           │
                                  ┌────────┴────────┐
                                  │ 7. Privacy      │
                                  │    Accept       │
                                  └────────┬────────┘
                                           │
                                  ┌────────┴────────┐
                                  │ 8. Complete     │
                                  │    Profile      │
                                  └────────┬────────┘
                                           │
                                  ┌────────┴────────┐
                                  │ 9. Auto-Activate│
                                  │    Free Tier    │
                                  │  (if enabled)   │
                                  └────────┬────────┘
                                           │
┌──────────────────────────────────────────┴────────────────────┐
│                       Show Main Menu                          │
└───────────────────────────────────────────────────────────────┘
```

## Testing Checklist

### New User Flow
- [ ] Start bot with `/start`
- [ ] Select language (English/Spanish)
- [ ] Verify age (18+)
- [ ] Accept Terms & Conditions
- [ ] Enter valid email address
- [ ] Receive channel invite link
- [ ] Receive group invite link
- [ ] Accept Privacy Policy
- [ ] See "Welcome to the Cult" message
- [ ] Verify Free tier activated (if AUTO_ACTIVATE_FREE_USERS=true)
- [ ] See main menu with all options

### Returning User Flow
- [ ] User with complete onboarding types `/start`
- [ ] Directly shown main menu
- [ ] No onboarding steps repeated

### Age Re-Verification Flow
- [ ] User completes onboarding
- [ ] Manually set `ageVerificationExpiresAt` to past date in Firestore
- [ ] Type `/start`
- [ ] See age re-verification prompt
- [ ] Accept age verification
- [ ] See "Age verification successful" message
- [ ] Redirected to main menu
- [ ] Verify new `ageVerificationExpiresAt` is 7 days in future

### Email Validation
- [ ] Enter invalid email (e.g., "notanemail")
- [ ] See "Invalid email format" error
- [ ] Enter valid email (e.g., "user@example.com")
- [ ] See "Email confirmed" message
- [ ] Verify email saved to Firestore

### Channel Invite Generation
- [ ] Complete onboarding
- [ ] Verify channel invite link received
- [ ] Verify group invite link received
- [ ] Click links to verify they work
- [ ] Verify links are one-time use (member_limit: 1)

### Error Handling
- [ ] Bot unable to create channel invite (wrong permissions)
- [ ] Verify user sees error message but continues onboarding
- [ ] Terms declined - verify onboarding stops
- [ ] Privacy declined - verify onboarding stops

### Multi-Language Support
- [ ] Select English - verify all messages in English
- [ ] Select Spanish - verify all messages in Spanish
- [ ] Switch language mid-flow - verify language persists

### Session Persistence
- [ ] Start onboarding
- [ ] Complete 3 steps
- [ ] Restart bot (simulate crash)
- [ ] Verify session restored (if using Redis)
- [ ] Verify can continue from last step

## Database Schema Updates

### Firestore `users` Collection
```javascript
{
  userId: number,
  username: string,
  firstName: string | null,
  lastName: string | null,
  language: "en" | "es",
  email: string | null,
  emailVerified: boolean,

  // Onboarding tracking
  onboardingComplete: boolean,
  createdAt: Timestamp,
  lastActive: Timestamp,

  // Age verification (7-day interval)
  ageVerified: boolean,
  ageVerifiedAt: Timestamp | null,
  ageVerificationExpiresAt: Timestamp | null,
  ageVerificationIntervalHours: 168,

  // Legal compliance
  termsAccepted: boolean,
  privacyAccepted: boolean,

  // Membership
  tier: "Free" | "Silver" | "Golden",
  membershipExpiresAt: Timestamp | null,
  membershipActivatedAt: Timestamp | null,
  membershipActivatedBy: string,

  // Profile (optional fields)
  bio: string | null,
  location: GeoPoint | null,
  photoUrl: string | null,
  interests: array,

  // Legacy fields (backwards compatibility)
  subscriptionStatus: string,
  planId: string | null,
  planExpiry: Timestamp | null,
  isActive: boolean,
  isAdmin: boolean,
  privacySettings: object,
  updatedAt: Timestamp
}
```

## Environment Variables

### Required
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_CLIENT_EMAIL` - Firebase client email
- `FIREBASE_PRIVATE_KEY` - Firebase private key

### Channel Configuration
- `FREE_CHANNEL_ID` - Free channel ID (default: `-1003159260496`)
- `FREE_GROUP_ID` - Free group ID (default: `-1003291737499`)

### URLs
- `TERMS_URL` - Terms & Conditions URL (default: `https://pnptv.app/terms`)
- `PRIVACY_URL` - Privacy Policy URL (default: `https://pnptv.app/privacy`)

### Feature Flags
- `AUTO_ACTIVATE_FREE_USERS` - Auto-activate Free tier (default: `true`)

## Key Features Implemented

### ✅ Age Re-Verification
- Age verification expires every 7 days
- Users prompted to re-verify on next `/start`
- Timestamp tracking with `ageVerificationExpiresAt`
- Non-intrusive for returning users

### ✅ Channel Invite Generation
- One-time invite links for channel and group
- Member limit of 1 per invite
- Personalized invite names (`Free - User {userId}`)
- Non-blocking errors (continues onboarding if invite fails)

### ✅ Auto-Activation of Free Tier
- Configurable via `AUTO_ACTIVATE_FREE_USERS` env var
- Activates after privacy policy acceptance
- Uses `membershipManager.activateMembership()`
- Sends confirmation message to user

### ✅ Session State Management
- Session tracks current onboarding step
- Supports resuming interrupted onboarding
- Separate flag for re-verification (`isReVerification`)
- Clears session on terms/privacy decline

### ✅ Comprehensive Error Handling
- All callback queries answered (prevents timeout)
- Handles "message not modified" Telegram errors
- Fallback to new message if edit fails
- Logs all errors with context

### ✅ Internationalization (i18n)
- Full English and Spanish support
- Language persists across sessions
- Updates user language in database
- Consistent translation key usage

### ✅ Email Validation
- Regex validation for email format
- Normalizes email (trim, lowercase)
- Saves to Firestore immediately
- Sets `emailVerified: false` for future verification

## Migration Notes

### Backwards Compatibility
The new implementation maintains backwards compatibility with the old schema:

1. **Dual Field Names:**
   - `onboardingComplete` (new) and `onboardingCompleted` (old)
   - Both are set to `true` when onboarding completes
   - Main menu checks both fields

2. **Legacy Fields Preserved:**
   - `age18Plus` mapped to `ageVerified`
   - `subscriptionStatus`, `planId`, `planExpiry` kept for existing logic

3. **Gradual Migration:**
   - New users get new schema automatically
   - Existing users updated on next `/start`
   - No data loss during transition

## Known Limitations

1. **Session Storage:**
   - Currently uses Redis (24-hour TTL)
   - Onboarding resume may not work if Redis is unavailable
   - Consider Firestore session storage for production

2. **Email Verification:**
   - Email is collected but not verified
   - `emailVerified` always set to `false`
   - Future work: Add email verification flow

3. **Channel Permissions:**
   - Bot must be admin in FREE_CHANNEL_ID and FREE_GROUP_ID
   - Must have `can_invite_users` permission
   - Invites fail silently if permissions missing

4. **Age Re-Verification:**
   - Fixed 7-day interval (not configurable per user)
   - No grace period (expires exactly at timestamp)
   - User blocked from app until re-verified

## Future Enhancements

1. **Email Verification:**
   - Send verification link via email
   - Update `emailVerified` flag
   - Require verification for premium features

2. **Configurable Age Interval:**
   - Per-jurisdiction age verification requirements
   - Admin override for age verification
   - Configurable intervals per tier

3. **Resume Onboarding:**
   - Persist onboarding state to Firestore
   - Allow users to continue from exact step
   - Handle multi-day onboarding sessions

4. **Analytics:**
   - Track onboarding completion rate
   - Identify drop-off points
   - A/B test different flows

5. **Admin Tools:**
   - Force re-onboarding for specific users
   - Bulk update onboarding status
   - View onboarding analytics dashboard

## Support

For issues or questions, please contact the development team or create an issue in the repository.

## License

Proprietary - PNPtv © 2025
