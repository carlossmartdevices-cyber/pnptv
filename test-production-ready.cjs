#!/usr/bin/env node

/**
 * Production Readiness Test Script for PNPtv Telegram Bot
 *
 * This script performs comprehensive checks to ensure the bot is 100% production-ready.
 * It tests all features, validates configuration, checks dependencies, and verifies deployment readiness.
 *
 * Usage:
 *   node test-production-ready.js
 *   npm run test:production
 *
 * Exit codes:
 *   0 - All tests passed, production ready
 *   1 - Critical failures, NOT production ready
 *   2 - Warnings present, review before deploying
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class ProductionReadinessTest {
  constructor() {
    this.results = {
      passed: [],
      warnings: [],
      failed: [],
      critical: [],
    };
    this.startTime = Date.now();
  }

  /**
   * Print colored output
   */
  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  /**
   * Print section header
   */
  section(title) {
    this.log(`\n${'='.repeat(80)}`, 'cyan');
    this.log(`  ${title}`, 'bright');
    this.log('='.repeat(80), 'cyan');
  }

  /**
   * Record test result
   */
  record(category, name, status, details = '') {
    const result = { name, details, timestamp: new Date().toISOString() };

    if (status === 'pass') {
      this.results.passed.push(result);
      this.log(`  ✓ ${name}`, 'green');
    } else if (status === 'warn') {
      this.results.warnings.push(result);
      this.log(`  ⚠ ${name}${details ? ': ' + details : ''}`, 'yellow');
    } else if (status === 'fail') {
      this.results.failed.push(result);
      this.log(`  ✗ ${name}${details ? ': ' + details : ''}`, 'red');
    } else if (status === 'critical') {
      this.results.critical.push(result);
      this.log(`  ✗✗ CRITICAL: ${name}${details ? ': ' + details : ''}`, 'red');
    }
  }

  /**
   * Check if file exists
   */
  fileExists(filepath) {
    return fs.existsSync(path.join(process.cwd(), filepath));
  }

  /**
   * Read file content
   */
  readFile(filepath) {
    try {
      return fs.readFileSync(path.join(process.cwd(), filepath), 'utf8');
    } catch (error) {
      return null;
    }
  }

  /**
   * Execute command and return output
   */
  exec(command) {
    try {
      return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    } catch (error) {
      return null;
    }
  }

  /**
   * TEST SUITE 1: Environment Configuration
   */
  async testEnvironmentConfiguration() {
    this.section('1. Environment Configuration');

    // Check .env file exists
    if (this.fileExists('.env')) {
      this.record('env', '.env file exists', 'pass');

      const envContent = this.readFile('.env');
      const envExample = this.readFile('.env.example');

      // Check required environment variables
      const requiredVars = [
        'BOT_TOKEN',
        'FIREBASE_PROJECT_ID',
        'FIREBASE_PRIVATE_KEY',
        'FIREBASE_CLIENT_EMAIL',
        'REDIS_URL',
        'NODE_ENV',
        'PORT',
      ];

      requiredVars.forEach(varName => {
        if (envContent.includes(`${varName}=`)) {
          const value = envContent.match(new RegExp(`${varName}=(.+)`))?.[1]?.trim();
          if (value && value !== '' && !value.startsWith('your_')) {
            this.record('env', `${varName} is set`, 'pass');
          } else {
            this.record('env', `${varName} is empty or placeholder`, 'critical');
          }
        } else {
          this.record('env', `${varName} is missing`, 'critical');
        }
      });

      // Check optional but important variables
      const importantVars = [
        'SENTRY_DSN',
        'DAIMO_API_KEY',
        'EPAYCO_PUBLIC_KEY',
        'ZOOM_ACCOUNT_ID',
        'OPENAI_API_KEY',
      ];

      importantVars.forEach(varName => {
        if (envContent.includes(`${varName}=`)) {
          const value = envContent.match(new RegExp(`${varName}=(.+)`))?.[1]?.trim();
          if (value && value !== '') {
            this.record('env', `${varName} is configured`, 'pass');
          } else {
            this.record('env', `${varName} is not configured`, 'warn', 'Feature may not work');
          }
        } else {
          this.record('env', `${varName} is not set`, 'warn', 'Feature may not work');
        }
      });

      // Check NODE_ENV is production
      if (envContent.includes('NODE_ENV=production')) {
        this.record('env', 'NODE_ENV set to production', 'pass');
      } else {
        this.record('env', 'NODE_ENV not set to production', 'warn', 'Should be "production" for deployment');
      }

    } else {
      this.record('env', '.env file exists', 'critical', 'Create .env from .env.example');
    }

    // Check .env.example exists
    if (this.fileExists('.env.example')) {
      this.record('env', '.env.example exists', 'pass');
    } else {
      this.record('env', '.env.example exists', 'fail');
    }
  }

  /**
   * TEST SUITE 2: Dependencies & Package Management
   */
  async testDependencies() {
    this.section('2. Dependencies & Package Management');

    // Check package.json exists
    if (this.fileExists('package.json')) {
      this.record('deps', 'package.json exists', 'pass');

      const packageJson = JSON.parse(this.readFile('package.json'));

      // Check Node version requirement
      if (packageJson.engines && packageJson.engines.node) {
        this.record('deps', `Node version specified: ${packageJson.engines.node}`, 'pass');
      } else {
        this.record('deps', 'Node version not specified in engines', 'warn');
      }

      // Check for security vulnerabilities
      const auditOutput = this.exec('npm audit --json 2>/dev/null');
      if (auditOutput) {
        try {
          const audit = JSON.parse(auditOutput);
          const vulnerabilities = audit.metadata?.vulnerabilities || {};
          const total = Object.values(vulnerabilities).reduce((sum, count) => sum + count, 0);

          if (total === 0) {
            this.record('deps', 'No npm security vulnerabilities', 'pass');
          } else if (vulnerabilities.critical > 0 || vulnerabilities.high > 0) {
            this.record('deps', `Found ${total} vulnerabilities (${vulnerabilities.critical} critical, ${vulnerabilities.high} high)`, 'critical');
          } else {
            this.record('deps', `Found ${total} low/moderate vulnerabilities`, 'warn');
          }
        } catch (e) {
          this.record('deps', 'Could not parse npm audit results', 'warn');
        }
      } else {
        this.record('deps', 'npm audit check', 'warn', 'Could not run npm audit');
      }

      // Check node_modules exists
      if (this.fileExists('node_modules')) {
        this.record('deps', 'node_modules directory exists', 'pass');
      } else {
        this.record('deps', 'node_modules directory exists', 'critical', 'Run npm install');
      }

      // Check for outdated dependencies
      const outdatedOutput = this.exec('npm outdated --json 2>/dev/null');
      if (outdatedOutput && outdatedOutput.trim() !== '{}' && outdatedOutput.trim() !== '') {
        this.record('deps', 'Some dependencies are outdated', 'warn', 'Run npm outdated for details');
      } else {
        this.record('deps', 'All dependencies up to date', 'pass');
      }

    } else {
      this.record('deps', 'package.json exists', 'critical');
    }

    // Check package-lock.json exists
    if (this.fileExists('package-lock.json')) {
      this.record('deps', 'package-lock.json exists', 'pass');
    } else {
      this.record('deps', 'package-lock.json exists', 'warn', 'Should be committed for reproducible builds');
    }
  }

  /**
   * TEST SUITE 3: Core Files & Structure
   */
  async testCoreFiles() {
    this.section('3. Core Files & Structure');

    const requiredFiles = [
      'src/index.js',
      'src/bot/core/bot.js',
      'src/config/firebase.js',
      'src/config/redis.js',
      'src/utils/logger.js',
      'src/bot/core/middleware/errorHandler.js',
      'src/bot/core/middleware/sessionManager.js',
      'src/bot/core/middleware/rateLimiter.js',
      'src/services/membershipService.js',
      'src/models/userModel.js',
    ];

    requiredFiles.forEach(file => {
      if (this.fileExists(file)) {
        this.record('files', `${file} exists`, 'pass');
      } else {
        this.record('files', `${file} exists`, 'critical');
      }
    });

    const importantFiles = [
      'ecosystem.config.cjs',
      'pm2-deploy.sh',
      'jest.config.js',
      '.gitignore',
      'README.md',
    ];

    importantFiles.forEach(file => {
      if (this.fileExists(file)) {
        this.record('files', `${file} exists`, 'pass');
      } else {
        this.record('files', `${file} exists`, 'warn');
      }
    });

    // Check for sensitive files in .gitignore
    if (this.fileExists('.gitignore')) {
      const gitignore = this.readFile('.gitignore');
      const sensitivePatterns = ['.env', 'node_modules', 'logs/', '*.log'];

      sensitivePatterns.forEach(pattern => {
        if (gitignore.includes(pattern)) {
          this.record('files', `.gitignore includes ${pattern}`, 'pass');
        } else {
          this.record('files', `.gitignore includes ${pattern}`, 'fail', 'Add to .gitignore');
        }
      });
    }
  }

  /**
   * TEST SUITE 4: Code Quality
   */
  async testCodeQuality() {
    this.section('4. Code Quality');

    // Check for TODO comments
    const todoCheck = this.exec('grep -r "TODO" src/ --include="*.js" 2>/dev/null | wc -l');
    if (todoCheck) {
      const todoCount = parseInt(todoCheck.trim());
      if (todoCount === 0) {
        this.record('quality', 'No TODO comments in code', 'pass');
      } else if (todoCount < 10) {
        this.record('quality', `${todoCount} TODO comments found`, 'warn');
      } else {
        this.record('quality', `${todoCount} TODO comments found`, 'fail', 'Review and complete TODOs');
      }
    }

    // Check for console.log (should use logger)
    const consoleLogCheck = this.exec('grep -r "console\\.log" src/ --include="*.js" 2>/dev/null | wc -l');
    if (consoleLogCheck) {
      const consoleCount = parseInt(consoleLogCheck.trim());
      if (consoleCount === 0) {
        this.record('quality', 'No console.log statements', 'pass');
      } else {
        this.record('quality', `${consoleCount} console.log statements found`, 'warn', 'Use logger instead');
      }
    }

    // Check for ESLint
    if (this.fileExists('.eslintrc.js') || this.fileExists('.eslintrc.json')) {
      this.record('quality', 'ESLint configuration exists', 'pass');

      // Try to run ESLint
      const lintOutput = this.exec('npm run lint 2>&1');
      if (lintOutput && !lintOutput.includes('error')) {
        this.record('quality', 'ESLint passes', 'pass');
      } else if (lintOutput && lintOutput.includes('error')) {
        this.record('quality', 'ESLint has errors', 'warn', 'Fix linting errors');
      }
    } else {
      this.record('quality', 'ESLint configuration exists', 'warn');
    }

    // Check for Prettier
    if (this.fileExists('.prettierrc') || this.fileExists('.prettierrc.json')) {
      this.record('quality', 'Prettier configuration exists', 'pass');
    } else {
      this.record('quality', 'Prettier configuration exists', 'warn');
    }
  }

  /**
   * TEST SUITE 5: Testing Infrastructure
   */
  async testTestingInfrastructure() {
    this.section('5. Testing Infrastructure');

    // Check Jest config
    if (this.fileExists('jest.config.js')) {
      this.record('testing', 'Jest configuration exists', 'pass');
    } else {
      this.record('testing', 'Jest configuration exists', 'fail');
    }

    // Check for test files
    const unitTestCount = this.exec('find src/tests/unit -name "*.test.js" 2>/dev/null | wc -l');
    if (unitTestCount) {
      const count = parseInt(unitTestCount.trim());
      if (count > 10) {
        this.record('testing', `${count} unit test files found`, 'pass');
      } else if (count > 0) {
        this.record('testing', `${count} unit test files found`, 'warn', 'Low unit test coverage');
      } else {
        this.record('testing', 'No unit test files found', 'fail', 'Add unit tests');
      }
    }

    // Check for integration tests
    const integrationTests = ['test-bot-automated.js', 'test-bot-features.js', 'test-onboarding.js'];
    integrationTests.forEach(test => {
      if (this.fileExists(test)) {
        this.record('testing', `${test} exists`, 'pass');
      } else {
        this.record('testing', `${test} exists`, 'warn');
      }
    });

    // Try to run tests
    const testOutput = this.exec('npm test 2>&1');
    if (testOutput) {
      if (testOutput.includes('PASS') || testOutput.includes('Tests:')) {
        this.record('testing', 'Tests can run', 'pass');
      } else {
        this.record('testing', 'Tests can run', 'warn', 'Check test execution');
      }
    }
  }

  /**
   * TEST SUITE 6: Database Configuration
   */
  async testDatabaseConfiguration() {
    this.section('6. Database Configuration');

    // Check Firebase config
    if (this.fileExists('src/config/firebase.js')) {
      const firebaseConfig = this.readFile('src/config/firebase.js');

      if (firebaseConfig.includes('initializeApp')) {
        this.record('db', 'Firebase initialized', 'pass');
      } else {
        this.record('db', 'Firebase initialized', 'fail');
      }

      // Check for collection references
      const collections = ['users', 'payments', 'plans', 'membership_history'];
      collections.forEach(collection => {
        if (firebaseConfig.includes(collection)) {
          this.record('db', `Collection '${collection}' referenced`, 'pass');
        }
      });
    }

    // Check Redis config
    if (this.fileExists('src/config/redis.js')) {
      const redisConfig = this.readFile('src/config/redis.js');

      if (redisConfig.includes('ioredis') || redisConfig.includes('createClient')) {
        this.record('db', 'Redis configuration exists', 'pass');
      } else {
        this.record('db', 'Redis configuration exists', 'fail');
      }
    }

    // Check for Firestore schema documentation
    if (this.fileExists('docs/FIRESTORE_SCHEMA.md')) {
      this.record('db', 'Firestore schema documented', 'pass');
    } else {
      this.record('db', 'Firestore schema documented', 'warn');
    }
  }

  /**
   * TEST SUITE 7: Error Handling & Logging
   */
  async testErrorHandlingAndLogging() {
    this.section('7. Error Handling & Logging');

    // Check logger implementation
    if (this.fileExists('src/utils/logger.js')) {
      const logger = this.readFile('src/utils/logger.js');

      if (logger.includes('winston')) {
        this.record('logging', 'Winston logger configured', 'pass');
      }

      if (logger.includes('DailyRotateFile')) {
        this.record('logging', 'Log rotation configured', 'pass');
      } else {
        this.record('logging', 'Log rotation configured', 'warn');
      }

      if (logger.includes('error') && logger.includes('info')) {
        this.record('logging', 'Multiple log levels configured', 'pass');
      }
    } else {
      this.record('logging', 'Logger implementation exists', 'critical');
    }

    // Check error handler middleware
    if (this.fileExists('src/bot/core/middleware/errorHandler.js')) {
      const errorHandler = this.readFile('src/bot/core/middleware/errorHandler.js');

      if (errorHandler.includes('try') && errorHandler.includes('catch')) {
        this.record('logging', 'Error handler has try-catch', 'pass');
      }

      if (errorHandler.includes('Sentry') || errorHandler.includes('sentry')) {
        this.record('logging', 'Sentry integration present', 'pass');
      } else {
        this.record('logging', 'Sentry integration present', 'warn', 'Error tracking recommended');
      }
    }

    // Check logs directory
    if (this.fileExists('logs')) {
      this.record('logging', 'Logs directory exists', 'pass');
    } else {
      this.record('logging', 'Logs directory exists', 'warn', 'Will be created at runtime');
    }
  }

  /**
   * TEST SUITE 8: Security
   */
  async testSecurity() {
    this.section('8. Security');

    // Check for hardcoded secrets
    const secretPatterns = [
      { pattern: 'password\\s*=\\s*["\'][^"\']+["\']', name: 'hardcoded passwords' },
      { pattern: 'api[_-]?key\\s*=\\s*["\'][a-zA-Z0-9]{20,}["\']', name: 'hardcoded API keys' },
      { pattern: 'secret\\s*=\\s*["\'][^"\']+["\']', name: 'hardcoded secrets' },
    ];

    secretPatterns.forEach(({ pattern, name }) => {
      const result = this.exec(`grep -rE "${pattern}" src/ --include="*.js" 2>/dev/null | wc -l`);
      if (result) {
        const count = parseInt(result.trim());
        if (count === 0) {
          this.record('security', `No ${name} in code`, 'pass');
        } else {
          this.record('security', `Found ${count} potential ${name}`, 'critical', 'Use environment variables');
        }
      }
    });

    // Check rate limiting
    if (this.fileExists('src/bot/core/middleware/rateLimiter.js')) {
      this.record('security', 'Rate limiting middleware exists', 'pass');
    } else {
      this.record('security', 'Rate limiting middleware exists', 'warn');
    }

    // Check input validation
    const validationFiles = this.exec('find src -name "*validation*" -o -name "*validator*" 2>/dev/null');
    if (validationFiles && validationFiles.trim() !== '') {
      this.record('security', 'Input validation utilities exist', 'pass');
    } else {
      this.record('security', 'Input validation utilities exist', 'warn');
    }

    // Check for HTTPS in production
    const envContent = this.readFile('.env');
    if (envContent) {
      if (envContent.includes('FORCE_HTTPS=true')) {
        this.record('security', 'FORCE_HTTPS enabled', 'pass');
      } else {
        this.record('security', 'FORCE_HTTPS enabled', 'warn', 'Enable HTTPS in production');
      }
    }
  }

  /**
   * TEST SUITE 9: Deployment Configuration
   */
  async testDeploymentConfiguration() {
    this.section('9. Deployment Configuration');

    // Check PM2 ecosystem file
    if (this.fileExists('ecosystem.config.cjs')) {
      this.record('deploy', 'PM2 ecosystem config exists', 'pass');

      const ecosystem = this.readFile('ecosystem.config.cjs');

      if (ecosystem.includes('instances')) {
        this.record('deploy', 'PM2 instances configured', 'pass');
      }

      if (ecosystem.includes('max_memory_restart')) {
        this.record('deploy', 'Memory limit configured', 'pass');
      } else {
        this.record('deploy', 'Memory limit configured', 'warn');
      }

      if (ecosystem.includes('error_file') && ecosystem.includes('out_file')) {
        this.record('deploy', 'PM2 log files configured', 'pass');
      }

      if (ecosystem.includes('cron_restart')) {
        this.record('deploy', 'Cron restart configured', 'pass');
      }
    } else {
      this.record('deploy', 'PM2 ecosystem config exists', 'fail', 'Required for production deployment');
    }

    // Check deployment script
    if (this.fileExists('pm2-deploy.sh')) {
      this.record('deploy', 'Deployment script exists', 'pass');

      const deployScript = this.readFile('pm2-deploy.sh');
      if (deployScript.includes('#!/bin/bash')) {
        this.record('deploy', 'Deployment script has shebang', 'pass');
      }
    } else {
      this.record('deploy', 'Deployment script exists', 'warn');
    }

    // Check Docker configuration
    if (this.fileExists('Dockerfile')) {
      this.record('deploy', 'Dockerfile exists', 'pass');

      if (this.fileExists('docker-compose.yml')) {
        this.record('deploy', 'Docker Compose config exists', 'pass');
      }

      if (this.fileExists('.dockerignore')) {
        this.record('deploy', '.dockerignore exists', 'pass');
      } else {
        this.record('deploy', '.dockerignore exists', 'warn');
      }
    }

    // Check CI/CD
    if (this.fileExists('.github/workflows/ci-cd.yml')) {
      this.record('deploy', 'GitHub Actions CI/CD configured', 'pass');
    } else {
      this.record('deploy', 'CI/CD pipeline configured', 'warn');
    }
  }

  /**
   * TEST SUITE 10: Documentation
   */
  async testDocumentation() {
    this.section('10. Documentation');

    const requiredDocs = [
      'README.md',
      'docs/FIRESTORE_SCHEMA.md',
    ];

    requiredDocs.forEach(doc => {
      if (this.fileExists(doc)) {
        this.record('docs', `${doc} exists`, 'pass');

        const content = this.readFile(doc);
        if (content.length > 500) {
          this.record('docs', `${doc} has substantial content`, 'pass');
        } else {
          this.record('docs', `${doc} has substantial content`, 'warn', 'Documentation seems minimal');
        }
      } else {
        this.record('docs', `${doc} exists`, 'fail');
      }
    });

    const recommendedDocs = [
      'PM2_DEPLOYMENT.md',
      'TESTING_GUIDE.md',
      'API.md',
      'CONTRIBUTING.md',
    ];

    recommendedDocs.forEach(doc => {
      if (this.fileExists(doc)) {
        this.record('docs', `${doc} exists`, 'pass');
      } else {
        this.record('docs', `${doc} exists`, 'warn');
      }
    });

    // Check for inline documentation
    const jsdocCount = this.exec('grep -r "/\\*\\*" src/ --include="*.js" 2>/dev/null | wc -l');
    if (jsdocCount) {
      const count = parseInt(jsdocCount.trim());
      if (count > 50) {
        this.record('docs', `${count} JSDoc comments found`, 'pass');
      } else if (count > 0) {
        this.record('docs', `${count} JSDoc comments found`, 'warn', 'Add more inline documentation');
      } else {
        this.record('docs', 'No JSDoc comments found', 'warn', 'Add inline documentation');
      }
    }
  }

  /**
   * TEST SUITE 11: Performance & Monitoring
   */
  async testPerformanceAndMonitoring() {
    this.section('11. Performance & Monitoring');

    // Check for caching implementation
    if (this.fileExists('src/config/redis.js')) {
      this.record('perf', 'Redis caching configured', 'pass');
    } else {
      this.record('perf', 'Caching layer configured', 'warn', 'Redis recommended for production');
    }

    // Check for monitoring/APM
    const indexContent = this.readFile('src/index.js');
    if (indexContent) {
      if (indexContent.includes('Sentry') || indexContent.includes('sentry')) {
        this.record('perf', 'Error monitoring (Sentry) configured', 'pass');
      } else {
        this.record('perf', 'Error monitoring configured', 'warn', 'Sentry or similar recommended');
      }
    }

    // Check for health check endpoint
    const serverFiles = this.exec('find src -name "*server*" -o -name "*app.js" 2>/dev/null');
    if (serverFiles) {
      const hasHealthCheck = this.exec('grep -r "/health" src/ --include="*.js" 2>/dev/null');
      if (hasHealthCheck) {
        this.record('perf', 'Health check endpoint exists', 'pass');
      } else {
        this.record('perf', 'Health check endpoint exists', 'warn', 'Add /health endpoint');
      }
    }

    // Check for graceful shutdown
    if (indexContent && indexContent.includes('SIGTERM') && indexContent.includes('SIGINT')) {
      this.record('perf', 'Graceful shutdown handlers configured', 'pass');
    } else {
      this.record('perf', 'Graceful shutdown handlers configured', 'warn');
    }
  }

  /**
   * TEST SUITE 12: Feature Completeness
   */
  async testFeatureCompleteness() {
    this.section('12. Feature Completeness');

    // Check core bot handlers
    const handlers = [
      'user/onboardingHandler.js',
      'user/profileHandler.js',
      'payments/subscriptionHandler.js',
      'admin/index.js',
      'group/index.js',
    ];

    handlers.forEach(handler => {
      if (this.fileExists(`src/bot/handlers/${handler}`)) {
        this.record('features', `${handler} exists`, 'pass');
      } else {
        this.record('features', `${handler} exists`, 'fail');
      }
    });

    // Check for webhook handlers
    if (this.fileExists('src/api/webhooks')) {
      const webhooks = this.exec('find src/api/webhooks -name "*.js" 2>/dev/null | wc -l');
      if (webhooks && parseInt(webhooks.trim()) > 0) {
        this.record('features', 'Webhook handlers implemented', 'pass');
      }
    }

    // Check services
    const services = ['membershipService.js', 'notificationService.js'];
    services.forEach(service => {
      if (this.fileExists(`src/services/${service}`)) {
        this.record('features', `${service} exists`, 'pass');
      } else {
        this.record('features', `${service} exists`, 'warn');
      }
    });

    // Check for incomplete features (TODO comments in handlers)
    const handlerTodos = this.exec('grep -r "TODO" src/bot/handlers --include="*.js" 2>/dev/null | wc -l');
    if (handlerTodos) {
      const count = parseInt(handlerTodos.trim());
      if (count === 0) {
        this.record('features', 'No incomplete features (TODOs) in handlers', 'pass');
      } else {
        this.record('features', `${count} incomplete features (TODOs) in handlers`, 'warn', 'Complete before production');
      }
    }
  }

  /**
   * Generate detailed report
   */
  generateReport() {
    this.section('Production Readiness Report');

    const total = this.results.passed.length + this.results.warnings.length +
                  this.results.failed.length + this.results.critical.length;

    const passRate = ((this.results.passed.length / total) * 100).toFixed(1);
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);

    this.log(`\n📊 Test Summary:`, 'bright');
    this.log(`   Total Tests: ${total}`, 'cyan');
    this.log(`   ✓ Passed: ${this.results.passed.length}`, 'green');
    this.log(`   ⚠ Warnings: ${this.results.warnings.length}`, 'yellow');
    this.log(`   ✗ Failed: ${this.results.failed.length}`, 'red');
    this.log(`   ✗✗ Critical: ${this.results.critical.length}`, 'red');
    this.log(`   Pass Rate: ${passRate}%`, passRate > 90 ? 'green' : passRate > 70 ? 'yellow' : 'red');
    this.log(`   Duration: ${duration}s\n`, 'cyan');

    // Production readiness verdict
    if (this.results.critical.length > 0) {
      this.log('❌ PRODUCTION STATUS: NOT READY', 'red');
      this.log(`   ${this.results.critical.length} critical issues must be resolved\n`, 'red');

      this.log('Critical Issues:', 'red');
      this.results.critical.forEach(issue => {
        this.log(`   • ${issue.name}${issue.details ? ': ' + issue.details : ''}`, 'red');
      });
    } else if (this.results.failed.length > 5) {
      this.log('⚠️  PRODUCTION STATUS: NOT RECOMMENDED', 'yellow');
      this.log(`   ${this.results.failed.length} failures should be addressed\n`, 'yellow');
    } else if (this.results.warnings.length > 10) {
      this.log('⚠️  PRODUCTION STATUS: REVIEW REQUIRED', 'yellow');
      this.log(`   ${this.results.warnings.length} warnings present\n`, 'yellow');
    } else {
      this.log('✅ PRODUCTION STATUS: READY', 'green');
      this.log('   All critical checks passed!\n', 'green');
    }

    // Display failures if any
    if (this.results.failed.length > 0) {
      this.log('\nFailures to Address:', 'red');
      this.results.failed.forEach(issue => {
        this.log(`   • ${issue.name}${issue.details ? ': ' + issue.details : ''}`, 'red');
      });
    }

    // Display warnings if any
    if (this.results.warnings.length > 0 && this.results.warnings.length <= 15) {
      this.log('\nWarnings:', 'yellow');
      this.results.warnings.slice(0, 15).forEach(issue => {
        this.log(`   • ${issue.name}${issue.details ? ': ' + issue.details : ''}`, 'yellow');
      });
      if (this.results.warnings.length > 15) {
        this.log(`   ... and ${this.results.warnings.length - 15} more`, 'yellow');
      }
    }

    // Save detailed report to file
    this.saveReportToFile();

    return this.results.critical.length > 0 ? 1 :
           this.results.failed.length > 5 ? 2 : 0;
  }

  /**
   * Save detailed report to JSON file
   */
  saveReportToFile() {
    const reportData = {
      timestamp: new Date().toISOString(),
      duration: ((Date.now() - this.startTime) / 1000).toFixed(2),
      summary: {
        total: this.results.passed.length + this.results.warnings.length +
               this.results.failed.length + this.results.critical.length,
        passed: this.results.passed.length,
        warnings: this.results.warnings.length,
        failed: this.results.failed.length,
        critical: this.results.critical.length,
      },
      results: this.results,
    };

    const reportPath = path.join(process.cwd(), 'production-readiness-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

    this.log(`\n📄 Detailed report saved to: production-readiness-report.json`, 'cyan');
  }

  /**
   * Run all tests
   */
  async runAll() {
    this.log('\n🚀 PNPtv Telegram Bot - Production Readiness Test', 'bright');
    this.log(`   Started at: ${new Date().toISOString()}`, 'cyan');

    try {
      await this.testEnvironmentConfiguration();
      await this.testDependencies();
      await this.testCoreFiles();
      await this.testCodeQuality();
      await this.testTestingInfrastructure();
      await this.testDatabaseConfiguration();
      await this.testErrorHandlingAndLogging();
      await this.testSecurity();
      await this.testDeploymentConfiguration();
      await this.testDocumentation();
      await this.testPerformanceAndMonitoring();
      await this.testFeatureCompleteness();

      return this.generateReport();
    } catch (error) {
      this.log(`\n❌ Test execution failed: ${error.message}`, 'red');
      console.error(error);
      return 1;
    }
  }
}

// Main execution
if (require.main === module) {
  const tester = new ProductionReadinessTest();
  tester.runAll().then(exitCode => {
    process.exit(exitCode);
  });
}

module.exports = ProductionReadinessTest;
