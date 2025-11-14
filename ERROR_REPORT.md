# PNPtv Bot Test & Runtime Error Report

## 1. Test Suite Errors (Jest)

### Summary
- All test suites failed to run.
- Main error: `SyntaxError: Cannot use import statement outside a module`
- Cause: Jest is not configured to handle ES module `import` syntax by default.

### Example Error
```
/root/pnptv/src/tests/unit/webhookValidator.test.js:5
import {
^^^^^^
SyntaxError: Cannot use import statement outside a module
```

### Details
- This error appears in all test files using ES module imports:
  - webhookValidator.test.js
  - validation.test.js
  - membershipService.test.js
  - subscriptionService.test.js
  - logger.test.js

### Jest Output
- No tests were executed.
- Coverage: 0% for all files.

### How to Fix
- Configure Jest for ES modules:
  - Add `"type": "module"` to `package.json`.
  - Update `jest.config.js`:
    - Add `extensionsToTreatAsEsm: [".js"]`
    - Use Babel or another transformer for ES modules.
  - See: https://jestjs.io/docs/ecmascript-modules

---

## 2. Runtime Errors (PM2 Logs)

### Import Errors
- `Error: Cannot find module '/root/pnptv/src/bot/utils/logger.js' imported from /root/pnptv/src/bot/handlers/admin/utils/session.js`
- Cause: No file at `/root/pnptv/src/bot/utils/logger.js`. Symlink workaround applied.

- `Error: Cannot find module '/root/pnptv/src/bot/utils/i18n.js' imported from /root/pnptv/src/bot/handlers/admin/utils/errorHandler.js`
- Cause: No file at `/root/pnptv/src/bot/utils/i18n.js`. Should import from `../../../../utils/i18n.js`.

### Syntax Errors
- `SyntaxError: Unexpected token '*'`
- Cause: Stray block comment (`*/`) in `errorHandler.js`. Fixed by removing the stray character.

### Telegraf Bot Errors
- `400: Bad Request: message can't be edited`
- Cause: Attempt to edit a Telegram message that cannot be edited (e.g., message is too old or not editable).

### HTTP 404 Errors
- Multiple `POST /webhook/telegram HTTP/1.1 404` and `GET / HTTP/1.1 404` errors.
- Cause: Webhook or HTTP endpoint not found or not configured.

---

## 3. Coverage Summary
- All files: 0% coverage (no tests executed).

---

## Next Steps
- Fix Jest configuration for ES modules.
- Correct import paths for `i18n.js` in admin utility files.
- Review bot logic for Telegram message editing errors.
- Ensure all required endpoints are configured and available.
