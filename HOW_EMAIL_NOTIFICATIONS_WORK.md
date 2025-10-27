# 📧 Email Notifications Hoạt Động Như Thế Nào?

## 🎯 Cho Người Dùng

### 1. Email Gửi Đến Đâu?

Email notification sẽ được gửi đến **email đăng nhập** của bạn trong hệ thống!

- Nếu bạn đăng ký với email: `user@example.com`
- Thì email notifications sẽ gửi đến: `user@example.com`

### 2. Cách Bật/Tắt Email Notifications

#### Bước 1: Vào Settings
1. Click vào avatar của bạn (góc trên phải)
2. Chọn "Cài đặt" (Settings icon)

#### Bước 2: Vào tab "Thông báo"
1. Chọn tab **"Thông báo"** (Notifications)
2. Toggle **"Email thông báo"** thành **ON**

#### Bước 3: Lưu
- Click nút **"Lưu cài đặt"**
- Xong! Bạn sẽ nhận email notifications

### 3. Các Loại Email Notifications

Khi bật "Email thông báo", bạn sẽ nhận email cho:

✅ **Cuộc họp mới**
- Khi được mời tham gia cuộc họp
- Khi có cuộc họp mới trong phòng ban

✅ **Nhắc nhở cuộc họp** (nếu bật)
- Nhắc nhở trước cuộc họp (15 phút)

✅ **Thay đổi cuộc họp**
- Cuộc họp bị hủy
- Cuộc họp bị hoãn
- Thời gian/địa điểm thay đổi

✅ **Cập nhật trạng thái** (nếu bật)
- Trạng thái cuộc họp thay đổi
- Biên bản được duyệt

### 4. Cách Tắt Email Notifications

1. Vào Settings → Thông báo
2. Toggle "Email thông báo" thành **OFF**
3. Click "Lưu cài đặt"

## 🔧 Cho Admin/Developer

### Email Provider

Hệ thống sử dụng Gmail SMTP của bạn để gửi email:
- Server cấu hình: `EMAIL_USER` và `EMAIL_PASS` trong `.env`
- Tất cả emails đều từ cùng 1 Gmail account
- Người dùng nhận email tại email của **chính họ**

### Flow

```
1. Event xảy ra (meeting mới, hủy, etc.)
   ↓
2. Tạo notification trong database
   ↓
3. Gửi real-time notification (Socket.IO)
   ↓
4. Check user.notificationSettings.email
   ↓
5. Nếu TRUE → Gửi email đến user.email
```

### Database

**Notifications Collection:**
```javascript
{
  recipient: ObjectId,  // User ID nhận notification
  sender: ObjectId,      // User gửi
  type: 'meeting_invitation',
  title: 'Cuộc họp mới',
  message: 'Bạn được mời tham gia...',
  read: false,
  data: { meetingId: ... }
}
```

**User.notificationSettings:**
```javascript
{
  email: true,              // ✅ Bật email notifications
  push: true,               // Browser push notifications
  meetingReminders: true,   // Nhắc nhở cuộc họp
  statusUpdates: false,     // Cập nhật trạng thái
  weeklyReports: true       // Báo cáo hàng tuần
}
```

## 📝 Ví Dụ Cụ Thể

### User A (bestsedmever2003@gmail.com)
- Đăng ký với email: `user123@gmail.com`
- Bật "Email thông báo" trong Settings
- Khi có meeting mới → Nhận email tại `user123@gmail.com`

### User B
- Đăng ký với email: `user456@gmail.com`
- Tắt "Email thông báo"
- Khi có meeting mới → KHÔNG nhận email, chỉ real-time notification

## ⚠️ Lưu Ý Quan Trọng

### 1. Email Phải Tồn Tại
- Email của user PHẢI là email thật
- Không thể gửi đến email giả/không tồn tại

### 2. Spam Folder
- Email có thể vào Spam folder
- Đề nghị đánh dấu "Not Spam" lần đầu

### 3. Quota Limit
- Gmail có giới hạn 500 emails/ngày (free tier)
- Production nên dùng Google Workspace hoặc SendGrid

### 4. User Settings
- Mỗi user tự quyết định bật/tắt
- Admin không thể force send email

## 🧪 Test Email

User có thể test bằng cách:
1. Tạo meeting mới
2. Check email inbox
3. Nếu không thấy → Check Spam folder

## ✅ Tổng Kết

- ✅ User cần đăng ký với email thật
- ✅ User cần bật "Email thông báo" trong Settings
- ✅ Email gửi đến email của user (không phải email server)
- ✅ User có thể tắt bất cứ lúc nào
- ✅ Email từ server (Gmail) nhưng đến người dùng

