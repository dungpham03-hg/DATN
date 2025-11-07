# ⚡ Hướng dẫn Nhanh - Domain Phenikaa

## 🎓 Domain: `meeting-management.phenikaa-uni.edu.vn`

---

## 📋 Checklist trước khi bắt đầu

- [ ] Đã có VPS với IP public
- [ ] DNS đã được cấu hình (liên hệ IT Phenikaa)
- [ ] SSH vào VPS được
- [ ] Port 80, 443 đã mở

---

## 🚀 Setup Siêu Nhanh (3 bước)

### Bước 1: SSH vào VPS

```bash
ssh user@<IP_VPS>
cd ~/DATN
```

### Bước 2: Pull code mới (đã cấu hình sẵn domain)

```bash
git pull origin main
```

### Bước 3: Chạy script tự động

```bash
chmod +x scripts/setup-phenikaa-ssl.sh
./scripts/setup-phenikaa-ssl.sh
```

**Script sẽ tự động:**
- ✅ Kiểm tra DNS
- ✅ Cài đặt Certbot
- ✅ Tạo SSL certificate
- ✅ Deploy ứng dụng
- ✅ Cấu hình auto-renewal

**XONG!** 🎉

---

## 🌐 Truy cập

Sau khi setup xong:

**Website:** https://meeting-management.phenikaa-uni.edu.vn

**API:** https://meeting-management.phenikaa-uni.edu.vn/api

---

## ⚙️ Cấu hình thủ công (nếu cần)

Xem hướng dẫn chi tiết: **[SETUP_PHENIKAA_DOMAIN.md](SETUP_PHENIKAA_DOMAIN.md)**

---

## 🔧 Các lệnh hữu ích

```bash
# Xem logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Kiểm tra SSL
sudo certbot certificates

# Update code và deploy lại
git pull origin main
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

---

## ❓ Troubleshooting Nhanh

### DNS không trỏ đúng

```bash
nslookup meeting-management.phenikaa-uni.edu.vn
```

→ Liên hệ IT Phenikaa để cấu hình DNS A Record

### Website không truy cập được

```bash
# Xem logs
docker-compose -f docker-compose.prod.yml logs

# Restart
docker-compose -f docker-compose.prod.yml restart
```

### SSL không hoạt động

```bash
# Kiểm tra certificates
ls -la nginx/ssl/

# Xem logs nginx
docker-compose -f docker-compose.prod.yml logs nginx
```

---

## 📞 Hỗ trợ

- **Chi tiết đầy đủ**: [SETUP_PHENIKAA_DOMAIN.md](SETUP_PHENIKAA_DOMAIN.md)
- **IT Phenikaa**: Cho vấn đề DNS
- **Logs**: Luôn kiểm tra logs trước

---

## ✅ Kết quả mong đợi

- ✅ Website chạy với HTTPS
- ✅ SSL certificate hợp lệ (🔒)
- ✅ API hoạt động
- ✅ Auto SSL renewal

**🎉 Chúc mừng! Domain Phenikaa đã sẵn sàng!**

