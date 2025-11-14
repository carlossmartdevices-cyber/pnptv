#!/bin/bash

################################################################################
# PM2 Deployment Script for PNPtv Telegram Bot
# 
# This script handles the deployment of the bot using PM2 process manager.
# It includes setup, start, stop, restart, and status commands.
# 
# Usage:
#   ./pm2-deploy.sh setup      # Initial setup
#   ./pm2-deploy.sh start      # Start the bot
#   ./pm2-deploy.sh stop       # Stop the bot
#   ./pm2-deploy.sh restart    # Restart the bot
#   ./pm2-deploy.sh reload     # Reload without downtime
#   ./pm2-deploy.sh status     # Show status
#   ./pm2-deploy.sh logs       # Show logs
#   ./pm2-deploy.sh delete     # Delete from PM2
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="pnptv-bot"
ECOSYSTEM_FILE="ecosystem.config.cjs"
ENV=${2:-production}  # Default to production

# Helper functions
print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  $1"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

check_pm2_installed() {
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 is not installed"
        echo -e "${YELLOW}Installing PM2 globally...${NC}"
        npm install -g pm2
        print_success "PM2 installed successfully"
    else
        print_success "PM2 is installed"
    fi
}

check_dependencies() {
    if [ ! -d "node_modules" ]; then
        print_info "Node modules not found. Installing dependencies..."
        npm install
        print_success "Dependencies installed"
    else
        print_success "Dependencies are installed"
    fi
}

check_env_file() {
    if [ ! -f ".env" ]; then
        print_error ".env file not found"
        if [ -f ".env.example" ]; then
            print_info "Copying .env.example to .env"
            cp .env.example .env
            print_error "Please configure .env file before continuing"
            exit 1
        else
            print_error "No .env.example found. Please create .env file manually"
            exit 1
        fi
    else
        print_success ".env file exists"
    fi
}

create_log_directories() {
    mkdir -p logs/pm2
    print_success "Log directories created"
}

# Command functions
setup() {
    print_header "Setting up PM2 deployment"
    
    check_pm2_installed
    check_dependencies
    check_env_file
    create_log_directories
    
    # Install PM2 log rotate
    print_info "Installing PM2 log rotate module..."
    pm2 install pm2-logrotate
    pm2 set pm2-logrotate:max_size 10M
    pm2 set pm2-logrotate:retain 7
    pm2 set pm2-logrotate:compress true
    
    print_success "Setup completed successfully!"
    echo -e "\n${YELLOW}Next steps:${NC}"
    echo "  1. Configure your .env file"
    echo "  2. Run: ./pm2-deploy.sh start"
}

start() {
    print_header "Starting PNPtv Bot"
    
    check_pm2_installed
    check_dependencies
    check_env_file
    
    print_info "Starting bot with environment: $ENV"
    pm2 start $ECOSYSTEM_FILE --env $ENV
    
    print_success "Bot started successfully!"
    echo ""
    pm2 list
}

stop() {
    print_header "Stopping PNPtv Bot"
    
    print_info "Stopping $APP_NAME..."
    pm2 stop $APP_NAME
    
    print_success "Bot stopped successfully!"
    echo ""
    pm2 list
}

restart() {
    print_header "Restarting PNPtv Bot"
    
    print_info "Restarting $APP_NAME..."
    pm2 restart $APP_NAME
    
    print_success "Bot restarted successfully!"
    echo ""
    pm2 list
}

reload() {
    print_header "Reloading PNPtv Bot (Zero Downtime)"
    
    print_info "Reloading $APP_NAME with environment: $ENV"
    pm2 reload $ECOSYSTEM_FILE --env $ENV
    
    print_success "Bot reloaded successfully!"
    echo ""
    pm2 list
}

status() {
    print_header "PNPtv Bot Status"
    
    pm2 list
    echo ""
    pm2 describe $APP_NAME
}

logs() {
    print_header "PNPtv Bot Logs"
    
    if [ -n "$2" ]; then
        # Show specific number of lines
        pm2 logs $APP_NAME --lines $2
    else
        # Follow logs
        pm2 logs $APP_NAME --lines 100
    fi
}

delete_app() {
    print_header "Deleting PNPtv Bot from PM2"
    
    print_info "Stopping and deleting $APP_NAME..."
    pm2 delete $APP_NAME || true
    
    print_success "Bot deleted from PM2"
    echo ""
    pm2 list
}

monitor() {
    print_header "Monitoring PNPtv Bot"
    
    pm2 monit
}

save() {
    print_header "Saving PM2 Configuration"
    
    print_info "Saving current PM2 process list..."
    pm2 save
    
    print_success "PM2 configuration saved!"
}

startup() {
    print_header "Configuring PM2 Startup"
    
    print_info "Generating startup script..."
    pm2 startup
    
    echo ""
    print_info "After running the command above, execute:"
    echo "  ./pm2-deploy.sh save"
}

update() {
    print_header "Updating PNPtv Bot"
    
    print_info "Pulling latest changes..."
    git pull
    
    print_info "Installing dependencies..."
    npm install
    
    print_info "Reloading bot..."
    pm2 reload $ECOSYSTEM_FILE --env $ENV
    
    print_success "Bot updated successfully!"
    echo ""
    pm2 list
}

# Main command handler
case "$1" in
    setup)
        setup
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    reload)
        reload
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    delete)
        delete_app
        ;;
    monitor)
        monitor
        ;;
    save)
        save
        ;;
    startup)
        startup
        ;;
    update)
        update
        ;;
    *)
        echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${BLUE}║${NC}  PNPtv Bot - PM2 Deployment Script"
        echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo "Usage: $0 {command} [environment]"
        echo ""
        echo "Commands:"
        echo "  setup      - Initial setup (install PM2, dependencies, create dirs)"
        echo "  start      - Start the bot"
        echo "  stop       - Stop the bot"
        echo "  restart    - Restart the bot"
        echo "  reload     - Reload without downtime"
        echo "  status     - Show bot status"
        echo "  logs       - Show and follow logs"
        echo "  delete     - Delete bot from PM2"
        echo "  monitor    - Open PM2 monitor"
        echo "  save       - Save PM2 process list"
        echo "  startup    - Configure PM2 to start on boot"
        echo "  update     - Pull latest changes and reload"
        echo ""
        echo "Environment (optional, default: production):"
        echo "  production, development, staging"
        echo ""
        echo "Examples:"
        echo "  $0 setup"
        echo "  $0 start production"
        echo "  $0 reload development"
        echo "  $0 logs"
        echo ""
        exit 1
        ;;
esac
