# 🔧 Fix Lỗi Build trên VPS

## Vấn đề:
- `npm ci` bị lỗi vì package-lock.json không sync với package.json
- Local Dockerfile đã được sửa thành `npm install`

## Giải pháp:

### Trên VPS, chạy các lệnh sau:

```bash
cd /opt/app

# Reset lại code về trạng thái sạch
git reset --hard HEAD
git clean -fd

# Pull lại code mới (đã có Dockerfile đã sửa)
git pull origin main

# Xóa Docker images và volumes cũ để build lại sạch
docker-compose -f docker-compose.prod.yml down
docker system prune -af
docker volume prune -f

# Build lại từ đầu
docker-compose -f docker-compose.prod.yml build --no-cache

# Start containers
docker-compose -f docker-compose.prod.yml up -d

# Xem logs
docker-compose -f docker-compose.prod.yml logs -f --tail=100
```

## Hoặc nếu vẫn lỗi, thử cách này:

```bash
cd /opt/app/client

# Xóa node_modules và package-lock.json
rm -rf node_modules package-lock.json

# Install lại dependencies
npm install

# Commit thay đổi (nếu cần)
cd ..
git add client/package-lock.json
git commit -m "Update package-lock.json"

# Build lại
docker-compose -f docker-compose.prod.yml build --no-cache client
docker-compose -f docker-compose.prod.yml up -d
```

