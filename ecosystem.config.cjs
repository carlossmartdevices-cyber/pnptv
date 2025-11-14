/**
 * PM2 Ecosystem Configuration for PNPtv Telegram Bot
 * 
 * This configuration file defines how PM2 should manage the bot processes.
 * It includes settings for production, development, and testing environments.
 * 
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 start ecosystem.config.js --env development
 *   pm2 reload ecosystem.config.js --env production
 *   pm2 stop ecosystem.config.js
 *   pm2 delete ecosystem.config.js
 * 
 * Features:
 * - Auto-restart on file changes (watch mode for dev)
 * - Memory limit monitoring
 * - Log rotation
 * - Cluster mode support
 * - Environment-specific configurations
 */

module.exports = {
  apps: [
    {
      // Main Bot Application
      name: 'pnptv-bot',
      script: './src/index.js',
      
      // Instances
      instances: 1, // Single instance for Telegram bot (no cluster needed)
      exec_mode: 'fork', // Fork mode (not cluster) for Telegram bot
      
      // Auto-restart configuration
      autorestart: true,
      watch: false, // Disable in production, enable in dev
      max_memory_restart: '500M', // Restart if memory exceeds 500MB
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
      },
      
      // Logging
      error_file: './logs/pm2/error.log',
      out_file: './logs/pm2/out.log',
      log_file: './logs/pm2/combined.log',
      time: true, // Prefix logs with timestamp
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Advanced options
      min_uptime: '10s', // Min uptime before considered online
      max_restarts: 10, // Max restarts within 1 minute before stopping
      restart_delay: 4000, // Delay between restarts (ms)
      
      // Process management
      kill_timeout: 5000, // Time to wait before force kill (ms)
      listen_timeout: 3000, // Time to wait for app to be ready
      shutdown_with_message: true,
      
      // Source map support
      source_map_support: true,
      
      // Ignore these files/folders when watching
      ignore_watch: [
        'node_modules',
        'logs',
        '.git',
        'test-*.js',
        '*.md',
        '.env*',
      ],
      
      // Additional options
      combine_logs: true,
      
      // Cron restart (optional - restart daily at 3 AM)
      cron_restart: '0 3 * * *',
      
      // Exponential backoff restart delay
      exp_backoff_restart_delay: 100,
    },
    
    // Cleanup Service (Optional - for subscription management)
    {
      name: 'pnptv-cleanup',
      script: './src/services/cleanupService.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      
      error_file: './logs/pm2/cleanup-error.log',
      out_file: './logs/pm2/cleanup-out.log',
      time: true,
      
      // Run daily at 2 AM
      cron_restart: '0 2 * * *',
    },
  ],
  
  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'root',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'git@github.com:carlossmartdevices-cyber/pnptv.git',
      path: '/var/www/pnptv',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get install git -y',
      ssh_options: 'StrictHostKeyChecking=no',
    },
    
    staging: {
      user: 'root',
      host: ['staging-server-ip'],
      ref: 'origin/develop',
      repo: 'git@github.com:carlossmartdevices-cyber/pnptv.git',
      path: '/var/www/pnptv-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging',
      ssh_options: 'StrictHostKeyChecking=no',
    },
  },
};
