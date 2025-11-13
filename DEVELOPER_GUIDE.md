# Developer Guide - PNPtv Telegram Bot

## Table of Contents
1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Key Concepts](#key-concepts)
4. [Development Workflow](#development-workflow)
5. [Adding New Features](#adding-new-features)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

## Getting Started

### Development Environment Setup

1. **Clone and install**
   \`\`\`bash
   git clone https://github.com/yourusername/pnptv.git
   cd pnptv
   npm install
   \`\`\`

2. **Set up Firebase**
   - Create a Firebase project
   - Enable Firestore
   - Download service account JSON
   - Add credentials to `.env`

3. **Set up Redis**
   - Install Redis locally or use Docker:
     \`\`\`bash
     docker run -d -p 6379:6379 redis:7-alpine
     \`\`\`

4. **Get API keys**
   - Telegram: Talk to [@BotFather](https://t.me/botfather)
   - Daily.co: Sign up at [https://www.daily.co/](https://www.daily.co/)
   - ePayco: Register at [https://epayco.co/](https://epayco.co/)
   - OpenAI: Get key from [https://platform.openai.com/](https://platform.openai.com/)

5. **Run development server**
   \`\`\`bash
   npm run dev
   \`\`\`

## Architecture Overview

### Layers

1. **Handlers Layer** (`src/bot/handlers/`)
   - Receives user input
   - Minimal logic
   - Delegates to services

2. **Services Layer** (`src/services/`)
   - Business logic
   - Orchestrates between models
   - Returns data to handlers

3. **Models Layer** (`src/models/`)
   - Direct database interaction
   - CRUD operations
   - Data validation

4. **Utils Layer** (`src/utils/`)
   - Reusable utilities
   - Logging, validation, i18n
   - No business logic

### Data Flow

\`\`\`
User Input → Handler → Service → Model → Firestore
                ↓         ↓         ↓
              Response ← Cache ← Redis
\`\`\`

## Key Concepts

### Inline Menu Pattern

All menus use `editMessageText` to replace previous messages:

\`\`\`javascript
// Good - replaces message
bot.action('show_menu', async (ctx) => {
  await ctx.editMessageText('Menu text', {
    reply_markup: {
      inline_keyboard: [[/* buttons */]],
    },
  });
});

// Bad - stacks messages
bot.action('show_menu', async (ctx) => {
  await ctx.reply('Menu text'); // Don't do this for menus
});
\`\`\`

### Session Management

Sessions are stored in Redis:

\`\`\`javascript
// Access session data
const lang = ctx.session.language;

// Set session data
ctx.session.waitingFor = 'email';

// Clear session data
delete ctx.session.waitingFor;
\`\`\`

### Error Handling

All handlers should use try-catch:

\`\`\`javascript
bot.action('some_action', async (ctx) => {
  try {
    // Your logic here
  } catch (error) {
    logger.error('Error in some_action:', error);
    await ctx.reply(t('error', getUserLanguage(ctx)));
  }
});
\`\`\`

### Internationalization

Always use translation keys:

\`\`\`javascript
import { t, getUserLanguage } from '../utils/i18n.js';

const lang = getUserLanguage(ctx);
await ctx.reply(t('welcome', lang));

// With variables
await ctx.reply(t('userCount', lang, { count: 100 }));
\`\`\`

## Development Workflow

### 1. Create a New Handler

\`\`\`javascript
// src/bot/handlers/user/newFeatureHandler.js
import { Markup } from 'telegraf';
import { t, getUserLanguage } from '../../../utils/i18n.js';
import logger from '../../../utils/logger.js';

export function registerNewFeatureHandlers(bot) {
  bot.action('show_new_feature', async (ctx) => {
    try {
      const lang = getUserLanguage(ctx);

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback(t('back', lang), 'main_menu')],
      ]);

      await ctx.editMessageText(t('newFeatureIntro', lang), keyboard);
    } catch (error) {
      logger.error('Error in new feature:', error);
    }
  });
}

export default registerNewFeatureHandlers;
\`\`\`

### 2. Register Handler in bot.js

\`\`\`javascript
// src/bot/core/bot.js
import { registerNewFeatureHandlers } from '../handlers/user/newFeatureHandler.js';

// In initializeBot()
registerNewFeatureHandlers(bot);
\`\`\`

### 3. Add Translations

\`\`\`javascript
// src/utils/i18n.js
const translations = {
  en: {
    newFeatureIntro: '✨ Welcome to the new feature!',
  },
  es: {
    newFeatureIntro: '✨ ¡Bienvenido a la nueva característica!',
  },
};
\`\`\`

### 4. Add Service Logic (if needed)

\`\`\`javascript
// src/services/newFeatureService.js
export async function doSomething(userId, data) {
  // Business logic here
}
\`\`\`

### 5. Add Tests

\`\`\`javascript
// src/tests/unit/newFeature.test.js
describe('New Feature', () => {
  test('should do something', () => {
    // Test implementation
  });
});
\`\`\`

## Adding New Features

### Example: Adding a "Favorites" Feature

1. **Create Model**
   \`\`\`javascript
   // src/models/favoriteModel.js
   export async function addFavorite(userId, targetUserId) {
     // Implementation
   }
   \`\`\`

2. **Create Service**
   \`\`\`javascript
   // src/services/favoriteService.js
   export async function toggleFavorite(userId, targetUserId) {
     // Implementation
   }
   \`\`\`

3. **Create Handler**
   \`\`\`javascript
   // src/bot/handlers/user/favoriteHandler.js
   export function registerFavoriteHandlers(bot) {
     // Implementation
   }
   \`\`\`

4. **Add to Menu**
   \`\`\`javascript
   // In mainMenuHandler.js
   [Markup.button.callback(t('favorites', lang), 'show_favorites')]
   \`\`\`

## Testing

### Unit Tests

\`\`\`bash
# Run all tests
npm test

# Run specific test file
npm test -- validation.test.js

# Watch mode
npm run test:watch

# Coverage
npm test -- --coverage
\`\`\`

### Integration Tests

\`\`\`javascript
// src/tests/integration/payment.test.js
describe('Payment Flow', () => {
  test('should activate subscription on successful payment', async () => {
    // Mock webhook call
    // Verify subscription activation
  });
});
\`\`\`

### Manual Testing

Use Telegram's test environment:
- Create a test bot
- Use test payment credentials
- Test all user flows

## Deployment

### Staging Deployment

\`\`\`bash
# Build
docker build -t pnptv-bot:staging .

# Deploy
docker-compose -f docker-compose.staging.yml up -d
\`\`\`

### Production Deployment

\`\`\`bash
# Tag release
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# CI/CD will automatically deploy
\`\`\`

### Database Migrations

\`\`\`bash
# Run subscription expiry check manually
npm run migration:expiry
\`\`\`

## Troubleshooting

### Common Issues

1. **Bot not responding**
   - Check bot token in .env
   - Verify bot is running: `docker ps`
   - Check logs: `docker logs pnptv-bot`

2. **Firestore permission denied**
   - Verify service account credentials
   - Check Firestore rules
   - Ensure indexes are created

3. **Redis connection failed**
   - Check Redis is running: `redis-cli ping`
   - Verify REDIS_HOST and REDIS_PORT
   - Check firewall/network settings

4. **Payments not working**
   - Verify webhook URLs are publicly accessible
   - Check payment provider credentials
   - Review webhook logs

### Debugging

Enable debug logging:

\`\`\`bash
LOG_LEVEL=debug npm run dev
\`\`\`

View logs in real-time:

\`\`\`bash
tail -f logs/combined-$(date +%Y-%m-%d).log
\`\`\`

### Performance Issues

1. **Check Redis cache hit rate**
   \`\`\`bash
   redis-cli info stats | grep keyspace
   \`\`\`

2. **Monitor Firestore queries**
   - Use Firebase Console > Firestore > Usage
   - Optimize queries with composite indexes

3. **Profile Node.js**
   \`\`\`bash
   node --prof src/index.js
   \`\`\`

## Best Practices

1. **Always use transactions for critical operations**
2. **Cache frequently accessed data**
3. **Implement rate limiting for expensive operations**
4. **Use batch writes for multiple Firestore updates**
5. **Keep handlers thin, move logic to services**
6. **Write tests for all business logic**
7. **Log all errors with context**
8. **Use environment variables for all configuration**

## Resources

- [Telegraf Documentation](https://telegraf.js.org/)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Redis Best Practices](https://redis.io/topics/optimization)
- [Daily.co API Docs](https://docs.daily.co/)

---

Questions? Open an issue on GitHub or contact the team.
