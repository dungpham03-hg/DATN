# 🚀 Deployment Guide - Local & Production

## 📋 Tổng quan

Guide này hướng dẫn cách deploy ứng dụng Meeting Management cho:
- ✅ **Local Development** - Chạy trên máy local
- ✅ **VPS Production** - Deploy lên server production

---

## 🏠 I. LOCAL DEVELOPMENT SETUP

### Yêu cầu

- Node.js >= 18.0.0
- MongoDB Community Edition (hoặc MongoDB Atlas)
- npm >= 8.0.0
- Git

### Bước 1: Clone Repository

```bash
git clone <repository-url>
cd DATN
```

### Bước 2: Tự động setup (Khuyến nghị)

**Windows:**
```powershell
.\scripts\setup-local.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/setup-local.sh
./scripts/setup-local.sh
```

### Bước 3: Hoặc setup thủ công

**Server (.env):**
```bash
cd server
cp env.example .env
# Sửa file .env với config local
```

**Client (.env.local):**
```bash
cd client
# Tạo file .env.local với nội dung:
# REACT_APP_API_BASE_URL=http://localhost:5000/api
# REACT_APP_SOCKET_URL=http://localhost:5000
```

**Install dependencies:**
```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### Bước 4: Chạy ứng dụng

**Terminal 1 - Backend:**
```bash
cd server
npm start
# hoặc
npm run dev  # với nodemon
```

**Terminal 2 - Frontend:**
```bash
cd client
npm start
```

**Truy cập:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Health check: http://localhost:5000/api/auth/health

---

## 🌐 II. VPS PRODUCTION DEPLOYMENT

### Yêu cầu VPS

- Ubuntu 20.04+ / CentOS 8+ 
- RAM: >= 2GB (khuyến nghị 4GB)
- Storage: >= 20GB
- Node.js >= 18.0.0
- Nginx
- PM2 (process manager)
- MongoDB Atlas account (hoặc MongoDB trên VPS)

### A. Chuẩn bị VPS

#### 1. Update system

```bash
sudo apt update && sudo apt upgrade -y  # Ubuntu/Debian
# hoặc
sudo yum update -y  # CentOS/RHEL
```

#### 2. Install Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version
npm --version
```

#### 3. Install PM2

```bash
sudo npm install -g pm2
```

#### 4. Install Nginx

```bash
# Ubuntu/Debian
sudo apt install -y nginx

# CentOS/RHEL
sudo yum install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 5. Setup Firewall

```bash
# Ubuntu
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw enable

# CentOS
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### B. Deploy Application

#### 1. Clone code

```bash
sudo mkdir -p /var/www
cd /var/www
sudo git clone <repository-url> meeting-app
cd meeting-app
```

#### 2. Setup Environment Variables

**Server (.env):**
```bash
cd /var/www/meeting-app/server
sudo nano .env
```

Paste nội dung (thay đổi các giá trị):
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/meeting_management
JWT_SECRET=CHANGE_THIS_TO_RANDOM_SECURE_STRING_MIN_32_CHARS
CLIENT_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com
DOMAIN_URL=https://your-domain.com
MAX_FILE_SIZE=10485760
UPLOAD_PATH=uploads/
```

**Client (.env.production):**
```bash
cd /var/www/meeting-app/client
sudo nano .env.production
```

```env
REACT_APP_API_BASE_URL=https://your-domain.com/api
REACT_APP_SOCKET_URL=https://your-domain.com
GENERATE_SOURCEMAP=false
```

#### 3. Install Dependencies & Build

```bash
# Server
cd /var/www/meeting-app/server
sudo npm install --production

# Client
cd /var/www/meeting-app/client
sudo npm install
sudo npm run build:production
```

#### 4. Start Server với PM2

```bash
cd /var/www/meeting-app/server
pm2 start index.js --name meeting-app --env production

# Save PM2 config
pm2 save

# Auto-start on system reboot
pm2 startup
# Copy và chạy lệnh output ra
```

#### 5. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/meeting-app
```

Paste config:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect HTTP to HTTPS (sau khi có SSL)
    # return 301 https://$server_name$request_uri;

    # Root directory - React build
    root /var/www/meeting-app/client/build;
    index index.html;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Uploaded files
    location /uploads {
        alias /var/www/meeting-app/server/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/meeting-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 6. Setup SSL với Let's Encrypt (Khuyến nghị)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal đã được setup
# Test renewal:
sudo certbot renew --dry-run
```

### C. Verify Deployment

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs meeting-app

# Check Nginx
sudo systemctl status nginx

# Test endpoints
curl http://your-domain.com
curl http://your-domain.com/api/auth/health
```

---

## 🔄 III. UPDATE & MAINTENANCE

### Update Code

```bash
cd /var/www/meeting-app

# Pull latest code
git pull origin main

# Update server
cd server
npm install --production
pm2 restart meeting-app

# Rebuild client
cd ../client
npm install
npm run build:production

# Reload Nginx (nếu có thay đổi config)
sudo systemctl reload nginx
```

### Database Backup

```bash
# Backup MongoDB (nếu chạy local trên VPS)
mongodump --db meeting_management --out /var/backups/mongodb/$(date +%Y%m%d)

# Restore
mongorestore --db meeting_management /var/backups/mongodb/20241024
```

### Monitor Application

```bash
# PM2 monitoring
pm2 monit              # Real-time monitoring
pm2 logs meeting-app   # View logs
pm2 status             # Status

# System resources
htop                   # CPU, Memory
df -h                  # Disk usage
free -m                # Memory usage

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🐛 IV. TROUBLESHOOTING

### Server không start

```bash
# Check logs
pm2 logs meeting-app --lines 100

# Check .env file
cat server/.env

# Check MongoDB connection
# Test connection string
```

### 502 Bad Gateway

```bash
# Server có chạy không?
pm2 status

# Port 5000 có bị chặn không?
sudo netstat -tulpn | grep :5000

# Restart server
pm2 restart meeting-app

# Check Nginx config
sudo nginx -t
```

### CORS Error

```bash
# Kiểm tra NODE_ENV
pm2 env meeting-app | grep NODE_ENV

# Kiểm tra FRONTEND_URL in .env
cat server/.env | grep FRONTEND_URL

# Restart sau khi sửa .env
pm2 restart meeting-app
```

### Database Connection Error

```bash
# Kiểm tra MONGODB_URI
cat server/.env | grep MONGODB_URI

# Test connection (nếu dùng MongoDB Atlas)
# Check IP whitelist trên MongoDB Atlas dashboard

# Restart với log
pm2 restart meeting-app --update-env
pm2 logs meeting-app
```

### File Upload Error

```bash
# Check permissions
ls -la /var/www/meeting-app/server/uploads

# Fix permissions
sudo chown -R $USER:$USER /var/www/meeting-app/server/uploads
sudo chmod -R 755 /var/www/meeting-app/server/uploads
```

---

## ⚙️ V. OPTIMIZATION TIPS

### Production Optimizations

1. **Enable Gzip** (đã có trong Nginx config)
2. **Use CDN** cho static assets
3. **Database Indexing** - Đã có trong models
4. **PM2 Cluster Mode** (nếu multi-core):
   ```bash
   pm2 start index.js -i max --name meeting-app
   ```

5. **Rate Limiting** - Thêm vào server:
   ```bash
   npm install express-rate-limit
   ```

6. **Caching** - Redis (optional):
   ```bash
   npm install redis
   ```

### Security Headers (thêm vào Nginx)

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

## 📊 VI. MONITORING SETUP (Optional)

### PM2 Plus (Free)

```bash
pm2 link <secret_key> <public_key>
```

### Custom Monitoring

Add to server/index.js:
```javascript
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date(),
    environment: process.env.NODE_ENV
  });
});
```

---

## 🔐 VII. SECURITY CHECKLIST

### Trước khi deploy Production:

- [x] Đổi JWT_SECRET thành random string mạnh
- [x] Sử dụng HTTPS (SSL certificate)
- [x] MongoDB connection string bảo mật
- [x] .env không được commit vào git  
- [x] Firewall đã được cấu hình
- [x] Rate limiting đã enable
- [x] Security headers đã thêm vào Nginx
- [x] Regular backups đã setup
- [x] Error logs được monitor
- [x] Dependencies đã update (npm audit)

---

## 📞 VIII. SUPPORT

Nếu gặp vấn đề:

1. Check logs: `pm2 logs meeting-app`
2. Check status: `pm2 status`
3. Check Nginx: `sudo nginx -t`
4. Check database connection
5. Xem ENV_SETUP_GUIDE.md

---

## 🎯 Quick Commands Reference

### Development
```bash
npm run dev                    # Start both server & client
cd server && npm start         # Server only
cd client && npm start         # Client only
```

### Production
```bash
pm2 start meeting-app          # Start
pm2 restart meeting-app        # Restart
pm2 stop meeting-app           # Stop
pm2 logs meeting-app           # Logs
pm2 monit                      # Monitor
```

### Maintenance
```bash
pm2 flush                      # Clear logs
pm2 reload meeting-app         # Zero-downtime reload
pm2 save                       # Save current config
```

---

**Chúc bạn deploy thành công! 🎉**

