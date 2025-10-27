# 📊 Trạng thái Meeting Approval

## ✅ Đã hoàn thành:
1. ✅ Tạo user thư ký: `nga103@gmail.com` / `Dung03@@`
2. ✅ Thêm trường `generalApproval` vào Meeting model
3. ✅ Tạo API endpoints: GET `/pending-approval`, PUT `/:id/approval`
4. ✅ Tạo trang MeetingApprovals.jsx
5. ✅ Thêm menu "Phê duyệt cuộc họp" vào sidebar
6. ✅ Update logic: Tự động set `generalApproval.status = 'pending'` khi tạo cuộc họp có phòng
7. ✅ Update 2 cuộc họp cũ thành pending

## 📋 Cuộc họp đang chờ phê duyệt:
1. **họp test** (ID: 68ff2e15976cacaf34f63bef)
   - Organizer: Phạm Tuấn Dũng
   - Room: 101

2. **họp** (ID: 68f88d41644c025eb40f7622)
   - Organizer: Phạm Tuấn Dũng
   - Room: 101

## 🔧 Cần làm:
1. **Khởi động lại server** để áp dụng thay đổi
2. Test endpoint: Đăng nhập admin → Vào menu "Phê duyệt cuộc họp"
3. Phê duyệt/từ chối cuộc họp

## 📝 Endpoints:
- `GET /api/meetings/pending-approval` - Lấy danh sách chờ phê duyệt (admin/manager only)
- `PUT /api/meetings/:id/approval` - Phê duyệt/từ chối (body: `{ status: 'approved'/'rejected', note?: string }`)

## 🐛 Debugging:
Nếu vẫn lỗi 500, check:
1. Server có khởi động lại chưa?
2. Console log của server có error gì không?
3. User đăng nhập có role admin/manager không?

