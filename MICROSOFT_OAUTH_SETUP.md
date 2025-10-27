# Microsoft OAuth Setup

## 1. Đăng ký ứng dụng trên Microsoft Azure Portal

### Bước 1: Truy cập Azure Portal
1. Mở trình duyệt và truy cập: https://portal.azure.com
2. Đăng nhập với tài khoản Microsoft hoặc Azure AD của bạn

### Bước 2: Tạo App Registration
1. Tìm kiếm **"Azure Active Directory"** hoặc **"Azure AD"** trong thanh tìm kiếm
2. Chọn **"App registrations"** (Đăng ký ứng dụng)
3. Click **"+ New registration"** (+ Đăng ký mới)

### Bước 3: Điền thông tin
- **Name**: Meeting Manager (hoặc tên bạn muốn)
- **Supported account types**: 
  - **Accounts in any organizational directory and personal Microsoft accounts**
- Click **"Register"**

### Bước 4: Lấy Client ID và Client Secret
1. Trên trang **Overview**, copy **Application (client) ID** - Đây là `MICROSOFT_CLIENT_ID`

2. Để tạo Client Secret:
   - Chọn **"Certificates & secrets"** (Chứng chỉ và bí mật) ở sidebar bên trái
   - Click **"+ New client secret"** (+ Bí mật máy khách mới)
   - **Description**: Production Secret (hoặc tên bạn muốn)
   - **Expires**: 6 months hoặc 12 months hoặc Never
   - Click **"Add"**
   - **Quan trọng**: Copy **Value** ngay lập tức (bạn sẽ không thể xem lại được!)
   - Đây là `MICROSOFT_CLIENT_SECRET`

### Bước 5: Cấu hình Redirect URI
1. Chọn **"Authentication"** (Xác thực) ở sidebar bên trái
2. Click **"+ Add a platform"** (+ Thêm nền tảng)
3. Chọn **"Web"**
4. Thêm **Redirect URIs**:
   - Local: `http://localhost:5000/api/auth/microsoft/callback`
   - Production: `https://your-domain.com/api/auth/microsoft/callback`
5. Click **"Configure"**

### Bước 6: Cấu hình API Permissions (Optional)
1. Chọn **"API permissions"** ở sidebar bên trái
2. Click **"+ Add a permission"**
3. Chọn **"Microsoft Graph"**
4. Chọn **"Delegated permissions"**
5. Thêm các permissions:
   - `openid` (Được thêm tự động)
   - `profile` (Được thêm tự động)
   - `email` (Được thêm tự động)
   - `User.Read`
6. Click **"Add permissions"**

---

## 2. Cấu hình Environment Variables

### File `.env` trong thư mục `server/`

Thêm hoặc cập nhật các dòng sau vào file `.env`:

```env
# ======================
# MICROSOFT OAUTH
# ======================
MICROSOFT_CLIENT_ID=your-client-id-here
MICROSOFT_CLIENT_SECRET=your-client-secret-here

# Local Development:
MICROSOFT_CALLBACK_URL=http://localhost:5000/api/auth/microsoft/callback

# Production:
# MICROSOFT_CALLBACK_URL=https://your-domain.com/api/auth/microsoft/callback

# Tenant ID (thường để là 'common' để cho phép tất cả Microsoft accounts):
MICROSOFT_TENANT_ID=common
```

### Ví dụ thực tế:
```env
MICROSOFT_CLIENT_ID=12345678-1234-1234-1234-123456789abc
MICROSOFT_CLIENT_SECRET=abc123DEF456ghi789JKL012mno345PQR678stu901vwx234=
MICROSOFT_CALLBACK_URL=http://localhost:5000/api/auth/microsoft/callback
MICROSOFT_TENANT_ID=common
```

---

## 3. Kiểm tra cài đặt

### Kiểm tra backend đã có Microsoft Strategy

File `server/config/passport.js` đã có sẵn code cho Microsoft Strategy (dòng 205-300).

### Kiểm tra routes đã có

File `server/routes/auth.js` đã có routes:
- `GET /api/auth/microsoft` - Bắt đầu OAuth flow
- `GET /api/auth/microsoft/callback` - Callback từ Microsoft

### Kiểm tra frontend có nút Microsoft

File `client/src/pages/Auth/Login.jsx` đã có nút "Đăng nhập với Microsoft" (dòng 286-313).

---

## 4. Test OAuth Flow

### Bước 1: Khởi động server
```bash
cd server
npm start
```

### Bước 2: Khởi động client
```bash
cd client
npm start
```

### Bước 3: Test Login
1. Mở trình duyệt: http://localhost:3000/login
2. Click nút **"Đăng nhập với Microsoft"**
3. Chọn tài khoản Microsoft
4. Chấp nhận permissions
5. Xác minh redirect về `/dashboard`

---

## 5. Troubleshooting

### Lỗi: "TokenError: Unauthorized"
- **Nguyên nhân**: Client Secret không đúng hoặc đã hết hạn
- **Giải pháp**: Tạo lại Client Secret mới trong Azure Portal và cập nhật trong `.env`

### Lỗi: "redirect_uri_mismatch"
- **Nguyên nhân**: Redirect URI trong Azure không khớp với `.env`
- **Giải pháp**: Kiểm tra chính xác URI trong Azure Portal và `.env` phải giống hệt nhau

### Lỗi: "AADSTS700016: Application not found"
- **Nguyên nhân**: Client ID không đúng
- **Giải pháp**: Kiểm tra lại Client ID trong `.env` với Application ID trong Azure Portal

### Lỗi: Email domain không được phép
- **Nguyên nhân**: Domain email của user không nằm trong whitelist
- **Giải pháp**: 
  - Kiểm tra file `server/config/domainConfig.js`
  - Thêm domain vào `WHITELISTED_DOMAINS` nếu cần
  - Hoặc xem `passport.js` đã xử lý cho phép tất cả domains qua OAuth

---

## 6. Production Deployment

### Cập nhật Redirect URI
1. Vào Azure Portal → App Registration → Authentication
2. Thêm Production URL:
   - `https://yourdomain.com/api/auth/microsoft/callback`
3. Remove localhost URL (nếu không cần trong production)

### Cập nhật `.env` trên server
```env
MICROSOFT_CLIENT_ID=your-production-client-id
MICROSOFT_CLIENT_SECRET=your-production-client-secret
MICROSOFT_CALLBACK_URL=https://yourdomain.com/api/auth/microsoft/callback
MICROSOFT_TENANT_ID=common
```

### Security Notes
- ⚠️ **Never commit** `.env` file to Git
- 🔒 Store Client Secret securely (use environment variables or secret manager)
- 🔄 Rotate Client Secret periodically (every 6-12 months)
- ✅ Use HTTPS in production
- ✅ Enable conditional access policies (optional)

---

## 7. Multi-tenant vs Single-tenant

### Common (Multi-tenant) - Hiện tại
```env
MICROSOFT_TENANT_ID=common
```
- Cho phép tất cả Microsoft accounts (personal + work)
- Phù hợp cho public applications

### Single-tenant
```env
MICROSOFT_TENANT_ID=your-tenant-id
```
- Chỉ cho phép accounts từ organization cụ thể
- Phù hợp cho internal applications
- Lấy Tenant ID từ Azure AD → Overview

---

## Summary

✅ **Đã có sẵn trong code:**
- Backend passport strategy
- Routes (/microsoft, /microsoft/callback)
- Frontend login button
- Error handling

📝 **Cần làm:**
1. Đăng ký app trên Azure Portal
2. Lấy Client ID và Secret
3. Cấu hình Redirect URI
4. Thêm vào `.env` file
5. Test login flow

🎉 **Sau khi setup xong, user có thể login với Microsoft account!**
