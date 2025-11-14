#!/usr/bin/env node

/**
 * Environment Variables Validation Script
 * Validates all required environment variables before deployment
 */

const fs = require('fs');
const path = require('path');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Required environment variables
const REQUIRED_VARS = [
  'BOT_TOKEN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'REDIS_URL',
  'NODE_ENV',
  'PORT',
];

// Optional but recommended
const RECOMMENDED_VARS = [
  'SENTRY_DSN',
  'DAIMO_API_KEY',
  'EPAYCO_PUBLIC_KEY',
  'ZOOM_ACCOUNT_ID',
  'OPENAI_API_KEY',
  'ADMIN_USER_IDS',
];

// Production-specific requirements
const PRODUCTION_VARS = [
  'SENTRY_DSN',
  'ADMIN_USER_IDS',
];

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateEnv() {
  log('\n🔍 Validating Environment Variables\n', 'cyan');

  // Check if .env exists
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    log('❌ .env file not found!', 'red');
    log('   Create .env from .env.example', 'yellow');
    return false;
  }

  // Load .env file
  require('dotenv').config();

  const results = {
    missing: [],
    invalid: [],
    warnings: [],
    passed: [],
  };

  // Check required variables
  log('📋 Required Variables:', 'blue');
  REQUIRED_VARS.forEach(varName => {
    const value = process.env[varName];

    if (!value || value.trim() === '') {
      log(`  ✗ ${varName}: MISSING`, 'red');
      results.missing.push(varName);
    } else if (value.startsWith('your_') || value === 'changeme') {
      log(`  ⚠ ${varName}: PLACEHOLDER VALUE`, 'yellow');
      results.invalid.push(varName);
    } else {
      log(`  ✓ ${varName}: SET`, 'green');
      results.passed.push(varName);
    }
  });

  // Check recommended variables
  log('\n💡 Recommended Variables:', 'blue');
  RECOMMENDED_VARS.forEach(varName => {
    const value = process.env[varName];

    if (!value || value.trim() === '') {
      log(`  ⚠ ${varName}: NOT SET`, 'yellow');
      results.warnings.push(varName);
    } else {
      log(`  ✓ ${varName}: SET`, 'green');
      results.passed.push(varName);
    }
  });

  // Production-specific checks
  if (process.env.NODE_ENV === 'production') {
    log('\n🚀 Production Checks:', 'blue');

    PRODUCTION_VARS.forEach(varName => {
      const value = process.env[varName];

      if (!value || value.trim() === '') {
        log(`  ✗ ${varName}: REQUIRED IN PRODUCTION`, 'red');
        results.missing.push(varName);
      } else {
        log(`  ✓ ${varName}: SET`, 'green');
      }
    });

    // Additional production validations
    if (process.env.REDIS_URL && process.env.REDIS_URL.includes('localhost')) {
      log('  ⚠ REDIS_URL: Using localhost in production', 'yellow');
      results.warnings.push('REDIS_URL (localhost)');
    }

    if (!process.env.FORCE_HTTPS || process.env.FORCE_HTTPS !== 'true') {
      log('  ⚠ FORCE_HTTPS: Not enabled', 'yellow');
      results.warnings.push('FORCE_HTTPS');
    }
  }

  // Validate specific formats
  log('\n🔬 Format Validation:', 'blue');

  // BOT_TOKEN format
  if (process.env.BOT_TOKEN && !process.env.BOT_TOKEN.match(/^\d+:[A-Za-z0-9_-]+$/)) {
    log('  ⚠ BOT_TOKEN: Invalid format', 'yellow');
    results.warnings.push('BOT_TOKEN format');
  } else if (process.env.BOT_TOKEN) {
    log('  ✓ BOT_TOKEN: Valid format', 'green');
  }

  // REDIS_URL format
  if (process.env.REDIS_URL && !process.env.REDIS_URL.match(/^redis:\/\//)) {
    log('  ⚠ REDIS_URL: Should start with redis://', 'yellow');
    results.warnings.push('REDIS_URL format');
  } else if (process.env.REDIS_URL) {
    log('  ✓ REDIS_URL: Valid format', 'green');
  }

  // PORT is a number
  if (process.env.PORT && isNaN(parseInt(process.env.PORT))) {
    log('  ✗ PORT: Must be a number', 'red');
    results.invalid.push('PORT format');
  } else if (process.env.PORT) {
    log('  ✓ PORT: Valid number', 'green');
  }

  // Summary
  log('\n📊 Summary:', 'cyan');
  log(`  ✓ Passed: ${results.passed.length}`, 'green');
  log(`  ⚠ Warnings: ${results.warnings.length}`, 'yellow');
  log(`  ✗ Failed: ${results.missing.length + results.invalid.length}`, 'red');

  const isValid = results.missing.length === 0 && results.invalid.length === 0;

  if (isValid) {
    log('\n✅ Environment validation passed!', 'green');
    return true;
  } else {
    log('\n❌ Environment validation failed!', 'red');

    if (results.missing.length > 0) {
      log('\nMissing variables:', 'red');
      results.missing.forEach(v => log(`  - ${v}`, 'red'));
    }

    if (results.invalid.length > 0) {
      log('\nInvalid variables:', 'red');
      results.invalid.forEach(v => log(`  - ${v}`, 'red'));
    }

    return false;
  }
}

// Run validation
if (require.main === module) {
  const isValid = validateEnv();
  process.exit(isValid ? 0 : 1);
}

module.exports = validateEnv;
