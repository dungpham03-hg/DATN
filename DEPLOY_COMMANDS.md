# 🚀 Lệnh Deploy lên VPS (chạy trên MobaXterm)

## Các lệnh cần chạy theo thứ tự:

### 1. SSH vào VPS (đã thực hiện trên MobaXterm)

### 2. Di chuyển vào thư mục project
```bash
cd /opt/app
```

### 3. Pull code mới từ git
```bash
git pull origin main
```
*(hoặc thay `main` bằng branch bạn đang dùng)*

### 4. Dừng containers cũ
```bash
docker-compose -f docker-compose.prod.yml down
```

### 5. Build lại images (nếu có thay đổi code)
```bash
docker-compose -f docker-compose.prod.yml build --no-cache
```

### 6. Start lại containers
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 7. Kiểm tra logs
```bash
docker-compose -f docker-compose.prod.yml logs -f --tail=100
```
*(Nhấn Ctrl+C để thoát khỏi xem logs)*

### 8. Kiểm tra status containers
```bash
docker-compose -f docker-compose.prod.yml ps
```

---

## 🔍 Nếu có lỗi:

### Xem logs chi tiết:
```bash
# Logs server
docker-compose -f docker-compose.prod.yml logs server

# Logs client (nếu có)
docker-compose -f docker-compose.prod.yml logs client

# Logs MongoDB (nếu có)
docker-compose -f docker-compose.prod.yml logs mongo
```

### Restart lại services:
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Xem tất cả containers đang chạy:
```bash
docker ps -a
```

---

## 📝 Ghi chú:
- Tất cả lệnh chạy từ thư mục `/opt/app`
- File compose: `docker-compose.prod.yml`
- Kiểm tra web ở: http://your-domain.com

