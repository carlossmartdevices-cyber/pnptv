# Quick Test Reference Card

## 🚀 Quick Commands

```bash
# Automated Testing (No bot needed)
npm run test:bot:auto          # Run all automated tests
npm run test:bot:verbose       # Verbose output
npm run test:bot:report        # Generate HTML report

# Interactive Testing (Requires live bot)
npm run test:bot               # Full feature testing
npm run test:onboarding        # Onboarding only

# Unit Tests
npm test                       # Jest tests
npm run test:watch            # Jest watch mode
```

## 📊 Test Scripts Overview

| Script | Type | Bot Required? | User Input? | Best For |
|--------|------|---------------|-------------|----------|
| `test-bot-automated.js` | Automated | ❌ | ❌ | CI/CD, Quick validation |
| `test-bot-features.js` | Interactive | ✅ | ✅ | Manual QA, Demos |
| `test-onboarding.js` | Interactive | ✅ | ✅ | Onboarding debugging |

## 🎯 Common Test Scenarios

### Scenario 1: Before Committing Code
```bash
npm run test:bot:auto
# Should show ~95%+ pass rate
```

### Scenario 2: Testing New Feature
```bash
npm run test:bot
# Open Telegram, test manually
# All actions logged to console
```

### Scenario 3: Onboarding Issues
```bash
npm run test:onboarding
# Follow onboarding flow
# Check console for errors
```

### Scenario 4: CI/CD Pipeline
```bash
npm install
npm run test:bot:auto
npm test
```

## 📈 Expected Results

### Automated Tests
```
✓ Onboarding (5/5 tests)
✓ Subscription Plans (3/3 tests)
✓ Profile Management (3/3 tests)
✓ Nearby Users (2/2 tests)
✓ Live Streams (2/2 tests)
✓ Radio (2/2 tests)
✓ Zoom Rooms (2/2 tests)
✓ Support (2/2 tests)
✓ Settings (2/2 tests)
✓ Admin Panel (3/3 tests)
⚠ Error Handling (2/3 tests)

Pass Rate: 96.6% (28/29)
```

### Interactive Tests
Real-time logging:
```
[15:23:45] ✓ Language Selection
[15:23:47] ✓ Age Verification
[15:23:50] ✓ Terms Acceptance
[15:23:52] ✓ Email Validation
[15:23:53] ✓ Onboarding Complete
```

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Bot doesn't respond | Check `.env` for `TELEGRAM_BOT_TOKEN` |
| Tests failing | Run with `--verbose` flag |
| Missing dependencies | Run `npm install` |
| Env vars not set | Copy `.env.example` to `.env` |

## 📝 Test Checklist

Before deploying:

- [ ] `npm run test:bot:auto` passes
- [ ] `npm test` passes
- [ ] Manual test of onboarding flow
- [ ] Manual test of payment flow
- [ ] Admin features tested
- [ ] Error handling verified

## 🔗 Quick Links

- Full Guide: [TEST_SCRIPTS_README.md](./TEST_SCRIPTS_README.md)
- Testing Guide: [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- Developer Guide: [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)

---

**TIP:** Run `npm run test:bot:auto` before every commit!
