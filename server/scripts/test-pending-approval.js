const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const MeetingRoom = require('../models/MeetingRoom');
require('dotenv').config();

async function testPendingApproval() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/meeting-management';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 Testing query...');
    
    const meetings = await Meeting.find({
      'generalApproval.status': 'pending'
    })
    .populate('organizer', 'fullName email avatar')
    .populate('secretary', 'fullName email avatar')
    .populate('room', 'name location')
    .sort({ createdAt: -1 });

    console.log(`✅ Tìm thấy ${meetings.length} cuộc họp chờ phê duyệt\n`);

    if (meetings.length > 0) {
      console.log('📋 Chi tiết cuộc họp:');
      meetings.forEach((m, i) => {
        console.log(`${i + 1}. ${m.title}`);
        console.log(`   - Status: ${m.generalApproval.status}`);
        console.log(`   - Organizer: ${m.organizer?.fullName || 'N/A'}`);
        console.log(`   - Room: ${m.room?.name || 'N/A'}`);
        console.log(`   - ID: ${m._id}`);
        console.log('');
      });
    } else {
      console.log('⚠️ Không có cuộc họp nào cần phê duyệt');
      
      // List all meetings
      const allMeetings = await Meeting.find({}).limit(5).select('title generalApproval room');
      console.log('\n📋 Danh sách tất cả cuộc họp (5 mới nhất):');
      allMeetings.forEach((m, i) => {
        console.log(`${i + 1}. ${m.title}`);
        console.log(`   - General Approval: ${JSON.stringify(m.generalApproval)}`);
        console.log(`   - Room: ${m.room || 'N/A'}`);
        console.log('');
      });
    }

    await mongoose.connection.close();
    console.log('✅ Đã đóng kết nối MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Lỗi:', error);
    console.error('Stack:', error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

testPendingApproval();

