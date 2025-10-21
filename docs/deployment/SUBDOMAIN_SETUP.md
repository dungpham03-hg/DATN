# Hướng dẫn Cấu hình Subdomain cho VPS

## 📋 Tổng quan

Hướng dẫn này giúp bạn cấu hình subdomain (VD: `meeting.yourdomain.com`) cho ứng dụng đang chạy trên VPS.

## 🎯 Yêu cầu

- ✅ VPS đã cài đặt và có địa chỉ IP public
- ✅ Domain đã đăng ký (VD: `yourdomain.com`)
- ✅ Quyền truy cập vào bảng điều khiển quản lý DNS của domain
- ✅ Docker và Docker Compose đã được cài đặt trên VPS

## 📝 Các bước thực hiện

### Bước 1: Cấu hình DNS Record

#### 1.1. Đăng nhập vào trang quản lý DNS

Đăng nhập vào nhà cung cấp domain của bạn:
- **CloudFlare**: https://dash.cloudflare.com
- **Namecheap**: https://www.namecheap.com
- **GoDaddy**: https://www.godaddy.com
- **Hoặc nhà cung cấp khác**

#### 1.2. Thêm A Record

Tạo bản ghi DNS mới với thông tin:

```
Type: A
Name/Host: meeting (hoặc tên subdomain bạn muốn)
Value/Points to: <IP_CUA_VPS>
TTL: Auto hoặc 3600
```

**Ví dụ cụ thể:**
```
Type: A
Name: meeting
Value: 123.456.78.90
TTL: 3600
```

Kết quả: `meeting.yourdomain.com` → `123.456.78.90`

#### 1.3. Chờ DNS propagation

Thời gian DNS có hiệu lực:
- CloudFlare: 2-5 phút
- Nhà cung cấp khác: 15 phút - 48 giờ (thường 1-2 giờ)

**Kiểm tra DNS:**
```bash
# Kiểm tra DNS đã trỏ đúng chưa
nslookup meeting.yourdomain.com

# Hoặc
dig meeting.yourdomain.com
```

### Bước 2: Cập nhật Nginx Configuration

#### 2.1. Chỉnh sửa file nginx.conf

```bash
# SSH vào VPS
ssh user@your-vps-ip

# Di chuyển đến thư mục dự án
cd ~/meeting-management-app

# Chỉnh sửa nginx config
nano nginx/nginx.conf
```

#### 2.2. Thay đổi server_name

Tìm dòng:
```nginx
server_name your-subdomain.yourdomain.com;
```

Thay thế bằng subdomain thực của bạn:
```nginx
server_name meeting.yourdomain.com;
```

**Lưu ý:** Thay thế ở **CẢ 2 NƠI** trong file (HTTP và HTTPS server blocks)

### Bước 3: Cập nhật Environment Variables

#### 3.1. Chỉnh sửa file .env

```bash
nano .env
```

#### 3.2. Cập nhật các biến môi trường

```bash
# Frontend URLs
FRONTEND_URL=https://meeting.yourdomain.com
DOMAIN_URL=https://meeting.yourdomain.com

# API URLs  
REACT_APP_API_BASE_URL=https://meeting.yourdomain.com/api
REACT_APP_SOCKET_URL=https://meeting.yourdomain.com

# OAuth Callback URLs (nếu dùng)
GOOGLE_CALLBACK_URL=https://meeting.yourdomain.com/api/auth/google/callback
MICROSOFT_REDIRECT_URI=https://meeting.yourdomain.com/api/auth/microsoft/callback
```

### Bước 4: Cấu hình SSL với Let's Encrypt

#### 4.1. Cài đặt Certbot

```bash
# Update package list
sudo apt update

# Cài đặt Certbot
sudo apt install certbot -y
```

#### 4.2. Tạo thư mục cho SSL certificates

```bash
# Tạo thư mục SSL trong dự án
mkdir -p ~/meeting-management-app/nginx/ssl

# Tạo thư mục cho Let's Encrypt validation
sudo mkdir -p /var/www/certbot
```

#### 4.3. Tạm thời cấu hình Nginx để chạy HTTP (cho Let's Encrypt verification)

```bash
# Backup file cấu hình hiện tại
cp nginx/nginx.conf nginx/nginx.conf.backup

# Tạo file cấu hình tạm thời
cat > nginx/nginx.conf.temp << 'EOF'
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
        server_name meeting.yourdomain.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 "OK";
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Thay thế server_name bằng subdomain của bạn
sed -i 's/meeting.yourdomain.com/YOUR_SUBDOMAIN_HERE/g' nginx/nginx.conf.temp
```

#### 4.4. Deploy cấu hình tạm thời

```bash
# Dừng services hiện tại
docker-compose -f docker-compose.prod.yml down

# Start chỉ nginx với cấu hình tạm thời
docker run -d \
  --name temp-nginx \
  -p 80:80 \
  -v $(pwd)/nginx/nginx.conf.temp:/etc/nginx/nginx.conf:ro \
  -v /var/www/certbot:/var/www/certbot:ro \
  nginx:1.25-alpine
```

#### 4.5. Tạo SSL Certificate

```bash
# Chạy Certbot để tạo certificate
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d meeting.yourdomain.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email
```

**Thay thế:**
- `meeting.yourdomain.com` → subdomain của bạn
- `your-email@example.com` → email của bạn

#### 4.6. Copy SSL certificates vào dự án

```bash
# Stop temp nginx
docker stop temp-nginx
docker rm temp-nginx

# Copy certificates
sudo cp /etc/letsencrypt/live/meeting.yourdomain.com/fullchain.pem ~/meeting-management-app/nginx/ssl/
sudo cp /etc/letsencrypt/live/meeting.yourdomain.com/privkey.pem ~/meeting-management-app/nginx/ssl/

# Fix permissions
sudo chown $(whoami):$(whoami) ~/meeting-management-app/nginx/ssl/*.pem
sudo chmod 644 ~/meeting-management-app/nginx/ssl/fullchain.pem
sudo chmod 600 ~/meeting-management-app/nginx/ssl/privkey.pem
```

### Bước 5: Deploy với SSL

#### 5.1. Restore lại nginx config đầy đủ

```bash
# Xóa file temp
rm nginx/nginx.conf.temp

# Sử dụng lại file config gốc (đã cập nhật ở Bước 2)
# File này đã có cấu hình HTTPS
```

#### 5.2. Cập nhật docker-compose để mount SSL certificates

Kiểm tra file `docker-compose.prod.yml` đã có mount SSL:

```yaml
nginx:
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./nginx/ssl:/etc/nginx/ssl:ro  # ← Dòng này
```

#### 5.3. Deploy lại ứng dụng

```bash
# Build và deploy
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Kiểm tra logs
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### Bước 6: Kiểm tra kết nối

#### 6.1. Test HTTP → HTTPS redirect

```bash
curl -I http://meeting.yourdomain.com
# Phải thấy: Location: https://meeting.yourdomain.com
```

#### 6.2. Test HTTPS

```bash
curl -I https://meeting.yourdomain.com
# Phải thấy: HTTP/2 200
```

#### 6.3. Test SSL Certificate

```bash
# Kiểm tra certificate info
openssl s_client -connect meeting.yourdomain.com:443 -servername meeting.yourdomain.com < /dev/null

# Hoặc kiểm tra online tại:
# https://www.ssllabs.com/ssltest/
```

#### 6.4. Truy cập từ trình duyệt

Mở trình duyệt và truy cập:
```
https://meeting.yourdomain.com
```

Kiểm tra:
- ✅ Website hiển thị chính xác
- ✅ Có biểu tượng khóa (🔒) trên thanh địa chỉ
- ✅ Certificate hợp lệ (click vào khóa để xem)
- ✅ API hoạt động bình thường

### Bước 7: Cấu hình Auto-renewal SSL

#### 7.1. Test renewal

```bash
# Test dry-run
sudo certbot renew --dry-run
```

#### 7.2. Tạo script auto-renewal

```bash
cat > ~/renew-ssl.sh << 'EOF'
#!/bin/bash

# Renew certificate
sudo certbot renew --quiet

# Copy certificates
DOMAIN="meeting.yourdomain.com"
PROJECT_DIR="$HOME/meeting-management-app"

if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $PROJECT_DIR/nginx/ssl/
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $PROJECT_DIR/nginx/ssl/
    sudo chown $(whoami):$(whoami) $PROJECT_DIR/nginx/ssl/*.pem
    sudo chmod 644 $PROJECT_DIR/nginx/ssl/fullchain.pem
    sudo chmod 600 $PROJECT_DIR/nginx/ssl/privkey.pem
    
    # Reload nginx
    docker-compose -f $PROJECT_DIR/docker-compose.prod.yml exec nginx nginx -s reload
    
    echo "SSL certificates renewed successfully"
fi
EOF

chmod +x ~/renew-ssl.sh
```

#### 7.3. Thêm vào crontab

```bash
# Mở crontab
crontab -e

# Thêm dòng này (chạy mỗi ngày lúc 3:00 AM)
0 3 * * * /home/yourusername/renew-ssl.sh >> /home/yourusername/ssl-renewal.log 2>&1
```

## 🔧 Troubleshooting

### DNS không trỏ đúng

```bash
# Kiểm tra DNS
nslookup meeting.yourdomain.com

# Nếu không đúng, đợi thêm hoặc xóa DNS cache
sudo systemd-resolve --flush-caches
```

### SSL Certificate không tạo được

```bash
# Kiểm tra nginx đang chạy và port 80 mở
sudo netstat -tulpn | grep :80

# Kiểm tra firewall
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Test lại
sudo certbot certonly --webroot -w /var/www/certbot -d meeting.yourdomain.com
```

### Nginx không start

```bash
# Kiểm tra config syntax
docker run --rm -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro nginx:1.25-alpine nginx -t

# Xem logs
docker-compose -f docker-compose.prod.yml logs nginx
```

### ERR_SSL_PROTOCOL_ERROR

```bash
# Kiểm tra SSL files có tồn tại
ls -la nginx/ssl/

# Kiểm tra permissions
ls -l nginx/ssl/*.pem

# Restart nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

### CORS Issues

Nếu có lỗi CORS, cập nhật `server/index.js`:

```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'https://meeting.yourdomain.com',  // ← Thêm subdomain của bạn
  // ... các origins khác
];
```

## 📊 Monitoring

### Kiểm tra logs

```bash
# Nginx access logs
docker-compose -f docker-compose.prod.yml logs -f nginx

# Server logs
docker-compose -f docker-compose.prod.yml logs -f server

# Tất cả logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Kiểm tra SSL expiry

```bash
# Xem thông tin certificate
sudo certbot certificates

# Hoặc
echo | openssl s_client -servername meeting.yourdomain.com -connect meeting.yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

## 🎯 Checklist hoàn thành

- [ ] DNS A Record đã được tạo và trỏ đúng IP VPS
- [ ] DNS đã propagate (kiểm tra với nslookup/dig)
- [ ] Nginx config đã cập nhật với subdomain đúng
- [ ] Environment variables (.env) đã cập nhật
- [ ] SSL Certificate đã được tạo thành công
- [ ] SSL certificates đã được copy vào thư mục dự án
- [ ] Docker containers đã được deploy lại
- [ ] HTTP tự động redirect sang HTTPS
- [ ] Website truy cập được qua HTTPS
- [ ] SSL certificate hiển thị hợp lệ trên browser
- [ ] API endpoints hoạt động bình thường
- [ ] Auto-renewal SSL đã được cấu hình

## 📞 Hỗ trợ

Nếu gặp vấn đề, kiểm tra:
1. Logs của nginx: `docker-compose -f docker-compose.prod.yml logs nginx`
2. Logs của server: `docker-compose -f docker-compose.prod.yml logs server`
3. DNS propagation: https://dnschecker.org
4. SSL test: https://www.ssllabs.com/ssltest/

---

**🎉 Chúc mừng! Subdomain của bạn đã được cấu hình thành công!**

