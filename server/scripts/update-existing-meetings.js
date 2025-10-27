const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');
require('dotenv').config();

async function updateExistingMeetings() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/meeting-management';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Find meetings that have room but no generalApproval
    const meetings = await Meeting.find({
      room: { $exists: true, $ne: null },
      $or: [
        { generalApproval: { $exists: false } },
        { 'generalApproval.status': 'not_required' }
      ]
    });

    console.log(`📋 Tìm thấy ${meetings.length} cuộc họp cần cập nhật`);

    let updated = 0;
    for (const meeting of meetings) {
      // Check if meeting has room
      if (meeting.room) {
        // Update generalApproval to pending
        meeting.generalApproval = {
          status: 'pending',
          requestedAt: meeting.createdAt || new Date()
        };
        await meeting.save();
        updated++;
        console.log(`✅ Đã cập nhật cuộc họp: ${meeting.title} (ID: ${meeting._id})`);
      }
    }

    console.log(`✅ Đã cập nhật ${updated}/${meetings.length} cuộc họp`);

    await mongoose.connection.close();
    console.log('✅ Đã đóng kết nối MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

updateExistingMeetings();

