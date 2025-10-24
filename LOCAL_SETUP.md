# Hướng dẫn chạy ứng dụng trên Local

## Yêu cầu

- Node.js (v14 trở lên)
- MongoDB (cài đặt local hoặc sử dụng MongoDB Atlas)
- npm hoặc yarn

## Bước 1: Cài đặt MongoDB (nếu chưa có)

### Option 1: MongoDB Local
1. Tải MongoDB Community Edition tại: https://www.mongodb.com/try/download/community
2. Cài đặt và chạy MongoDB
3. Mặc định MongoDB sẽ chạy trên `mongodb://localhost:27017`

### Option 2: MongoDB Atlas (Cloud - Miễn phí)
1. Đăng ký tài khoản tại: https://www.mongodb.com/cloud/atlas/register
2. Tạo cluster miễn phí
3. Lấy connection string

## Bước 2: Cấu hình file .env

File `.env` đã có sẵn trong thư mục gốc. Kiểm tra và điều chỉnh nếu cần:

```env
# Database - Chọn 1 trong 2:
# MongoDB Local:
MONGODB_URI=mongodb://localhost:27017/meeting_management

# MongoDB Atlas (nếu dùng cloud):
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/meeting_management

# Server
PORT=5000
NODE_ENV=development

# Frontend
CLIENT_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
DOMAIN_URL=http://localhost:3000

# React App
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000

# JWT Secret (giữ nguyên)
JWT_SECRET=local_development_secret_key_minimum_32_characters_long_12345
```

## Bước 3: Cài đặt dependencies

```bash
# Cài đặt dependencies cho server
cd server
npm install

# Cài đặt dependencies cho client
cd ../client
npm install
```

## Bước 4: Chạy ứng dụng

### Chạy Server (Terminal 1)

```bash
cd server
npm start
# hoặc
node index.js
```

Server sẽ chạy tại: http://localhost:5000

### Chạy Client (Terminal 2)

```bash
cd client
npm start
```

Client sẽ tự động mở tại: http://localhost:3000

## Bước 5: Tạo dữ liệu mẫu (Optional)

```bash
cd server
node scripts/seed.js
```

## Kiểm tra

1. Mở trình duyệt: http://localhost:3000
2. Đăng ký tài khoản mới hoặc đăng nhập
3. Bắt đầu sử dụng!

## Troubleshooting

### Lỗi: MongoDB connection error
- **Giải pháp**: Đảm bảo MongoDB đang chạy:
  ```bash
  # Windows (Command Prompt):
  net start MongoDB
  
  # Hoặc kiểm tra trong Services (services.msc)
  ```

### Lỗi: Port 5000 đã được sử dụng
- **Giải pháp**: Thay đổi PORT trong file `.env`:
  ```env
  PORT=5001
  ```

### Lỗi: Port 3000 đã được sử dụng
- **Giải pháp**: React sẽ tự hỏi bạn có muốn dùng port khác không (thường là 3001)

### Lỗi: CORS
- **Giải pháp**: Đảm bảo `NODE_ENV=development` trong file `.env`

### Lỗi: Cannot find module
- **Giải pháp**: 
  ```bash
  # Xóa node_modules và cài lại
  rm -rf node_modules package-lock.json
  npm install
  ```

## Scripts hữu ích

### Server
```bash
cd server
npm start              # Chạy server
node scripts/seed.js   # Tạo dữ liệu mẫu
npm test              # Chạy tests
```

### Client
```bash
cd client
npm start                    # Chạy development server
npm run build               # Build production
npm test                    # Chạy unit tests
npm run test:coverage       # Test với coverage
npm run cypress:open        # Mở Cypress E2E tests
```

## Cấu trúc thư mục

```
DATN/
├── server/               # Backend (Node.js + Express)
│   ├── config/          # Cấu hình
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Middleware
│   ├── utils/           # Utilities
│   └── index.js         # Entry point
├── client/              # Frontend (React)
│   ├── public/          # Static files
│   └── src/             # Source code
│       ├── components/  # React components
│       ├── pages/       # Pages
│       ├── contexts/    # Context API
│       └── utils/       # Utilities
└── .env                 # Environment variables
```

## Tính năng chính

1. **Quản lý cuộc họp**: Tạo, sửa, xóa cuộc họp
2. **Biên bản họp**: Tạo và quản lý biên bản
3. **Thông báo**: Nhận thông báo real-time qua Socket.IO
4. **Lưu trữ**: Tự động lưu trữ cuộc họp đã hoàn thành
5. **Thống kê**: Dashboard với biểu đồ thống kê
6. **Phòng họp**: Quản lý phòng họp và booking

## Lưu ý

- Trong môi trường development, CORS đã được cấu hình để cho phép tất cả localhost
- Server tự động cập nhật trạng thái cuộc họp mỗi phút
- Socket.IO được dùng cho real-time notifications và chat
- Upload files được lưu trong thư mục `server/uploads/`

## Hỗ trợ

Nếu gặp vấn đề, hãy kiểm tra:
1. MongoDB đang chạy
2. File `.env` đã được cấu hình đúng
3. Tất cả dependencies đã được cài đặt
4. Port 5000 và 3000 không bị chiếm dụng

