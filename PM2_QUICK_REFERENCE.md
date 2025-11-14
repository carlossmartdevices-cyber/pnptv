# 🚀 PM2 Quick Reference

## ✅ Deployment Complete!

The PNPtv Telegram Bot is now running under PM2 process manager.

---

## 📊 Current Status

```bash
npm run pm2:status
```

**Process:** `pnptv-bot`  
**Status:** ✅ Online  
**Mode:** Fork  
**Auto-restart:** Enabled  
**Daily restart:** 3:00 AM UTC  
**Memory limit:** 500MB  

---

## 🎯 Quick Commands

| Command | Description |
|---------|-------------|
| `npm run pm2:status` | Check bot status |
| `npm run pm2:logs` | View logs (live) |
| `npm run pm2:restart` | Restart bot |
| `npm run pm2:reload` | Reload (zero downtime) |
| `npm run pm2:stop` | Stop bot |
| `npm run pm2:monitor` | Resource monitor |
| `npm run pm2:save` | Save configuration |

---

## 📝 Logs

**View logs:**
```bash
npm run pm2:logs
# or
pm2 logs pnptv-bot
```

**Log files location:**
```
logs/pm2/
├── out.log       # stdout
├── error.log     # stderr  
└── combined.log  # both
```

---

## 🔄 Update Bot

```bash
# Quick update (recommended)
npm run pm2:update

# Manual update
git pull
npm install
npm run pm2:reload
```

---

## 🛡️ Auto-Start on Boot

```bash
# Setup once
npm run pm2:startup
# Run the command shown
npm run pm2:save
```

---

## 🔍 Monitoring

```bash
# Real-time monitor
npm run pm2:monitor

# Detailed info
pm2 describe pnptv-bot

# Process list
pm2 list
```

---

## ⚙️ Configuration

**File:** `ecosystem.config.cjs`

```javascript
{
  name: 'pnptv-bot',
  script: './src/index.js',
  instances: 1,
  max_memory_restart: '500M',
  cron_restart: '0 3 * * *',  // Daily 3 AM
  env_production: {
    NODE_ENV: 'production',
    PORT: 3000,
  }
}
```

---

## 🆘 Troubleshooting

### Bot Not Responding
```bash
# Check logs
npm run pm2:logs

# Check status
npm run pm2:status

# Restart
npm run pm2:restart
```

### High Memory Usage
```bash
# Check memory
pm2 monit

# Restart to clear
npm run pm2:restart
```

### Can't Stop Process
```bash
pm2 delete pnptv-bot
npm run pm2:start
```

---

## 📚 Full Documentation

See [`PM2_DEPLOYMENT.md`](PM2_DEPLOYMENT.md) for complete guide.

---

**Status Check:** `npm run pm2:status`  
**Logs:** `npm run pm2:logs`  
**Help:** `./pm2-deploy.sh` (no args)

🎉 **Bot is live and ready!**
