# PNPtv Bot - Comprehensive Testing Guide

This guide explains how to test all bot features using the automated test scripts.

## Available Test Scripts

### 1. **test-bot-features.js** (Comprehensive Test Suite)
Tests all major bot features with detailed logging and real-time feedback.

### 2. **test-onboarding.js** (Onboarding Flow Only)
Tests only the onboarding flow - useful for quick onboarding verification.

---

## Quick Start

### Prerequisites

1. Ensure you have Node.js installed (v18+)
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your `.env` file with:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token
   BOT_USERNAME=your_bot_username
   ```

### Running the Comprehensive Test

```bash
node test-bot-features.js
```

### Running the Onboarding Test Only

```bash
node test-onboarding.js
```

---

## What Gets Tested

### ✅ Onboarding Flow
- Language selection (English/Spanish)
- Age verification (18+ check)
- Terms & conditions acceptance
- Email collection (with validation)
- Profile creation

### ✅ Main Menu
- Menu display
- Navigation between features
- Button functionality

### ✅ Subscription Plans
- Display of all plans (Basic, Premium, Gold)
- Plan selection
- Payment method selection (Daimo, ePayco)
- Payment flow simulation

### ✅ Profile Management
- Profile display
- Profile editing menu
- Photo update
- Bio update
- Location update

### ✅ Nearby Users
- User discovery
- Distance calculation
- Refresh functionality

### ✅ Live Streams
- Stream listing
- Stream watching
- Stream creation

### ✅ Radio
- Radio player display
- Play/pause functionality
- Now playing information

### ✅ Zoom Rooms
- Room listing
- Join room functionality
- Create room functionality

### ✅ Support
- FAQ display
- AI chat simulation
- Admin contact

### ✅ Settings
- Language settings
- Notification toggles
- Privacy settings

### ✅ Admin Panel
- Access control
- User management
- Statistics
- Broadcast functionality

---

## Test Output

The test script provides color-coded real-time feedback:

```
🟢 [PASS] - Test passed successfully
🔴 [FAIL] - Test failed
🟡 [SKIP] - Test skipped
```

### Example Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 TESTING: Onboarding Flow
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User: 123456789 (@testuser)
[PASS] Language Selection
  ✓ Language set to: en
[PASS] Age Confirmation
  ✓ Age verified: 18+
[PASS] Terms Acceptance
  ✓ Terms and conditions accepted
[PASS] Email Validation
  ✓ Valid email provided: test@example.com
[PASS] Onboarding Completion
  ✓ User profile created
  ✓ Main menu displayed
```

---

## Testing Workflow

### 1. Start the Test Bot

```bash
node test-bot-features.js
```

You should see:
```
╔════════════════════════════════════════════════════════════╗
║         PNPtv Bot - Comprehensive Feature Test            ║
╚════════════════════════════════════════════════════════════╝

📱 Bot Token: 123456789:ABCDEF...
🤖 Bot Username: @YourBotName

📋 Available Test Commands:
  /start  - Test onboarding flow
  /menu   - Test main menu

🚀 Test bot is running!
💬 Open Telegram and start testing...
```

### 2. Test Onboarding Flow

1. Open Telegram
2. Find your bot: `@YourBotUsername`
3. Send `/start` command
4. Follow the prompts:
   - Select language
   - Confirm age (18+)
   - Accept terms
   - Provide email or skip

### 3. Test Main Features

After onboarding, you'll see the main menu with all features:

- **💎 Subscribe** - Test subscription plans
- **👤 Profile** - Test profile management
- **🌍 Nearby** - Test nearby users feature
- **🎤 Live** - Test live streaming
- **📻 Radio** - Test radio player
- **🎥 Zoom** - Test Zoom rooms
- **🤖 Support** - Test support features
- **⚙️ Settings** - Test settings

Click each button to test the corresponding feature.

### 4. Test Specific Features

#### Testing Subscriptions
1. Click "💎 Subscribe"
2. Select a plan (Basic/Premium/Gold)
3. Choose payment method (Daimo/ePayco)
4. Observe the test confirmation

#### Testing Profile
1. Click "👤 Profile"
2. Click "✏️ Edit Profile"
3. Test bio update by clicking "📝 Bio"
4. Send a text message to update your bio
5. Verify the update appears in your profile

#### Testing Admin Features
1. Add your Telegram user ID to `ADMIN_USER_IDS` in `.env`
2. Click "🔧 Admin"
3. Explore admin panel features:
   - User list
   - Statistics
   - Broadcast

---

## Troubleshooting

### Bot doesn't respond

**Check:**
- Is the bot token correct in `.env`?
- Is the test script running without errors?
- Did you start a chat with the bot on Telegram?

**Solution:**
```bash
# Verify bot token
echo $TELEGRAM_BOT_TOKEN

# Restart the test script
node test-bot-features.js
```

### Email validation fails

**Issue:** Email format not recognized

**Solution:** Use a valid email format:
- ✅ `test@example.com`
- ✅ `user@domain.co.uk`
- ❌ `notemail`
- ❌ `@example.com`

### Admin features not accessible

**Issue:** User ID not in admin list

**Solution:** Add your Telegram user ID to `.env`:
```bash
ADMIN_USER_IDS=123456789,987654321
```

To find your Telegram user ID, check the console output when you send `/start`:
```
User: 123456789 (@username)
       ^^^^^^^^^
       This is your user ID
```

### Test script crashes

**Check:**
- Node.js version: `node --version` (should be v18+)
- Dependencies installed: `npm install`
- `.env` file exists and is properly formatted

---

## Advanced Testing

### Testing with Multiple Users

1. Start the test bot
2. Use multiple Telegram accounts
3. Test interactions between users (nearby users, etc.)

### Testing Payment Webhooks

For full payment testing, you'll need:
- Daimo API credentials
- ePayco credentials
- A publicly accessible webhook URL

See the main documentation for production testing.

### Testing in Production Mode

```bash
# Set production environment
NODE_ENV=production node test-bot-features.js
```

---

## Automated Testing vs Manual Testing

### Use `test-bot-features.js` for:
- ✅ Quick feature verification
- ✅ Regression testing
- ✅ Onboarding flow testing
- ✅ UI/UX testing
- ✅ Integration testing

### Use Jest unit tests (`npm test`) for:
- ✅ Service layer testing
- ✅ Validation logic
- ✅ Business logic
- ✅ API endpoints

### Manual Testing Required for:
- ⚠️ Payment gateway integration
- ⚠️ Actual Zoom room creation
- ⚠️ Live streaming with real RTMP
- ⚠️ Radio streaming
- ⚠️ Location-based features with real GPS

---

## Test Data

The test script uses in-memory storage, so all data is lost when the script stops.

### Test Users
All users who interact with the test bot are stored in memory.

### Test Subscriptions
Subscription flows are simulated - no actual charges are made.

---

## Viewing Test Results

### Console Output

All test results are logged to the console in real-time with:
- Timestamps
- Color-coded status
- Detailed step information
- User IDs and actions

### Session Summary

When you stop the test bot (Ctrl+C), you'll see a summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Test Session Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Users Tested: 5
Total Sessions: 5

👋 Shutting down test bot...
```

---

## Best Practices

### 1. Test in Order
Follow the natural user flow:
1. Onboarding first
2. Then main features
3. Then advanced features (admin, payments)

### 2. Test Edge Cases
- Try invalid inputs (bad email formats)
- Test access control (admin features as non-admin)
- Test cancellation flows

### 3. Keep Console Visible
Watch the console output while testing to catch any issues immediately.

### 4. Use Multiple Test Accounts
Test with different user roles:
- Regular users
- Subscribers (simulated)
- Admin users

### 5. Test Both Languages
Test in both English and Spanish to verify translations work correctly.

---

## Next Steps

After successful testing:

1. **Deploy to Production**
   ```bash
   npm start
   ```

2. **Monitor Logs**
   ```bash
   tail -f logs/combined.log
   ```

3. **Run Jest Tests**
   ```bash
   npm test
   ```

4. **Set Up Monitoring**
   - Configure Sentry for error tracking
   - Set up analytics
   - Monitor payment webhooks

---

## Support

If you encounter issues:

1. Check the console output for error messages
2. Verify your `.env` configuration
3. Ensure all dependencies are installed
4. Check Telegram bot permissions

For production issues, check:
- Firestore connection
- Redis connection
- Payment gateway status
- API rate limits

---

## Test Script Maintenance

The test script is designed to mirror the production bot's functionality. When you update the production bot:

1. Update the corresponding test handlers in `test-bot-features.js`
2. Add new features to the test menu
3. Update this documentation

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `node test-bot-features.js` | Run full test suite |
| `node test-onboarding.js` | Test onboarding only |
| `npm test` | Run Jest unit tests |
| `/start` | Begin onboarding test |
| `/menu` | Show main menu |
| Ctrl+C | Stop test and show summary |

---

## Feature Coverage

| Feature | Test Coverage | Notes |
|---------|---------------|-------|
| Onboarding | ✅ Full | All steps tested |
| Subscriptions | ✅ Full | Simulated payments |
| Profile | ✅ Full | All edit options |
| Nearby Users | ⚠️ Partial | Simulated data |
| Live Streams | ⚠️ Partial | Simulated streams |
| Radio | ⚠️ Partial | Simulated player |
| Zoom Rooms | ⚠️ Partial | Simulated rooms |
| Support | ✅ Full | All options tested |
| Settings | ✅ Full | All settings tested |
| Admin | ✅ Full | Access control tested |

✅ Full = All functionality tested
⚠️ Partial = UI tested, backend simulated

---

Happy Testing! 🚀
