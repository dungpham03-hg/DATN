# 🧪 Hướng dẫn Test Meeting Approval

## ✅ Đã hoàn thành:
1. ✅ Tạo user thư ký: `nga103@gmail.com` / `Dung03@@`
2. ✅ Cập nhật logic: Tự động set `generalApproval.status = 'pending'` khi tạo cuộc họp có chọn phòng
3. ✅ Cập nhật 1 cuộc họp cũ (có phòng) thành pending

## 🔧 Các bước test:

### 1. Test với cuộc họp đã cập nhật:
- Đăng nhập với account **admin** hoặc **manager**
- Vào menu "**Phê duyệt cuộc họp**"
- Sẽ thấy 1 cuộc họp "họp" đang chờ phê duyệt
- Click "**Phê duyệt**" hoặc "**Từ chối**"

### 2. Test tạo cuộc họp mới:
- Đăng nhập với account thư ký: `nga103@gmail.com` / `Dung03@@`
- Tạo cuộc họp mới:
  - Chọn phòng họp (không online)
  - Điền các thông tin cần thiết
  - Lưu cuộc họp
- Đăng nhập với account **admin**
- Vào "**Phê duyệt cuộc họp**"
- Sẽ thấy cuộc họp mới chờ phê duyệt

## 📝 API Endpoints:
- `GET /api/meetings/pending-approval` - Lấy danh sách chờ phê duyệt
- `PUT /api/meetings/:id/approval` - Phê duyệt/từ chối

## ⚠️ Lưu ý:
- Cuộc họp online (`meetingType: 'online'`) sẽ tự động set `generalApproval.status = 'not_required'`
- Chỉ cuộc họp offline có chọn phòng mới cần phê duyệt
- Menu "Phê duyệt cuộc họp" chỉ hiển thị cho admin và manager

