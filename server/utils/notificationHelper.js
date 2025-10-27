const Notification = require('../models/Notification');
const emailService = require('../services/emailService');

/**
 * Gửi notification với retry mechanism và error handling
 * @param {Object} io - Socket.IO instance
 * @param {Array} recipients - Danh sách user IDs nhận notification
 * @param {Object} notificationData - Dữ liệu notification
 * @param {Number} maxRetries - Số lần retry tối đa (default: 3)
 * @returns {Promise<Array>} - Kết quả gửi notification
 */
const sendNotificationWithRetry = async (io, recipients, notificationData, maxRetries = 3) => {
  const results = [];
  
  for (const recipientId of recipients) {
    let retryCount = 0;
    let success = false;
    
    while (retryCount < maxRetries && !success) {
      try {
        // Tạo notification trong database
        const notification = await Notification.create({
          ...notificationData,
          recipient: recipientId
        });
        
        // Populate sender data
        await notification.populate('sender', 'fullName email avatar position');
        
        // Gửi real-time notification
        if (io) {
          io.to(`user_${recipientId.toString()}`).emit('newNotification', notification);
        }
        
        // Gửi email notification (async, không chặn)
        emailService.sendMeetingNotification(notification).catch(err => {
          console.error('Error sending email notification:', err);
        });
        
        results.push({
          recipientId,
          success: true,
          notification,
          attempts: retryCount + 1
        });
        
        success = true;
        
      } catch (error) {
        retryCount++;
        
        if (retryCount >= maxRetries) {
          results.push({
            recipientId,
            success: false,
            error: error.message,
            attempts: retryCount
          });
        } else {
          // Exponential backoff
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }
  
  return results;
};

/**
 * Gửi bulk notifications với batch processing
 * @param {Object} io - Socket.IO instance
 * @param {Array} notifications - Mảng các notification data
 * @returns {Promise<Object>} - Kết quả gửi
 */
const sendBulkNotifications = async (io, notifications) => {
  try {
    // Tạo notifications trong database
    const createdNotifications = await Notification.insertMany(notifications);
    
    // Populate sender data cho tất cả notifications
    await Notification.populate(createdNotifications, {
      path: 'sender',
      select: 'fullName email avatar position'
    });
    
    // Gửi real-time notifications
    const socketResults = [];
    for (const notification of createdNotifications) {
      try {
        if (io) {
          io.to(`user_${notification.recipient.toString()}`).emit('newNotification', notification);
          socketResults.push({ recipientId: notification.recipient, success: true });
        }
      } catch (socketError) {
        socketResults.push({ 
          recipientId: notification.recipient, 
          success: false, 
          error: socketError.message 
        });
      }
    }
    
    return {
      database: {
        success: true,
        count: createdNotifications.length
      },
      socket: {
        results: socketResults,
        successCount: socketResults.filter(r => r.success).length,
        errorCount: socketResults.filter(r => !r.success).length
      }
    };
    
  } catch (error) {
    return {
      database: {
        success: false,
        error: error.message
      },
      socket: {
        successCount: 0,
        errorCount: notifications.length
      }
    };
  }
};

/**
 * Kiểm tra và cleanup notifications cũ
 * @param {Number} daysOld - Số ngày cũ để cleanup (default: 30)
 * @returns {Promise<Number>} - Số notifications đã xóa
 */
const cleanupOldNotifications = async (daysOld = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
      read: true
    });
    
    return result.deletedCount;
  } catch (error) {
    return 0;
  }
};

module.exports = {
  sendNotificationWithRetry,
  sendBulkNotifications,
  cleanupOldNotifications
};
