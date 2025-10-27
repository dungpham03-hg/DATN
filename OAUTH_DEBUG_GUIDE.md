# Hướng dẫn Debug OAuth Flow

## ✅ **Trạng thái hiện tại:**
- Server: ✅ Đang chạy tại `http://localhost:5000`
- Client: ✅ Đang chạy tại `http://localhost:3000`
- OAuth Routes: ✅ Hoạt động bình thường
- OAuth Callback: ✅ Route tồn tại và hoạt động

## 🔍 **Cách debug lỗi "Unauthorized":**

### 1. **Kiểm tra Browser Console:**
- Mở Developer Tools (F12)
- Vào tab Console
- Thử đăng nhập bằng OAuth
- Xem có lỗi gì trong console không

### 2. **Kiểm tra Network Tab:**
- Vào tab Network trong Developer Tools
- Thử đăng nhập bằng OAuth
- Xem các request đến server
- Kiểm tra response status và error messages

### 3. **Kiểm tra OAuth Flow:**
1. Truy cập `http://localhost:3000/login`
2. Click "Đăng nhập bằng Google" hoặc "Đăng nhập bằng GitHub"
3. Hoàn thành quá trình OAuth trên trang của nhà cung cấp
4. Kiểm tra URL redirect về callback
5. Xem có lỗi gì trong quá trình xử lý callback không

### 4. **Kiểm tra Server Logs:**
- Xem terminal chạy server
- Kiểm tra có lỗi gì khi xử lý OAuth callback không

## 🛠️ **Các bước khắc phục:**

### Nếu lỗi xảy ra ở bước OAuth redirect:
- Kiểm tra OAuth credentials trong file `.env`
- Đảm bảo callback URL đúng trong OAuth app settings

### Nếu lỗi xảy ra ở bước callback:
- Kiểm tra OAuthCallback component
- Kiểm tra AuthContext login function
- Kiểm tra token validation

### Nếu lỗi "Unauthorized" xuất hiện:
- Kiểm tra JWT token có hợp lệ không
- Kiểm tra user data có đầy đủ không
- Kiểm tra API endpoint `/auth/me` có hoạt động không

## 📝 **Test Commands:**

```bash
# Test OAuth routes
node test-oauth.js

# Test OAuth callback
node test-oauth-callback.js

# Test server health
curl http://localhost:5000/api/auth/health
```

## 🎯 **Kết luận:**
OAuth infrastructure đã hoạt động tốt. Lỗi "Unauthorized" có thể do:
1. Token không hợp lệ
2. User data không đầy đủ
3. API endpoint có vấn đề
4. Browser cache issues

Hãy kiểm tra browser console để xem chi tiết lỗi!
