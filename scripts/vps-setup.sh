#!/bin/bash

# VPS Initial Setup Script for Meeting Management App
# Usage: ./scripts/vps-setup.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root for initial setup"
fi

# Update system
log "Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
log "Installing essential packages..."
apt install -y \
    curl \
    wget \
    git \
    unzip \
    htop \
    nano \
    ufw \
    fail2ban \
    logrotate \
    cron \
    certbot \
    nginx

# Install Docker
log "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    
    # Add current user to docker group
    if [[ -n "$SUDO_USER" ]]; then
        usermod -aG docker "$SUDO_USER"
        log "Added $SUDO_USER to docker group"
    fi
else
    log "Docker already installed"
fi

# Install Docker Compose
log "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    log "Docker Compose already installed"
fi

# Install Node.js (for local development/debugging)
log "Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
else
    log "Node.js already installed"
fi

# Setup firewall
log "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (be careful with this)
ufw allow ssh

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow application ports (you may want to remove these in production)
ufw allow 3000/tcp comment "Frontend"
ufw allow 5000/tcp comment "Backend API"

# Enable firewall
ufw --force enable

# Configure fail2ban
log "Configuring fail2ban..."
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# Setup swap if not exists (for low memory VPS)
log "Setting up swap..."
if [[ ! -f /swapfile ]]; then
    # Create 2GB swap file
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    
    # Make swap permanent
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    
    # Optimize swap usage
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf
    
    log "Swap file created and configured"
else
    log "Swap file already exists"
fi

# Create application user
log "Creating application user..."
APP_USER="appuser"
if ! id "$APP_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$APP_USER"
    usermod -aG docker "$APP_USER"
    
    # Create SSH directory for app user
    mkdir -p /home/$APP_USER/.ssh
    chown $APP_USER:$APP_USER /home/$APP_USER/.ssh
    chmod 700 /home/$APP_USER/.ssh
    
    log "Created user: $APP_USER"
else
    log "User $APP_USER already exists"
fi

# Setup application directory
log "Setting up application directory..."
APP_DIR="/opt/meeting-app"
mkdir -p "$APP_DIR"
chown $APP_USER:$APP_USER "$APP_DIR"

# Setup log directory
mkdir -p /var/log/meeting-app
chown $APP_USER:$APP_USER /var/log/meeting-app

# Setup backup directory
mkdir -p /opt/backups/meeting-app
chown $APP_USER:$APP_USER /opt/backups/meeting-app

# Configure nginx (basic setup)
log "Configuring nginx..."
cat > /etc/nginx/sites-available/meeting-app <<EOF
server {
    listen 80;
    server_name _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # API
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/meeting-app /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Setup systemd service for auto-start
log "Setting up systemd service..."
cat > /etc/systemd/system/meeting-app.service <<EOF
[Unit]
Description=Meeting Management Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
User=$APP_USER
Group=$APP_USER

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable meeting-app

# Setup log rotation for application logs
log "Setting up log rotation..."
cat > /etc/logrotate.d/meeting-app <<EOF
/var/log/meeting-app/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 644 $APP_USER $APP_USER
    postrotate
        docker-compose -f $APP_DIR/docker-compose.prod.yml restart server 2>/dev/null || true
    endscript
}
EOF

# Setup monitoring script
log "Setting up monitoring..."
cat > /usr/local/bin/monitor-app.sh <<EOF
#!/bin/bash

# Simple monitoring script
LOG_FILE="/var/log/meeting-app/monitor.log"
APP_DIR="$APP_DIR"

cd \$APP_DIR

# Check if containers are running
if ! docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "\$(date): Some containers are down, restarting..." >> \$LOG_FILE
    docker-compose -f docker-compose.prod.yml up -d
fi

# Check disk space
DISK_USAGE=\$(df / | awk 'NR==2 {print \$5}' | sed 's/%//')
if [[ \$DISK_USAGE -gt 85 ]]; then
    echo "\$(date): High disk usage: \$DISK_USAGE%" >> \$LOG_FILE
    # Cleanup old Docker images
    docker image prune -f
fi

# Check memory usage
MEMORY_USAGE=\$(free | awk 'NR==2{printf "%.0f", \$3*100/\$2}')
if [[ \$MEMORY_USAGE -gt 90 ]]; then
    echo "\$(date): High memory usage: \$MEMORY_USAGE%" >> \$LOG_FILE
fi
EOF

chmod +x /usr/local/bin/monitor-app.sh

# Setup cron job for monitoring
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/monitor-app.sh") | crontab -

# Setup automatic security updates
log "Setting up automatic security updates..."
apt install -y unattended-upgrades
cat > /etc/apt/apt.conf.d/50unattended-upgrades <<EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

# Enable automatic updates
echo 'APT::Periodic::Update-Package-Lists "1";' > /etc/apt/apt.conf.d/20auto-upgrades
echo 'APT::Periodic::Unattended-Upgrade "1";' >> /etc/apt/apt.conf.d/20auto-upgrades

# Create environment template
log "Creating environment template..."
cat > "$APP_DIR/.env.example" <<EOF
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/meeting-app?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-here

# URLs
FRONTEND_URL=http://your-domain.com
DOMAIN_URL=https://your-domain.com
REACT_APP_API_BASE_URL=https://your-domain.com/api
REACT_APP_SOCKET_URL=https://your-domain.com

# Email (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Monitoring (optional)
GRAFANA_PASSWORD=secure-password-here
EOF

chown $APP_USER:$APP_USER "$APP_DIR/.env.example"

# Final instructions
log "VPS setup completed successfully!"
info ""
info "Next steps:"
info "1. Clone your application to $APP_DIR"
info "2. Copy .env.example to .env and configure your values"
info "3. Run the deployment script: ./scripts/deploy.sh"
info ""
info "Important security notes:"
info "- Change default passwords"
info "- Configure SSL certificates with certbot"
info "- Review firewall rules"
info "- Setup backup strategy"
info ""
info "Application will be available at:"
info "- Frontend: http://$(hostname -I | awk '{print $1}')"
info "- Backend API: http://$(hostname -I | awk '{print $1}')/api"
info ""
warning "Remember to reboot the system to ensure all changes take effect"
