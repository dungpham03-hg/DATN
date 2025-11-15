const Meeting = require('../models/Meeting');
const User = require('../models/User');
const MeetingRoom = require('../models/MeetingRoom');

/**
 * Smart Schedule Optimizer
 * Tự động tìm khung giờ tối ưu cho cuộc họp dựa trên:
 * - Lịch của attendees
 * - Giờ làm việc lý tưởng
 * - Mật độ cuộc họp
 * - Phòng họp available
 */

/**
 * Lấy lịch của users trong khoảng thời gian
 */
async function getUserSchedules(userIds, startDate, endDate) {
  const schedules = {};
  
  for (const userId of userIds) {
    const meetings = await Meeting.find({
      $or: [
        { organizer: userId },
        { 'attendees.user': userId }
      ],
      status: { $in: ['scheduled', 'ongoing'] },
      startTime: { $gte: startDate, $lte: endDate }
    }).select('startTime endTime title');
    
    schedules[userId.toString()] = meetings;
  }
  
  return schedules;
}

/**
 * Tạo danh sách các time slots trong khoảng thời gian
 * Mỗi slot: 30 phút
 */
function generateTimeSlots(startDate, endDate, duration) {
  const slots = [];
  const slotDuration = 30; // minutes
  
  let currentDate = new Date(startDate);
  currentDate.setHours(8, 0, 0, 0); // Bắt đầu từ 8h sáng
  
  const endDateTime = new Date(endDate);
  endDateTime.setHours(18, 0, 0, 0); // Kết thúc 18h chiều
  
  while (currentDate <= endDateTime) {
    const hour = currentDate.getHours();
    const dayOfWeek = currentDate.getDay();
    
    // Chỉ xét giờ làm việc (8h-18h) và thứ 2-6
    if (hour >= 8 && hour < 18 && dayOfWeek >= 1 && dayOfWeek <= 5) {
      const slotEnd = new Date(currentDate.getTime() + duration * 60000);
      
      // Kiểm tra slot có nằm trong ngày làm việc không
      if (slotEnd.getHours() <= 18) {
        slots.push({
          startTime: new Date(currentDate),
          endTime: slotEnd
        });
      }
    }
    
    // Tăng 30 phút
    currentDate = new Date(currentDate.getTime() + slotDuration * 60000);
    
    // Nếu qua 18h, nhảy sang ngày hôm sau 8h
    if (currentDate.getHours() >= 18) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(8, 0, 0, 0);
    }
  }
  
  return slots;
}

/**
 * Kiểm tra slot có xung đột với lịch của user không
 */
function hasConflict(slot, userMeetings) {
  for (const meeting of userMeetings) {
    const meetingStart = new Date(meeting.startTime);
    const meetingEnd = new Date(meeting.endTime);
    const slotStart = new Date(slot.startTime);
    const slotEnd = new Date(slot.endTime);
    
    // Check overlap
    if (slotStart < meetingEnd && slotEnd > meetingStart) {
      return true;
    }
  }
  return false;
}

/**
 * Tìm các khung giờ trống chung cho tất cả attendees
 */
function findCommonFreeSlots(schedules, slots, attendeeIds) {
  const freeSlots = [];
  
  for (const slot of slots) {
    let isSlotFree = true;
    const conflicts = [];
    
    for (const userId of attendeeIds) {
      const userSchedule = schedules[userId.toString()] || [];
      if (hasConflict(slot, userSchedule)) {
        isSlotFree = false;
        conflicts.push(userId);
      }
    }
    
    if (isSlotFree) {
      freeSlots.push({
        ...slot,
        availableCount: attendeeIds.length,
        conflicts: []
      });
    } else if (conflicts.length < attendeeIds.length * 0.3) {
      // Chấp nhận nếu < 30% người có conflict (có thể optional)
      freeSlots.push({
        ...slot,
        availableCount: attendeeIds.length - conflicts.length,
        conflicts
      });
    }
  }
  
  return freeSlots;
}

/**
 * Tính điểm cho mỗi time slot
 * Điểm cao hơn = thời gian tốt hơn
 */
function calculateSlotScore(slot, factors = {}) {
  let score = 100;
  const hour = slot.startTime.getHours();
  const minute = slot.startTime.getMinutes();
  const dayOfWeek = slot.startTime.getDay();
  
  // 1. Giờ làm việc lý tưởng (9-11h, 14-16h) = +20 điểm
  if ((hour >= 9 && hour < 11) || (hour >= 14 && hour < 16)) {
    score += 20;
  } else if (hour === 8 || hour === 16 || hour === 17) {
    score += 5; // Giờ đầu/cuối ngày: điểm thấp hơn
  } else if (hour >= 11 && hour < 14) {
    score -= 10; // Giờ nghỉ trưa: điểm âm
  }
  
  // 2. Đầu tuần (Thứ 2-3) tốt hơn cuối tuần (Thứ 6) = +10 điểm
  if (dayOfWeek >= 2 && dayOfWeek <= 4) {
    score += 10; // Thứ 3-5
  } else if (dayOfWeek === 1) {
    score += 5; // Thứ 2
  } else if (dayOfWeek === 5) {
    score -= 5; // Thứ 6
  }
  
  // 3. Giờ tròn (9:00, 10:00) tốt hơn giờ lẻ (9:30) = +5 điểm
  if (minute === 0) {
    score += 5;
  }
  
  // 4. Availability rate (% người available)
  if (slot.availableCount) {
    const availabilityRate = slot.availableCount / factors.totalAttendees;
    score += availabilityRate * 30; // Max +30 điểm
  }
  
  // 5. Meeting density (tránh quá nhiều meetings liên tiếp)
  if (factors.meetingDensity) {
    score -= factors.meetingDensity * 10; // Penalty cho slot có nhiều meetings xung quanh
  }
  
  // 6. Buffer time (có khoảng trống trước/sau) = +10 điểm
  if (factors.hasBufferBefore && factors.hasBufferAfter) {
    score += 10;
  } else if (factors.hasBufferBefore || factors.hasBufferAfter) {
    score += 5;
  }
  
  return Math.max(0, Math.min(150, score)); // Giới hạn 0-150
}

/**
 * Tính meeting density (số meetings xung quanh slot)
 */
function calculateMeetingDensity(slot, schedules, attendeeIds, windowHours = 2) {
  let densityCount = 0;
  const windowMs = windowHours * 60 * 60 * 1000;
  
  const slotStart = new Date(slot.startTime);
  const beforeWindow = new Date(slotStart.getTime() - windowMs);
  const afterWindow = new Date(slotStart.getTime() + windowMs);
  
  for (const userId of attendeeIds) {
    const userSchedule = schedules[userId.toString()] || [];
    
    for (const meeting of userSchedule) {
      const meetingStart = new Date(meeting.startTime);
      if (meetingStart >= beforeWindow && meetingStart <= afterWindow) {
        densityCount++;
      }
    }
  }
  
  return densityCount / (attendeeIds.length * 4); // Normalize
}

/**
 * Kiểm tra có buffer time không
 */
function hasBufferTime(slot, schedules, attendeeIds, bufferMinutes = 30) {
  const bufferMs = bufferMinutes * 60 * 1000;
  const slotStart = new Date(slot.startTime);
  const slotEnd = new Date(slot.endTime);
  
  let hasBufferBefore = true;
  let hasBufferAfter = true;
  
  for (const userId of attendeeIds) {
    const userSchedule = schedules[userId.toString()] || [];
    
    for (const meeting of userSchedule) {
      const meetingStart = new Date(meeting.startTime);
      const meetingEnd = new Date(meeting.endTime);
      
      // Check buffer trước
      if (meetingEnd > slotStart - bufferMs && meetingEnd <= slotStart) {
        hasBufferBefore = false;
      }
      
      // Check buffer sau
      if (meetingStart < slotEnd + bufferMs && meetingStart >= slotEnd) {
        hasBufferAfter = false;
      }
    }
  }
  
  return { hasBufferBefore, hasBufferAfter };
}

/**
 * Tìm phòng họp available cho slot
 */
async function findAvailableRooms(slot, capacity = 0) {
  try {
    const rooms = await MeetingRoom.findAvailableRooms(
      slot.startTime,
      slot.endTime,
      capacity
    );
    return rooms;
  } catch (error) {
    console.error('Error finding available rooms:', error);
    return [];
  }
}

/**
 * Main function: Tìm khung giờ tối ưu
 */
async function findOptimalTimeSlots(attendeeIds, duration, options = {}) {
  try {
    const {
      startDate = new Date(),
      endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 tuần
      capacity = 0,
      roomRequired = false,
      topN = 5
    } = options;
    
    // Validate inputs
    if (!Array.isArray(attendeeIds) || attendeeIds.length === 0) {
      throw new Error('Attendees list is required');
    }
    
    if (!duration || duration < 15 || duration > 480) {
      throw new Error('Duration must be between 15 and 480 minutes');
    }
    
    console.log(`🔍 Finding optimal time slots for ${attendeeIds.length} attendees`);
    console.log(`📅 Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`⏱️  Duration: ${duration} minutes`);
    
    // 1. Lấy lịch của tất cả attendees
    const schedules = await getUserSchedules(attendeeIds, startDate, endDate);
    console.log(`📋 Retrieved schedules for ${Object.keys(schedules).length} users`);
    
    // 2. Tạo danh sách time slots
    const allSlots = generateTimeSlots(startDate, endDate, duration);
    console.log(`⏰ Generated ${allSlots.length} potential time slots`);
    
    // 3. Tìm các khung giờ trống chung
    const freeSlots = findCommonFreeSlots(schedules, allSlots, attendeeIds);
    console.log(`✅ Found ${freeSlots.length} free slots`);
    
    if (freeSlots.length === 0) {
      return {
        success: false,
        message: 'Không tìm thấy khung giờ trống nào phù hợp',
        suggestions: []
      };
    }
    
    // 4. Tính điểm cho mỗi slot
    const scoredSlots = await Promise.all(
      freeSlots.map(async (slot) => {
        const density = calculateMeetingDensity(slot, schedules, attendeeIds);
        const { hasBufferBefore, hasBufferAfter } = hasBufferTime(slot, schedules, attendeeIds);
        
        const score = calculateSlotScore(slot, {
          totalAttendees: attendeeIds.length,
          meetingDensity: density,
          hasBufferBefore,
          hasBufferAfter
        });
        
        // Tìm phòng available nếu cần
        let rooms = [];
        if (roomRequired) {
          rooms = await findAvailableRooms(slot, capacity);
        }
        
        return {
          startTime: slot.startTime,
          endTime: slot.endTime,
          score,
          availableCount: slot.availableCount,
          conflicts: slot.conflicts,
          reasons: generateReasons(slot, score, density, hasBufferBefore, hasBufferAfter),
          availableRooms: roomRequired ? rooms : undefined,
          metadata: {
            hour: slot.startTime.getHours(),
            dayOfWeek: slot.startTime.getDay(),
            density,
            hasBufferBefore,
            hasBufferAfter
          }
        };
      })
    );
    
    // 5. Sắp xếp theo điểm và lấy top N
    const topSlots = scoredSlots
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
    
    console.log(`🎯 Top ${topN} suggestions generated`);
    console.log(`   Best score: ${topSlots[0]?.score || 0}`);
    
    return {
      success: true,
      message: `Tìm thấy ${topSlots.length} khung giờ phù hợp`,
      suggestions: topSlots,
      totalAnalyzed: allSlots.length,
      totalFreeSlots: freeSlots.length
    };
    
  } catch (error) {
    console.error('Error in findOptimalTimeSlots:', error);
    throw error;
  }
}

/**
 * Generate reasons cho mỗi suggestion
 */
function generateReasons(slot, score, density, hasBufferBefore, hasBufferAfter) {
  const reasons = [];
  const hour = slot.startTime.getHours();
  const dayOfWeek = slot.startTime.getDay();
  
  // Tất cả available
  if (slot.availableCount && slot.conflicts.length === 0) {
    reasons.push('✅ Tất cả người tham dự đều rảnh');
  } else if (slot.conflicts.length > 0) {
    reasons.push(`⚠️ ${slot.conflicts.length} người có thể bận`);
  }
  
  // Giờ lý tưởng
  if ((hour >= 9 && hour < 11) || (hour >= 14 && hour < 16)) {
    reasons.push('🌟 Giờ làm việc lý tưởng');
  }
  
  // Buffer time
  if (hasBufferBefore && hasBufferAfter) {
    reasons.push('⏱️ Có thời gian nghỉ trước và sau');
  }
  
  // Mật độ thấp
  if (density < 0.5) {
    reasons.push('📊 Mật độ cuộc họp thấp');
  }
  
  // Đầu tuần
  if (dayOfWeek >= 2 && dayOfWeek <= 4) {
    reasons.push('📅 Giữa tuần làm việc');
  }
  
  // Điểm cao
  if (score >= 120) {
    reasons.push('🏆 Điểm tối ưu cao');
  }
  
  return reasons;
}

/**
 * Tìm alternative times khi có conflict
 */
async function findAlternativeTimeSlots(meetingId, options = {}) {
  try {
    const meeting = await Meeting.findById(meetingId)
      .populate('attendees.user');
    
    if (!meeting) {
      throw new Error('Meeting not found');
    }
    
    const attendeeIds = meeting.attendees.map(a => a.user._id);
    const duration = Math.round((meeting.endTime - meeting.startTime) / 60000);
    
    return await findOptimalTimeSlots(attendeeIds, duration, options);
    
  } catch (error) {
    console.error('Error finding alternatives:', error);
    throw error;
  }
}

module.exports = {
  findOptimalTimeSlots,
  findAlternativeTimeSlots,
  getUserSchedules,
  generateTimeSlots,
  calculateSlotScore,
  findAvailableRooms
};

