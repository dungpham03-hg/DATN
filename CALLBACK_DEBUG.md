# Debug: Callback bị redirect về login

## Vấn đề
Sau khi login xong thì lại load về trang login

## Đã sửa

### 1. Domain Validation Issue
**Vấn đề:** Hệ thống chỉ cho phép các domain được cấu hình (như `@ep.techcorp.vn`), nên email Gmail bị từ chối.

**Đã sửa:** Cho phép email bất kỳ (kể cả Gmail) sử dụng Google OAuth với role mặc định `employee`.

### 2. Thêm Logging Chi Tiết
- Log toàn bộ OAuth callback flow
- Log user object sau khi authenticate
- Log token generation
- Log redirect URL

## Cách Debug

### 1. Kiểm tra Server Logs
Khi chạy OAuth flow, bạn sẽ thấy các log này:

**Khi khởi động OAuth:**
```
🔍 Initiating Google OAuth...
📍 Request URL: http://localhost:5000/api/auth/google
```

**Trong quá trình authenticate:**
```
🔍 Google OAuth Strategy - Profile: {...}
📧 Email from profile: user@gmail.com
🔍 Existing user found: No/Yes
🔍 Domain validation: {...}
```

**Trong callback:**
```
🔄 Google OAuth Callback - START
🔄 Query params: {...}
✅ Authorization code received
👤 User object: {...}
🎫 Generated token: ...
🔄 Redirecting to: http://localhost:3000/oauth/callback?...
✅ Google OAuth Callback - SUCCESS
```

### 2. Kiểm tra Client URL
Đảm bảo `.env` có:
```
CLIENT_URL=http://localhost:3000
```

### 3. Kiểm tra Frontend Route
Đảm bảo frontend có route `/oauth/callback` để xử lý token.

## Nếu vẫn redirect về login

Kiểm tra server logs để xem lỗi cụ thể:

### Lỗi 1: "No user found"
**Nguyên nhân:** Passport không trả về user object
**Fix:** Check domain validation logs

### Lỗi 2: "Invalid user data" 
**Nguyên nhân:** User không có _id
**Fix:** Check database connection

### Lỗi 3: "Token generation failed"
**Nguyên nhân:** JWT_SECRET không đúng
**Fix:** Check `.env` file

## Test

### Step 1: Restart Server
```bash
cd server
npm run dev
```

### Step 2: Check Logs
Bạn sẽ thấy:
```
🔧 Initializing Google OAuth Strategy...
📍 Callback URL: http://localhost:5000/api/auth/google/callback
✅ Google OAuth Strategy initialized successfully
```

### Step 3: Test OAuth Flow
1. Visit: `http://localhost:5000/api/auth/google`
2. Sign in with Google
3. Watch server logs - bạn sẽ thấy toàn bộ flow

## Common Issues

### Issue 1: "Domain không được hỗ trợ"
**Log:** `❌ Domain validation failed: ...`

**Fix:** Đã sửa - bây giờ cho phép mọi domain với role mặc định

### Issue 2: "No authorization code"
**Log:** `⚠️ No authorization code in callback`

**Nguyên nhân:** Google Console redirect URI không đúng
**Fix:** 
1. Check Google Console
2. Add: `http://localhost:5000/api/auth/google/callback`

### Issue 3: "Token generation failed"
**Log:** `❌ Error in Google callback handler: ...`

**Fix:** Check `.env` có `JWT_SECRET` đúng

## Quick Test

```bash
# Terminal 1: Start server
cd server
npm run dev

# Terminal 2: Test endpoint
curl http://localhost:5000/api/auth/google
```

## Next Steps

1. Restart server
2. Try OAuth flow
3. Check server logs
4. Report specific error messages if still failing

