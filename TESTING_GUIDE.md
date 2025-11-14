# Testing Guide - PNPtv Telegram Bot

## Testing Onboarding Feature

### Prerequisites
1. ✅ Telegram account
2. ✅ Bot token: `8558254013:AAGaoJf2O7bIQn4r7GpQpMAh99-1M3PYE9U`
3. ✅ Bot username: `@PNPtvBot`

### Setup for Local Testing

#### Option 1: Full Bot (with Firebase & Redis)
```bash
# 1. Install dependencies
npm install

# 2. Ensure .env is configured
cp .env.example .env

# 3. Start Redis (if testing locally)
docker run -d -p 6379:6379 redis:7-alpine

# 4. Start the bot
npm start
```

#### Option 2: Onboarding Test Only (no infrastructure needed)
```bash
# Uses in-memory storage, no Firebase/Redis required
node test-onboarding.js
```

---

## Onboarding Flow Test Steps

### Step 1: Initial Contact
**Action:** Send `/start` to @PNPtvBot

**Expected Response:**
```
🌐 Welcome to PNPtv! / ¡Bienvenido a PNPtv!

Please select your language / Por favor selecciona tu idioma:
```

**Inline Keyboard:**
- `🇺🇸 English`
- `🇪🇸 Español`

**Test:**
- ✅ Message appears
- ✅ Inline keyboard has 2 language buttons
- ✅ Bilingual welcome message

---

### Step 2: Language Selection

#### Test 2a: Select English
**Action:** Click `🇺🇸 English`

**Expected Response:**
```
Are you 18 years or older?
```

**Inline Keyboard:**
- `✅ Yes, I am 18+`
- `❌ No`

**Test:**
- ✅ Previous message is **replaced** (not a new message)
- ✅ Message shows in English
- ✅ Two age confirmation buttons appear

#### Test 2b: Select Spanish
**Action:** Click `🇪🇸 Español`

**Expected Response:**
```
¿Tienes 18 años o más?
```

**Inline Keyboard:**
- `✅ Sí, tengo 18+`
- `❌ No`

**Test:**
- ✅ Previous message is **replaced**
- ✅ Message shows in Spanish
- ✅ Age confirmation buttons in Spanish

---

### Step 3: Age Confirmation

#### Test 3a: Age Confirmed (Happy Path)
**Action:** Click `✅ Yes, I am 18+`

**Expected Response:**
```
Please read and accept our Terms of Service and Privacy Policy:
```

**Inline Keyboard:**
- `📄 Terms of Service` (URL button → https://pnptv.app/terms)
- `🔒 Privacy Policy` (URL button → https://pnptv.app/privacy)
- `✅ I Accept`
- `❌ Decline`

**Test:**
- ✅ Message replaced (not stacked)
- ✅ Terms and Privacy buttons link to correct URLs
- ✅ Accept/Decline buttons appear

#### Test 3b: Age Declined (Edge Case)
**Action:** Click `❌ No`

**Expected Response:**
```
⚠️ Sorry, you must be 18+ to use this bot.
```

**Test:**
- ✅ Message replaced
- ✅ Bot stops onboarding
- ✅ No further buttons (flow ends)

---

### Step 4: Terms Acceptance

#### Test 4a: Terms Accepted (Happy Path)
**Action:** Click `✅ I Accept`

**Expected Response:**
```
Would you like to provide your email for updates? (Optional)
```

**Inline Keyboard:**
- `⏭️ Skip`

**Test:**
- ✅ Message replaced
- ✅ Skip button appears
- ✅ Bot waits for email input

#### Test 4b: Terms Declined (Edge Case)
**Action:** Click `❌ Decline`

**Expected Response:**
```
⚠️ You must accept the terms to continue.
```

**Test:**
- ✅ Message replaced
- ✅ Flow stops
- ✅ User cannot proceed

---

### Step 5: Email Collection

#### Test 5a: Valid Email Provided
**Action:** Type a valid email: `user@example.com`

**Expected Response:**
```
🎉 Setup complete! Welcome to PNPtv!

🎬 PNPtv - Your Entertainment Hub

What would you like to do?
```

**Inline Keyboard (Main Menu):**
```
[💎 Subscribe to PRIME] [👤 My Profile]
[🌍 Nearby Users]      [🎤 Live Streams]
[📻 Radio]             [🎥 Zoom Rooms]
[🤖 Support]           [⚙️ Settings]
```

**Test:**
- ✅ Completion message appears
- ✅ Main menu keyboard displays
- ✅ All 8 buttons are present
- ✅ Onboarding complete

#### Test 5b: Invalid Email Format
**Action:** Type invalid email: `notanemail`

**Expected Response:**
```
❌ Invalid email format. Please try again.
```

**Inline Keyboard:**
- `⏭️ Skip`

**Test:**
- ✅ Error message appears
- ✅ Skip button still available
- ✅ Bot continues waiting for valid email

#### Test 5c: Skip Email
**Action:** Click `⏭️ Skip`

**Expected Response:**
```
🎉 Setup complete! Welcome to PNPtv!

🎬 PNPtv - Your Entertainment Hub

What would you like to do?
```

**Inline Keyboard:** (Same as 5a)

**Test:**
- ✅ Completion message appears
- ✅ Main menu displays
- ✅ Onboarding complete without email

---

## Main Menu Navigation Test

After onboarding, test each button:

### Test 6: Main Menu Buttons

| Button | Expected Behavior |
|--------|------------------|
| `💎 Subscribe to PRIME` | Shows subscription plans |
| `👤 My Profile` | Shows user profile |
| `🌍 Nearby Users` | Shows nearby users (requires location) |
| `🎤 Live Streams` | Shows live streams menu |
| `📻 Radio` | Shows radio menu |
| `🎥 Zoom Rooms` | Shows zoom rooms menu |
| `🤖 Support` | Shows support menu |
| `⚙️ Settings` | Shows settings menu |

**Test Each Button:**
- ✅ Click registers
- ✅ Previous message is **replaced** (no stacking)
- ✅ Appropriate menu/feature appears

---

## Language Switching Test

### Test 7: Language Persistence

**Steps:**
1. Complete onboarding in English
2. Go to Settings → Change Language → Select Español
3. Return to main menu

**Expected:**
- ✅ All messages now in Spanish
- ✅ Inline buttons in Spanish
- ✅ Language persists across sessions

---

## Edge Cases & Error Handling

### Test 8: Multiple /start Commands

**Action:** Send `/start` after completing onboarding

**Expected:**
- ✅ Main menu appears (not onboarding again)
- ✅ No duplication of user data

### Test 9: Interrupting Onboarding

**Steps:**
1. Start onboarding
2. Mid-flow, send `/start` again

**Expected:**
- ✅ Onboarding restarts from language selection
- ✅ No state corruption

### Test 10: Invalid Inputs During Email

**Action:** Send gibberish text while bot waits for email

**Expected:**
- ✅ Invalid email error appears
- ✅ Bot continues waiting for valid email
- ✅ Skip button still works

---

## Console Logging (for test-onboarding.js)

When running `node test-onboarding.js`, you should see:

```
🚀 Starting onboarding test bot...
📱 Bot token: 8558254013:AAGaoJf2O...

📋 Test Steps:
1. Open Telegram and find your bot: @PNPtvBot
2. Send /start command
3. Follow the onboarding flow

✅ All actions are logged to console

# User actions logged as:
📱 User started onboarding: 123456789 username
🌐 Language selected: en by user: 123456789
✅ Age confirmed by user: 123456789
📝 Terms accepted by user: 123456789
⏭️  Email skipped by user: 123456789
🎉 Onboarding completed for user: 123456789
   Language: en
   Age 18+: true
   Terms accepted: true
   Email: Not provided
✅ Main menu displayed to user: 123456789
```

---

## Automated Test Script

For CI/CD integration, see: `src/tests/integration/onboarding.test.js`

Run automated tests:
```bash
npm test -- onboarding
```

---

## Troubleshooting

### Bot doesn't respond
- ✅ Check bot token in `.env`
- ✅ Verify bot is running: `ps aux | grep node`
- ✅ Check logs: `tail -f logs/combined-*.log`

### Messages stack instead of replacing
- ❌ Bug: Check that handlers use `editMessageText`
- ✅ Expected: All inline menu actions should replace previous message

### Email validation not working
- ✅ Check validation.js → isValidEmail function
- ✅ Test regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

---

## Success Criteria

✅ **Onboarding is considered successful if:**
1. User can select language (EN/ES)
2. Age verification works (blocks <18)
3. Terms acceptance required
4. Email validation works (optional)
5. All messages **replace** previous ones (no stacking)
6. Main menu appears after completion
7. User data saved properly
8. Language persists across features

---

## Next Steps

After onboarding passes all tests:
1. ✅ Move to testing **Profile Management**
2. ✅ Test **Subscription Plans**
3. ✅ Test **Payment Integration**
4. ✅ Test other features

---

**Test Date:** ___________
**Tested By:** ___________
**Version:** 1.0.0
**Status:** [ ] Pass [ ] Fail

**Notes:**
_______________________________
_______________________________
