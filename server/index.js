const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const passport = require('passport');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Meeting = require('./models/Meeting');
const Archive = require('./models/Archive');
const Minutes = require('./models/Minutes');
const Notification = require('./models/Notification');
const cron = require('node-cron');
const User = require('./models/User');
const { cleanupOldNotifications } = require('./utils/notificationHelper');


// Load environment variables
dotenv.config();

// Nếu vẫn chưa có MONGODB_URI (chạy từ thư mục server), thử load file .env ở thư mục gốc dự án
if (!process.env.MONGODB_URI) {
  const rootEnvPath = path.resolve(__dirname, '../.env');
  dotenv.config({ path: rootEnvPath });
}

// Import passport config
require('./config/passport');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(passport.initialize());

// Connect to MongoDB với cấu hình SSL/TLS phù hợp
const mongoOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  retryWrites: true,
  w: 'majority',
  // Cấu hình TLS để tránh lỗi SSL
  tls: true,
  tlsAllowInvalidCertificates: true,
  tlsAllowInvalidHostnames: true
};

mongoose.connect(process.env.MONGODB_URI, mongoOptions)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
    // Test connection bằng cách tạo một simple query
    return mongoose.connection.db.admin().ping();
  })
  .then(() => {
    console.log('✅ MongoDB ping successful - Database ready!');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('🔄 Trying simplified connection config...');
    
    // Thử với config đơn giản hơn
    const fallbackOptions = {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 30000,
      retryWrites: true
    };
    
    setTimeout(() => {
      mongoose.connect(process.env.MONGODB_URI, fallbackOptions)
        .then(() => console.log('✅ MongoDB connected with fallback config'))
        .catch(retryErr => {
          console.error('❌ All connection attempts failed:', retryErr.message);
          console.log('💡 Please check your MONGODB_URI in environment variables');
        });
    }, 2000);
  });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/meetings', require('./routes/meetings'));
app.use('/api/minutes', require('./routes/minutes'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/meeting-rooms', require('./routes/meetingRooms'));
app.use('/api/archives', require('./routes/archives'));
app.use('/api/protocols', require('./routes/protocols'));
app.use('/api/users', require('./routes/users'));

// Serve uploaded files
const uploadPath = process.env.UPLOAD_PATH || 'uploads';
app.use('/uploads', express.static(path.join(__dirname, uploadPath)));

// Serve static files from the React app (only if build folder exists)
const buildPath = path.join(__dirname, '../client/build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  
  // The "catchall" handler: for any request that doesn't match API routes,
  // send back React's index.html file.
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  // If no build folder (separate deployment), just handle API routes
  app.get('*', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Đã xảy ra lỗi!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Lưu io instance vào app để sử dụng trong routes
app.set('io', io);

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers['authorization']?.split(' ')[1];
    if (!token) return next(new Error('Authentication error'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  // Join user's personal room để nhận notifications
  if (socket.userId) {
    socket.join(`user_${socket.userId}`);
  }

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    // Silent disconnect
  });

  // Handle errors
  socket.on('error', (error) => {
    // Silent error handling
  });

  socket.on('joinMeeting', (meetingId) => {
    if (meetingId) {
      socket.join(meetingId);
    }
  });

  socket.on('leaveMeeting', (meetingId) => {
    if (meetingId) {
      socket.leave(meetingId);
    }
  });

  socket.on('meetingMessage', async ({ meetingId, text }) => {
    try {
      if (!meetingId || !text?.trim()) return;
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) return;

      const newMsg = { sender: socket.userId, text: text.trim() };
      meeting.messages.push(newMsg);
      await meeting.save();

      const populated = await Meeting.findById(meetingId).select('messages').populate('messages.sender', 'fullName email avatar');
      const msgPop = populated.messages[populated.messages.length - 1];

      io.to(meetingId).emit('newMeetingMessage', msgPop);
    } catch (e) {
      socket.emit('error', { message: 'Lỗi khi gửi tin nhắn' });
    }
  });
});

// Cron: mỗi phút kiểm tra và cập nhật trạng thái cuộc họp
cron.schedule('*/1 * * * *', async () => {
  try {
    const now = new Date();
    
    // 1. Cập nhật status cuộc họp bắt đầu (từ scheduled -> ongoing)
    const startedMeetings = await Meeting.find({ 
      startTime: { $lte: now }, 
      endTime: { $gt: now },
      status: 'scheduled' 
    });
    
    for (const meeting of startedMeetings) {
      meeting.status = 'ongoing';
      await meeting.save();
    }
    
    // Silent update

    // 2. Cập nhật status cuộc họp đã kết thúc (từ scheduled/ongoing -> completed)
    const endedMeetings = await Meeting.find({ 
      endTime: { $lte: now }, 
      status: { $in: ['scheduled', 'ongoing'] } 
    });
    
    for (const meeting of endedMeetings) {
      meeting.status = 'completed';
      await meeting.save();
    }
    
    // Silent update

    // 3. Tự động lưu trữ tất cả cuộc họp completed chưa có archive
    const completedMeetings = await Meeting.find({ 
      status: 'completed' 
    }).populate('organizer', 'fullName email department position')
      .populate('secretary', 'fullName email department position')
      .populate('attendees.user', 'fullName email department position')
      .populate('minutes')
      .populate('notes.author', 'fullName email')
      .populate('summaryMessages.author', 'fullName email');

    // Silent processing

    for (const meeting of completedMeetings) {
      try {
        // Kiểm tra đã có archive chưa
        const existingArchive = await Archive.findOne({ meeting: meeting._id });
        if (existingArchive) {
          continue; // Đã có archive rồi, bỏ qua
        }

        // Creating archive

        // Lấy thông tin biên bản nếu có
        let minutesSnapshot = null;
        if (meeting.minutes) {
          const minutes = await Minutes.findById(meeting.minutes)
            .populate('secretary', 'fullName email')
            .populate('approvedBy', 'fullName email')
            .populate('decisions.responsible', 'fullName email')
            .populate('votes.user', 'fullName email');
          
          if (minutes) {
            minutesSnapshot = {
              _id: minutes._id,
              title: minutes.title,
              content: minutes.content,
              status: minutes.status,
              decisions: minutes.decisions || [],
              votes: minutes.votes || [],
              voteDeadline: minutes.voteDeadline,
              isVotingClosed: minutes.isVotingClosed,
              isApproved: minutes.isApproved,
              approvedBy: minutes.approvedBy,
              approvedAt: minutes.approvedAt,
              secretary: minutes.secretary
            };
          }
        }

        // Tạo archive đơn giản
        const archiveData = {
          meeting: meeting._id,
          title: `Lưu trữ - ${meeting.title}`,
          description: `Lưu trữ tự động cho cuộc họp "${meeting.title}"`,
          archiveType: 'complete',
          meetingSnapshot: {
            title: meeting.title,
            description: meeting.description || '',
            startTime: meeting.startTime,
            endTime: meeting.endTime,
            actualEndTime: meeting.actualEndTime,
            location: meeting.location || '',
            meetingType: meeting.meetingType || 'offline',
            status: meeting.status,
            priority: meeting.priority || 'medium',
            department: meeting.department || '',
            organizer: meeting.organizer ? {
              _id: meeting.organizer._id,
              fullName: meeting.organizer.fullName,
              email: meeting.organizer.email,
              department: meeting.organizer.department
            } : null,
            secretary: meeting.secretary ? {
              _id: meeting.secretary._id,
              fullName: meeting.secretary.fullName,
              email: meeting.secretary.email,
              department: meeting.secretary.department
            } : null,
            attendees: meeting.attendees ? meeting.attendees.map(att => ({
              user: {
                _id: att.user._id,
                fullName: att.user.fullName,
                email: att.user.email,
                department: att.user.department
              },
              status: att.status,
              responseDate: att.responseDate
            })) : [],
            attendeeCount: meeting.attendees ? meeting.attendees.length : 0,
            duration: Math.round((meeting.endTime - meeting.startTime) / (1000 * 60))
          },
          minutesSnapshot,
          documents: [],
          summary: {
            text: meeting.summary || '',
            keyPoints: [],
            actionItems: [],
            nextSteps: ''
          },
          notifications: [],
          // Lưu summary messages (tóm tắt chi tiết)
          summaryMessages: meeting.summaryMessages ? meeting.summaryMessages.map(msg => ({
            text: msg.text || '',
            author: msg.author ? {
              _id: msg.author._id,
              fullName: msg.author.fullName || '',
              email: msg.author.email || ''
            } : null,
            attachments: msg.attachments || [],
            createdAt: msg.createdAt
          })) : [],
          // Lưu notes/ghi chú trong archive model
          notes: meeting.notes ? meeting.notes.map(note => ({
            text: note.text || '',
            author: note.author ? {
              _id: note.author._id,
              fullName: note.author.fullName || '',
              email: note.author.email || ''
            } : null,
            createdAt: note.createdAt,
            isImportant: note.isImportant || false
          })) : [],
          tags: meeting.tags || [],
          access: {
            isPublic: true, // Tạm thời để public để dễ test
            allowedDepartments: meeting.department ? [meeting.department] : []
          },
          createdBy: meeting.organizer ? meeting.organizer._id : null,
          statistics: {
            totalDocuments: 0,
            totalSize: 0
          }
        };

        // Thêm documents an toàn
        if (meeting.attachments && Array.isArray(meeting.attachments)) {
          archiveData.documents = meeting.attachments.map(att => ({
            name: att.name || 'Unknown file',
            originalPath: att.path || '',
            archivePath: att.path || '',
            size: att.size || 0,
            type: 'meeting_attachment',
            uploadedBy: att.uploadedBy,
            uploadedAt: att.uploadedAt
          }));
          archiveData.statistics.totalDocuments = meeting.attachments.length;
          archiveData.statistics.totalSize = meeting.attachments.reduce((sum, att) => sum + (att.size || 0), 0);
        }

        // Tạo archive
        const newArchive = await Archive.create(archiveData);

      } catch (archiveError) {
        // Silent error handling
      }
    }

    // 4. Revert temporary secretary roles
    const expiredUsers = await User.find({ temporaryRoleExpiresAt: { $lte: now } });
    for (const u of expiredUsers) {
      u.role = u.originalRole || 'employee';
      u.originalRole = undefined;
      u.temporaryRoleExpiresAt = undefined;
      await u.save();
    }

  } catch (e) {
    // Silent error handling
  }
});

// Cron: mỗi ngày lúc 2:00 AM cleanup notifications cũ
cron.schedule('0 2 * * *', async () => {
  try {
    await cleanupOldNotifications(30); // Xóa notifications đã đọc cũ hơn 30 ngày
  } catch (error) {
    // Silent error handling
  }
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 