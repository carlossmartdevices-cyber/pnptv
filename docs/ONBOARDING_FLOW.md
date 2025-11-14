# Onboarding Flow Diagram

## Visual Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER STARTS BOT                              │
│                      Send: /start                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              STEP 1: LANGUAGE SELECTION                          │
│                                                                  │
│  🌐 Welcome to PNPtv! / ¡Bienvenido a PNPtv!                    │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ 🇺🇸 English   │  │ 🇪🇸 Español  │                            │
│  └──────┬───────┘  └──────┬───────┘                            │
│         │                  │                                     │
└─────────┼──────────────────┼─────────────────────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              STEP 2: AGE VERIFICATION                            │
│                                                                  │
│  Are you 18 years or older?                                     │
│  ¿Tienes 18 años o más?                                         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ ✅ Yes/Sí    │  │ ❌ No        │                             │
│  └──────┬───────┘  └──────┬───────┘                            │
│         │                  │                                     │
│         │                  └──────► ⚠️ BLOCKED                   │
│         │                           (Must be 18+)               │
│         ▼                                                        │
└─────────┼──────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│              STEP 3: TERMS ACCEPTANCE                            │
│                                                                  │
│  Please read and accept our Terms of Service                    │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ 📄 Terms     │  │ 🔒 Privacy   │  (URL Buttons)              │
│  └──────────────┘  └──────────────┘                            │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ ✅ Accept    │  │ ❌ Decline   │                             │
│  └──────┬───────┘  └──────┬───────┘                            │
│         │                  │                                     │
│         │                  └──────► ⚠️ BLOCKED                   │
│         │                           (Must accept terms)         │
│         ▼                                                        │
└─────────┼──────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│              STEP 4: EMAIL COLLECTION (Optional)                 │
│                                                                  │
│  Would you like to provide your email? (Optional)               │
│                                                                  │
│  User types email OR clicks Skip                                │
│                                                                  │
│  ┌──────────────────────────────┐                              │
│  │  user@example.com            │                              │
│  └──────┬───────────────────────┘                              │
│         │                                                        │
│         ├──► ✅ Valid email → Continue                          │
│         │                                                        │
│         └──► ❌ Invalid format → Show error, retry              │
│                                                                  │
│  ┌──────────────┐                                              │
│  │ ⏭️ Skip      │                                               │
│  └──────┬───────┘                                              │
│         │                                                        │
│         ▼                                                        │
└─────────┼──────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│              STEP 5: ONBOARDING COMPLETE                         │
│                                                                  │
│  🎉 Setup complete! Welcome to PNPtv!                           │
│                                                                  │
│  🎬 PNPtv - Your Entertainment Hub                              │
│                                                                  │
│  What would you like to do?                                     │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │ 💎 Subscribe     │  │ 👤 My Profile    │                   │
│  └──────────────────┘  └──────────────────┘                   │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │ 🌍 Nearby Users  │  │ 🎤 Live Streams  │                   │
│  └──────────────────┘  └──────────────────┘                   │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │ 📻 Radio         │  │ 🎥 Zoom Rooms    │                   │
│  └──────────────────┘  └──────────────────┘                   │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │ 🤖 Support       │  │ ⚙️ Settings      │                   │
│  └──────────────────┘  └──────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## State Machine

```
[START]
   ↓
[Language Selection]
   ↓ (lang selected)
[Age Verification]
   ↓ (age confirmed)
[Terms Acceptance]
   ↓ (terms accepted)
[Email Collection]
   ↓ (email provided/skipped)
[COMPLETE] → Main Menu
```

## Data Flow

```
Session Data Updated at Each Step:
────────────────────────────────────

Step 1: language = 'en' | 'es'
Step 2: age18Plus = true | false
Step 3: termsAccepted = true | false
Step 4: email = 'user@email.com' | null
Step 5: onboardingCompleted = true

Final Stored Data:
────────────────────────────────────
{
  userId: 123456789,
  username: 'johndoe',
  language: 'en',
  age18Plus: true,
  termsAccepted: true,
  email: 'john@example.com',
  onboardingCompleted: true,
  createdAt: '2025-01-14T00:00:00.000Z'
}
```

## Message Replacement Pattern

All steps use **message replacement** (not stacking):

```javascript
// ✅ CORRECT - Replaces previous message
await ctx.editMessageText('New content', {
  reply_markup: { inline_keyboard: [...] }
});

// ❌ WRONG - Creates new message (stacking)
await ctx.reply('New content');
```

## Error Handling

```
Email Validation Loop:
─────────────────────

User Input → Validate
    ↓
    ├─► Valid → Continue to completion
    │
    └─► Invalid → Show error, allow retry
                  ↓
                  User can:
                  - Try again
                  - Click Skip
```

## Language Support

```
All messages have EN/ES versions:

EN: "Are you 18 years or older?"
ES: "¿Tienes 18 años o más?"

EN: "I Accept"
ES: "Acepto"

Translation key: getUserLanguage(ctx)
```

## Exit Points

```
1. Age < 18        → BLOCKED ❌
2. Terms Declined  → BLOCKED ❌
3. Completed       → SUCCESS ✅
```

## Code References

- **Handler**: `src/bot/handlers/user/onboardingHandler.js`
- **Service**: `src/services/userService.js` → `completeOnboarding()`
- **Model**: `src/models/userModel.js` → `createUser()`
- **i18n**: `src/utils/i18n.js`
- **Validation**: `src/utils/validation.js` → `isValidEmail()`

## Test Coverage

```
✅ Language selection (EN/ES)
✅ Age verification (Yes/No)
✅ Terms acceptance (Accept/Decline)
✅ Email validation (Valid/Invalid/Skip)
✅ Message replacement (no stacking)
✅ Session persistence
✅ Error handling
✅ Edge cases (restart mid-flow)
```
