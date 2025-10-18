# Hướng dẫn Phát triển - Ứng dụng Quản lý Cuộc họp

## Tổng quan
Dự án được xây dựng theo mô hình MERN Stack với cấu trúc monorepo:
- **Backend**: Node.js + Express.js + MongoDB
- **Frontend**: React.js + Bootstrap
- **Authentication**: JWT với refresh token
- **Database**: MongoDB với Mongoose ODM

## Cấu trúc Dự án

```
meeting-management-app/
├── client/                 # React Frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Shared components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   ├── utils/          # Utility functions
│   │   └── index.js
│   └── package.json
├── server/                 # Express Backend
│   ├── middleware/         # Custom middleware
│   ├── models/            # Mongoose models
│   ├── routes/            # API routes
│   ├── utils/             # Helper functions
│   ├── index.js           # Server entry point
│   └── package.json
├── docs/                  # Documentation
├── package.json           # Root package.json
└── README.md
```

## Cài đặt và Chạy Dự án

### 1. Cài đặt Dependencies

```bash
# Cài đặt dependencies cho cả frontend và backend
npm run install-all

# Hoặc cài đặt riêng lẻ
npm run install-server    # Backend dependencies
npm run install-client    # Frontend dependencies
```

### 2. Cấu hình Môi trường

Tạo file `.env` trong thư mục `server/` với nội dung:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/meeting_management

# JWT Secret (tạo chuỗi ngẫu nhiên 32+ ký tự)
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters

# Server Configuration
PORT=5000
NODE_ENV=development

# Email Configuration (tùy chọn)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Frontend URL
CLIENT_URL=http://localhost:3000
```

### 3. Thiết lập MongoDB

#### Option 1: MongoDB Atlas (Khuyến nghị)
1. Tạo tài khoản tại [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Tạo cluster miễn phí
3. Tạo database user
4. Whitelist IP (0.0.0.0/0 cho development)
5. Copy connection string vào `MONGODB_URI`

#### Option 2: MongoDB Local
```bash
# Cài đặt MongoDB Community
# Windows: Download từ mongodb.com
# macOS: brew install mongodb-community
# Linux: sudo apt install mongodb

# Start MongoDB service
mongod --dbpath /path/to/data/directory
```

### 4. Chạy Ứng dụng

```bash
# Chạy cả frontend và backend
npm run dev

# Hoặc chạy riêng lẻ
npm run server    # Backend trên port 5000
npm run client    # Frontend trên port 3000
```

## Kế hoạch Phát triển Theo Tuần

### ✅ Tuần 1: Thiết lập và Xác thực (HOÀN THÀNH)
- [x] Cấu trúc dự án MERN Stack
- [x] Models: User, Meeting (cơ bản)
- [x] Authentication API (register, login, profile)
- [x] JWT middleware và phân quyền
- [x] React routing và AuthContext
- [x] UI/UX cơ bản với Bootstrap

### 🔄 Tuần 2: Lập lịch và Giao diện (ĐANG THỰC HIỆN)
- [ ] Hoàn thiện Meeting API (CRUD)
- [ ] Form tạo/chỉnh sửa cuộc họp
- [ ] Danh sách cuộc họp với filter/search
- [ ] Calendar view
- [ ] Responsive design

### 📅 Tuần 3: Agenda và Thông báo
- [ ] Agenda model và API
- [ ] Meeting agenda management
- [ ] Email notification system
- [ ] In-app notifications
- [ ] Meeting reminders

### 📅 Tuần 4: Biên bản và File sharing
- [ ] Minutes model và API
- [ ] Meeting minutes editor
- [ ] File upload/download
- [ ] Document management
- [ ] Integration testing

### 📅 Tuần 5: Deployment và Testing
- [ ] Deploy backend (Heroku/Railway)
- [ ] Deploy frontend (Vercel/Netlify)
- [ ] User acceptance testing
- [ ] Performance optimization

### 📅 Tuần 6: Hoàn thiện và Search
- [ ] Search functionality
- [ ] Advanced filters
- [ ] Dashboard analytics
- [ ] Final documentation
- [ ] Presentation preparation

## API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Thông tin user hiện tại
- `PUT /api/auth/profile` - Cập nhật profile
- `POST /api/auth/change-password` - Đổi mật khẩu

### Meetings (Đang phát triển)
- `GET /api/meetings` - Danh sách cuộc họp
- `POST /api/meetings` - Tạo cuộc họp
- `GET /api/meetings/:id` - Chi tiết cuộc họp
- `PUT /api/meetings/:id` - Cập nhật cuộc họp
- `DELETE /api/meetings/:id` - Xóa cuộc họp
- `PUT /api/meetings/:id/respond` - Phản hồi lời mời

### Agenda, Notifications, Minutes, Files
*(Sẽ phát triển trong các tuần tiếp theo)*

## Công nghệ và Thư viện

### Backend
- **Express.js** - Web framework
- **Mongoose** - MongoDB ODM
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **express-validator** - Input validation
- **multer** - File upload
- **nodemailer** - Email sending
- **helmet** - Security headers
- **cors** - Cross-origin requests

### Frontend
- **React 18** - UI library
- **React Router** - Client-side routing
- **Bootstrap 5** - CSS framework
- **React Bootstrap** - Bootstrap components
- **Axios** - HTTP client
- **React Icons** - Icon library
- **React Toastify** - Notifications
- **Formik & Yup** - Form handling
- **React DatePicker** - Date selection

## Testing (Sắp tới)
- **Backend**: Jest + Supertest
- **Frontend**: React Testing Library + Jest
- **E2E**: Cypress (tùy chọn)

## Deployment (Tuần 5)
- **Backend**: Heroku, Railway, hoặc server riêng
- **Frontend**: Vercel, Netlify
- **Database**: MongoDB Atlas
- **CDN**: Cloudinary (cho file uploads)

## Best Practices

### Code Style
- ESLint configuration
- Prettier code formatting
- Consistent naming conventions
- Component và function documentation

### Security
- Environment variables cho sensitive data
- Input validation và sanitization
- Rate limiting
- CORS configuration
- Helmet security headers

### Performance
- Lazy loading components
- Image optimization
- Database indexing
- Caching strategies

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   ```bash
   # Kiểm tra connection string và network access
   # Đảm bảo IP được whitelist trên Atlas
   ```

2. **JWT Token Expired**
   ```bash
   # Implement automatic token refresh
   # Hoặc đăng nhập lại
   ```

3. **CORS Error**
   ```bash
   # Kiểm tra CLIENT_URL trong .env
   # Đảm bảo proxy setting trong client/package.json
   ```

4. **Port Already in Use**
   ```bash
   # Thay đổi PORT trong .env
   # Hoặc kill process đang sử dụng port
   lsof -ti:5000 | xargs kill -9
   ```

## Contributing

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## Support

- **Email**: your.email@gmail.com
- **Documentation**: `/docs` directory
- **Issues**: GitHub Issues section 