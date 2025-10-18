#!/bin/bash

# VPS Deployment Script for Meeting Management App
# Usage: ./scripts/deploy.sh [environment]

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-production}
PROJECT_NAME="datn"
BACKUP_DIR="/opt/backups/$PROJECT_NAME"
LOG_FILE="/var/log/$PROJECT_NAME-deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
    fi
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    # Check available disk space (minimum 2GB)
    available_space=$(df / | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 2097152 ]]; then
        error "Insufficient disk space. At least 2GB required"
    fi
    
    # Check available memory (minimum 1GB)
    available_memory=$(free -m | awk 'NR==2{print $7}')
    if [[ $available_memory -lt 1024 ]]; then
        warning "Low available memory. At least 1GB recommended"
    fi
    
    log "System requirements check passed"
}

# Create backup
create_backup() {
    if [[ -f "docker-compose.yml" ]]; then
        log "Creating backup..."
        
        # Create backup directory
        sudo mkdir -p "$BACKUP_DIR"
        
        # Backup current deployment
        backup_name="backup-$(date +%Y%m%d-%H%M%S)"
        backup_path="$BACKUP_DIR/$backup_name"
        
        sudo mkdir -p "$backup_path"
        
        # Export current containers
        if docker-compose ps -q | grep -q .; then
            log "Backing up current containers..."
            docker-compose down
        fi
        
        # Backup volumes
        if docker volume ls -q | grep -q "${PROJECT_NAME}"; then
            log "Backing up volumes..."
            docker run --rm -v "${PROJECT_NAME}_server_uploads:/data" -v "$backup_path:/backup" alpine tar czf /backup/uploads.tar.gz -C /data .
        fi
        
        # Backup environment files
        if [[ -f ".env" ]]; then
            sudo cp .env "$backup_path/"
        fi
        
        log "Backup created at $backup_path"
    fi
}

# Update system packages
update_system() {
    log "Updating system packages..."
    
    # Update package list
    sudo apt update
    
    # Upgrade security packages only
    sudo apt upgrade -y --with-new-pkgs
    
    # Clean up
    sudo apt autoremove -y
    sudo apt autoclean
    
    log "System update completed"
}

# Setup environment
setup_environment() {
    log "Setting up environment..."
    
    # Create .env file if it doesn't exist
    if [[ ! -f ".env" ]]; then
        if [[ -f ".env.example" ]]; then
            cp .env.example .env
            warning "Created .env from .env.example. Please update with your values"
        else
            error ".env file not found and no .env.example available"
        fi
    fi
    
    # Validate required environment variables
    required_vars=("MONGODB_URI" "JWT_SECRET")
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" .env; then
            error "Required environment variable $var not found in .env"
        fi
    done
    
    log "Environment setup completed"
}

# Build and deploy
deploy() {
    log "Starting deployment for $ENVIRONMENT environment..."
    
    # Pull latest images
    log "Pulling latest base images..."
    docker-compose -f docker-compose.prod.yml pull --ignore-pull-failures
    
    # Build application images
    log "Building application images..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    # Start services
    log "Starting services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    timeout=300  # 5 minutes
    elapsed=0
    
    while [[ $elapsed -lt $timeout ]]; do
        if docker-compose -f docker-compose.prod.yml ps | grep -q "healthy"; then
            log "Services are healthy"
            break
        fi
        
        sleep 10
        elapsed=$((elapsed + 10))
        info "Waiting for services... ($elapsed/$timeout seconds)"
    done
    
    if [[ $elapsed -ge $timeout ]]; then
        error "Services failed to become healthy within $timeout seconds"
    fi
    
    log "Deployment completed successfully"
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Check if containers are running
    if ! docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        error "Some containers are not running"
    fi
    
    # Check API health endpoint
    if command -v curl &> /dev/null; then
        if ! curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
            error "API health check failed"
        fi
    fi
    
    # Check frontend
    if command -v curl &> /dev/null; then
        if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
            warning "Frontend health check failed"
        fi
    fi
    
    log "Health check passed"
}

# Cleanup old images and containers
cleanup() {
    log "Cleaning up old images and containers..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes (be careful with this)
    # docker volume prune -f
    
    # Remove unused networks
    docker network prune -f
    
    log "Cleanup completed"
}

# Setup log rotation
setup_logging() {
    log "Setting up log rotation..."
    
    # Create logrotate configuration
    sudo tee /etc/logrotate.d/$PROJECT_NAME > /dev/null <<EOF
$LOG_FILE {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 $(whoami) $(whoami)
}
EOF
    
    log "Log rotation configured"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Create monitoring directories
    mkdir -p monitoring/{prometheus,grafana/{dashboards,datasources}}
    
    # Basic Prometheus config
    if [[ ! -f "monitoring/prometheus.yml" ]]; then
        cat > monitoring/prometheus.yml <<EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']
  
  - job_name: 'app-metrics'
    static_configs:
      - targets: ['server:5000']
EOF
    fi
    
    log "Monitoring setup completed"
}

# Main deployment function
main() {
    log "Starting VPS deployment process..."
    
    check_root
    check_requirements
    create_backup
    update_system
    setup_environment
    setup_logging
    setup_monitoring
    deploy
    health_check
    cleanup
    
    log "Deployment completed successfully!"
    info "Application is running at:"
    info "  Frontend: http://$(hostname -I | awk '{print $1}'):3000"
    info "  Backend:  http://$(hostname -I | awk '{print $1}'):5000"
    info "  Logs:     $LOG_FILE"
}

# Handle script interruption
trap 'error "Deployment interrupted"' INT TERM

# Run main function
main "$@"
