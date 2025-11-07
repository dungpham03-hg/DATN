# 🚀 Hướng dẫn Nhanh: Cấu hình Subdomain

## ⚡ Cài đặt tự động (Khuyến nghị)

### Bước 1: Cấu hình DNS
Trước tiên, vào trang quản lý DNS của bạn và thêm A Record:

```
Type: A
Name: meeting (hoặc subdomain bạn muốn)
Value: <IP_VPS_CUA_BAN>
TTL: 3600
```

**Ví dụ:** `meeting.yourdomain.com` → `123.456.78.90`

### Bước 2: Chạy script tự động

```bash
# SSH vào VPS
ssh user@your-vps-ip

# Di chuyển vào thư mục dự án
cd ~/meeting-management-app

# Cấp quyền thực thi cho script
chmod +x scripts/setup-subdomain.sh

# Chạy script
./scripts/setup-subdomain.sh
```

Script sẽ tự động:
- ✅ Kiểm tra DNS
- ✅ Cập nhật Nginx config
- ✅ Cập nhật environment variables
- ✅ Cài đặt SSL với Let's Encrypt
- ✅ Deploy ứng dụng
- ✅ Cấu hình auto-renewal SSL

### Bước 3: Truy cập ứng dụng

Mở trình duyệt và truy cập:
```
https://meeting.yourdomain.com
```

---

## 🔧 Cài đặt thủ công (Nâng cao)

Nếu bạn muốn cài đặt thủ công chi tiết hơn, xem:

📖 **[Hướng dẫn chi tiết](../deployment/SUBDOMAIN_SETUP.md)**

---

## ❓ Troubleshooting

### DNS chưa trỏ đúng

```bash
# Kiểm tra DNS
nslookup meeting.yourdomain.com

# Hoặc
dig meeting.yourdomain.com
```

Nếu chưa đúng, đợi DNS propagate (5 phút - 48 giờ) hoặc xóa cache:
```bash
sudo systemd-resolve --flush-caches
```

### SSL không tạo được

```bash
# Kiểm tra port 80 đã mở chưa
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status

# Kiểm tra firewall của VPS provider (cổng 80, 443 phải mở)
```

### Website không truy cập được

```bash
# Xem logs
docker-compose -f docker-compose.prod.yml logs -f nginx
docker-compose -f docker-compose.prod.yml logs -f server

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

### CORS Issues

Nếu có lỗi CORS, kiểm tra file `.env`:
```bash
FRONTEND_URL=https://meeting.yourdomain.com
DOMAIN_URL=https://meeting.yourdomain.com
```

Sau đó restart:
```bash
docker-compose -f docker-compose.prod.yml restart server
```

---

## 📊 Kiểm tra trạng thái

### Kiểm tra containers

```bash
docker-compose -f docker-compose.prod.yml ps
```

### Kiểm tra logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Chỉ nginx
docker-compose -f docker-compose.prod.yml logs -f nginx

# Chỉ server
docker-compose -f docker-compose.prod.yml logs -f server
```

### Kiểm tra SSL certificate

```bash
# Xem thông tin certificate
sudo certbot certificates

# Xem ngày hết hạn
echo | openssl s_client -servername meeting.yourdomain.com -connect meeting.yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Test API

```bash
# Health check
curl https://meeting.yourdomain.com/api/auth/health

# Nếu OK, phải trả về: {"status":"ok"}
```

---

## 🔄 Update và Bảo trì

### Deploy lại sau khi update code

```bash
# Pull latest code
git pull origin main

# Rebuild và restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Renew SSL certificate thủ công

```bash
# Test renewal
sudo certbot renew --dry-run

# Thực hiện renewal
sudo certbot renew

# Copy certificates
./scripts/renew-ssl-meeting.yourdomain.com.sh
```

### Backup

```bash
# Backup uploads
docker run --rm \
  -v meeting-app_server_uploads:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /data .
```

---

## 📞 Hỗ trợ

### Log locations
- **Application**: `docker-compose logs`
- **SSL renewal**: `~/ssl-renewal.log`
- **Nginx**: `/var/log/nginx/` (trong container)

### Useful commands

```bash
# Restart toàn bộ
docker-compose -f docker-compose.prod.yml restart

# Stop toàn bộ
docker-compose -f docker-compose.prod.yml down

# Start lại
docker-compose -f docker-compose.prod.yml up -d

# View resource usage
docker stats

# Cleanup
docker system prune -f
```

### Liên hệ

- 📖 [Hướng dẫn đầy đủ](../deployment/SUBDOMAIN_SETUP.md)
- 📖 [VPS Deployment Guide](../deployment/VPS_DEPLOYMENT_GUIDE.md)
- 🐛 [Report Issues](https://github.com/your-repo/issues)

---

## ✅ Checklist

Sau khi cài đặt, đảm bảo:

- [ ] DNS A Record đã được tạo
- [ ] DNS đã propagate (kiểm tra với nslookup)
- [ ] Script setup-subdomain.sh đã chạy thành công
- [ ] Website truy cập được qua HTTPS
- [ ] SSL certificate hợp lệ (có khóa 🔒)
- [ ] API endpoints hoạt động
- [ ] Không có lỗi CORS
- [ ] Auto-renewal SSL đã được cấu hình

---

**🎉 Chúc mừng! Bạn đã cấu hình subdomain thành công!**

Truy cập: **https://meeting.yourdomain.com**

