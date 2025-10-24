#!/bin/bash

# ======================
# VPS Deployment Script
# ======================
# Script tự động deploy ứng dụng lên VPS

set -e  # Exit on error

echo "🚀 Starting deployment process..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/meeting-app"
BACKUP_DIR="/var/backups/meeting-app"
PM2_APP_NAME="meeting-app"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}❌ Please run as root (sudo)${NC}"
  exit 1
fi

# Create backup
echo -e "${YELLOW}📦 Creating backup...${NC}"
mkdir -p $BACKUP_DIR
BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
if [ -d "$APP_DIR" ]; then
  tar -czf $BACKUP_FILE $APP_DIR
  echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
fi

# Pull latest code
echo -e "${YELLOW}📥 Pulling latest code...${NC}"
cd $APP_DIR
git pull origin main

# Install server dependencies
echo -e "${YELLOW}📦 Installing server dependencies...${NC}"
cd $APP_DIR/server
npm install --production

# Build client
echo -e "${YELLOW}🏗️  Building client...${NC}"
cd $APP_DIR/client
npm install
NODE_ENV=production GENERATE_SOURCEMAP=false npm run build

# Restart server with PM2
echo -e "${YELLOW}🔄 Restarting server...${NC}"
pm2 restart $PM2_APP_NAME || pm2 start $APP_DIR/server/index.js --name $PM2_APP_NAME

# Save PM2 configuration
pm2 save

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}📊 Check status: pm2 status${NC}"
echo -e "${GREEN}📝 View logs: pm2 logs $PM2_APP_NAME${NC}"

