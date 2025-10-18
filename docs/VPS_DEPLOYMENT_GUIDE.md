# Hướng dẫn Deploy lên VPS - Dự án Quản lý Cuộc họp

## 🚀 Tổng quan

Tài liệu này hướng dẫn chi tiết cách deploy ứng dụng quản lý cuộc họp lên VPS với các tối ưu hóa cho production.

## 📋 Yêu cầu hệ thống

### VPS Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 2GB (khuyến nghị 4GB)
- **Storage**: 20GB SSD
- **OS**: Ubuntu 20.04 LTS hoặc mới hơn
- **Network**: 100 Mbps

### Recommended VPS Specs
- **CPU**: 4 cores
- **RAM**: 4GB
- **Storage**: 40GB SSD
- **OS**: Ubuntu 22.04 LTS

## 🛠️ Cài đặt ban đầu

### 1. Chuẩn bị VPS

```bash
# Kết nối SSH vào VPS
ssh root@your-vps-ip

# Cập nhật hệ thống
apt update && apt upgrade -y

# Tạo user mới (thay 'username' bằng tên bạn muốn)
adduser username
usermod -aG sudo username

# Cấu hình SSH key (khuyến nghị)
mkdir -p /home/username/.ssh
cp ~/.ssh/authorized_keys /home/username/.ssh/
chown -R username:username /home/username/.ssh
chmod 700 /home/username/.ssh
chmod 600 /home/username/.ssh/authorized_keys
```

### 2. Chạy script setup tự động

```bash
# Chuyển sang user mới
su - username

# Clone dự án
git clone https://github.com/your-repo/meeting-management-app.git
cd meeting-management-app

# Chạy script setup (với quyền sudo)
sudo ./scripts/vps-setup.sh
```

## 🔧 Cấu hình Environment

### 1. Tạo file .env

```bash
# Copy template
cp env.production.example .env

# Chỉnh sửa file .env
nano .env
```

### 2. Cấu hình cần thiết

```bash
# Database (MongoDB Atlas)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/meeting-app

# Security
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# Domain
FRONTEND_URL=https://your-domain.com
DOMAIN_URL=https://your-domain.com
REACT_APP_API_BASE_URL=https://your-domain.com/api
```

## 🚢 Deployment

### 1. Deploy ứng dụng

```bash
# Chạy script deploy
./scripts/deploy.sh production
```

### 2. Kiểm tra trạng thái

```bash
# Kiểm tra containers
docker-compose -f docker-compose.prod.yml ps

# Kiểm tra logs
docker-compose -f docker-compose.prod.yml logs -f

# Kiểm tra health
curl http://localhost:5000/api/health
curl http://localhost:3000/health
```

## 🔒 Cấu hình SSL (HTTPS)

### 1. Cài đặt SSL với Let's Encrypt

```bash
# Cài đặt Certbot
sudo apt install certbot python3-certbot-nginx

# Tạo SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 2. Cập nhật Nginx config cho HTTPS

```bash
# Backup config hiện tại
sudo cp /etc/nginx/sites-available/meeting-app /etc/nginx/sites-available/meeting-app.backup

# Cập nhật config với SSL
sudo nano /etc/nginx/sites-available/meeting-app
```

## 📊 Monitoring và Logging

### 1. Xem logs

```bash
# Application logs
sudo tail -f /var/log/meeting-app/deploy.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Docker logs
docker-compose -f docker-compose.prod.yml logs -f server
docker-compose -f docker-compose.prod.yml logs -f client
```

### 2. Monitoring với Prometheus & Grafana

```bash
# Khởi động monitoring stack
docker-compose -f docker-compose.prod.yml up -d prometheus grafana

# Truy cập Grafana: http://your-domain.com:3001
# Username: admin
# Password: (xem trong .env)
```

## 🔄 Backup và Restore

### 1. Backup tự động

```bash
# Tạo script backup
cat > /home/username/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/meeting-app"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup uploads
docker run --rm -v meeting-app_server_uploads:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/uploads_$DATE.tar.gz -C /data .

# Backup database (nếu cần)
# mongodump --uri="$MONGODB_URI" --out=$BACKUP_DIR/db_$DATE

# Cleanup old backups (giữ 7 ngày)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x /home/username/backup.sh

# Thêm vào crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /home/username/backup.sh") | crontab -
```

### 2. Restore từ backup

```bash
# Restore uploads
docker run --rm -v meeting-app_server_uploads:/data -v /opt/backups/meeting-app:/backup alpine tar xzf /backup/uploads_YYYYMMDD_HHMMSS.tar.gz -C /data
```

## 🔧 Troubleshooting

### 1. Container không start

```bash
# Kiểm tra logs
docker-compose -f docker-compose.prod.yml logs server

# Kiểm tra resources
docker stats

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

### 2. Memory issues

```bash
# Kiểm tra memory usage
free -h
docker stats

# Cleanup Docker
docker system prune -f
docker image prune -f

# Restart với memory limit
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Database connection issues

```bash
# Test MongoDB connection
docker run --rm mongo:7 mongosh "$MONGODB_URI" --eval "db.runCommand({ping: 1})"

# Kiểm tra network
docker network ls
docker network inspect meeting-app_datn-network
```

### 4. SSL issues

```bash
# Test SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Renew certificate
sudo certbot renew

# Check certificate expiry
sudo certbot certificates
```

## ⚡ Performance Tuning

### 1. Database optimization

```bash
# MongoDB connection pooling đã được cấu hình trong server/config/database.js
# Kiểm tra connection pool
docker-compose -f docker-compose.prod.yml exec server node -e "
const mongoose = require('mongoose');
console.log('Connection state:', mongoose.connection.readyState);
console.log('Connection pool size:', mongoose.connection.db?.serverConfig?.poolSize);
"
```

### 2. Nginx optimization

```bash
# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Monitor Nginx performance
sudo tail -f /var/log/nginx/access.log | grep -E "rt=[0-9]+"
```

### 3. Docker optimization

```bash
# Optimize Docker daemon
sudo nano /etc/docker/daemon.json

# Add:
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}

# Restart Docker
sudo systemctl restart docker
```

## 🔄 Updates và Maintenance

### 1. Update ứng dụng

```bash
# Pull latest code
git pull origin main

# Rebuild và deploy
./scripts/deploy.sh production
```

### 2. Update system packages

```bash
# Update packages (tự động với unattended-upgrades)
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Maintenance tasks

```bash
# Cleanup logs
sudo find /var/log -name "*.log" -mtime +30 -delete

# Cleanup Docker
docker system prune -f

# Check disk space
df -h

# Check memory usage
free -h
```

## 📱 Mobile App Support

Nếu có mobile app, cần cấu hình thêm:

```bash
# Thêm CORS cho mobile
# Trong server/index.optimized.js, thêm mobile app URLs vào allowedOrigins
```

## 🆘 Support và Liên hệ

### Log Files Locations
- Application: `/var/log/meeting-app/`
- Nginx: `/var/log/nginx/`
- System: `/var/log/syslog`

### Useful Commands

```bash
# Restart toàn bộ stack
docker-compose -f docker-compose.prod.yml restart

# View real-time logs
docker-compose -f docker-compose.prod.yml logs -f --tail=100

# Check system resources
htop
iotop
nethogs

# Check open ports
sudo netstat -tulpn | grep LISTEN
```

### Emergency Procedures

```bash
# Rollback to previous version
docker-compose -f docker-compose.prod.yml down
# Restore from backup
# Start services
docker-compose -f docker-compose.prod.yml up -d
```

---

**🎉 Chúc mừng! Ứng dụng của bạn đã được deploy thành công lên VPS!**

Để được hỗ trợ thêm, vui lòng tạo issue trên GitHub hoặc liên hệ team development.
