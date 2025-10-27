const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth');
const authenticateToken = authMiddleware.authenticateToken;

router.get('/:id/minutes/:minutesId/attachments/:attachmentId/download', authenticateToken, async (req, res) => {
  console.log('🔧 [MINUTES DOWNLOAD] Request received:', req.params);
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      console.log('❌ Meeting not found');
      return res.status(404).json({ message: 'Cuộc họp không tồn tại' });
    }
    console.log('✅ Meeting found');

    const idx = meeting.minutesHistory.findIndex(m => m._id.toString() === req.params.minutesId);
    console.log('🔍 Minutes history index:', idx);
    console.log('🔍 Total minutes in history:', meeting.minutesHistory?.length);
    if (idx === -1) {
      console.log('❌ Minutes not found. Available IDs:', meeting.minutesHistory?.map(m => m._id.toString()));
      return res.status(404).json({ message: 'Biên bản không tồn tại' });
    }
    console.log('✅ Minutes found at index:', idx);

    const items = meeting.minutesHistory[idx].attachments || [];
    console.log('🔍 Attachments in this minutes:', items.length);
    console.log('🔍 Attachments:', items.map(a => ({ id: a._id?.toString(), name: a.name })));
    console.log('🔍 Looking for attachment ID:', req.params.attachmentId);
    
    const att = items.find(a => (a._id?.toString() || a.id) === req.params.attachmentId);
    if (!att) {
      console.log('❌ Attachment not found');
      return res.status(404).json({ message: 'File đính kèm không tồn tại' });
    }
    console.log('✅ Attachment found:', att.name);
    console.log('🔍 Attachment path:', att.path);

    // Check if path is absolute or relative
    let filePath;
    if (path.isAbsolute(att.path)) {
      // Path đã là absolute, dùng trực tiếp
      filePath = att.path;
    } else {
      // Path là relative, join với __dirname
      filePath = path.join(__dirname, '..', att.path);
    }
    
    console.log('🔍 Full file path:', filePath);
    console.log('🔍 File exists?', fs.existsSync(filePath));
    
    if (!fs.existsSync(filePath)) {
      console.log('❌ File not found on server at path:', filePath);
      return res.status(404).json({ message: 'File không tồn tại trên server' });
    }

    console.log('✅ File exists, sending download response...');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(att.name || 'attachment')}`);
    const stream = fs.createReadStream(filePath);
    stream.on('error', (streamErr) => {
      console.error('❌ Stream error:', streamErr);
    });
    stream.pipe(res);
    console.log('✅ Download stream started');
  } catch (err) {
    console.error('❌ Error downloading minutes attachment:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;
