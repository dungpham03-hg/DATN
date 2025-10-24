# 🔄 Cập nhật Code lên VPS Production

## 📋 Files đã thay đổi cần update:

### Server (Backend)
- ✅ `server/index.js` - Environment config, logging
- ✅ `server/config/environment.js` - NEW - Config module
- ✅ `server/middleware/security.js` - NEW - Security middleware
- ✅ `server/routes/meetings.js` - Content handling khi submit minutes
- ✅ `server/routes/minutes-attachments.js` - Path handling cho download

### Client (Frontend)  
- ✅ `client/src/pages/Meetings/MeetingDetail.jsx` - Download với token, HTML rendering
- ✅ `client/src/components/Layout/MaterialLayout.jsx` - Backdrop props, roles
- ✅ `client/src/pages/Auth/Login.jsx` - Password field UI
- ✅ `client/src/pages/Auth/Register.jsx` - Password field UI
- ✅ `client/src/theme.js` - Fixed syntax
- ✅ `client/src/config/environment.js` - NEW - Client config

---

## 🔧 BƯỚC 1: Commit & Push Code

**Trên máy local:**

```bash
cd E:\DATN

# Kiểm tra files đã thay đổi
git status

# Add files đã thay đổi
git add server/index.js
git add server/config/environment.js
git add server/middleware/security.js
git add server/routes/meetings.js
git add server/routes/minutes-attachments.js
git add client/src/pages/Meetings/MeetingDetail.jsx
git add client/src/components/Layout/MaterialLayout.jsx
git add client/src/pages/Auth/Login.jsx
git add client/src/pages/Auth/Register.jsx
git add client/src/theme.js
git add client/src/config/environment.js

# Add documentation (optional)
git add DEPLOYMENT_GUIDE.md
git add ENV_SETUP_GUIDE.md
git add QUICK_START.md
git add OPTIMIZATION_SUMMARY.md

# Commit
git commit -m "Fix file download authentication and optimize for production

- Fix download file đính kèm biên bản với token authentication
- Fix absolute path handling cho file uploads
- Update content handling khi submit biên bản
- Add environment config modules
- Add security middleware cho production
- Improve password field UI
- Add comprehensive documentation"

# Push lên repository
git push origin main
```

---

## 🌐 BƯỚC 2: Update trên VPS

**SSH vào VPS:**

```bash
ssh user@meeting-management.phenikaa-uni.edu.vn
# hoặc
ssh user@<vps-ip-address>
```

### A. Backup hiện tại (Quan trọng!)

```bash
# Tạo backup
cd /var/www  # hoặc thư mục chứa app của bạn
BACKUP_DIR="/var/backups/meeting-app"
mkdir -p $BACKUP_DIR
BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"

# Backup toàn bộ app
tar -czf $BACKUP_FILE meeting-app/

# Backup database (nếu MongoDB local)
# mongodump --db meeting_management --out $BACKUP_DIR/db-$(date +%Y%m%d-%H%M%S)

echo "✅ Backup created: $BACKUP_FILE"
```

### B. Pull code mới

```bash
# Di chuyển vào thư mục app
cd /var/www/meeting-app  # Hoặc thư mục của bạn

# Stash local changes (nếu có)
git stash

# Pull latest code
git pull origin main

# Restore .env nếu bị ghi đè
git checkout .env  # nếu cần

# Hoặc restore từ stash
git stash pop  # nếu có changes cần giữ
```

### C. Update Server Dependencies (nếu có thay đổi)

```bash
cd server

# Kiểm tra xem có dependencies mới không
git diff HEAD~1 package.json

# Nếu có thay đổi, install lại
npm install --production
```

### D. Rebuild Client

```bash
cd ../client

# Check nếu có dependencies mới
git diff HEAD~1 package.json

# Install nếu cần
npm install

# Build lại production
npm run build:production
```

### E. Restart Server

```bash
# Option 1: Reload (zero-downtime)
pm2 reload meeting-app

# Option 2: Restart
pm2 restart meeting-app

# Check status
pm2 status

# View logs để đảm bảo không có lỗi
pm2 logs meeting-app --lines 50
```

### F. Verify

```bash
# Test health endpoint
curl https://meeting-management.phenikaa-uni.edu.vn/api/auth/health

# Expected response:
# {"status":"ok"}

# Check PM2 status
pm2 list

# Monitor logs một lúc
pm2 logs meeting-app --lines 100
```

---

## ✅ BƯỚC 3: Test trên Production

**Trên browser:**

1. Mở: https://meeting-management.phenikaa-uni.edu.vn
2. Đăng nhập
3. Vào meeting detail
4. **Test download file biên bản:**
   - Click "Chi tiết biên bản"
   - Click icon download
   - ✅ File phải download thành công (không còn lỗi "Access token không tồn tại")
5. **Test nội dung biên bản:**
   - Tạo biên bản mới với nội dung
   - Gửi để duyệt
   - Xem lại → ✅ Nội dung hiển thị đầy đủ (không còn "Không có nội dung")

---

## 🔍 BƯỚC 4: Kiểm tra Logs

**Theo dõi logs trong khi test:**

```bash
# Real-time logs
pm2 logs meeting-app

# Nếu thấy:
# ✅ "Attachment found: ..."
# ✅ "File exists, sending download response..."
# ✅ "Download stream started"
# → THÀNH CÔNG!

# Nếu có lỗi, check:
pm2 logs meeting-app --err --lines 100
```

---

## 🆘 ROLLBACK (Nếu có vấn đề)

Nếu update gặp vấn đề, rollback ngay:

```bash
# Stop app
pm2 stop meeting-app

# Restore từ backup
cd /var/www
rm -rf meeting-app
tar -xzf $BACKUP_FILE

# Restart
cd meeting-app/server
pm2 start index.js --name meeting-app

# Hoặc rollback git commit
cd /var/www/meeting-app
git reset --hard HEAD~1
pm2 restart meeting-app
```

---

## 📝 BƯỚC 5: Save PM2 Config

Sau khi verify mọi thứ OK:

```bash
# Save current PM2 config
pm2 save

# Ensure auto-start on reboot
pm2 startup  # Copy và run lệnh output nếu chưa làm
```

---

## 🎯 ONE-LINER UPDATE (Nhanh nhất)

**Nếu đã quen và chắc chắn:**

```bash
cd /var/www/meeting-app && \
git pull origin main && \
cd server && npm install --production && \
cd ../client && npm install && npm run build:production && \
pm2 reload meeting-app && \
pm2 logs meeting-app --lines 30
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

### Trước khi update:

1. ✅ **Backup database** (nếu MongoDB local)
2. ✅ **Backup code hiện tại**
3. ✅ **Thông báo users** về maintenance (nếu app đang có traffic)
4. ✅ **Test trên local** trước (đã làm ✓)

### Sau khi update:

1. ✅ **Test download files**
2. ✅ **Test biên bản content**
3. ✅ **Test login/register**
4. ✅ **Check PM2 logs** không có errors
5. ✅ **Monitor CPU/Memory** usage

### File .env trên VPS:

**⚠️ QUAN TRỌNG:** Đảm bảo file `.env` trên VPS có đúng config production:

```bash
# Check .env hiện tại
cat server/.env

# Phải có:
NODE_ENV=production
MONGODB_URI=mongodb+srv://...  # MongoDB Atlas
CLIENT_URL=https://meeting-management.phenikaa-uni.edu.vn
FRONTEND_URL=https://meeting-management.phenikaa-uni.edu.vn
DOMAIN_URL=https://meeting-management.phenikaa-uni.edu.vn
```

Nếu chưa đúng, update:
```bash
nano server/.env
# Sửa và save (Ctrl+X, Y, Enter)
pm2 restart meeting-app --update-env
```

---

## 📊 Monitor sau khi deploy

```bash
# Real-time monitoring
pm2 monit

# Check resource usage
htop

# Check Nginx
sudo systemctl status nginx

# Nginx access logs
sudo tail -f /var/log/nginx/access.log
```

---

**Làm theo các bước trên, ứng dụng VPS của bạn sẽ được update thành công! 🎉**

