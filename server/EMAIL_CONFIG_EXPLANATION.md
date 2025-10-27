# Giải Thích Cấu Hình Email

## ✅ EMAIL_USER và EMAIL_PASS phải khớp nhau!

### EMAIL_USER
- Là địa chỉ Gmail **đầy đủ** của bạn
- Ví dụ: `duongpham@gmail.com` hoặc `yourname@gmail.com`

### EMAIL_PASS  
- Là **App Password** (16 ký tự) mà bạn tạo từ email đó
- Không phải mật khẩu Gmail thông thường
- Là App Password riêng biệt

## 🔗 Chúng Phải Khớp Nhau

```
EMAIL_USER = duongpham@gmail.com
EMAIL_PASS = dcvo vjrs yxir tyuz  (App Password từ duongpham@gmail.com)
```

## ❌ SAI - Không Khớp
```
EMAIL_USER = duongpham@gmail.com
EMAIL_PASS = 1234 5678 abcd efgh  (App Password từ email khác)
```
→ Sẽ báo lỗi authentication failed

## ✅ ĐÚNG - Khớp Nhau
```
EMAIL_USER = duongpham@gmail.com
EMAIL_PASS = dcvo vjrs yxir tyuz  (App Password từ chính duongpham@gmail.com)
```
→ Hoạt động tốt!

## 📝 Checklist

1. ✅ Email nào tạo App Password → Dùng email đó cho EMAIL_USER
2. ✅ Copy App Password từ email đó → Dùng cho EMAIL_PASS
3. ✅ Cả 2 phải từ cùng 1 Gmail account

## 💡 Ví Dụ Cụ Thể

Nếu bạn dùng email: `dungpham03.hg@gmail.com`

Thì file `.env` sẽ là:
```env
EMAIL_USER=dungpham03.hg@gmail.com
EMAIL_PASS=dcvojrsyxirtyuz  (App Password từ dungpham03.hg@gmail.com)
```

## ⚠️ Lưu Ý

- App Password chỉ dùng được với email đã tạo nó
- Không thể dùng App Password của email A cho email B
- Nếu thay đổi email, phải tạo App Password mới

