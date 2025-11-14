# PM2 Deployment Guide

## Overview

This guide explains how to deploy and manage the PNPtv Telegram Bot using PM2 process manager.

PM2 is a production-ready process manager for Node.js applications that provides:
- ✅ Auto-restart on crashes
- ✅ Load balancing
- ✅ Log management
- ✅ Monitoring
- ✅ Zero-downtime reloads
- ✅ Startup scripts

---

## 📦 Quick Start

### 1. Initial Setup

```bash
# Run setup script (installs PM2, dependencies, creates directories)
npm run pm2:setup
# or
./pm2-deploy.sh setup
```

This will:
- Install PM2 globally (if not installed)
- Install project dependencies
- Check for .env file
- Create log directories
- Configure PM2 log rotation

### 2. Configure Environment

Ensure your `.env` file is configured:

```bash
# Copy example if needed
cp .env.example .env

# Edit with your credentials
nano .env
```

### 3. Start the Bot

```bash
# Start in production mode
npm run pm2:start
# or
./pm2-deploy.sh start production

# Start in development mode
npm run pm2:start:dev
# or
./pm2-deploy.sh start development
```

### 4. Verify It's Running

```bash
npm run pm2:status
# or
pm2 list
```

---

## 🚀 Deployment Commands

### NPM Scripts

```bash
# Setup
npm run pm2:setup           # Initial setup

# Start/Stop
npm run pm2:start           # Start (production)
npm run pm2:start:dev       # Start (development)
npm run pm2:stop            # Stop the bot
npm run pm2:restart         # Restart the bot
npm run pm2:reload          # Reload without downtime

# Monitoring
npm run pm2:status          # Show status
npm run pm2:logs            # Show logs (follow mode)
npm run pm2:monitor         # Open PM2 monitor

# Management
npm run pm2:delete          # Delete from PM2
npm run pm2:save            # Save current process list
npm run pm2:startup         # Configure startup on boot
npm run pm2:update          # Pull latest code & reload
```

### Direct Script Commands

```bash
# All commands support environment parameter
./pm2-deploy.sh start production
./pm2-deploy.sh start development
./pm2-deploy.sh start staging

# Commands
./pm2-deploy.sh setup
./pm2-deploy.sh start [env]
./pm2-deploy.sh stop
./pm2-deploy.sh restart
./pm2-deploy.sh reload [env]
./pm2-deploy.sh status
./pm2-deploy.sh logs [lines]
./pm2-deploy.sh delete
./pm2-deploy.sh monitor
./pm2-deploy.sh save
./pm2-deploy.sh startup
./pm2-deploy.sh update
```

---

## 📊 PM2 Ecosystem Configuration

The `ecosystem.config.js` file defines how PM2 manages the bot:

### Main Bot Process

```javascript
{
  name: 'pnptv-bot',
  script: './src/index.js',
  instances: 1,              // Single instance (Telegram bot)
  exec_mode: 'fork',         // Fork mode (not cluster)
  autorestart: true,
  max_memory_restart: '500M', // Restart if > 500MB
  cron_restart: '0 3 * * *', // Daily restart at 3 AM
}
```

### Cleanup Service (Optional)

```javascript
{
  name: 'pnptv-cleanup',
  script: './src/services/cleanupService.js',
  cron_restart: '0 2 * * *', // Daily at 2 AM
}
```

### Environment Variables

- **development**: Development mode, port 3000
- **production**: Production mode, port 3000
- **staging**: Staging mode, port 3001

---

## 🔧 Common Tasks

### Starting the Bot for the First Time

```bash
# 1. Setup
npm run pm2:setup

# 2. Configure .env
nano .env

# 3. Start
npm run pm2:start

# 4. Check status
npm run pm2:status

# 5. View logs
npm run pm2:logs
```

### Updating the Bot

```bash
# Method 1: Using update script (recommended)
npm run pm2:update

# Method 2: Manual
git pull
npm install
npm run pm2:reload
```

### Viewing Logs

```bash
# Follow logs in real-time
npm run pm2:logs
# or
pm2 logs pnptv-bot

# Show last 200 lines
pm2 logs pnptv-bot --lines 200

# Show only errors
pm2 logs pnptv-bot --err

# Log files location
ls -la logs/pm2/
```

### Monitoring

```bash
# Real-time monitoring dashboard
npm run pm2:monitor
# or
pm2 monit

# Detailed info
pm2 describe pnptv-bot

# Process list
pm2 list
```

### Restarting Without Downtime

```bash
# Graceful reload (zero downtime)
npm run pm2:reload

# Hard restart (brief downtime)
npm run pm2:restart
```

### Auto-Start on Server Boot

```bash
# 1. Generate startup script
npm run pm2:startup

# 2. Run the command shown (requires sudo)
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root

# 3. Save current process list
npm run pm2:save

# Now PM2 will start automatically on boot
```

### Stopping the Bot

```bash
# Stop temporarily
npm run pm2:stop

# Stop and remove from PM2
npm run pm2:delete
```

---

## 📈 Monitoring & Logs

### Log Files

Logs are stored in `logs/pm2/`:

```
logs/pm2/
├── error.log          # Error logs
├── out.log            # Output logs
├── combined.log       # Combined logs
├── cleanup-error.log  # Cleanup service errors
└── cleanup-out.log    # Cleanup service output
```

### Log Rotation

PM2 automatically rotates logs:
- **Max size**: 10MB per file
- **Retention**: 7 days
- **Compression**: Enabled

Configure in setup or manually:
```bash
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### Real-Time Monitoring

```bash
# Built-in monitor
pm2 monit

# Web dashboard (optional)
pm2 plus
```

---

## 🔒 Production Best Practices

### 1. Configure Startup Script

```bash
npm run pm2:startup
# Follow the instructions shown
npm run pm2:save
```

### 2. Set Memory Limits

Already configured in `ecosystem.config.js`:
```javascript
max_memory_restart: '500M'
```

### 3. Enable Log Rotation

Automatically configured during setup:
```bash
pm2 install pm2-logrotate
```

### 4. Schedule Regular Restarts

Configured for daily restart at 3 AM:
```javascript
cron_restart: '0 3 * * *'
```

### 5. Monitor Resource Usage

```bash
# Check memory/CPU
pm2 monit

# Or use
htop
```

### 6. Backup Process List

```bash
# After any changes
npm run pm2:save
```

---

## 🐛 Troubleshooting

### Bot Won't Start

```bash
# Check logs
pm2 logs pnptv-bot --err --lines 50

# Check .env file
cat .env | grep TELEGRAM_BOT_TOKEN

# Try manual start to see errors
node src/index.js
```

### Memory Issues

```bash
# Check current memory usage
pm2 monit

# Increase limit in ecosystem.config.js
max_memory_restart: '1G'

# Reload
pm2 reload ecosystem.config.js
```

### PM2 Not Found

```bash
# Install globally
npm install -g pm2

# Or use npx
npx pm2 list
```

### Process Keeps Restarting

```bash
# Check error logs
pm2 logs pnptv-bot --err

# Common issues:
# - Missing .env file
# - Invalid bot token
# - Port already in use
# - Database connection failed
```

### Logs Not Showing

```bash
# Check log directory exists
mkdir -p logs/pm2

# Check PM2 log path
pm2 describe pnptv-bot | grep log

# Flush logs
pm2 flush
```

### Can't Stop Process

```bash
# Force stop
pm2 stop pnptv-bot --force

# Delete and restart
pm2 delete pnptv-bot
npm run pm2:start
```

---

## 🔄 Update Workflow

### Standard Update

```bash
# 1. Pull latest changes
git pull

# 2. Install dependencies
npm install

# 3. Reload without downtime
npm run pm2:reload
```

### Quick Update (All-in-One)

```bash
npm run pm2:update
```

### Rollback

```bash
# 1. Revert code
git checkout previous-commit-hash

# 2. Reinstall dependencies
npm install

# 3. Reload
npm run pm2:reload
```

---

## 📋 Health Checks

### Quick Health Check

```bash
#!/bin/bash
pm2 describe pnptv-bot | grep -E "status|uptime|memory|cpu"
```

### Full Status Report

```bash
pm2 list
pm2 describe pnptv-bot
pm2 logs pnptv-bot --lines 20 --nostream
```

---

## 🌐 Multi-Environment Setup

### Development

```bash
./pm2-deploy.sh start development
```

### Staging

```bash
./pm2-deploy.sh start staging
```

### Production

```bash
./pm2-deploy.sh start production
```

### Running Multiple Environments

```bash
# Modify app name in ecosystem.config.js
name: 'pnptv-bot-dev'
name: 'pnptv-bot-staging'
name: 'pnptv-bot-prod'
```

---

## 📊 PM2 Commands Reference

### Process Management

```bash
pm2 start ecosystem.config.js          # Start
pm2 stop pnptv-bot                     # Stop
pm2 restart pnptv-bot                  # Restart
pm2 reload pnptv-bot                   # Reload (zero downtime)
pm2 delete pnptv-bot                   # Delete
```

### Information

```bash
pm2 list                               # List all processes
pm2 describe pnptv-bot                 # Detailed info
pm2 monit                              # Monitor
```

### Logs

```bash
pm2 logs                               # All logs
pm2 logs pnptv-bot                     # Specific app
pm2 logs --lines 100                   # Last 100 lines
pm2 flush                              # Clear logs
```

### Persistence

```bash
pm2 save                               # Save process list
pm2 resurrect                          # Restore saved processes
pm2 unstartup                          # Disable auto-start
pm2 startup                            # Enable auto-start
```

### Updates

```bash
pm2 update                             # Update PM2
npm install -g pm2@latest              # Install latest PM2
```

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| **First time setup** | `npm run pm2:setup` |
| **Start bot** | `npm run pm2:start` |
| **Stop bot** | `npm run pm2:stop` |
| **Restart bot** | `npm run pm2:restart` |
| **Reload (no downtime)** | `npm run pm2:reload` |
| **View logs** | `npm run pm2:logs` |
| **Monitor** | `npm run pm2:monitor` |
| **Status** | `npm run pm2:status` |
| **Update code** | `npm run pm2:update` |
| **Auto-start on boot** | `npm run pm2:startup` then `npm run pm2:save` |

---

## 🚀 Production Deployment Checklist

- [ ] `.env` file configured with production credentials
- [ ] Dependencies installed: `npm install`
- [ ] PM2 installed globally: `npm install -g pm2`
- [ ] Logs directory created: `mkdir -p logs/pm2`
- [ ] Bot started: `npm run pm2:start`
- [ ] Status verified: `npm run pm2:status`
- [ ] Logs checked: `npm run pm2:logs`
- [ ] Startup script configured: `npm run pm2:startup`
- [ ] Process list saved: `npm run pm2:save`
- [ ] Log rotation enabled: `pm2 install pm2-logrotate`
- [ ] Monitoring set up: `pm2 monit`
- [ ] Test bot functionality in Telegram

---

## 📞 Support

For issues or questions:

1. Check logs: `npm run pm2:logs`
2. Check status: `npm run pm2:status`
3. Review [PM2 Documentation](https://pm2.keymetrics.io/)
4. Contact development team

---

**Last Updated:** November 14, 2025  
**Version:** 1.0.0  
**PM2 Version:** 5.x
