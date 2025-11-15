const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');
const Minutes = require('../models/Minutes');
const FollowUp = require('../models/FollowUp');
const User = require('../models/User');
const MeetingRoom = require('../models/MeetingRoom');

require('dotenv').config();

/**
 * Seed complete data for Reports testing
 * - Meetings
 * - Minutes
 * - FollowUps/Tasks
 */

async function seedCompleteData() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/meeting-management';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // 1. Get users
    console.log('\n📋 Lấy danh sách users...');
    const users = await User.find().limit(10);
    
    if (users.length < 2) {
      console.log('❌ Cần ít nhất 2 users trong database');
      console.log('💡 Chạy: npm run seed:users trước');
      process.exit(1);
    }

    console.log(`✅ Tìm thấy ${users.length} users`);

    // Get specific roles
    const admins = users.filter(u => u.role === 'admin');
    const secretaries = users.filter(u => u.role === 'secretary');
    const managers = users.filter(u => u.role === 'manager');
    const employees = users.filter(u => u.role === 'employee');

    const creator = admins[0] || users[0];
    const secretary = secretaries[0] || users[1];
    const organizer = managers[0] || users[0];

    console.log(`👤 Creator: ${creator.fullName}`);
    console.log(`📝 Secretary: ${secretary.fullName}`);
    console.log(`🎯 Organizer: ${organizer.fullName}`);

    // 2. Create/Get rooms
    console.log('\n🏢 Kiểm tra phòng họp...');
    let rooms = await MeetingRoom.find();
    
    if (rooms.length === 0) {
      console.log('📝 Tạo phòng họp mẫu...');
      rooms = await MeetingRoom.create([
        { name: 'Phòng 101', capacity: 10, location: { building: 'A', floor: '1' }, isActive: true },
        { name: 'Phòng A2-103', capacity: 20, location: { building: 'A2', floor: '1' }, isActive: true }
      ]);
      console.log(`✅ Đã tạo ${rooms.length} phòng họp`);
    }

    // 3. Create Meetings
    console.log('\n📅 Tạo cuộc họp mẫu...');
    
    const now = new Date();
    const meetingsData = [];

    // Meetings trong 6 tháng qua
    for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
      for (let i = 0; i < 5; i++) {
        const startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - monthOffset);
        startDate.setDate(Math.floor(Math.random() * 28) + 1);
        startDate.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setHours(startDate.getHours() + 1 + Math.floor(Math.random() * 2));

        const priorities = ['low', 'medium', 'high', 'urgent'];
        const statuses = ['completed', 'completed', 'completed', 'scheduled', 'cancelled'];

        meetingsData.push({
          title: `Cuộc họp ${monthOffset * 5 + i + 1}`,
          description: `Mô tả cuộc họp số ${monthOffset * 5 + i + 1}`,
          startTime: startDate,
          endTime: endDate,
          location: rooms[i % rooms.length]?.name || 'Phòng họp',
          room: rooms[i % rooms.length]?._id,
          meetingType: i % 3 === 0 ? 'online' : 'offline',
          status: statuses[Math.floor(Math.random() * statuses.length)],
          priority: priorities[Math.floor(Math.random() * priorities.length)],
          organizer: organizer._id,
          createdBy: creator._id,
          secretary: secretary._id,
          attendees: users.slice(0, 3 + Math.floor(Math.random() * 4)).map(u => ({
            user: u._id,
            status: 'attended'
          })),
          isPrivate: false,
          department: creator.department || 'IT'
        });
      }
    }

    await Meeting.deleteMany({}); // Clear old data
    const meetings = await Meeting.create(meetingsData);
    console.log(`✅ Đã tạo ${meetings.length} cuộc họp`);

    // 4. Create Minutes cho completed meetings
    console.log('\n📄 Tạo biên bản mẫu...');
    
    const completedMeetings = meetings.filter(m => m.status === 'completed');
    const minutesData = [];

    for (let i = 0; i < completedMeetings.length; i++) {
      const meeting = completedMeetings[i];
      
      const voteDeadline = new Date(meeting.endTime);
      voteDeadline.setDate(voteDeadline.getDate() + 3);

      const statuses = ['draft', 'pending_review', 'pending_approval', 'approved', 'approved', 'approved'];
      const selectedStatus = statuses[Math.floor(Math.random() * statuses.length)];

      const minutesDoc = {
        meeting: meeting._id,
        title: `Biên bản - ${meeting.title}`,
        content: `Nội dung biên bản cuộc họp ${meeting.title}. Các vấn đề được thảo luận và quyết định...`,
        voteDeadline: voteDeadline,
        secretary: secretary._id,
        status: selectedStatus,
        isVotingClosed: selectedStatus === 'approved' || selectedStatus === 'rejected',
        isApproved: selectedStatus === 'approved',
        decisions: [
          {
            title: 'Quyết định 1',
            description: 'Mô tả quyết định',
            type: 'decision',
            status: 'pending',
            priority: 'medium'
          }
        ],
        metadata: {
          attendeeCount: meeting.attendees.length,
          requiredVoteCount: meeting.attendees.length
        }
      };

      // Add votes nếu đã approved
      if (selectedStatus === 'approved') {
        const voters = meeting.attendees.slice(0, Math.floor(meeting.attendees.length * 0.8)); // 80% vote
        minutesDoc.votes = voters.map(att => ({
          user: att.user,
          voteType: Math.random() > 0.15 ? 'agree' : (Math.random() > 0.5 ? 'agree_with_comments' : 'disagree'),
          comment: Math.random() > 0.7 ? 'Tốt, đồng ý' : '',
          votedAt: new Date(meeting.endTime.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000)
        }));
        
        minutesDoc.approvedBy = organizer._id;
        minutesDoc.approvedAt = new Date(voteDeadline.getTime() + 1000);
      }

      minutesData.push(minutesDoc);
    }

    await Minutes.deleteMany({}); // Clear old data
    const minutes = await Minutes.create(minutesData);
    console.log(`✅ Đã tạo ${minutes.length} biên bản`);

    // Update metadata for minutes
    for (const minute of minutes) {
      if (minute.votes && minute.votes.length > 0) {
        minute.metadata.receivedVoteCount = minute.votes.length;
        minute.metadata.agreeCount = minute.votes.filter(v => v.voteType === 'agree').length;
        minute.metadata.agreeWithCommentsCount = minute.votes.filter(v => v.voteType === 'agree_with_comments').length;
        minute.metadata.disagreeCount = minute.votes.filter(v => v.voteType === 'disagree').length;
        await minute.save();
      }
    }

    console.log('✅ Đã cập nhật metadata cho biên bản');

    // 5. Create FollowUps/Tasks
    console.log('\n✅ Tạo công việc/follow-ups mẫu...');
    
    const followUpsData = [];
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const statuses = ['not_started', 'in_progress', 'in_progress', 'completed', 'completed'];

    for (let i = 0; i < completedMeetings.length; i++) {
      const meeting = completedMeetings[i];
      
      // Tạo 2-4 tasks cho mỗi meeting
      const numTasks = 2 + Math.floor(Math.random() * 3);
      
      for (let j = 0; j < numTasks; j++) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const assignee = users[Math.floor(Math.random() * users.length)];
        
        const dueDate = new Date(meeting.endTime);
        dueDate.setDate(dueDate.getDate() + 7 + Math.floor(Math.random() * 14)); // 7-21 days sau meeting

        const progress = status === 'completed' ? 100 :
                        status === 'in_progress' ? 30 + Math.floor(Math.random() * 60) :
                        0;

        const taskData = {
          meeting: meeting._id,
          title: `Task ${j + 1} từ ${meeting.title}`,
          description: `Công việc cần thực hiện sau cuộc họp`,
          assignee: assignee._id,
          createdBy: creator._id,
          dueDate: dueDate,
          priority: priorities[Math.floor(Math.random() * priorities.length)],
          status: status,
          progress: progress,
          timeTracking: {
            estimatedHours: 2 + Math.floor(Math.random() * 6), // 2-8 hours
            actualHours: status === 'completed' ? 2 + Math.floor(Math.random() * 8) : 0
          }
        };

        // Add completion time for completed tasks
        if (status === 'completed') {
          taskData.completedAt = new Date(dueDate.getTime() - Math.random() * 3 * 24 * 60 * 60 * 1000);
          taskData.timeTracking.completedAt = taskData.completedAt;
          taskData.timeTracking.startedAt = new Date(meeting.endTime.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000);
        }

        // Add subtasks ngẫu nhiên
        if (Math.random() > 0.5) {
          taskData.subtasks = [
            {
              title: 'Subtask 1',
              completed: status === 'completed' || Math.random() > 0.5,
              createdAt: new Date()
            },
            {
              title: 'Subtask 2',
              completed: status === 'completed' || Math.random() > 0.5,
              createdAt: new Date()
            }
          ];
        }

        followUpsData.push(taskData);
      }
    }

    await FollowUp.deleteMany({}); // Clear old data
    const followUps = await FollowUp.create(followUpsData);
    console.log(`✅ Đã tạo ${followUps.length} công việc/follow-ups`);

    // Summary
    console.log('\n📊 TỔNG KẾT:');
    console.log(`✅ Meetings: ${meetings.length}`);
    console.log(`✅ Minutes: ${minutes.length}`);
    console.log(`✅ FollowUps: ${followUps.length}`);
    console.log(`✅ Users: ${users.length}`);
    console.log(`✅ Rooms: ${rooms.length}`);

    console.log('\n🎉 SEED DATA HOÀN TẤT!');
    console.log('\n💡 Bây giờ refresh trang Reports để xem dữ liệu:');
    console.log('   http://localhost:3000/reports');

    await mongoose.connection.close();
    console.log('\n✅ Đã đóng kết nối MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedCompleteData();

