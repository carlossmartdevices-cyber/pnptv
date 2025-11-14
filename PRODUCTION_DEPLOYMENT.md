# PNPtv Telegram Bot - Production Deployment Guide

## 🚀 Complete Production Deployment Checklist

This guide will walk you through deploying the PNPtv Telegram Bot to production with 100% readiness.

---

## Pre-Deployment Checklist

### 1. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with production values
nano .env
```

**Required Variables:**
- `BOT_TOKEN` - Your Telegram bot token from @BotFather
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_PRIVATE_KEY` - Firebase service account private key
- `FIREBASE_CLIENT_EMAIL` - Firebase service account email
- `REDIS_URL` - Redis connection URL (redis://...)
- `NODE_ENV=production`
- `PORT` - Server port (default: 3000)

**Recommended for Production:**
- `SENTRY_DSN` - Error tracking
- `ADMIN_USER_IDS` - Comma-separated admin Telegram IDs
- `DAIMO_API_KEY` - Payment gateway
- `EPAYCO_PUBLIC_KEY` - Payment gateway
- `ZOOM_ACCOUNT_ID` - Video integration
- `OPENAI_API_KEY` - AI support

### 2. Validate Environment

```bash
npm run validate:env
```

This will check:
- All required variables are set
- No placeholder values remain
- Correct formats and types
- Production-specific requirements

---

## Database Setup

### 3. Firestore Indexes

The bot requires composite indexes for optimal performance:

```bash
# Generate index configuration
npm run setup:indexes

# Deploy to Firebase (requires Firebase CLI)
npm run deploy:indexes

# Or manually deploy
firebase deploy --only firestore:indexes
```

**Critical Index:** Event reminders (currently disabled)
- After deploying indexes, enable in `.env`:
  ```
  DISABLE_REMINDER_CRON=false
  ```

### 4. Verify Database Access

Test Firestore and Redis connectivity:

```bash
node scripts/test-db-connection.js
```

---

## Dependency & Security

### 5. Install Dependencies

```bash
npm install --production
```

### 6. Security Audit

```bash
# Check for vulnerabilities
npm audit

# Fix automatically if possible
npm audit fix

# For breaking changes
npm audit fix --force  # Use with caution
```

### 7. Code Quality

```bash
# Run linter
npm run lint

# Auto-fix issues
npm run lint:fix

# Format code
npm run format
```

---

## Testing

### 8. Run Test Suites

```bash
# Unit tests
npm test

# Production readiness test
npm run test:production

# Bot feature tests (requires bot token)
npm run test:bot:auto
```

**Production Readiness Test** checks:
- ✅ Environment configuration
- ✅ Dependencies and security
- ✅ Core files structure
- ✅ Code quality
- ✅ Testing infrastructure
- ✅ Database configuration
- ✅ Error handling & logging
- ✅ Security measures
- ✅ Deployment configuration
- ✅ Documentation
- ✅ Performance & monitoring
- ✅ Feature completeness

---

## Deployment

### 9. PM2 Setup (Recommended)

```bash
# Setup PM2
npm run pm2:setup

# Start in production
npm run pm2:start

# Enable auto-restart on server reboot
npm run pm2:startup

# Save current process list
npm run pm2:save
```

### 10. Docker Deployment (Alternative)

```bash
# Build image
npm run docker:build

# Start containers
npm run docker:up

# View logs
docker-compose logs -f

# Stop containers
npm run docker:down
```

### 11. Manual Deployment

```bash
# Set environment
export NODE_ENV=production

# Start bot
npm start
```

---

## Post-Deployment

### 12. Verify Deployment

```bash
# Check PM2 status
npm run pm2:status

# View logs
npm run pm2:logs

# Monitor performance
npm run pm2:monitor
```

### 13. Health Checks

**API Health Endpoint:**
```bash
curl http://your-domain.com/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-14T...",
  "uptime": 3600
}
```

### 14. Test Bot Commands

Send these commands to your bot:

1. `/start` - Onboarding flow
2. `/menu` - Main menu
3. `/radio` - Radio features
4. `/profile` - User profile
5. `/admin` - Admin panel (admin only)

---

## Monitoring & Maintenance

### 15. Setup Monitoring

**Sentry (Recommended):**
- Sign up at https://sentry.io
- Add `SENTRY_DSN` to `.env`
- Restart bot

**PM2 Monitoring:**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 16. Backup Strategy

**Firestore Backups:**
```bash
# Manual backup
gcloud firestore export gs://your-bucket/backups/$(date +%Y%m%d)

# Setup automated backups in Firebase Console
# Navigate to: Firestore Database > Backups
```

**Redis Persistence:**
- Configure Redis with `appendonly yes`
- Schedule regular snapshots

### 17. Log Management

Logs are stored in:
- `logs/error-YYYY-MM-DD.log` - Error logs
- `logs/combined-YYYY-MM-DD.log` - All logs
- `logs/pm2/` - PM2 process logs

**Log Rotation:**
- Automatic rotation after 20MB
- Retention: 14 days
- Managed by winston-daily-rotate-file

---

## Troubleshooting

### Common Issues

**Bot not responding:**
```bash
# Check process status
npm run pm2:status

# View recent logs
npm run pm2:logs

# Restart bot
npm run pm2:restart
```

**High memory usage:**
```bash
# Check memory
pm2 status

# Increase memory limit in ecosystem.config.cjs
# max_memory_restart: '1000M'

# Reload configuration
npm run pm2:reload
```

**Database connection errors:**
```bash
# Test Firebase connection
node -e "require('./src/config/firebase.js')"

# Test Redis connection
redis-cli -u $REDIS_URL ping
```

**Payment webhooks failing:**
- Verify webhook URLs in payment gateway dashboards
- Check webhook signature validation logs
- Ensure `DAIMO_WEBHOOK_SECRET` and `EPAYCO_WEBHOOK_SECRET` are set

---

## Performance Optimization

### 18. Redis Caching

The bot uses Redis for:
- Session management
- Rate limiting
- Dashboard statistics cache
- Admin feature toggles

**Monitor Redis:**
```bash
redis-cli info memory
redis-cli dbsize
```

### 19. Database Optimization

**Firestore Best Practices:**
- Indexes are deployed for all queries
- Batch operations for bulk writes
- Pagination implemented (20 items/page)
- Transaction-safe membership operations

### 20. Rate Limiting

**Current Limits:**
- API: 100 requests per 15 minutes per IP
- Bot commands: Unlimited (consider adding if needed)

---

## Security Checklist

- [x] Environment variables not committed
- [x] `.gitignore` includes sensitive files
- [x] Webhook signature verification implemented
- [x] Rate limiting on API endpoints
- [x] HTTPS enforced in production
- [x] Input validation with Joi/Zod
- [x] SQL injection prevention (NoSQL database)
- [x] XSS prevention (Telegram handles this)
- [x] Session management with Redis
- [x] Error messages don't leak sensitive info
- [x] Admin-only commands protected
- [x] Payment webhooks validated

---

## Scaling Considerations

### Horizontal Scaling

**PM2 Cluster Mode:**
```javascript
// ecosystem.config.cjs
instances: 'max', // Use all CPU cores
exec_mode: 'cluster'
```

**Load Balancer:**
- Use nginx or cloud load balancer
- Sticky sessions for webhook reliability
- Health check endpoint: `/health`

### Database Scaling

**Firestore:**
- Automatic scaling
- Consider multi-region for global users
- Monitor quota in Firebase Console

**Redis:**
- Use Redis Cluster for large scale
- Consider managed services (Redis Labs, AWS ElastiCache)

---

## Rollback Procedure

If deployment fails:

```bash
# Stop current version
npm run pm2:stop

# Revert to previous version
git checkout <previous-commit>

# Install dependencies
npm install

# Start previous version
npm run pm2:start
```

---

## Support & Resources

### Documentation

- [README.md](./README.md) - Project overview
- [FIRESTORE_SCHEMA.md](./docs/FIRESTORE_SCHEMA.md) - Database schema
- [PM2_DEPLOYMENT.md](./PM2_DEPLOYMENT.md) - PM2 details
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Testing procedures

### Get Help

- GitHub Issues: [Report issues](https://github.com/your-repo/issues)
- Telegram: Contact @pnptv_support
- Email: support@pnptv.com

---

## Production Launch Checklist

Before going live, verify:

- [ ] All environment variables configured
- [ ] Database indexes deployed
- [ ] Sentry error tracking active
- [ ] Admin users configured
- [ ] Payment gateways tested
- [ ] Webhook URLs configured
- [ ] Zoom integration verified
- [ ] Bot commands tested
- [ ] Backup strategy implemented
- [ ] Monitoring dashboards setup
- [ ] Log rotation configured
- [ ] PM2 auto-restart enabled
- [ ] Health checks passing
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Team trained on operations
- [ ] Incident response plan ready
- [ ] Rollback procedure documented

---

## 🎉 Congratulations!

Your PNPtv Telegram Bot is now production-ready!

**Next Steps:**
1. Monitor logs for first 24 hours
2. Watch for error spikes in Sentry
3. Check payment webhook success rate
4. Monitor user onboarding completion
5. Review performance metrics

**Remember:**
- Keep dependencies updated (monthly)
- Review logs regularly (daily)
- Test backup restoration (quarterly)
- Update documentation as features evolve
- Monitor costs in Firebase/Cloud consoles

---

## Quick Reference Commands

```bash
# Start bot
npm start                    # Direct start
npm run pm2:start           # PM2 production

# Stop bot
npm run pm2:stop

# Restart bot
npm run pm2:restart          # Hard restart
npm run pm2:reload           # Zero-downtime reload

# View logs
npm run pm2:logs
tail -f logs/combined-*.log

# Run tests
npm test                     # Unit tests
npm run test:production      # Production readiness
npm run test:bot:auto        # Bot automation tests

# Database
npm run setup:indexes        # Generate indexes
npm run deploy:indexes       # Deploy indexes
npm run migration:expiry     # Check expired subscriptions

# Monitoring
npm run pm2:monitor          # PM2 dashboard
npm run pm2:status           # Process status

# Maintenance
npm audit                    # Security check
npm run lint                 # Code quality
npm run validate:env         # Environment check
```

---

**Version:** 1.0.0
**Last Updated:** January 2025
**Maintained by:** PNPtv Team
