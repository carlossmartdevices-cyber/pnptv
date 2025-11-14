# Quick Start - Testing Onboarding Feature

## 🚀 Fastest Way to Test

### On Your Local Machine or Server:

```bash
# 1. Clone and setup
git clone <your-repo>
cd pnptv
npm install

# 2. Configure environment
cp .env.example .env
# The bot token is already set: 8558254013:AAGaoJf2O7bIQn4r7GpQpMAh99-1M3PYE9U

# 3. Run onboarding test (no infrastructure needed!)
node test-onboarding.js
```

That's it! The test script uses **in-memory storage** so you don't need:
- ❌ Firebase/Firestore
- ❌ Redis
- ❌ Any database

---

## 📱 Test in Telegram

1. **Open Telegram** on your phone or desktop
2. **Search for:** `@PNPtvBot`
3. **Send:** `/start`
4. **Follow the flow:**

```
Step 1: Choose language (English/Español)
   ↓
Step 2: Confirm you're 18+
   ↓
Step 3: Accept terms (read links if you want)
   ↓
Step 4: Provide email or skip
   ↓
Step 5: See main menu ✅
```

---

## ✅ What to Look For

### Message Replacement (CRITICAL)
- Each step should **replace** the previous message
- **NOT** create a new message below
- This prevents message stacking

**How to verify:**
- There should only be ONE active message during the whole flow
- Old messages disappear when you click a button

### Inline Keyboards Work
- All buttons should be clickable
- Terms/Privacy links should open in browser
- Language should persist (if you choose Spanish, all messages in Spanish)

### Email Validation
- Try valid email: `test@example.com` → ✅ Accepts
- Try invalid: `notanemail` → ❌ Shows error, asks again
- Click "Skip" → ✅ Continues without email

### Main Menu Appears
After completing onboarding, you should see:
```
💎 Subscribe to PRIME    👤 My Profile
🌍 Nearby Users          🎤 Live Streams
📻 Radio                 🎥 Zoom Rooms
🤖 Support               ⚙️ Settings
```

---

## 🐛 Console Logs (If Running test-onboarding.js)

You'll see detailed logs:
```
📱 User started onboarding: 123456789 username
🌐 Language selected: en by user: 123456789
✅ Age confirmed by user: 123456789
📝 Terms accepted by user: 123456789
📧 Email received: test@example.com from user: 123456789
🎉 Onboarding completed for user: 123456789
   Language: en
   Age 18+: true
   Terms accepted: true
   Email: test@example.com
✅ Main menu displayed to user: 123456789
```

---

## 🎯 Success Criteria

Onboarding passes if:
- ✅ All 5 steps complete
- ✅ Messages replace (no stacking)
- ✅ Email validation works
- ✅ Language persists
- ✅ Main menu appears at end
- ✅ No errors in console

---

## 🔄 Test Both Languages

1. First run: Choose **English**
2. Second run: Send `/start` again, choose **Español**
3. Verify all messages are in Spanish

---

## 📊 Full Test Checklist

See **TESTING_GUIDE.md** for detailed test scenarios including:
- Edge cases (age < 18, declined terms)
- Error handling
- Invalid inputs
- Flow interruption
- Multiple /start commands

---

## 🎬 Ready to Test?

**Quick Command:**
```bash
node test-onboarding.js
```

Then open Telegram and message: **@PNPtvBot**

**Test time:** ~2 minutes
**No setup required:** Test script handles everything!

---

## 📞 Need Help?

- Check logs: Console output shows all actions
- See full guide: **TESTING_GUIDE.md**
- Flow diagram: **docs/ONBOARDING_FLOW.md**
- Code: `src/bot/handlers/user/onboardingHandler.js:1`

Happy testing! 🎉
