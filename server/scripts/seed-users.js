const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const sampleUsers = [
  {
    fullName: 'Nguyễn Văn Admin',
    email: 'admin@company.com',
    password: '123456',
    role: 'admin',
    department: 'IT',
    position: 'Quản trị viên hệ thống',
    phone: '0123456789',
    isActive: true
  },
  {
    fullName: 'Trần Thị Manager',
    email: 'manager@company.com',
    password: '123456',
    role: 'manager',
    department: 'Kinh doanh',
    position: 'Trưởng phòng Kinh doanh',
    phone: '0987654321',
    isActive: true
  },
  {
    fullName: 'Lê Văn Secretary',
    email: 'secretary@company.com',
    password: '123456',
    role: 'secretary',
    department: 'Hành chính',
    position: 'Thư ký Tổng giám đốc',
    phone: '0369852147',
    isActive: true
  },
  {
    fullName: 'Phạm Thị Assistant',
    email: 'assistant@company.com',
    password: '123456',
    role: 'assistant',
    department: 'Hành chính',
    position: 'Trợ lý Giám đốc',
    phone: '0741258963',
    isActive: true
  },
  {
    fullName: 'Hoàng Văn Employee',
    email: 'employee@company.com',
    password: '123456',
    role: 'employee',
    department: 'Marketing',
    position: 'Chuyên viên Marketing',
    phone: '0852369741',
    isActive: true
  },
  {
    fullName: 'Vũ Thị Sales',
    email: 'sales@company.com',
    password: '123456',
    role: 'employee',
    department: 'Kinh doanh',
    position: 'Nhân viên Kinh doanh',
    phone: '0963258741',
    isActive: true
  },
  {
    fullName: 'Đặng Văn Developer',
    email: 'dev@company.com',
    password: '123456',
    role: 'employee',
    department: 'IT',
    position: 'Lập trình viên',
    phone: '0147258963',
    isActive: true
  },
  {
    fullName: 'Bùi Thị Designer',
    email: 'designer@company.com',
    password: '123456',
    role: 'employee',
    department: 'Marketing',
    position: 'Thiết kế đồ họa',
    phone: '0258963147',
    isActive: false
  },
  {
    fullName: 'Ngô Văn Accountant',
    email: 'accountant@company.com',
    password: '123456',
    role: 'employee',
    department: 'Kế toán',
    position: 'Kế toán viên',
    phone: '0741852963',
    isActive: true
  },
  {
    fullName: 'Đinh Thị HR',
    email: 'hr@company.com',
    password: '123456',
    role: 'employee',
    department: 'Nhân sự',
    position: 'Chuyên viên Nhân sự',
    phone: '0963852741',
    isActive: true
  }
];

async function seedUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing users (optional - remove this line if you want to keep existing users)
    // await User.deleteMany({});
    // console.log('🗑️  Cleared existing users');

    // Check if users already exist
    const existingUsers = await User.find({});
    console.log(`📊 Found ${existingUsers.length} existing users`);

    // Add new users only if they don't exist
    let addedCount = 0;
    for (const userData of sampleUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`✅ Added user: ${userData.fullName} (${userData.email})`);
        addedCount++;
      } else {
        console.log(`⚠️  User already exists: ${userData.email}`);
      }
    }

    console.log(`\n🎉 Seed completed! Added ${addedCount} new users.`);
    console.log(`📈 Total users in database: ${await User.countDocuments()}`);

    // Show departments summary
    const departments = await User.distinct('department');
    console.log(`\n🏢 Departments in database: ${departments.join(', ')}`);

    // Show roles summary
    const roles = await User.distinct('role');
    console.log(`👥 Roles in database: ${roles.join(', ')}`);

  } catch (error) {
    console.error('❌ Error seeding users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seed function
seedUsers();
