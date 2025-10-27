# Hướng Dẫn Setup Microsoft OAuth - Tiếng Việt

## 🎯 Mục đích
Cho phép user đăng nhập bằng tài khoản Microsoft (Azure AD / Outlook / Hotmail)

---

## 📝 Các bước thiết lập

### Bước 1: Tạo App trên Azure Portal

1. **Truy cập**: https://portal.azure.com
2. Đăng nhập với Microsoft account
3. Tìm kiếm: **"Azure Active Directory"** (Azure AD)
4. Click vào **"App registrations"** → **"+ New registration"**

#### Điền thông tin:
- **Name**: Meeting Manager
- **Supported account types**: Chọn **"Accounts in any organizational directory and personal Microsoft accounts"**
- Click **"Register"**

---

### Bước 2: Lấy Client ID

1. Sau khi tạo xong, copy **Application (client) ID**
   - Ví dụ: `12345678-abcd-1234-5678-abcdef123456`
2. Lưu lại để thêm vào file `.env`

---

### Bước 3: Tạo Client Secret

1. Ở sidebar bên trái, click **"Certificates & secrets"**
2. Click **"+ New client secret"**
3. Điền:
   - **Description**: Production
   - **Expires**: Chọn 12 months (hoặc Never)
   - Click **"Add"**
4. **Quan trọng**: Copy **Value** ngay lập tức!
   - Đây là Client Secret, bạn sẽ không xem lại được
   - Ví dụ: `abc~123XYZ~Secret~Value`

---

### Bước 4: Thêm Redirect URI

1. Ở sidebar bên trái, click **"Authentication"**
2. Click **"+ Add a platform"** → Chọn **"Web"**
3. Thêm Redirect URI:
   - **Local**: `http://localhost:5000/api/auth/microsoft/callback`
   - **Production** (nếu có): `https://your-domain.com/api/auth/microsoft/callback`
4. Click **"Configure"**

---

### Bước 5: Cấu hình file .env

Mở file `server/.env` và thêm:

```env
# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-client-id-here
MICROSOFT_CLIENT_SECRET=your-client-secret-here
MICROSOFT_CALLBACK_URL=http://localhost:5000/api/auth/microsoft/callback
MICROSOFT_TENANT_ID=common
```

#### Ví dụ thực tế:
```env
MICROSOFT_CLIENT_ID=12345678-abcd-1234-5678-abcdef123456
MICROSOFT_CLIENT_SECRET=abc~123XYZ~Secret~Value
MICROSOFT_CALLBACK_URL=http://localhost:5000/api/auth/microsoft/callback
MICROSOFT_TENANT_ID=common
```

---

### Bước 6: Khởi động lại Server

```bash
cd server
npm start
```

---

### Bước 7: Test

1. Mở trình duyệt: http://localhost:3000/login
2. Click nút **"Đăng nhập với Microsoft"**
3. Chọn tài khoản Microsoft
4. Cho phép truy cập
5. Nếu thành công, sẽ tự động redirect về `/dashboard`

---

## 🔍 Kiểm tra cấu hình

Chạy lệnh để kiểm tra:

```bash
cd server
node setup-microsoft-oauth.js
```

Nếu thấy tất cả ✅ nghĩa là cấu hình đúng!

---

## ⚠️ Lưu ý quan trọng

### Bảo mật
- ✅ **Không commit** file `.env` lên Git
- ✅ Client Secret phải giữ bí mật
- ✅ Thay đổi Secret định kỳ (6-12 tháng)

### Lỗi thường gặp

**1. "redirect_uri_mismatch"**
- Redirect URI trong Azure phải khớp **100%** với `.env`
- Kiểm tra lại cả 2 nơi

**2. "TokenError: Unauthorized"**
- Client Secret đã hết hạn hoặc sai
- Tạo lại Secret mới trong Azure

**3. "AADSTS700016"**
- Client ID sai
- Kiểm tra lại Application ID

---

## ✅ Checklist

- [ ] Tạo App Registration trên Azure
- [ ] Lấy Client ID
- [ ] Tạo Client Secret
- [ ] Thêm Redirect URI
- [ ] Cập nhật file `.env`
- [ ] Test login thành công

---

## 🎉 Hoàn tất!

Sau khi setup xong, user có thể:
- Đăng nhập với Microsoft account
- Không cần nhập username/password
- Chỉ cần click nút "Đăng nhập với Microsoft"

---

## 📞 Support

Nếu gặp vấn đề:
1. Xem file `MICROSOFT_OAUTH_SETUP.md` (English)
2. Chạy `node setup-microsoft-oauth.js` để kiểm tra
3. Check server logs để xem lỗi cụ thể
