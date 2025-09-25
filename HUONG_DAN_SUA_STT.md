# Hướng dẫn sửa STT biên bản

## Vấn đề
Mặc dù đã sửa code backend để tạo STT mới, nhưng giao diện vẫn hiển thị ID cũ (ví dụ: `#e4d2eb`) thay vì STT mới (ví dụ: `STT-01`).

## Nguyên nhân
- Dữ liệu cũ trong database vẫn chưa được cập nhật
- Cần gọi API để refresh lại dữ liệu

## Giải pháp

### 🚀 **CÁCH NHANH NHẤT - Direct Database Update**

#### Bước 1: Chạy script direct update (Khuyến nghị)
```bash
cd e:\DATN
node direct-update-protocols.js
```

#### Bước 2: Hoặc chạy script API (nếu server đang chạy)
```bash
cd e:\DATN
node force-update-protocols.js
```

#### Bước 3: Hoặc gọi API trực tiếp
```bash
GET http://localhost:5000/api/archives/force-update-test
```

### 🔍 **CÁCH KIỂM TRA TỪNG ARCHIVE**

#### Bước 1: Kiểm tra dữ liệu hiện tại
```bash
# Truy cập URL này để xem protocolSnapshots hiện tại
GET http://localhost:5000/api/archives/test-protocols/{ARCHIVE_ID}
```

#### Bước 2: Cập nhật từng archive
```bash
# Cập nhật protocolSnapshots cho archive cụ thể
PUT http://localhost:5000/api/archives/{ARCHIVE_ID}/update-protocols-minutes
Authorization: Bearer {YOUR_TOKEN}
```

### 🌐 **CÁCH SỬ DỤNG GIAO DIỆN WEB**
1. Vào trang chi tiết archive
2. Tìm nút "Đồng bộ dữ liệu" hoặc "Sync"
3. Click để cập nhật

### Bước 3: Kiểm tra kết quả
Sau khi cập nhật, biên bản sẽ hiển thị:
- **Trước**: `Biên bản #e4d2eb`
- **Sau**: `Biên bản STT-01 (Chờ duyệt) - 11/09/2025`

## Lưu ý
- Cần có quyền admin hoặc organizer của meeting để cập nhật
- Dữ liệu sẽ được sắp xếp theo thứ tự tạo và trạng thái
- STT sẽ được format với 2 chữ số (01, 02, 03...)

## Troubleshooting
Nếu vẫn không thấy thay đổi:
1. Kiểm tra console log trong browser
2. Kiểm tra network tab để xem API response
3. Thử refresh trang hoặc clear cache
4. Kiểm tra quyền truy cập của user
