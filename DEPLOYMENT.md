# Deployment Guide - PNPtv Telegram Bot

## Pre-Deployment Checklist

### 1. Environment Variables

Ensure all required environment variables are set:

\`\`\`bash
# Required
✓ TELEGRAM_BOT_TOKEN
✓ FIREBASE_PROJECT_ID
✓ FIREBASE_CLIENT_EMAIL
✓ FIREBASE_PRIVATE_KEY
✓ REDIS_HOST
✓ REDIS_PORT

# Payment Gateways
✓ EPAYCO_PUBLIC_KEY
✓ EPAYCO_PRIVATE_KEY
✓ DAIMO_API_KEY

# Video Features
✓ DAILY_API_KEY

# Optional but Recommended
✓ SENTRY_DSN
✓ OPENAI_API_KEY
✓ GOOGLE_MAPS_API_KEY
\`\`\`

### 2. Firebase/Firestore Setup

**Create Indexes:**

Go to Firebase Console → Firestore → Indexes and create:

1. Collection: `users`
   - Fields: `planExpiry` (Ascending), `subscriptionStatus` (Ascending)
   - Fields: `isActive` (Ascending), `language` (Ascending)

2. Collection: `payments`
   - Fields: `userId` (Ascending), `createdAt` (Descending)

3. Collection: `liveStreams`
   - Fields: `isActive` (Ascending), `createdAt` (Descending)

**Set Security Rules:**

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own data
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Payments are server-only
    match /payments/{paymentId} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    // Live streams are public read
    match /liveStreams/{streamId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
\`\`\`

### 3. Payment Gateway Setup

**ePayco:**
1. Log in to ePayco dashboard
2. Get API keys from Settings → API
3. Set confirmation URL: `https://your-domain.com/api/webhooks/epayco`
4. Enable test mode initially

**Daimo Pay:**
1. Create Daimo account
2. Get API key
3. Set callback URL: `https://your-domain.com/api/webhooks/daimo`

### 4. Daily.co Setup

1. Create Daily.co account at https://dashboard.daily.co
2. Get API key from Settings
3. Configure room defaults (optional)

## Deployment Options

### Option 1: Docker Compose (Recommended)

\`\`\`bash
# 1. Clone repository
git clone https://github.com/yourusername/pnptv.git
cd pnptv

# 2. Create .env file
cp .env.example .env
nano .env  # Add your credentials

# 3. Build and start services
docker-compose up -d

# 4. Check logs
docker-compose logs -f bot

# 5. Verify health
curl http://localhost:3000/health
\`\`\`

### Option 2: Docker (Standalone)

\`\`\`bash
# 1. Build image
docker build -t pnptv-bot .

# 2. Run Redis
docker run -d --name pnptv-redis -p 6379:6379 redis:7-alpine

# 3. Run bot
docker run -d \
  --name pnptv-bot \
  --env-file .env \
  -p 3000:3000 \
  --link pnptv-redis:redis \
  pnptv-bot

# 4. Check logs
docker logs -f pnptv-bot
\`\`\`

### Option 3: Node.js (Direct)

\`\`\`bash
# 1. Install dependencies
npm ci --production

# 2. Set environment variables
export $(cat .env | xargs)

# 3. Start Redis
redis-server &

# 4. Start bot
NODE_ENV=production node src/index.js

# Or use PM2 for production
pm2 start src/index.js --name pnptv-bot
pm2 save
pm2 startup
\`\`\`

### Option 4: Cloud Platforms

#### Heroku

\`\`\`bash
# 1. Create app
heroku create pnptv-bot

# 2. Add Redis addon
heroku addons:create heroku-redis:hobby-dev

# 3. Set environment variables
heroku config:set TELEGRAM_BOT_TOKEN=your_token
heroku config:set FIREBASE_PROJECT_ID=your_project_id
# ... set all other vars

# 4. Deploy
git push heroku main

# 5. Scale
heroku ps:scale web=1
\`\`\`

#### Google Cloud Run

\`\`\`bash
# 1. Build and push image
gcloud builds submit --tag gcr.io/PROJECT_ID/pnptv-bot

# 2. Deploy
gcloud run deploy pnptv-bot \
  --image gcr.io/PROJECT_ID/pnptv-bot \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
\`\`\`

#### AWS ECS

\`\`\`bash
# 1. Create ECR repository
aws ecr create-repository --repository-name pnptv-bot

# 2. Build and push
docker tag pnptv-bot:latest YOUR_ECR_URI/pnptv-bot:latest
docker push YOUR_ECR_URI/pnptv-bot:latest

# 3. Create ECS service (use AWS Console or Terraform)
\`\`\`

## Post-Deployment

### 1. Verify Bot is Running

\`\`\`bash
# Check health endpoint
curl http://your-domain.com/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-01-13T...",
  "uptime": 123.45
}
\`\`\`

### 2. Test Bot

1. Open Telegram and search for your bot
2. Send `/start`
3. Complete onboarding flow
4. Test each feature

### 3. Configure Webhooks

**Set Telegram Webhook (Optional):**

\`\`\`bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://your-domain.com/api/telegram/webhook"
\`\`\`

### 4. Monitor Logs

\`\`\`bash
# Docker Compose
docker-compose logs -f

# PM2
pm2 logs pnptv-bot

# Cloud Platform
# Use platform-specific logging (CloudWatch, Stackdriver, etc.)
\`\`\`

### 5. Set Up Monitoring

**Sentry:**
- Errors automatically sent if SENTRY_DSN is set
- View at https://sentry.io

**Custom Monitoring:**
- Health check: `GET /health`
- API status: `GET /api/status`
- Set up uptime monitoring (UptimeRobot, Pingdom, etc.)

## Scaling

### Horizontal Scaling

For high traffic, run multiple bot instances:

\`\`\`yaml
# docker-compose.yml
services:
  bot:
    deploy:
      replicas: 3
    # ... rest of config
\`\`\`

### Load Balancing

Use nginx or cloud load balancer:

\`\`\`nginx
upstream pnptv {
    server bot1:3000;
    server bot2:3000;
    server bot3:3000;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://pnptv;
    }
}
\`\`\`

### Database Optimization

1. **Firestore:**
   - Use composite indexes for complex queries
   - Implement pagination for large result sets
   - Cache frequently accessed data in Redis

2. **Redis:**
   - Use Redis Cluster for high availability
   - Set appropriate TTLs to prevent memory issues
   - Monitor memory usage

## Maintenance

### Daily Tasks

\`\`\`bash
# Check logs for errors
docker-compose logs --tail=100 bot | grep ERROR

# Monitor resource usage
docker stats

# Check subscription expirations (automated via cron)
# Runs automatically at 2 AM daily
\`\`\`

### Weekly Tasks

- Review Sentry errors
- Check payment webhook logs
- Monitor user growth
- Review API usage

### Monthly Tasks

- Update dependencies: `npm update`
- Review and optimize Firestore usage
- Analyze bot analytics
- Backup important data

## Troubleshooting

### Bot Not Responding

\`\`\`bash
# Check if bot is running
docker ps | grep pnptv-bot

# Check logs
docker logs pnptv-bot --tail=50

# Restart bot
docker-compose restart bot
\`\`\`

### Payment Webhooks Not Working

1. Verify webhook URLs are publicly accessible
2. Check webhook logs in payment provider dashboard
3. Test webhook manually:
   \`\`\`bash
   curl -X POST http://your-domain.com/api/webhooks/epayco \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   \`\`\`

### High Memory Usage

\`\`\`bash
# Check Redis memory
redis-cli info memory

# Clear cache if needed
redis-cli FLUSHDB

# Restart services
docker-compose restart
\`\`\`

### Firestore Quota Exceeded

1. Review query patterns
2. Implement better caching
3. Optimize indexes
4. Consider upgrading Firebase plan

## Backup Strategy

### Database Backup

\`\`\`bash
# Firestore (automated in Firebase Console)
# Settings → Backups → Schedule daily backups

# Export manually
gcloud firestore export gs://YOUR_BUCKET/backups/$(date +%Y%m%d)
\`\`\`

### Code Backup

- Use Git for version control
- Tag releases: `git tag v1.0.0`
- Push to GitHub/GitLab

### Configuration Backup

- Store .env files securely (encrypted)
- Document all API keys and credentials
- Use secret management tools (AWS Secrets Manager, etc.)

## Security Best Practices

1. **Rotate API Keys** regularly
2. **Monitor webhook signatures** for authenticity
3. **Keep dependencies updated**: `npm audit fix`
4. **Use HTTPS** for all endpoints
5. **Implement rate limiting** (already included)
6. **Review Firestore security rules** periodically
7. **Enable 2FA** on all service accounts

## Support

For deployment issues:
- Check logs first
- Review this guide
- Open GitHub issue
- Contact: dev@pnptv.com

---

**Last Updated:** January 2025
