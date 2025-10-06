# Hướng dẫn chạy project với Docker

## Yêu cầu hệ thống

- Docker Desktop (Windows/Mac) hoặc Docker Engine (Linux)
- Docker Compose
- Ít nhất 4GB RAM available cho Docker

## Cấu trúc Docker

Project sử dụng Docker Compose với 3 services:
- **mongodb**: Cơ sở dữ liệu MongoDB
- **server**: Backend API (Node.js)
- **client**: Frontend React app (Nginx)

## Cách chạy

### 1. Clone và chuẩn bị project

```bash
# Đảm bảo bạn đang ở thư mục gốc của project
cd E:\DATN
```

### 2. Tạo file environment (tùy chọn)

Tạo file `.env` ở thư mục gốc để override các biến môi trường:

```env
# Database
MONGODB_URI=mongodb://admin:password123@mongodb:27017/meeting_management?authSource=admin

# JWT Secret (thay đổi trong production)
JWT_SECRET=your_super_secret_jwt_key_here

# Email Configuration (tùy chọn)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# OAuth (tùy chọn)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### 3. Chạy với Docker Compose

```bash
# Build và chạy tất cả services
docker-compose up --build

# Chạy ở background (detached mode)
docker-compose up -d --build

# Chỉ build lại một service cụ thể
docker-compose up --build server
```

### 4. Kiểm tra services

```bash
# Xem logs của tất cả services
docker-compose logs

# Xem logs của một service cụ thể
docker-compose logs server
docker-compose logs client
docker-compose logs mongodb

# Kiểm tra status của services
docker-compose ps
```

## Truy cập ứng dụng

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MongoDB**: localhost:27017

### Tài khoản mặc định

- **Email**: admin@company.com
- **Password**: admin123 (hoặc password mặc định trong seed)

## Lệnh Docker hữu ích

### Quản lý containers

```bash
# Dừng tất cả services
docker-compose down

# Dừng và xóa volumes (cẩn thận: sẽ mất data)
docker-compose down -v

# Restart một service
docker-compose restart server

# Xem logs real-time
docker-compose logs -f server
```

### Debug và maintenance

```bash
# Vào bên trong container
docker-compose exec server sh
docker-compose exec mongodb mongosh

# Backup database
docker-compose exec mongodb mongodump --out /backup

# Restore database
docker-compose exec mongodb mongorestore /backup
```

### Build và rebuild

```bash
# Build lại từ đầu (no cache)
docker-compose build --no-cache

# Build lại một service cụ thể
docker-compose build server
```

## Troubleshooting

### 1. Port conflicts

Nếu gặp lỗi port đã được sử dụng:

```bash
# Kiểm tra port nào đang được sử dụng
netstat -an | findstr :3000
netstat -an | findstr :5000
netstat -an | findstr :27017

# Thay đổi port trong docker-compose.yml
```

### 2. MongoDB connection issues

```bash
# Kiểm tra MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb

# Vào MongoDB shell để test
docker-compose exec mongodb mongosh meeting_management
```

### 3. Build failures

```bash
# Xóa images cũ và build lại
docker-compose down
docker system prune -a
docker-compose up --build
```

### 4. Permission issues (Linux/Mac)

```bash
# Fix permissions cho uploads folder
docker-compose exec server chown -R nodejs:nodejs /app/uploads
```

## Production Deployment

### 1. Tạo production docker-compose

```bash
# Copy file production
cp docker-compose.yml docker-compose.prod.yml
```

### 2. Cập nhật production config

- Thay đổi JWT_SECRET
- Sử dụng MongoDB Atlas hoặc managed database
- Cấu hình reverse proxy (Nginx)
- Setup SSL certificates
- Cấu hình monitoring

### 3. Deploy với production compose

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring và Logs

### Health checks

Services đã được cấu hình health checks:
- Server: `http://localhost:5000/api/auth/health`
- Client: `http://localhost:80`
- MongoDB: `mongosh ping`

### Logs management

```bash
# Logs với timestamps
docker-compose logs -t

# Logs của 1 service với follow
docker-compose logs -f server

# Giới hạn số dòng logs
docker-compose logs --tail=100 server
```

## Performance Tips

1. **Allocate more resources** cho Docker Desktop
2. **Use .dockerignore** để giảm build context
3. **Multi-stage builds** cho production images
4. **Volume mounting** cho development
5. **Health checks** để auto-restart failed services

## Security Notes

- Thay đổi default passwords trong production
- Sử dụng secrets management
- Enable firewall rules
- Regular security updates
- Backup data thường xuyên

---

**Lưu ý**: Đây là setup development. Đối với production, cần cấu hình thêm security, monitoring, và backup strategies.
