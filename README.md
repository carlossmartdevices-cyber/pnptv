# PNPtv Telegram Bot

[![CI/CD](https://github.com/yourusername/pnptv/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/yourusername/pnptv/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Production-ready Telegram bot for PNPtv with subscriptions, live streaming, and social features.

## 🎬 Features

### User Features
- ✅ **Multi-language Support** - English and Spanish
- 👤 **User Profiles** - Customizable profiles with bio, photos, and interests
- 💎 **Subscription Plans** - Basic, Premium, and Gold tiers
- 💳 **Multiple Payment Methods** - ePayco (USD) and Daimo Pay (USDC)
- 🌍 **Nearby Users** - Find users within customizable radius (5km, 10km, 25km)
- 🎤 **Live Streaming** - Start and join live streams with Daily.co integration
- 📻 **24/7 Radio** - Dynamic radio streaming with song requests
- 🎥 **Video Rooms** - One-click video meetings (no host required)
- 🤖 **AI Support** - Cristina AI assistant powered by OpenAI

### Admin Features
- 📢 **Broadcast System** - Segment by language, subscription status, or all users
- 👥 **User Management** - Search, activate, deactivate, extend subscriptions
- 📊 **Analytics** - User growth, revenue tracking (coming soon)

### Technical Features
- 🚀 **Clean Architecture** - Modular, maintainable, and scalable
- 🔒 **Security** - Input validation, rate limiting, secure webhooks
- ⚡ **Performance** - Redis caching, optimized Firestore queries
- 📝 **Logging** - Structured logging with Winston
- 🐛 **Error Tracking** - Sentry integration
- 🧪 **Testing** - Unit and integration tests with Jest
- 📚 **API Documentation** - Swagger/OpenAPI docs
- 🐳 **Dockerized** - Easy deployment with Docker Compose
- 🔄 **CI/CD** - Automated testing and deployment with GitHub Actions

## 📋 Prerequisites

- Node.js 18+ and npm 9+
- Firebase/Firestore account
- Redis instance (local or cloud)
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- Payment Gateway accounts:
  - ePayco account (for USD payments)
  - Daimo Pay account (for USDC payments)
- Daily.co account (for video features)
- OpenAI API key (optional, for AI chat)
- Sentry account (optional, for error tracking)

## 🚀 Quick Start

### 1. Clone the repository

\`\`\`bash
git clone https://github.com/yourusername/pnptv.git
cd pnptv
\`\`\`

### 2. Install dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Configure environment variables

\`\`\`bash
cp .env.example .env
\`\`\`

Edit `.env` with your credentials:

\`\`\`env
TELEGRAM_BOT_TOKEN=your_bot_token
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY=your_private_key
REDIS_HOST=localhost
REDIS_PORT=6379
EPAYCO_PUBLIC_KEY=your_epayco_key
DAILY_API_KEY=your_daily_api_key
OPENAI_API_KEY=your_openai_key
SENTRY_DSN=your_sentry_dsn
\`\`\`

### 4. Start the bot

#### Development mode

\`\`\`bash
npm run dev
\`\`\`

#### Production mode

\`\`\`bash
npm start
\`\`\`

#### Docker

\`\`\`bash
docker-compose up -d
\`\`\`

## 📖 Documentation

### Project Structure

\`\`\`
src/
├── bot/
│   ├── core/               # Bot initialization and middleware
│   │   ├── bot.js          # Main bot setup
│   │   └── middleware/     # Custom middleware
│   ├── handlers/           # Command and callback handlers
│   │   ├── admin/          # Admin panel
│   │   ├── user/           # User features
│   │   ├── payments/       # Subscription handling
│   │   └── media/          # Radio, streams, video rooms
│   └── api/                # REST API and webhooks
│       ├── server.js       # Express server
│       ├── routes/         # API routes
│       └── controllers/    # Webhook handlers
├── services/              # Business logic
├── models/                # Data models
├── utils/                 # Utilities (logger, i18n, validation)
└── config/                # Configuration (Firebase, Redis)
\`\`\`

### API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health
- **API Status**: http://localhost:3000/api/status

### User Flows

#### Onboarding Flow
1. User sends `/start`
2. Language selection (English/Spanish)
3. Age confirmation (18+)
4. Terms and privacy acceptance
5. Email collection (optional)
6. Main menu displayed

#### Subscription Flow
1. User clicks "Subscribe to PRIME"
2. Plan selection (Basic/Premium/Gold)
3. Payment method selection (ePayco/Daimo)
4. Payment link generated
5. User completes payment
6. Webhook confirms payment
7. Subscription activated
8. User notified

#### Nearby Users Flow
1. User clicks "Nearby Users" (requires location in profile)
2. Radius selection (5km/10km/25km)
3. System queries Firestore for nearby users
4. Results displayed with distance
5. User can view profiles

## 🧪 Testing

### Run all tests

\`\`\`bash
npm test
\`\`\`

### Run with coverage

\`\`\`bash
npm test -- --coverage
\`\`\`

### Watch mode

\`\`\`bash
npm run test:watch
\`\`\`

## 🔧 Configuration

### Firebase/Firestore

Create the following indexes in Firestore:

\`\`\`
Collection: users
- planExpiry (ASC), subscriptionStatus (ASC)
- location (GEO), subscriptionStatus (ASC)

Collection: payments
- userId (ASC), createdAt (DESC)

Collection: liveStreams
- isActive (ASC), createdAt (DESC)
\`\`\`

### Firestore Security Rules

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    match /payments/{paymentId} {
      allow read: if request.auth != null;
      allow write: if false; // Only server can write
    }
  }
}
\`\`\`

### Webhook Configuration

Set up webhooks in your payment providers:

**ePayco**:
- Confirmation URL: `https://your-domain.com/api/webhooks/epayco`

**Daimo Pay**:
- Callback URL: `https://your-domain.com/api/webhooks/daimo`

## 🚢 Deployment

### Docker Deployment

\`\`\`bash
# Build image
docker build -t pnptv-bot .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
\`\`\`

### Environment-specific Deployments

#### Staging

\`\`\`bash
NODE_ENV=staging docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d
\`\`\`

#### Production

\`\`\`bash
NODE_ENV=production docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
\`\`\`

## 🔐 Security

- All user inputs are sanitized and validated
- Rate limiting on API endpoints (100 req/15min)
- Webhook signature verification (implement in production)
- Environment variables for sensitive data
- Helmet.js for HTTP security headers
- CORS configured for allowed origins only

## 📊 Monitoring

### Logs

Logs are stored in the `logs/` directory:
- `error-YYYY-MM-DD.log` - Error logs
- `combined-YYYY-MM-DD.log` - All logs

### Sentry

Errors are automatically sent to Sentry with:
- User context (ID, username)
- Session data
- Stack traces

### Health Checks

Monitor bot health:
- Docker: Built-in health check every 30s
- HTTP: `GET /health` endpoint

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Support

- **Bot Support**: Use the `/support` command in the bot
- **Issues**: [GitHub Issues](https://github.com/yourusername/pnptv/issues)
- **Documentation**: [Wiki](https://github.com/yourusername/pnptv/wiki)

## 🙏 Acknowledgments

- [Telegraf](https://telegraf.js.org/) - Telegram bot framework
- [Daily.co](https://www.daily.co/) - Video infrastructure
- [ePayco](https://epayco.co/) - Payment gateway
- [Firebase](https://firebase.google.com/) - Backend services
- [Redis](https://redis.io/) - Caching

---

Made with ❤️ by the PNPtv Team
