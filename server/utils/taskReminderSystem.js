const cron = require('node-cron');
const FollowUp = require('../models/FollowUp');
const Notification = require('../models/Notification');
const { sendBulkNotifications } = require('./notificationHelper');
const emailService = require('../services/emailService');

/**
 * Task Reminder System
 * Tự động gửi reminders và escalations cho tasks
 */

/**
 * Gửi reminder cho task
 */
async function sendTaskReminder(followUp, io) {
  try {
    console.log(`📧 Sending reminder for task: ${followUp.title}`);
    
    // Create notification
    const notification = await Notification.create({
      recipient: followUp.assignee,
      sender: followUp.createdBy,
      type: 'task_reminder',
      title: '⏰ Nhắc nhở công việc',
      message: `Task "${followUp.title}" sẽ đến hạn vào ${new Date(followUp.dueDate).toLocaleDateString('vi-VN')}`,
      link: `/meetings/${followUp.meeting}`,
      metadata: {
        followUpId: followUp._id,
        dueDate: followUp.dueDate,
        priority: followUp.priority
      }
    });
    
    // Send real-time notification
    if (io) {
      await notification.populate('sender', 'fullName email avatar');
      io.to(`user_${followUp.assignee.toString()}`).emit('newNotification', notification);
    }
    
    // Send email
    try {
      await emailService.sendTaskReminder({
        to: followUp.assignee.email,
        taskTitle: followUp.title,
        dueDate: followUp.dueDate,
        meetingLink: `/meetings/${followUp.meeting}`,
        priority: followUp.priority
      });
    } catch (emailError) {
      console.error('Error sending reminder email:', emailError);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Error sending task reminder:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Gửi escalation notification
 */
async function sendEscalation(followUp, io) {
  try {
    console.log(`🚨 Escalating task: ${followUp.title}`);
    
    if (!followUp.escalation.escalateTo) {
      console.log('No escalation target set');
      return { success: false, error: 'No escalation target' };
    }
    
    // Escalate task
    await followUp.escalate();
    
    // Notify escalation target
    const notification = await Notification.create({
      recipient: followUp.escalation.escalateTo,
      sender: followUp.createdBy,
      type: 'task_escalation',
      title: '🚨 Task quá hạn cần xử lý',
      message: `Task "${followUp.title}" của ${followUp.assignee.fullName} đã quá hạn ${Math.abs(followUp.daysUntilDue)} ngày`,
      link: `/meetings/${followUp.meeting}`,
      metadata: {
        followUpId: followUp._id,
        assignee: followUp.assignee._id,
        daysOverdue: Math.abs(followUp.daysUntilDue)
      }
    });
    
    // Send real-time
    if (io) {
      await notification.populate('sender', 'fullName email avatar');
      io.to(`user_${followUp.escalation.escalateTo.toString()}`).emit('newNotification', notification);
    }
    
    // Also notify assignee
    const assigneeNotification = await Notification.create({
      recipient: followUp.assignee,
      sender: followUp.createdBy,
      type: 'task_escalation',
      title: '🚨 Task của bạn đã được escalate',
      message: `Task "${followUp.title}" đã quá hạn và được escalate tới ${followUp.escalation.escalateTo.fullName}`,
      link: `/meetings/${followUp.meeting}`
    });
    
    if (io) {
      await assigneeNotification.populate('sender', 'fullName email avatar');
      io.to(`user_${followUp.assignee.toString()}`).emit('newNotification', assigneeNotification);
    }
    
    // Send emails
    try {
      await emailService.sendEscalationNotification({
        toManager: followUp.escalation.escalateTo.email,
        toAssignee: followUp.assignee.email,
        taskTitle: followUp.title,
        daysOverdue: Math.abs(followUp.daysUntilDue),
        assigneeName: followUp.assignee.fullName
      });
    } catch (emailError) {
      console.error('Error sending escalation email:', emailError);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Error escalating task:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process reminders cho các tasks
 */
async function processReminders(io) {
  try {
    const now = new Date();
    
    // Find tasks with pending reminders
    const tasks = await FollowUp.find({
      status: { $nin: ['completed', 'cancelled'] },
      'reminders': {
        $elemMatch: {
          sent: false,
          sendAt: { $lte: now }
        }
      }
    }).populate('assignee createdBy');
    
    console.log(`📬 Found ${tasks.length} tasks with pending reminders`);
    
    let sentCount = 0;
    
    for (const task of tasks) {
      // Send reminders
      for (const reminder of task.reminders) {
        if (!reminder.sent && reminder.sendAt <= now) {
          await sendTaskReminder(task, io);
          
          // Mark as sent
          reminder.sent = true;
          reminder.sentAt = new Date();
          sentCount++;
        }
      }
      
      await task.save();
    }
    
    console.log(`✅ Sent ${sentCount} reminders`);
    return { success: true, count: sentCount };
    
  } catch (error) {
    console.error('Error processing reminders:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process escalations cho tasks quá hạn
 */
async function processEscalations(io) {
  try {
    // Find tasks needing escalation
    const tasks = await FollowUp.find({
      status: { $nin: ['completed', 'cancelled'] },
      'escalation.enabled': true,
      'escalation.escalated': false
    }).populate('assignee createdBy escalation.escalateTo');
    
    console.log(`🔍 Checking ${tasks.length} tasks for escalation`);
    
    let escalatedCount = 0;
    
    for (const task of tasks) {
      if (task.needsEscalation()) {
        await sendEscalation(task, io);
        escalatedCount++;
      }
    }
    
    console.log(`🚨 Escalated ${escalatedCount} tasks`);
    return { success: true, count: escalatedCount };
    
  } catch (error) {
    console.error('Error processing escalations:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Daily digest: Gửi tóm tắt tasks cho users
 */
async function sendDailyDigest(io) {
  try {
    console.log('📊 Generating daily digest...');
    
    // Find all users with active tasks
    const tasks = await FollowUp.find({
      status: { $nin: ['completed', 'cancelled'] }
    }).populate('assignee meeting');
    
    // Group by assignee
    const tasksByUser = {};
    for (const task of tasks) {
      const userId = task.assignee._id.toString();
      if (!tasksByUser[userId]) {
        tasksByUser[userId] = {
          user: task.assignee,
          overdue: [],
          dueSoon: [],
          inProgress: []
        };
      }
      
      if (task.isOverdue) {
        tasksByUser[userId].overdue.push(task);
      } else if (task.daysUntilDue !== null && task.daysUntilDue <= 3) {
        tasksByUser[userId].dueSoon.push(task);
      } else if (task.status === 'in_progress') {
        tasksByUser[userId].inProgress.push(task);
      }
    }
    
    // Send digest to each user
    let digestCount = 0;
    for (const [userId, data] of Object.entries(tasksByUser)) {
      if (data.overdue.length > 0 || data.dueSoon.length > 0 || data.inProgress.length > 0) {
        try {
          await emailService.sendTaskDigest({
            to: data.user.email,
            userName: data.user.fullName,
            overdueTasks: data.overdue,
            dueSoonTasks: data.dueSoon,
            inProgressTasks: data.inProgress
          });
          digestCount++;
        } catch (emailError) {
          console.error(`Error sending digest to ${data.user.email}:`, emailError);
        }
      }
    }
    
    console.log(`✅ Sent ${digestCount} daily digests`);
    return { success: true, count: digestCount };
    
  } catch (error) {
    console.error('Error sending daily digest:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Setup cron jobs
 */
function setupTaskReminderCronJobs(io) {
  console.log('⏰ Setting up task reminder cron jobs...');
  
  // 1. Check reminders every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('🔔 Running reminder check...');
    await processReminders(io);
  });
  
  // 2. Check escalations every hour
  cron.schedule('0 * * * *', async () => {
    console.log('🚨 Running escalation check...');
    await processEscalations(io);
  });
  
  // 3. Send daily digest at 8 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('📊 Sending daily digest...');
    await sendDailyDigest(io);
  });
  
  // 4. Auto-update overdue tasks at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('🔄 Updating overdue tasks...');
    try {
      const overdueTasks = await FollowUp.findOverdue();
      console.log(`Found ${overdueTasks.length} overdue tasks`);
      
      // Send notifications for newly overdue tasks
      for (const task of overdueTasks) {
        const notification = await Notification.create({
          recipient: task.assignee,
          type: 'task_overdue',
          title: '⚠️ Task quá hạn',
          message: `Task "${task.title}" đã quá hạn`,
          link: `/meetings/${task.meeting._id}`
        });
        
        if (io) {
          io.to(`user_${task.assignee._id.toString()}`).emit('newNotification', notification);
        }
      }
    } catch (error) {
      console.error('Error updating overdue tasks:', error);
    }
  });
  
  console.log('✅ Task reminder cron jobs setup complete');
  console.log('  - Reminders: Every 15 minutes');
  console.log('  - Escalations: Every hour');
  console.log('  - Daily digest: 8:00 AM');
  console.log('  - Overdue check: Midnight');
}

module.exports = {
  setupTaskReminderCronJobs,
  sendTaskReminder,
  sendEscalation,
  processReminders,
  processEscalations,
  sendDailyDigest
};

