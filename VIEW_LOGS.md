# 📋 Xem Logs Docker trên VPS

## 🔍 Các lệnh xem logs:

### Xem tất cả logs:
```bash
docker-compose -f docker-compose.prod.yml logs
```

### Xem logs theo container:

#### Client (Frontend):
```bash
docker-compose -f docker-compose.prod.yml logs client
```

#### Server (Backend):
```bash
docker-compose -f docker-compose.prod.yml logs server
```

#### Nginx:
```bash
docker-compose -f docker-compose.prod.yml logs nginx
```

#### Redis:
```bash
docker-compose -f docker-compose.prod.yml logs redis
```

---

## 📊 Xem logs real-time (follow):

### Tất cả containers:
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Chỉ client:
```bash
docker-compose -f docker-compose.prod.yml logs -f client
```

### Chỉ server:
```bash
docker-compose -f docker-compose.prod.yml logs -f server
```

### Chỉ nginx:
```bash
docker-compose -f docker-compose.prod.yml logs -f nginx
```

---

## 🔢 Xem N dòng logs cuối:

### 50 dòng cuối của client:
```bash
docker-compose -f docker-compose.prod.yml logs --tail=50 client
```

### 100 dòng cuối của server:
```bash
docker-compose -f docker-compose.prod.yml logs --tail=100 server
```

### 20 dòng cuối của tất cả:
```bash
docker-compose -f docker-compose.prod.yml logs --tail=20
```

---

## 🚀 Xem logs kết hợp (client + server):
```bash
docker-compose -f docker-compose.prod.yml logs -f client server
```

### 100 dòng cuối của client + server:
```bash
docker-compose -f docker-compose.prod.yml logs --tail=100 client server
```

---

## 📈 Kiểm tra real-time kết hợp:
```bash
# Theo dõi logs real-time của client và server
docker-compose -f docker-compose.prod.yml logs -f --tail=50 client server nginx
```

---

## 🎯 Commands nhanh thường dùng:

### Xem status + logs real-time:
```bash
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f --tail=100
```

### Chỉ xem logs nginx (debug routing):
```bash
docker-compose -f docker-compose.prod.yml logs --tail=200 nginx
```

### Xem logs khi có lỗi:
```bash
docker-compose -f docker-compose.prod.yml logs --tail=500 | grep -i error
```

---

## 💡 Tips:

**Nhấn `Ctrl + C` để thoát khỏi chế độ follow logs.**

**Xem logs một container cụ thể bằng tên:**
```bash
docker logs datn-client --tail=100
docker logs datn-server --tail=100
docker logs datn-nginx --tail=100
```

**Xem logs real-time bằng tên:**
```bash
docker logs -f datn-client
docker logs -f datn-server
docker logs -f datn-nginx
```

**Restart một container sau khi sửa config:**
```bash
docker-compose -f docker-compose.prod.yml restart client
docker-compose -f docker-compose.prod.yml restart server
docker-compose -f docker-compose.prod.yml restart nginx
```

