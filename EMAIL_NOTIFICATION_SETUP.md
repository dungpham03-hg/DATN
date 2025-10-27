# Hướng Dẫn Cấu Hình Email Notifications

## ✅ Đã Tạo

### 1. Email Service (`server/services/emailService.js`)
- ✅ Nodemailer integration
- ✅ Automatic configuration check
- ✅ HTML email templates
- ✅ Meeting notification emails
- ✅ Meeting reminder emails

### 2. Notification Integration
- ✅ Tự động gửi email khi có notification mới
- ✅ Check user notification settings
- ✅ Non-blocking (không làm chậm app)

## 🔧 Cấu Hình

### 1. Setup Gmail App Password

1. Truy cập: https://myaccount.google.com/security
2. Bật **2-Step Verification**
3. Tạo **App Password**:
   - Vào: https://myaccount.google.com/apppasswords
   - Chọn "Mail" và "Other (Custom name)"
   - Nhập tên: "Meeting Manager"
   - Copy mật khẩu 16 ký tự

### 2. Cấu Hình Backend

Thêm vào file `server/.env`:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_char_app_password
```

**Lưu ý:** Dùng App Password (16 ký tự), KHÔNG dùng mật khẩu Gmail thông thường

### 3. Test Email Service

Restart server và kiểm tra logs:
```
✅ Email service is ready
```

Hoặc kiểm tra trong terminal:
```bash
node -e "require('./services/emailService')"
```

## 📧 Tính Năng Email

### 1. Meeting Notifications
- Gửi email khi có cuộc họp mới
- Gửi email khi cuộc họp bị hủy/hoãn
- HTML email đẹp, responsive
- Nút CTA xem chi tiết

### 2. Meeting Reminders
- Tự động nhắc nhở trước cuộc họp
- Gửi theo user notification settings
- HTML email với thông tin đầy đủ

### 3. User Control
- User có thể bật/tắt email notifications trong Settings
- Backend tự động check settings trước khi gửi
- Không spam nếu user tắt

## 🧪 Test Email

### Manual Test
```javascript
// server/test-email.js
const emailService = require('./services/emailService');

emailService.sendEmail({
  to: 'test@example.com',
  subject: 'Test Email',
  html: '<h1>Hello from Meeting Manager!</h1>'
}).then(result => {
  console.log('Result:', result);
});
```

### Integration Test
Khi tạo meeting mới, user sẽ nhận:
1. ✅ Real-time notification (Socket.IO)
2. ✅ Database notification
3. ✅ Email notification (nếu bật)

## 🔒 Security

### Gmail App Password
- App Password riêng biệt, không phải mật khẩu chính
- Có thể revoke bất cứ lúc nào
- Không ảnh hưởng đến 2FA

### Best Practices
1. ✅ KHÔNG commit `.env` file
2. ✅ Dùng App Password, không dùng mật khẩu chính
3. ✅ Rotate App Password định kỳ
4. ✅ Rate limiting để tránh spam

## 📊 Monitoring

Server logs sẽ hiển thị:
```
✅ Email sent successfully: <message-id>
❌ Error sending email: <error>
📧 User has disabled email notifications
📧 Email service is disabled
```

## 🚀 Sẵn Sàng Sử Dụng

Sau khi cấu hình `.env`:
1. Restart server
2. Tạo meeting mới
3. User sẽ nhận email notification
4. Check inbox/spam folder

## ⚙️ Advanced Configuration

### Custom SMTP Server
Nếu không dùng Gmail:
```env
EMAIL_HOST=mail.example.com
EMAIL_PORT=587
EMAIL_USER=noreply@example.com
EMAIL_PASS=your_password
```

### HTML Templates
Chỉnh sửa templates trong:
`server/services/emailService.js`

### Adding New Email Types
1. Tạo method mới trong `emailService`
2. Tạo HTML template
3. Call method trong notification helper

