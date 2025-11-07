# 🎓 Hướng dẫn Setup Domain Phenikaa University

## Domain: `meeting-management.phenikaa-uni.edu.vn`

---

## 🚀 Quick Setup (Khuyến nghị)

### Bước 1: Kiểm tra DNS

Đầu tiên, kiểm tra xem DNS đã được cấu hình chưa:

```bash
# Trên máy local của bạn hoặc VPS
nslookup meeting-management.phenikaa-uni.edu.vn
```

**Kết quả mong đợi:**
```
Server: ...
Address: ...

Name: meeting-management.phenikaa-uni.edu.vn
Address: <IP_VPS_CỦA_BẠN>
```

**Nếu chưa có kết quả:** Liên hệ IT Phenikaa để thêm DNS A Record:
```
Type: A
Name: meeting-management
Value: <IP_VPS>
TTL: 3600
```

### Bước 2: Cấu hình trên VPS

```bash
# 1. SSH vào VPS
ssh user@<IP_VPS>

# 2. Di chuyển vào thư mục dự án
cd ~/DATN

# 3. Pull code mới nhất (đã có cấu hình domain)
git pull origin main

# 4. Tạo/cập nhật file .env
cp env.production.example .env
nano .env
```

### Bước 3: Cập nhật file .env

Trong file `.env`, cập nhật:

```bash
# ======================
# DATABASE
# ======================
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/meeting-app

# ======================
# SECURITY
# ======================
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
NODE_ENV=production

# ======================
# DOMAIN - ĐÃ CẤU HÌNH SẴN
# ======================
FRONTEND_URL=https://meeting-management.phenikaa-uni.edu.vn
DOMAIN_URL=https://meeting-management.phenikaa-uni.edu.vn
REACT_APP_API_BASE_URL=https://meeting-management.phenikaa-uni.edu.vn/api
REACT_APP_SOCKET_URL=https://meeting-management.phenikaa-uni.edu.vn

# ======================
# EMAIL (Optional)
# ======================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@phenikaa-uni.edu.vn
EMAIL_PASS=your-app-password

# ======================
# OAUTH (Optional)
# ======================
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Lưu file:** `Ctrl+X` → `Y` → `Enter`

### Bước 4: Cài đặt SSL Certificate

```bash
# 1. Cài đặt Certbot (nếu chưa có)
sudo apt update
sudo apt install -y certbot

# 2. Tạo thư mục cần thiết
sudo mkdir -p /var/www/certbot
mkdir -p nginx/ssl

# 3. Dừng services hiện tại
docker-compose -f docker-compose.prod.yml down

# 4. Start nginx tạm thời để verify SSL
docker run -d \
  --name temp-nginx \
  -p 80:80 \
  -v /var/www/certbot:/var/www/certbot:ro \
  nginx:1.25-alpine sh -c "mkdir -p /usr/share/nginx/html/.well-known/acme-challenge && nginx -g 'daemon off;'"

# 5. Tạo SSL certificate
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d meeting-management.phenikaa-uni.edu.vn \
  --email admin@phenikaa-uni.edu.vn \
  --agree-tos \
  --no-eff-email \
  --non-interactive

# 6. Copy certificates
sudo cp /etc/letsencrypt/live/meeting-management.phenikaa-uni.edu.vn/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/meeting-management.phenikaa-uni.edu.vn/privkey.pem nginx/ssl/

# 7. Fix permissions
sudo chown $(whoami):$(whoami) nginx/ssl/*.pem
sudo chmod 644 nginx/ssl/fullchain.pem
sudo chmod 600 nginx/ssl/privkey.pem

# 8. Dừng nginx tạm thời
docker stop temp-nginx && docker rm temp-nginx
```

### Bước 5: Deploy ứng dụng

```bash
# 1. Build images
docker-compose -f docker-compose.prod.yml build

# 2. Start services
docker-compose -f docker-compose.prod.yml up -d

# 3. Kiểm tra logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Bước 6: Kiểm tra kết nối

```bash
# Test HTTP redirect
curl -I http://meeting-management.phenikaa-uni.edu.vn

# Test HTTPS
curl -I https://meeting-management.phenikaa-uni.edu.vn

# Test API
curl https://meeting-management.phenikaa-uni.edu.vn/api/auth/health
```

**Mở trình duyệt:**
```
https://meeting-management.phenikaa-uni.edu.vn
```

---

## 🔧 Cấu hình Auto-renewal SSL

```bash
# Tạo script renewal
cat > ~/renew-ssl-phenikaa.sh << 'EOF'
#!/bin/bash

# Renew certificate
sudo certbot renew --quiet

# Copy certificates
DOMAIN="meeting-management.phenikaa-uni.edu.vn"
PROJECT_DIR="$HOME/DATN"

if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $PROJECT_DIR/nginx/ssl/
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $PROJECT_DIR/nginx/ssl/
    sudo chown $(whoami):$(whoami) $PROJECT_DIR/nginx/ssl/*.pem
    sudo chmod 644 $PROJECT_DIR/nginx/ssl/fullchain.pem
    sudo chmod 600 $PROJECT_DIR/nginx/ssl/privkey.pem
    
    # Reload nginx
    docker-compose -f $PROJECT_DIR/docker-compose.prod.yml exec nginx nginx -s reload
    
    echo "$(date): SSL certificates renewed successfully"
fi
EOF

# Cấp quyền thực thi
chmod +x ~/renew-ssl-phenikaa.sh

# Thêm vào crontab (chạy mỗi ngày lúc 3:00 AM)
(crontab -l 2>/dev/null; echo "0 3 * * * $HOME/renew-ssl-phenikaa.sh >> $HOME/ssl-renewal.log 2>&1") | crontab -

# Kiểm tra crontab
crontab -l
```

---

## 🔍 Troubleshooting

### 1. DNS không resolve

```bash
# Kiểm tra DNS
nslookup meeting-management.phenikaa-uni.edu.vn

# Nếu không có kết quả
# → Liên hệ IT Phenikaa để cấu hình DNS
```

### 2. SSL Certificate không tạo được

```bash
# Kiểm tra port 80 đã mở chưa
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Kiểm tra firewall của VPS provider
# → Đảm bảo port 80, 443 đã được mở

# Test lại
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d meeting-management.phenikaa-uni.edu.vn \
  --email admin@phenikaa-uni.edu.vn
```

### 3. Website không truy cập được

```bash
# Kiểm tra containers
docker-compose -f docker-compose.prod.yml ps

# Kiểm tra logs
docker-compose -f docker-compose.prod.yml logs nginx
docker-compose -f docker-compose.prod.yml logs server
docker-compose -f docker-compose.prod.yml logs client

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

### 4. CORS Error

Nếu có lỗi CORS trong console browser:

```bash
# Kiểm tra file .env có đúng không
cat .env | grep FRONTEND_URL

# Phải thấy:
# FRONTEND_URL=https://meeting-management.phenikaa-uni.edu.vn

# Nếu sai, sửa lại và restart
nano .env
docker-compose -f docker-compose.prod.yml restart server
```

### 5. ERR_SSL_PROTOCOL_ERROR

```bash
# Kiểm tra SSL certificates tồn tại
ls -la nginx/ssl/

# Kiểm tra nginx config
docker run --rm -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro nginx:1.25-alpine nginx -t

# Nếu có lỗi, kiểm tra lại file nginx/nginx.conf
```

---

## 📊 Monitoring

### Kiểm tra logs

```bash
# Tất cả logs
docker-compose -f docker-compose.prod.yml logs -f

# Chỉ nginx
docker-compose -f docker-compose.prod.yml logs -f nginx

# Chỉ server
docker-compose -f docker-compose.prod.yml logs -f server

# SSL renewal logs
tail -f ~/ssl-renewal.log
```

### Kiểm tra SSL certificate

```bash
# Thông tin certificate
sudo certbot certificates

# Ngày hết hạn
echo | openssl s_client -servername meeting-management.phenikaa-uni.edu.vn -connect meeting-management.phenikaa-uni.edu.vn:443 2>/dev/null | openssl x509 -noout -dates

# Test renewal
sudo certbot renew --dry-run
```

### Kiểm tra resources

```bash
# CPU, Memory usage
docker stats

# Disk usage
df -h

# Docker disk usage
docker system df
```

---

## 🔄 Update và Deploy lại

```bash
# Pull code mới
cd ~/DATN
git pull origin main

# Rebuild và deploy
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Xem logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 📱 OAuth Configuration (Nếu dùng)

Nếu sử dụng Google/Microsoft OAuth, cần cập nhật Redirect URIs:

### Google OAuth Console
1. Vào https://console.cloud.google.com
2. Chọn project
3. APIs & Services → Credentials
4. Thêm Authorized redirect URIs:
   ```
   https://meeting-management.phenikaa-uni.edu.vn/api/auth/google/callback
   ```

### Microsoft Azure AD
1. Vào https://portal.azure.com
2. Azure Active Directory → App registrations
3. Chọn app
4. Authentication → Add Redirect URI:
   ```
   https://meeting-management.phenikaa-uni.edu.vn/api/auth/microsoft/callback
   ```

---

## ✅ Checklist hoàn thành

- [ ] DNS đã được cấu hình (A Record)
- [ ] DNS đã propagate (kiểm tra với nslookup)
- [ ] File .env đã được cập nhật
- [ ] SSL Certificate đã được tạo thành công
- [ ] SSL certificates đã copy vào nginx/ssl/
- [ ] Docker containers đã được deploy
- [ ] Website truy cập được qua HTTPS
- [ ] SSL certificate hiển thị hợp lệ (🔒)
- [ ] API endpoints hoạt động
- [ ] Không có lỗi CORS
- [ ] Auto-renewal SSL đã được cấu hình
- [ ] OAuth redirect URIs đã được cập nhật (nếu dùng)

---

## 📞 Liên hệ hỗ trợ

- **IT Phenikaa**: Để cấu hình DNS
- **GitHub Issues**: Báo lỗi về code/deployment
- **Logs**: Luôn kiểm tra logs trước khi báo lỗi

---

## 🎉 Kết quả mong đợi

Sau khi hoàn tất, bạn sẽ có:

- ✅ Website: `https://meeting-management.phenikaa-uni.edu.vn`
- ✅ API: `https://meeting-management.phenikaa-uni.edu.vn/api`
- ✅ SSL Grade A (kiểm tra tại: https://www.ssllabs.com/ssltest/)
- ✅ Auto HTTPS redirect
- ✅ Auto SSL renewal mỗi 3 tháng
- ✅ Production-ready deployment

**🎓 Good luck với dự án Phenikaa University!**

