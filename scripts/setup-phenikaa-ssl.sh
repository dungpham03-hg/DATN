#!/bin/bash

# Script nhanh để setup SSL cho domain Phenikaa
# Usage: ./scripts/setup-phenikaa-ssl.sh

set -e

DOMAIN="meeting-management.phenikaa-uni.edu.vn"
EMAIL="admin@phenikaa-uni.edu.vn"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ $1${NC}"; }
print_header() { echo -e "${BLUE}$1${NC}"; }

clear
echo "============================================="
echo "   🎓 Setup SSL cho Phenikaa University"
echo "   Domain: $DOMAIN"
echo "============================================="
echo ""

# Check DNS
print_header "Bước 1: Kiểm tra DNS"
print_info "Kiểm tra DNS resolution..."

SERVER_IP=$(curl -s ifconfig.me)
DNS_IP=$(dig +short "$DOMAIN" | tail -n1)

if [ -z "$DNS_IP" ]; then
    print_error "DNS chưa được cấu hình!"
    echo ""
    echo "Vui lòng liên hệ IT Phenikaa để thêm DNS A Record:"
    echo "  Type: A"
    echo "  Name: meeting-management"
    echo "  Value: $SERVER_IP"
    echo "  TTL: 3600"
    echo ""
    exit 1
fi

if [ "$DNS_IP" != "$SERVER_IP" ]; then
    print_error "DNS đang trỏ về $DNS_IP nhưng VPS có IP $SERVER_IP"
    echo "Vui lòng liên hệ IT Phenikaa để cập nhật DNS."
    exit 1
fi

print_success "DNS đã được cấu hình đúng: $DOMAIN → $SERVER_IP"

# Check .env
print_header "Bước 2: Kiểm tra Environment"

if [ ! -f ".env" ]; then
    print_info "Tạo file .env từ template..."
    cp env.production.example .env
    print_success "File .env đã được tạo"
    echo ""
    print_info "⚠️  VUI LÒNG CẬP NHẬT các biến trong file .env:"
    echo "  - MONGODB_URI"
    echo "  - JWT_SECRET"
    echo "  - EMAIL_* (nếu dùng)"
    echo ""
    read -p "Nhấn Enter sau khi đã cập nhật .env..."
fi

print_success "File .env tồn tại"

# Install Certbot
print_header "Bước 3: Cài đặt Certbot"

if ! command -v certbot &> /dev/null; then
    print_info "Cài đặt Certbot..."
    sudo apt update
    sudo apt install -y certbot
    print_success "Certbot đã được cài đặt"
else
    print_success "Certbot đã có sẵn"
fi

# Prepare directories
print_header "Bước 4: Chuẩn bị thư mục"

sudo mkdir -p /var/www/certbot
mkdir -p nginx/ssl
print_success "Thư mục đã được tạo"

# Stop existing services
print_header "Bước 5: Dừng services hiện tại"

print_info "Dừng Docker containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
print_success "Services đã dừng"

# Start temp nginx
print_header "Bước 6: Khởi động Nginx tạm thời"

print_info "Start nginx để verify SSL..."

# Create temp nginx config
cat > /tmp/nginx-ssl-temp.conf << EOF
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name $DOMAIN;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 "SSL Verification - OK\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

docker run -d \
  --name phenikaa-ssl-temp \
  -p 80:80 \
  -v /tmp/nginx-ssl-temp.conf:/etc/nginx/nginx.conf:ro \
  -v /var/www/certbot:/var/www/certbot:ro \
  nginx:1.25-alpine

sleep 3
print_success "Nginx tạm thời đã start"

# Get SSL certificate
print_header "Bước 7: Tạo SSL Certificate"

print_info "Đang tạo SSL certificate với Let's Encrypt..."
echo ""

sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --non-interactive

if [ $? -eq 0 ]; then
    print_success "SSL certificate đã được tạo thành công!"
    
    # Copy certificates
    print_info "Copy certificates..."
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/
    
    # Fix permissions
    sudo chown $(whoami):$(whoami) nginx/ssl/*.pem
    sudo chmod 644 nginx/ssl/fullchain.pem
    sudo chmod 600 nginx/ssl/privkey.pem
    
    print_success "Certificates đã được copy"
else
    print_error "Không thể tạo SSL certificate"
    docker stop phenikaa-ssl-temp && docker rm phenikaa-ssl-temp
    rm /tmp/nginx-ssl-temp.conf
    exit 1
fi

# Stop temp nginx
docker stop phenikaa-ssl-temp && docker rm phenikaa-ssl-temp
rm /tmp/nginx-ssl-temp.conf
print_success "Đã dọn dẹp nginx tạm thời"

# Deploy application
print_header "Bước 8: Deploy ứng dụng"

print_info "Build Docker images..."
docker-compose -f docker-compose.prod.yml build

print_info "Start services..."
docker-compose -f docker-compose.prod.yml up -d

print_success "Ứng dụng đã được deploy"

# Setup auto-renewal
print_header "Bước 9: Cấu hình Auto-renewal"

cat > ~/renew-ssl-phenikaa.sh << 'EOFSCRIPT'
#!/bin/bash
sudo certbot renew --quiet
DOMAIN="meeting-management.phenikaa-uni.edu.vn"
PROJECT_DIR="$HOME/DATN"
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $PROJECT_DIR/nginx/ssl/
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $PROJECT_DIR/nginx/ssl/
    sudo chown $(whoami):$(whoami) $PROJECT_DIR/nginx/ssl/*.pem
    sudo chmod 644 $PROJECT_DIR/nginx/ssl/fullchain.pem
    sudo chmod 600 $PROJECT_DIR/nginx/ssl/privkey.pem
    docker-compose -f $PROJECT_DIR/docker-compose.prod.yml exec nginx nginx -s reload
    echo "$(date): SSL renewed"
fi
EOFSCRIPT

chmod +x ~/renew-ssl-phenikaa.sh

# Add to crontab
CRON_JOB="0 3 * * * $HOME/renew-ssl-phenikaa.sh >> $HOME/ssl-renewal-phenikaa.log 2>&1"
(crontab -l 2>/dev/null | grep -q "renew-ssl-phenikaa.sh") || (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

print_success "Auto-renewal đã được cấu hình"

# Wait for services to start
print_header "Bước 10: Kiểm tra kết nối"

print_info "Đợi services khởi động..."
sleep 10

# Test connections
print_info "Test HTTP redirect..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -L "http://$DOMAIN")
if [ "$HTTP_CODE" = "200" ]; then
    print_success "HTTP redirect OK"
else
    print_error "HTTP có vấn đề (Code: $HTTP_CODE)"
fi

print_info "Test HTTPS..."
HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -k "https://$DOMAIN")
if [ "$HTTPS_CODE" = "200" ]; then
    print_success "HTTPS OK"
else
    print_error "HTTPS có vấn đề (Code: $HTTPS_CODE)"
fi

print_info "Test API..."
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" -k "https://$DOMAIN/api/auth/health")
if [ "$API_CODE" = "200" ]; then
    print_success "API OK"
else
    print_error "API có vấn đề (Code: $API_CODE)"
fi

echo ""
echo "============================================="
echo "  🎉 HOÀN TẤT CÀI ĐẶT!"
echo "============================================="
echo ""
print_success "Domain Phenikaa đã được cấu hình thành công!"
echo ""
echo "📌 Thông tin:"
echo "   URL: https://$DOMAIN"
echo "   API: https://$DOMAIN/api"
echo ""
echo "🔍 Kiểm tra:"
echo "   Logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "   SSL: sudo certbot certificates"
echo ""
echo "📁 Files:"
echo "   SSL: nginx/ssl/"
echo "   Renewal script: ~/renew-ssl-phenikaa.sh"
echo "   Renewal log: ~/ssl-renewal-phenikaa.log"
echo ""
print_info "Truy cập https://$DOMAIN để kiểm tra!"
echo ""

# Open logs
read -p "Xem logs ngay? (y/n): " VIEW_LOGS
if [ "$VIEW_LOGS" = "y" ]; then
    docker-compose -f docker-compose.prod.yml logs -f
fi

