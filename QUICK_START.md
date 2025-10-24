# ⚡ Quick Start Guide

## 🎯 Chạy nhanh trên Local (3 phút)

### Windows

```powershell
# 1. Setup tự động
.\scripts\setup-local.ps1

# 2. Chạy app (2 terminals)
# Terminal 1:
cd server
npm start

# Terminal 2:
cd client
npm start
```

### Linux/Mac

```bash
# 1. Setup tự động
chmod +x scripts/setup-local.sh
./scripts/setup-local.sh

# 2. Chạy app (2 terminals)
# Terminal 1:
cd server
npm start

# Terminal 2:
cd client
npm start
```

### Truy cập

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **Health Check:** http://localhost:5000/api/auth/health

---

## 🚀 Deploy lên VPS (Production)

### Cách 1: Sử dụng script tự động

```bash
# SSH vào VPS
ssh user@your-vps-ip

# Clone repo
cd /var/www
git clone <repo-url> meeting-app
cd meeting-app

# Cấu hình .env files (xem ENV_SETUP_GUIDE.md)
nano server/.env
nano client/.env.production

# Chạy deploy script
chmod +x deploy-vps.sh
sudo ./deploy-vps.sh
```

### Cách 2: Manual deployment

Xem chi tiết trong **DEPLOYMENT_GUIDE.md**

---

## 🔧 Cấu hình môi trường

### Development (Local)

**Server (.env):**
```env
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/meeting_management
JWT_SECRET=local_dev_secret_12345
CLIENT_URL=http://localhost:3000
```

**Client (.env.local):**
```env
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### Production (VPS)

**Server (.env):**
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
JWT_SECRET=SECURE_RANDOM_STRING_MIN_32_CHARS
CLIENT_URL=https://your-domain.com
```

**Client (.env.production):**
```env
REACT_APP_API_BASE_URL=https://your-domain.com/api
REACT_APP_SOCKET_URL=https://your-domain.com
```

---

## 📚 Tài liệu chi tiết

- **ENV_SETUP_GUIDE.md** - Hướng dẫn cấu hình environment variables
- **DEPLOYMENT_GUIDE.md** - Hướng dẫn deployment chi tiết
- **LOCAL_SETUP.md** - Setup local development
- **README.md** - Overview và features

---

## ✅ Checklist

### Development Setup
- [ ] Node.js đã cài đặt
- [ ] MongoDB đang chạy (hoặc có MongoDB Atlas URL)
- [ ] Clone repository
- [ ] Chạy setup script hoặc tạo .env files
- [ ] Install dependencies
- [ ] Start server và client
- [ ] Mở http://localhost:3000

### Production Deployment
- [ ] VPS đã chuẩn bị (Node.js, Nginx, PM2)
- [ ] MongoDB Atlas account
- [ ] Domain đã trỏ về VPS
- [ ] .env files đã cấu hình đúng
- [ ] Dependencies installed
- [ ] Client đã build
- [ ] Server start với PM2
- [ ] Nginx đã cấu hình
- [ ] SSL certificate đã setup
- [ ] Test endpoints
- [ ] Monitor logs

---

## 🐛 Troubleshooting nhanh

| Vấn đề | Giải pháp |
|--------|-----------|
| Port 5000 đã sử dụng | `netstat -ano \| findstr :5000` → kill process |
| MongoDB connection error | Check MongoDB đang chạy |
| CORS error | Check NODE_ENV và FRONTEND_URL |
| 502 Bad Gateway | Check PM2: `pm2 status` |
| File upload error | Check permissions: `chmod 755 server/uploads` |

---

**Hỗ trợ:** Xem DEPLOYMENT_GUIDE.md hoặc ENV_SETUP_GUIDE.md

