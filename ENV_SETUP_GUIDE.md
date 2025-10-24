# Hướng dẫn cấu hình Environment Variables

## 📋 Tổng quan

Ứng dụng hỗ trợ 2 môi trường:
- **Development (Local)**: Chạy trên máy local với MongoDB local
- **Production (VPS)**: Deploy lên server với MongoDB Atlas

## 🔧 Setup cho Development (Local)

### Server (.env trong thư mục `server/`)

```env
# Environment
NODE_ENV=development
PORT=5000

# Database - MongoDB Local
MONGODB_URI=mongodb://localhost:27017/meeting_management

# JWT Secret (có thể dùng secret đơn giản cho dev)
JWT_SECRET=local_dev_secret_key_minimum_32_characters_12345

# Frontend URLs
CLIENT_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
DOMAIN_URL=http://localhost:3000

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=uploads/

# Optional - có thể bỏ trống
ENABLE_DOMAIN_LOGIN=false
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
```

### Client (.env.local trong thư mục `client/`)

```env
# API URLs
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000

# Optional
REACT_APP_GOOGLE_CLIENT_ID=
DANGEROUSLY_DISABLE_HOST_CHECK=true
```

## 🚀 Setup cho Production (VPS)

### Server (.env trong thư mục `server/`)

```env
# Environment
NODE_ENV=production
PORT=5000

# Database - MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/meeting_management?retryWrites=true&w=majority

# JWT Secret - ⚠️ PHẢI THAY ĐỔI!
JWT_SECRET=super_secure_random_string_for_production_min_32_chars

# Frontend URLs - Thay your-domain.com bằng domain thật
CLIENT_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com
DOMAIN_URL=https://your-domain.com

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=uploads/

# Email Configuration (nếu dùng)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Microsoft OAuth (nếu dùng)
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_CALLBACK_URL=https://your-domain.com/api/auth/microsoft/callback

# Domain Features
ENABLE_DOMAIN_LOGIN=true
REQUIRE_DOMAIN_VALIDATION=true
```

### Client (.env.production trong thư mục `client/`)

```env
# API URLs - Thay your-domain.com bằng domain thật
REACT_APP_API_BASE_URL=https://your-domain.com/api
REACT_APP_SOCKET_URL=https://your-domain.com

# Google OAuth
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id

# Build optimization
GENERATE_SOURCEMAP=false
INLINE_RUNTIME_CHUNK=false
```

## 📝 Scripts đã được tối ưu

### Package.json Scripts

**Root package.json:**
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:client": "cd client && npm start",
    "dev:server": "cd server && npm run dev",
    "build": "cd client && npm run build",
    "start:production": "cd server && NODE_ENV=production npm start"
  }
}
```

**Server package.json:**
```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  }
}
```

**Client package.json:**
```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "GENERATE_SOURCEMAP=false react-scripts build",
    "build:production": "NODE_ENV=production GENERATE_SOURCEMAP=false react-scripts build"
  }
}
```

## 🎯 Cách sử dụng

### Development (Local)

```bash
# Terminal 1 - Server
cd server
npm install
npm run dev

# Terminal 2 - Client  
cd client
npm install
npm start
```

### Production (VPS)

```bash
# Build client
cd client
npm run build:production

# Start server (với PM2 hoặc systemd)
cd ../server
npm install --production
NODE_ENV=production npm start

# Hoặc dùng PM2:
pm2 start index.js --name meeting-app
```

## ⚙️ Kiểm tra môi trường

Code đã được tối ưu để tự động nhận biết môi trường dựa trên `NODE_ENV`:

- **CORS**: Development cho phép tất cả localhost, Production chỉ cho phép domain cụ thể
- **Server Listen**: Development không bind 0.0.0.0, Production bind 0.0.0.0
- **MongoDB**: Tự động phát hiện Atlas vs Local, config TLS tương ứng
- **Logging**: Development có nhiều log hơn, Production ít log hơn
- **File Paths**: Tự động handle absolute/relative paths

## 🔐 Security Checklist cho Production

- [ ] Thay đổi `JWT_SECRET` thành random string mạnh
- [ ] Sử dụng MongoDB Atlas với IP whitelist
- [ ] Cấu hình HTTPS với SSL certificate
- [ ] Thêm rate limiting và security headers
- [ ] Đảm bảo `.env` không được commit vào git
- [ ] Setup firewall trên VPS
- [ ] Cấu hình backup database định kỳ

## 📦 Deploy lên VPS

### Sử dụng PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start app
cd server
pm2 start index.js --name meeting-app

# Save PM2 configuration
pm2 save
pm2 startup

# Monitor
pm2 monit
pm2 logs meeting-app
```

### Sử dụng Systemd (alternative)

Tạo file `/etc/systemd/system/meeting-app.service`:

```ini
[Unit]
Description=Meeting Management App
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/DATN/server
ExecStart=/usr/bin/node index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable meeting-app
sudo systemctl start meeting-app
sudo systemctl status meeting-app
```

## 🌐 Nginx Configuration (cho VPS)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Serve static files (React build)
    location / {
        root /path/to/DATN/client/build;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node.js
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
    }

    # WebSocket support for Socket.IO
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Serve uploaded files
    location /uploads {
        alias /path/to/DATN/server/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

## 📊 Monitoring (Optional)

### Health Check Endpoint

Server đã có endpoint: `GET /api/auth/health`

```bash
# Test health check
curl http://localhost:5000/api/auth/health
# Response: {"status":"ok"}
```

### PM2 Monitoring

```bash
pm2 monit           # Real-time monitoring
pm2 logs            # View logs
pm2 status          # Check status
pm2 restart all     # Restart
pm2 reload all      # Zero-downtime reload
```

## 🔄 Update Code trên VPS

```bash
# SSH vào VPS
ssh user@your-vps-ip

# Pull latest code
cd /path/to/DATN
git pull origin main

# Update dependencies (nếu có thay đổi)
cd server && npm install --production
cd ../client && npm install && npm run build:production

# Restart server
pm2 restart meeting-app

# Or với systemd:
sudo systemctl restart meeting-app
```

## 🐛 Troubleshooting

### Lỗi: MongoDB connection failed
```bash
# Kiểm tra MongoDB đang chạy
sudo systemctl status mongod  # Local
# Hoặc check MongoDB Atlas connection string
```

### Lỗi: Port already in use
```bash
# Tìm process đang dùng port
netstat -tulpn | grep :5000
# Kill process
kill -9 <PID>
```

### Lỗi: CORS
```bash
# Kiểm tra NODE_ENV
echo $NODE_ENV
# Kiểm tra FRONTEND_URL trong .env
```

### Lỗi: 502 Bad Gateway (Nginx)
```bash
# Kiểm tra server đang chạy
pm2 status
# Kiểm tra logs
pm2 logs meeting-app
# Restart server
pm2 restart meeting-app
```

