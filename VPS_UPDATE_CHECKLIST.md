# ✅ VPS Update Checklist

## 🎯 Các bước cập nhật lên VPS Production

### ☑️ **BƯỚC 1: Commit code trên Local** (máy Windows)

```powershell
cd E:\DATN

# Add files đã sửa
git add -A

# Commit
git commit -m "Fix file downloads and optimize for production"

# Push lên GitHub/GitLab
git push origin main
```

---

### ☑️ **BƯỚC 2: SSH vào VPS**

```bash
ssh user@meeting-management.phenikaa-uni.edu.vn
# Hoặc
ssh user@<IP-VPS>
```

---

### ☑️ **BƯỚC 3: Update Code (Chọn 1 trong 2 cách)**

#### **Cách 1: Dùng Script Tự Động** (Khuyến nghị)

```bash
# Download script update
cd /var/www/meeting-app
wget https://raw.githubusercontent.com/<your-repo>/main/update-vps.sh
# Hoặc upload file update-vps.sh từ local

# Chạy script
chmod +x update-vps.sh
./update-vps.sh
```

#### **Cách 2: Manual**

```bash
# Backup
cd /var/www
tar -czf ~/backup-$(date +%Y%m%d-%H%M%S).tar.gz meeting-app/

# Pull code
cd meeting-app
git pull origin main

# Update server
cd server
npm install --production

# Rebuild client
cd ../client
npm install
npm run build:production

# Reload PM2
pm2 reload meeting-app

# Check
pm2 logs meeting-app --lines 30
```

---

### ☑️ **BƯỚC 4: Verify**

```bash
# Test health
curl https://meeting-management.phenikaa-uni.edu.vn/api/auth/health

# Check PM2
pm2 status

# Monitor logs
pm2 logs meeting-app
```

---

### ☑️ **BƯỚC 5: Test trên Browser**

1. ✅ Mở: https://meeting-management.phenikaa-uni.edu.vn
2. ✅ Đăng nhập
3. ✅ Vào meeting detail
4. ✅ Test download file biên bản
5. ✅ Test tạo và xem nội dung biên bản
6. ✅ Test các chức năng khác

---

## 🚨 Rollback nếu có lỗi

```bash
# Stop app
pm2 stop meeting-app

# Restore backup
cd /var/www
rm -rf meeting-app
tar -xzf ~/backup-<timestamp>.tar.gz

# Start lại
cd meeting-app/server
pm2 start index.js --name meeting-app
pm2 save
```

---

## 💡 Tips

- **Không cần restart Nginx** (chỉ update code)
- **Zero-downtime**: Dùng `pm2 reload` thay vì `pm2 restart`
- **Monitor**: Mở terminal riêng chạy `pm2 logs meeting-app`
- **Backup database**: Nếu có thay đổi schema quan trọng

---

## ⚡ Quick Commands

```bash
# One-liner update (nếu chắc chắn)
cd /var/www/meeting-app && git pull && cd server && npm install --production && cd ../client && npm install && npm run build:production && pm2 reload meeting-app

# View logs
pm2 logs meeting-app

# Restart if needed
pm2 restart meeting-app

# Check status
pm2 status
```

---

**Estimated time:** 5-10 phút (tùy tốc độ mạng)

**Downtime:** 0 giây (nếu dùng `pm2 reload`)

