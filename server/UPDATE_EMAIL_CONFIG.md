# Cách Thêm Thông Tin Email Vào .env

## 📝 Cách 1: Loại bỏ dấu cách

Paste App Password **KHÔNG có dấu cách**:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=dcvojrsyxirtyuz
```

## 📝 Cách 2: Giữ nguyên với dấu cách (dùng quotes)

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS="dcvo vjrs yxir tyuz"
```

## ⚠️ Lưu Ý

1. **EMAIL_USER**: Thay `your_email@gmail.com` bằng email Gmail của bạn
2. **EMAIL_PASS**: App Password 16 ký tự (có thể có hoặc không có dấu cách)
3. Không có dấu ngoặc kép thừa (trừ khi dùng dấu cách)

## ✅ Sau Khi Cấu Hình

Restart server:
```bash
npm run dev
```

Kiểm tra logs:
- ✅ Email service is ready → THÀNH CÔNG
- ❌ Email service configuration error → KIỂM TRA LẠI THÔNG TIN

## 📧 Test Email

Sau khi config xong, tạo meeting mới sẽ gửi email notification tự động!

