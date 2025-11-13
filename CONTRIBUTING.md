# Contributing to PNPtv Telegram Bot

Thank you for your interest in contributing to PNPtv! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How to Contribute

### Reporting Bugs

1. **Check existing issues** to avoid duplicates
2. **Use the bug report template** when creating a new issue
3. **Include details**:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)
   - Logs and screenshots if applicable

### Suggesting Features

1. **Check the roadmap** and existing feature requests
2. **Use the feature request template**
3. **Describe the use case** and expected benefits
4. **Consider implementation** - how would it work?

### Code Contributions

#### Getting Started

1. **Fork the repository**
   \`\`\`bash
   git clone https://github.com/YOUR_USERNAME/pnptv.git
   cd pnptv
   \`\`\`

2. **Create a branch**
   \`\`\`bash
   git checkout -b feature/your-feature-name
   \`\`\`

3. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

4. **Set up environment**
   - Copy `.env.example` to `.env`
   - Add your credentials

#### Development Guidelines

##### Code Style

- Use ESLint and Prettier (configs included)
- Run before committing:
  \`\`\`bash
  npm run lint
  npm run format
  \`\`\`

##### File Organization

- **Handlers**: `/src/bot/handlers/` - User interactions
- **Services**: `/src/services/` - Business logic
- **Models**: `/src/models/` - Data access
- **Utils**: `/src/utils/` - Reusable utilities

##### Naming Conventions

- **Files**: camelCase.js (e.g., `userService.js`)
- **Functions**: camelCase (e.g., `getUserById`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Classes**: PascalCase (e.g., `PaymentService`)

##### Writing Handlers

Always follow this pattern:

\`\`\`javascript
export function registerYourHandlers(bot) {
  bot.action('your_action', async (ctx) => {
    try {
      const lang = getUserLanguage(ctx);
      // Your logic here
    } catch (error) {
      logger.error('Error in your_action:', error);
      await ctx.reply(t('error', getUserLanguage(ctx)));
    }
  });
}
\`\`\`

##### Error Handling

- Always use try-catch in async functions
- Log errors with context: `logger.error('Message:', error)`
- Send user-friendly messages using i18n

##### Internationalization

- Add translations to `src/utils/i18n.js`
- Support both English and Spanish
- Use translation keys, not hardcoded strings

\`\`\`javascript
// Good
await ctx.reply(t('welcome', lang));

// Bad
await ctx.reply('Welcome to PNPtv');
\`\`\`

#### Testing

- Write unit tests for all business logic
- Add integration tests for critical flows
- Ensure tests pass before submitting PR:
  \`\`\`bash
  npm test
  \`\`\`

#### Commits

Use conventional commit messages:

\`\`\`
feat: Add favorites feature
fix: Resolve payment webhook error
docs: Update installation instructions
test: Add tests for subscription service
refactor: Simplify user profile handler
\`\`\`

#### Pull Requests

1. **Update your branch**
   \`\`\`bash
   git fetch upstream
   git rebase upstream/main
   \`\`\`

2. **Run tests and linting**
   \`\`\`bash
   npm test
   npm run lint
   \`\`\`

3. **Push to your fork**
   \`\`\`bash
   git push origin feature/your-feature-name
   \`\`\`

4. **Create PR**
   - Use the PR template
   - Link related issues
   - Provide clear description
   - Add screenshots for UI changes

5. **Code Review**
   - Address feedback promptly
   - Keep discussions professional
   - Update PR as needed

### Documentation

- Update README.md for user-facing changes
- Update DEVELOPER_GUIDE.md for technical changes
- Add JSDoc comments for public APIs
- Update API docs (Swagger) for endpoint changes

## Development Workflow

### Branch Naming

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/what-changed` - Documentation
- `refactor/what-changed` - Code refactoring
- `test/what-added` - Test additions

### Review Process

1. Automated checks (CI/CD) must pass
2. Code review by at least one maintainer
3. No merge conflicts
4. All conversations resolved

### Merging

- Maintainers will merge approved PRs
- Squash commits for cleaner history
- Delete branch after merge

## Development Best Practices

### Performance

- Use Redis caching for expensive queries
- Implement pagination for large datasets
- Optimize Firestore queries with indexes
- Use batch operations when possible

### Security

- Validate all user input
- Sanitize text before storage/display
- Use environment variables for secrets
- Implement rate limiting

### Logging

- Log all errors with context
- Use appropriate log levels:
  - `error`: Errors that need attention
  - `warn`: Warnings and degraded states
  - `info`: Important application events
  - `debug`: Detailed debugging info

### Testing

- Aim for 80%+ code coverage
- Test edge cases and error conditions
- Mock external dependencies
- Use descriptive test names

## Questions?

- Open a discussion on GitHub
- Join our Discord (link in README)
- Email: dev@pnptv.com

Thank you for contributing! 🎉
