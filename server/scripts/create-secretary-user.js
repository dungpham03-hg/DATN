const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

async function createSecretaryUser() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/meeting-management';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'nga103@gmail.com' });
    if (existingUser) {
      console.log('⚠️ User đã tồn tại:', existingUser.email);
      await mongoose.connection.close();
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Dung03@@', salt);

    // Create secretary user
    const secretaryUser = new User({
      fullName: 'Nguyễn Thị Nga',
      email: 'nga103@gmail.com',
      password: hashedPassword,
      role: 'secretary',
      department: 'IT',
      position: 'Thư ký',
      emailDomain: 'gmail.com',
      isFromDomainAuth: false,
      isActive: true
    });

    await secretaryUser.save();
    console.log('✅ Đã tạo user thư ký thành công!');
    console.log('📧 Email:', secretaryUser.email);
    console.log('👤 Tên:', secretaryUser.fullName);
    console.log('🏢 Phòng ban:', secretaryUser.department);
    console.log('📝 Vai trò:', secretaryUser.role);

    await mongoose.connection.close();
    console.log('✅ Đã đóng kết nối MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

createSecretaryUser();

