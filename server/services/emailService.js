const nodemailer = require('nodemailer');
const envConfig = require('../config/environment');

/**
 * Email Service cho gửi thông báo qua email
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.enabled = envConfig.email.enabled;
    
    if (this.enabled) {
      this.initializeTransporter();
    }
  }

  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: envConfig.email.host,
        port: envConfig.email.port,
        secure: envConfig.email.port === 465, // true for 465, false for other ports
        auth: {
          user: envConfig.email.user,
          pass: envConfig.email.pass
        }
      });

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Email service configuration error:', error.message);
        } else {
          console.log('✅ Email service is ready');
        }
      });
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
      this.enabled = false;
    }
  }

  /**
   * Gửi email notification
   * @param {Object} options - Email options
   * @param {string} options.to - Email người nhận
   * @param {string} options.subject - Tiêu đề email
   * @param {string} options.html - Nội dung HTML
   * @param {string} options.text - Nội dung text (optional)
   * @returns {Promise<Object>}
   */
  async sendEmail({ to, subject, html, text }) {
    if (!this.enabled || !this.transporter) {
      console.log('📧 Email service is disabled');
      return { success: false, message: 'Email service is not configured' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"Meeting Management System" <${envConfig.email.user}>`,
        to,
        subject,
        text,
        html
      });

      console.log('✅ Email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Gửi thông báo meeting
   * @param {Object} notification - Notification data
   * @returns {Promise<Object>}
   */
  async sendMeetingNotification(notification) {
    const { recipient, title, message, data } = notification;
    
    // Get user email
    const User = require('../models/User');
    const user = await User.findById(recipient);
    
    if (!user || !user.email) {
      return { success: false, message: 'User email not found' };
    }

    // Check if user wants email notifications
    if (!user.notificationSettings?.email) {
      console.log('📧 User has disabled email notifications');
      return { success: false, message: 'User disabled email notifications' };
    }

    const html = this.generateMeetingEmailTemplate({
      title,
      message,
      user: user.fullName,
      meetingData: data
    });

    return await this.sendEmail({
      to: user.email,
      subject: `📅 Meeting Notification: ${title}`,
      html
    });
  }

  /**
   * Generate HTML template cho meeting notification
   */
  generateMeetingEmailTemplate({ title, message, user, meetingData }) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Meeting Notification</h1>
          </div>
          <div class="content">
            <h2>Xin chào ${user}!</h2>
            <p><strong>${title}</strong></p>
            <p>${message}</p>
            <div style="margin: 20px 0; padding: 15px; background: white; border-left: 4px solid #667eea; border-radius: 5px;">
              ${meetingData.meetingId ? `<p><a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/meetings/${meetingData.meetingId}" class="button">Xem chi tiết cuộc họp</a></p>` : ''}
            </div>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              Bạn nhận được email này vì bạn đã bật email notifications trong cài đặt.
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Meeting Management System</p>
            <p>Nhóm DATN - Phenikaa University</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Gửi meeting reminder
   */
  async sendMeetingReminder({ recipient, meeting }) {
    const User = require('../models/User');
    const user = await User.findById(recipient);
    
    if (!user || !user.email) {
      return { success: false, message: 'User email not found' };
    }

    // Check meeting reminders setting
    if (!user.notificationSettings?.meetingReminders) {
      return { success: false, message: 'User disabled meeting reminders' };
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .meeting-info { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Meeting Reminder</h1>
          </div>
          <div class="content">
            <h2>Xin chào ${user.fullName}!</h2>
            <p>Bạn có cuộc họp sắp diễn ra:</p>
            <div class="meeting-info">
              <h3>${meeting.title}</h3>
              <p><strong>Thời gian:</strong> ${new Date(meeting.startTime).toLocaleString('vi-VN')}</p>
              <p><strong>Địa điểm:</strong> ${meeting.location || 'Chưa có'}</p>
            </div>
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/meetings/${meeting._id}" class="button">Xem cuộc họp</a>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject: `🔔 Nhắc nhở: ${meeting.title}`,
      html
    });
  }
}

// Export singleton instance
module.exports = new EmailService();

