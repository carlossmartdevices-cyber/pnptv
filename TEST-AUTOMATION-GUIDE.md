# Bot Testing Automation Guide

## Overview

This guide explains how to use the automated testing scripts for the PNPtv Telegram bot. We provide three different testing approaches to match your needs.

## Available Test Scripts

### 1. **Automated Test Suite** (Recommended)
**File:** `test-bot-automated.js`

Fully automated testing with comprehensive reporting. No manual interaction required.

#### Features:
- ✅ Automated validation of all bot features
- ✅ Structured test suites with pass/fail tracking
- ✅ JSON and HTML report generation
- ✅ Filter tests by feature
- ✅ Verbose logging mode
- ✅ CI/CD compatible

#### Usage:

```bash
# Run all tests
npm run test:bot:auto

# Run specific feature tests
node test-bot-automated.js --feature=onboarding
node test-bot-automated.js --feature=subscription
node test-bot-automated.js --feature=profile

# Verbose mode (detailed logging)
npm run test:bot:verbose

# Generate HTML report
npm run test:bot:report

# Generate JSON report
node test-bot-automated.js --report=json

# Combine options
node test-bot-automated.js --feature=onboarding --verbose --report=html
```

#### Available Features:
- `onboarding` - User onboarding flow
- `subscription` - Subscription plans and payments
- `profile` - Profile management
- `nearby` - Nearby users feature
- `livestreams` - Live streaming
- `radio` - Radio features
- `zoom` - Zoom rooms
- `support` - Support system
- `settings` - User settings
- `admin` - Admin panel
- `errors` - Error handling

#### Output:

**Console Output:**
```
╔════════════════════════════════════════════════════════════╗
║       PNPtv Bot - Automated Testing Suite                 ║
╚════════════════════════════════════════════════════════════╝

✓ Onboarding → Language options available
✓ Onboarding → Email validation
✓ Onboarding → Age verification
✓ Onboarding → Terms acceptance
✓ Onboarding → Session state management

────────────────────────────────────────────────────────────
Onboarding Summary
────────────────────────────────────────────────────────────
Total: 5 | Passed: 5 | Failed: 0 | Skipped: 0
Pass Rate: 100.0%

═══════════════════════════════════════════════════════════
FINAL TEST REPORT
═══════════════════════════════════════════════════════════

Total Tests: 42
Passed: 40
Failed: 2
Skipped: 0
Pass Rate: 95.2%
```

**HTML Report:**
- Professional HTML report with charts
- Test breakdown by suite
- Visual pass/fail indicators
- Saved as `test-report-[timestamp].html`

**JSON Report:**
- Machine-readable test results
- Complete test details and timing
- Saved as `test-report-[timestamp].json`

---

### 2. **Interactive Feature Test** (Manual)
**File:** `test-bot-features.js`

Interactive bot instance that you control through Telegram. Real-time logging.

#### Features:
- ✅ Real bot interaction via Telegram
- ✅ In-memory storage (no database needed)
- ✅ Color-coded console logging
- ✅ Test all features interactively
- ✅ See bot responses in real-time

#### Usage:

```bash
# Start the interactive test bot
npm run test:bot

# Or directly
node test-bot-features.js
```

#### How to Test:

1. **Start the bot:**
   ```bash
   npm run test:bot
   ```

2. **Open Telegram** and find your bot: `@PNPtvBot`

3. **Send `/start`** to begin testing

4. **Interact** with the bot normally

5. **Watch console** for test results:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🚀 TESTING: Onboarding Flow
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   User: 123456789 (@testuser)
   [PASS] Language Selection
     ✓ Language set to: en
   [PASS] Age Confirmation
     ✓ Age verified: 18+
   ```

6. **Test all features** through the menus

#### Available Commands:
- `/start` - Test onboarding flow
- `/menu` - Show main menu

#### Tested Features:
- Onboarding (language, age, terms, email)
- Subscription plans
- Payment flows (Daimo, ePayco)
- Profile management
- Nearby users
- Live streams
- Radio
- Zoom rooms
- Support (FAQ, AI chat, admin contact)
- Settings (language, notifications, privacy)
- Admin panel

---

### 3. **Onboarding-Only Test** (Lightweight)
**File:** `test-onboarding.js`

Minimal test script focused only on the onboarding flow.

#### Features:
- ✅ Lightweight (no dependencies on services)
- ✅ Quick onboarding validation
- ✅ Console logging
- ✅ Perfect for onboarding debugging

#### Usage:

```bash
# Run onboarding test
npm run test:onboarding

# Or directly
node test-onboarding.js
```

#### Test Flow:
1. Language selection (EN/ES)
2. Age verification (18+)
3. Terms acceptance
4. Email collection (optional)
5. Main menu display

---

## Comparison Table

| Feature | Automated | Interactive | Onboarding-Only |
|---------|-----------|-------------|-----------------|
| **No manual interaction** | ✅ | ❌ | ❌ |
| **Real Telegram testing** | ❌ | ✅ | ✅ |
| **HTML/JSON reports** | ✅ | ❌ | ❌ |
| **CI/CD compatible** | ✅ | ❌ | ❌ |
| **Full feature coverage** | ✅ | ✅ | ❌ |
| **Quick setup** | ✅ | ✅ | ✅ |
| **Verbose logging** | ✅ | ✅ | ✅ |
| **No database needed** | ✅ | ✅ | ✅ |

---

## Test Coverage

### What Gets Tested:

#### ✅ **Onboarding**
- Language selection (EN/ES)
- Age verification
- Terms acceptance
- Email validation
- Session state management

#### ✅ **Subscription**
- Plan definitions (Basic, Premium, Gold)
- Payment methods (Daimo, ePayco)
- Subscription status tracking

#### ✅ **Profile**
- Profile data structure
- Bio length validation
- Profile update flow

#### ✅ **Nearby Users**
- Distance calculation
- Privacy settings

#### ✅ **Live Streams**
- Stream URL generation
- Viewer count tracking

#### ✅ **Radio**
- Playlist structure
- Radio controls (play, pause, skip)

#### ✅ **Zoom Rooms**
- Room creation
- Room URL generation
- Participant limits

#### ✅ **Support**
- Support categories (FAQ, AI, Admin)
- FAQ structure

#### ✅ **Settings**
- Language preferences
- Notification settings
- Privacy controls

#### ✅ **Admin Panel**
- Admin authorization
- User statistics
- Broadcast capability

#### ✅ **Error Handling**
- Invalid input validation
- Environment variable checks
- Session recovery

---

## CI/CD Integration

### GitHub Actions Example:

```yaml
name: Bot Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run automated tests
        run: npm run test:bot:auto
        env:
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          BOT_USERNAME: ${{ secrets.BOT_USERNAME }}
      
      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-report
          path: test-report-*.html
```

---

## Troubleshooting

### Tests Not Running

**Issue:** Script fails to start

**Solution:**
```bash
# Check Node.js version (should be 18+)
node --version

# Reinstall dependencies
npm install

# Check environment variables
cat .env | grep TELEGRAM_BOT_TOKEN
```

### Bot Not Responding (Interactive Tests)

**Issue:** Bot doesn't respond in Telegram

**Solution:**
1. Verify bot token in `.env`
2. Check bot is running: `ps aux | grep node`
3. Verify bot username: `@PNPtvBot`
4. Check logs for errors

### Tests Failing

**Issue:** Automated tests showing failures

**Solution:**
```bash
# Run with verbose mode to see details
npm run test:bot:verbose

# Run specific feature test
node test-bot-automated.js --feature=onboarding --verbose

# Check the HTML report for details
node test-bot-automated.js --report=html
```

### Email Validation Failing

**Issue:** Valid emails being rejected

**Solution:**
- Check `src/utils/validation.js`
- Verify regex pattern: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Test specific emails in verbose mode

---

## Best Practices

### 1. **Run Tests Before Deployment**
```bash
# Always run automated tests before deploying
npm run test:bot:auto

# Generate report for records
npm run test:bot:report
```

### 2. **Test After Code Changes**
```bash
# If you modified onboarding
node test-bot-automated.js --feature=onboarding

# If you modified multiple features
npm run test:bot:auto
```

### 3. **Interactive Testing for UX**
```bash
# Use interactive test to verify user experience
npm run test:bot

# Test in both languages
# - Select English, complete flow
# - Restart, select Spanish, complete flow
```

### 4. **Keep Test Reports**
```bash
# Generate timestamped reports
node test-bot-automated.js --report=html
node test-bot-automated.js --report=json

# Archive reports
mkdir -p test-reports
mv test-report-*.html test-reports/
mv test-report-*.json test-reports/
```

---

## Advanced Usage

### Custom Test Scenarios

Create custom test scenarios by modifying `test-bot-automated.js`:

```javascript
async function testCustomScenario() {
  const suite = new TestSuite('Custom Scenario', 'My custom tests');
  
  try {
    // Your test logic here
    suite.addTest('My custom test', 'passed', { data: 'test' });
  } catch (error) {
    suite.addTest('My custom test', 'failed', { error: error.message });
  }
  
  suite.summary();
  return suite;
}

// Add to test suites array in runAllTests()
```

### Environment-Specific Testing

```bash
# Development environment
NODE_ENV=development npm run test:bot:auto

# Staging environment
NODE_ENV=staging npm run test:bot:auto

# Production validation
NODE_ENV=production npm run test:bot:auto
```

---

## Quick Reference

### Commands Cheat Sheet

```bash
# Automated (no interaction needed)
npm run test:bot:auto              # All tests
npm run test:bot:verbose           # Verbose output
npm run test:bot:report            # HTML report

# Interactive (requires Telegram)
npm run test:bot                   # Full features
npm run test:onboarding            # Onboarding only

# Specific feature
node test-bot-automated.js --feature=onboarding
node test-bot-automated.js --feature=subscription
node test-bot-automated.js --feature=admin

# Report generation
node test-bot-automated.js --report=json
node test-bot-automated.js --report=html

# Combined
node test-bot-automated.js --feature=onboarding --verbose --report=html
```

---

## Support

If you encounter issues:

1. **Check logs:** Console output shows detailed errors
2. **Run verbose:** Add `--verbose` flag for more details
3. **Generate report:** HTML reports show all test details
4. **Review docs:** See `TESTING_GUIDE.md` for manual testing
5. **Check environment:** Verify `.env` file is configured

---

## Version History

- **v1.0.0** - Initial automated testing suite
  - Automated test runner
  - Interactive feature tests
  - Onboarding-only tests
  - HTML/JSON reporting
  - CI/CD support

---

**Last Updated:** 2025-01-14  
**Maintainer:** PNPtv Development Team
