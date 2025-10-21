#!/bin/bash

# Script tự động cấu hình subdomain cho VPS
# Usage: ./scripts/setup-subdomain.sh

set -e

echo "============================================="
echo "   Cấu hình Subdomain cho VPS"
echo "============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if running on VPS
if [ ! -f "/etc/os-release" ]; then
    print_error "Script này chỉ chạy trên Linux VPS"
    exit 1
fi

# Nhập thông tin subdomain
echo "Nhập thông tin subdomain của bạn:"
echo ""
read -p "Subdomain (VD: meeting.yourdomain.com): " SUBDOMAIN
read -p "Email để nhận thông báo SSL: " EMAIL

# Validate inputs
if [ -z "$SUBDOMAIN" ]; then
    print_error "Subdomain không được để trống"
    exit 1
fi

if [ -z "$EMAIL" ]; then
    print_error "Email không được để trống"
    exit 1
fi

echo ""
print_info "Subdomain: $SUBDOMAIN"
print_info "Email: $EMAIL"
echo ""
read -p "Xác nhận thông tin trên đúng? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    print_error "Đã hủy"
    exit 1
fi

echo ""
echo "============================================="
echo "Bước 1: Kiểm tra DNS"
echo "============================================="

# Check DNS
print_info "Kiểm tra DNS đã trỏ về VPS chưa..."
SERVER_IP=$(curl -s ifconfig.me)
DNS_IP=$(dig +short "$SUBDOMAIN" | tail -n1)

if [ -z "$DNS_IP" ]; then
    print_error "DNS chưa được cấu hình!"
    echo ""
    echo "Vui lòng thêm A Record trong DNS provider:"
    echo "  Type: A"
    echo "  Name: ${SUBDOMAIN%%.*}"
    echo "  Value: $SERVER_IP"
    echo "  TTL: 3600"
    echo ""
    echo "Sau khi cấu hình DNS, chạy lại script này."
    exit 1
fi

if [ "$DNS_IP" != "$SERVER_IP" ]; then
    print_error "DNS đang trỏ về $DNS_IP nhưng VPS có IP $SERVER_IP"
    echo "Vui lòng cập nhật DNS A Record để trỏ về: $SERVER_IP"
    exit 1
fi

print_success "DNS đã được cấu hình đúng!"

echo ""
echo "============================================="
echo "Bước 2: Cập nhật Nginx Config"
echo "============================================="

# Backup nginx config
if [ -f "nginx/nginx.conf" ]; then
    cp nginx/nginx.conf nginx/nginx.conf.backup
    print_success "Đã backup nginx config"
fi

# Update nginx config
print_info "Cập nhật server_name trong nginx config..."
sed -i "s/your-subdomain\.yourdomain\.com/$SUBDOMAIN/g" nginx/nginx.conf

if [ -f "deployment/nginx/nginx.conf" ]; then
    sed -i "s/your-subdomain\.yourdomain\.com/$SUBDOMAIN/g" deployment/nginx/nginx.conf
fi

print_success "Đã cập nhật nginx config"

echo ""
echo "============================================="
echo "Bước 3: Cập nhật Environment Variables"
echo "============================================="

# Create or update .env
if [ ! -f ".env" ]; then
    cp env.production.example .env
    print_info "Đã tạo file .env từ template"
fi

# Update .env with subdomain
print_info "Cập nhật URLs trong .env..."
sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$SUBDOMAIN|g" .env
sed -i "s|DOMAIN_URL=.*|DOMAIN_URL=https://$SUBDOMAIN|g" .env
sed -i "s|REACT_APP_API_BASE_URL=.*|REACT_APP_API_BASE_URL=https://$SUBDOMAIN/api|g" .env
sed -i "s|REACT_APP_SOCKET_URL=.*|REACT_APP_SOCKET_URL=https://$SUBDOMAIN|g" .env

print_success "Đã cập nhật .env"

echo ""
echo "============================================="
echo "Bước 4: Cài đặt Certbot (nếu chưa có)"
echo "============================================="

if ! command -v certbot &> /dev/null; then
    print_info "Cài đặt Certbot..."
    sudo apt update
    sudo apt install -y certbot
    print_success "Đã cài đặt Certbot"
else
    print_success "Certbot đã được cài đặt"
fi

echo ""
echo "============================================="
echo "Bước 5: Tạo SSL Certificate"
echo "============================================="

# Create directories
sudo mkdir -p /var/www/certbot
mkdir -p nginx/ssl

# Stop existing services
print_info "Dừng services hiện tại..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Start temporary nginx for SSL verification
print_info "Khởi động nginx tạm thời để verify SSL..."

cat > nginx/nginx.conf.temp << EOF
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name $SUBDOMAIN;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 "OK - SSL Verification";
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Start temp nginx
docker run -d \
  --name temp-nginx \
  -p 80:80 \
  -v $(pwd)/nginx/nginx.conf.temp:/etc/nginx/nginx.conf:ro \
  -v /var/www/certbot:/var/www/certbot:ro \
  nginx:1.25-alpine

sleep 3

# Get SSL certificate
print_info "Tạo SSL certificate với Let's Encrypt..."

sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d "$SUBDOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --non-interactive

if [ $? -eq 0 ]; then
    print_success "SSL certificate đã được tạo thành công!"
    
    # Copy certificates
    print_info "Copy certificates vào dự án..."
    sudo cp /etc/letsencrypt/live/$SUBDOMAIN/fullchain.pem nginx/ssl/
    sudo cp /etc/letsencrypt/live/$SUBDOMAIN/privkey.pem nginx/ssl/
    
    # Fix permissions
    sudo chown $(whoami):$(whoami) nginx/ssl/*.pem
    sudo chmod 644 nginx/ssl/fullchain.pem
    sudo chmod 600 nginx/ssl/privkey.pem
    
    print_success "Certificates đã được copy"
else
    print_error "Không thể tạo SSL certificate"
    docker stop temp-nginx && docker rm temp-nginx
    exit 1
fi

# Stop temp nginx
docker stop temp-nginx && docker rm temp-nginx
rm nginx/nginx.conf.temp

echo ""
echo "============================================="
echo "Bước 6: Deploy ứng dụng với SSL"
echo "============================================="

print_info "Build và deploy ứng dụng..."

# Build and start
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

print_success "Ứng dụng đã được deploy"

echo ""
echo "============================================="
echo "Bước 7: Cấu hình Auto-renewal SSL"
echo "============================================="

# Create renewal script
cat > ~/renew-ssl-$SUBDOMAIN.sh << EOF
#!/bin/bash

# Renew certificate
sudo certbot renew --quiet

# Copy certificates
DOMAIN="$SUBDOMAIN"
PROJECT_DIR="$(pwd)"

if [ -f "/etc/letsencrypt/live/\$DOMAIN/fullchain.pem" ]; then
    sudo cp /etc/letsencrypt/live/\$DOMAIN/fullchain.pem \$PROJECT_DIR/nginx/ssl/
    sudo cp /etc/letsencrypt/live/\$DOMAIN/privkey.pem \$PROJECT_DIR/nginx/ssl/
    sudo chown $(whoami):$(whoami) \$PROJECT_DIR/nginx/ssl/*.pem
    sudo chmod 644 \$PROJECT_DIR/nginx/ssl/fullchain.pem
    sudo chmod 600 \$PROJECT_DIR/nginx/ssl/privkey.pem
    
    # Reload nginx
    docker-compose -f \$PROJECT_DIR/docker-compose.prod.yml exec nginx nginx -s reload
    
    echo "\$(date): SSL certificates renewed successfully"
fi
EOF

chmod +x ~/renew-ssl-$SUBDOMAIN.sh

# Add to crontab if not exists
CRON_JOB="0 3 * * * $HOME/renew-ssl-$SUBDOMAIN.sh >> $HOME/ssl-renewal.log 2>&1"
(crontab -l 2>/dev/null | grep -q "$HOME/renew-ssl-$SUBDOMAIN.sh") || (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

print_success "Auto-renewal đã được cấu hình"

echo ""
echo "============================================="
echo "Bước 8: Kiểm tra kết nối"
echo "============================================="

sleep 5

# Test HTTP to HTTPS redirect
print_info "Kiểm tra HTTP redirect..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L "http://$SUBDOMAIN")
if [ "$HTTP_STATUS" = "200" ]; then
    print_success "HTTP redirect hoạt động"
else
    print_error "HTTP redirect có vấn đề (Status: $HTTP_STATUS)"
fi

# Test HTTPS
print_info "Kiểm tra HTTPS..."
HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$SUBDOMAIN")
if [ "$HTTPS_STATUS" = "200" ]; then
    print_success "HTTPS hoạt động"
else
    print_error "HTTPS có vấn đề (Status: $HTTPS_STATUS)"
fi

# Test API
print_info "Kiểm tra API health..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$SUBDOMAIN/api/auth/health")
if [ "$API_STATUS" = "200" ]; then
    print_success "API hoạt động"
else
    print_error "API có vấn đề (Status: $API_STATUS)"
fi

echo ""
echo "============================================="
echo "  🎉 HOÀN TẤT CÀI ĐẶT!"
echo "============================================="
echo ""
print_success "Subdomain đã được cấu hình thành công!"
echo ""
echo "Thông tin:"
echo "  URL: https://$SUBDOMAIN"
echo "  API: https://$SUBDOMAIN/api"
echo ""
echo "Kiểm tra logs:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "Backup files:"
echo "  nginx/nginx.conf.backup - Nginx config cũ"
echo ""
echo "SSL Certificate:"
echo "  Location: nginx/ssl/"
echo "  Expires: $(sudo certbot certificates | grep "Expiry Date" | head -1)"
echo "  Auto-renewal: Mỗi ngày lúc 3:00 AM"
echo ""
echo "Monitoring:"
echo "  Check logs: ~/ssl-renewal.log"
echo "  Check status: sudo certbot certificates"
echo ""
print_info "Truy cập https://$SUBDOMAIN để kiểm tra ứng dụng!"
echo ""

