#!/bin/bash

# ======================
# Quick Update Script for VPS
# ======================
# Upload script này lên VPS và chạy để update code nhanh

set -e

echo "🔄 Starting update process..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration - THAY ĐỔI NẾU CẦN
APP_DIR="/var/www/meeting-app"
PM2_APP_NAME="meeting-app"
BACKUP_DIR="/var/backups/meeting-app"

# Check if running in correct directory
if [ ! -d "$APP_DIR" ]; then
  echo -e "${RED}❌ App directory not found: $APP_DIR${NC}"
  echo "Please update APP_DIR in this script"
  exit 1
fi

# Create backup
echo -e "${YELLOW}📦 Creating backup...${NC}"
mkdir -p $BACKUP_DIR
BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
cd $(dirname $APP_DIR)
tar -czf $BACKUP_FILE $(basename $APP_DIR) 2>/dev/null || echo "Backup failed, continuing..."
echo -e "${GREEN}✅ Backup: $BACKUP_FILE${NC}"

# Navigate to app directory
cd $APP_DIR

# Stash any local changes to .env
echo -e "${YELLOW}💾 Stashing local changes...${NC}"
git stash push -m "Auto-stash before update" server/.env client/.env* 2>/dev/null || true

# Pull latest code
echo -e "${YELLOW}📥 Pulling latest code from git...${NC}"
git pull origin main || {
  echo -e "${RED}❌ Git pull failed${NC}"
  exit 1
}

# Restore .env files
echo -e "${YELLOW}🔧 Restoring .env files...${NC}"
git checkout server/.env 2>/dev/null || true
git stash pop 2>/dev/null || true

# Check if package.json changed
SERVER_PKG_CHANGED=false
CLIENT_PKG_CHANGED=false

if git diff HEAD~1 --name-only | grep -q "server/package.json"; then
  SERVER_PKG_CHANGED=true
fi

if git diff HEAD~1 --name-only | grep -q "client/package.json"; then
  CLIENT_PKG_CHANGED=true
fi

# Update server dependencies if needed
if [ "$SERVER_PKG_CHANGED" = true ]; then
  echo -e "${YELLOW}📦 Updating server dependencies...${NC}"
  cd $APP_DIR/server
  npm install --production
else
  echo -e "${GREEN}✅ Server dependencies unchanged${NC}"
fi

# Update and rebuild client
echo -e "${YELLOW}🏗️  Rebuilding client...${NC}"
cd $APP_DIR/client

if [ "$CLIENT_PKG_CHANGED" = true ]; then
  echo -e "${YELLOW}📦 Installing client dependencies...${NC}"
  npm install
fi

echo -e "${YELLOW}🔨 Building production client...${NC}"
NODE_ENV=production GENERATE_SOURCEMAP=false npm run build

# Reload PM2 (zero-downtime)
echo -e "${YELLOW}🔄 Reloading server with PM2...${NC}"
pm2 reload $PM2_APP_NAME

# Wait for server to start
sleep 3

# Check status
echo -e "${YELLOW}📊 Checking status...${NC}"
pm2 status $PM2_APP_NAME

# Test health endpoint
echo -e "${YELLOW}🏥 Testing health endpoint...${NC}"
HEALTH_RESPONSE=$(curl -s https://meeting-management.phenikaa-uni.edu.vn/api/auth/health)
if echo $HEALTH_RESPONSE | grep -q "ok"; then
  echo -e "${GREEN}✅ Health check passed!${NC}"
else
  echo -e "${RED}❌ Health check failed: $HEALTH_RESPONSE${NC}"
fi

# Save PM2 config
pm2 save

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Update completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Test website: https://meeting-management.phenikaa-uni.edu.vn"
echo "2. Test file downloads trong biên bản"
echo "3. Monitor logs: pm2 logs $PM2_APP_NAME"
echo ""
echo -e "${YELLOW}📊 Useful commands:${NC}"
echo "  pm2 logs $PM2_APP_NAME     - View logs"
echo "  pm2 monit                  - Real-time monitor"
echo "  pm2 restart $PM2_APP_NAME  - Restart if needed"
echo ""

