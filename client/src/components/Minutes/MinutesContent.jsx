import React, { useState, useEffect } from 'react';

import axios from 'axios';
import { useNotification } from '../../contexts/NotificationContext';
import { useApiCall } from '../../hooks/useApiCall';
import { exportToExcel, exportToWord, exportToText } from '../../utils/exportUtils';
import './MinutesContent.css';

const MinutesContent = ({ meetingId, user }) => {
  const [allMinutes, setAllMinutes] = useState([]);
  const [activeMinutes, setActiveMinutes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCloseVoteModal, setShowCloseVoteModal] = useState(false);
  const [selectedMinutesId, setSelectedMinutesId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    voteDeadline: '',
    decisions: []
  });
  const [voteData, setVoteData] = useState({
    voteType: '',
    comment: ''
  });
  const [error, setError] = useState('');

  const { success, error: notify, warning } = useNotification();
  const { submitForm } = useApiCall();
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  // Fetch minutes data
  const fetchMinutes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/minutes?meeting=${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.minutes && response.data.minutes.length > 0) {
        const minutes = response.data.minutes;
        setAllMinutes(minutes);
        
        // Chọn biên bản active: draft/pending trước, nếu không có thì lấy mới nhất
        const draftMinutes = minutes.find(m => ['draft', 'pending_review', 'pending_approval'].includes(m.status));
        const activeMinutes = draftMinutes || minutes[0]; // minutes đã sort theo createdAt desc
        
        setActiveMinutes(activeMinutes);
        setSelectedMinutesId(activeMinutes._id);
      } else {
        setAllMinutes([]);
        setActiveMinutes(null);
        setSelectedMinutesId(null);
      }
    } catch (error) {
      // Silent error - no minutes yet
      setAllMinutes([]);
      setActiveMinutes(null);
      setSelectedMinutesId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (meetingId) {
      fetchMinutes();
    }
  }, [meetingId]);

  // Kiểm tra quyền
  const canCreateMinutes = user && ['admin', 'manager', 'secretary'].includes(user.role);
  
  // Có thể tạo biên bản mới nếu: có quyền và (chưa có biên bản nào hoặc biên bản hiện tại đã approved hoặc đã đóng phiếu)
  const canCreateNew = canCreateMinutes && (!activeMinutes || activeMinutes.status === 'approved' || activeMinutes.isVotingClosed);
  
  // Kiểm tra xem user có phải attendee của meeting không
  const isAttendee = activeMinutes?.meeting?.attendees?.some(
    att => {
      const attendeeUserId = att.user?._id || att.user;
      return attendeeUserId?.toString() === user?._id?.toString();
    }
  );
  
  // Kiểm tra xem user có phải organizer (host) của meeting không
  const isOrganizer = activeMinutes?.meeting?.organizer?.toString() === user?._id?.toString() ||
                      activeMinutes?.meeting?.organizer?._id?.toString() === user?._id?.toString();
  
  // Có thể vote nếu: có biên bản, chưa đóng vote, chưa hết hạn, và (là attendee hoặc organizer)
  const canVote = activeMinutes && 
                  !activeMinutes.isVotingClosed && 
                  activeMinutes.voteDeadline && 
                  new Date() <= new Date(activeMinutes.voteDeadline) &&
                                    (isAttendee || isOrganizer);
                  
  const userVote = activeMinutes?.votes?.find(vote => vote.user._id === user?._id);

  // Handle close voting early
  const handleCloseVoting = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.post(`${API_BASE_URL}/minutes/${activeMinutes._id}/close-voting`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Refresh all minutes data sau khi close
      fetchMinutes();
      success('Đã đóng bỏ phiếu và lưu thống nhất thành công!');
    } catch (error) {
      notify('Lỗi đóng bỏ phiếu: ' + (error.response?.data?.message || error.message));
    }
  };

  // Handle create minutes
  const handleCreateMinutes = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        notify('Không có token! Vui lòng đăng nhập lại.');
        return;
      }

      if (!formData.title.trim() || !formData.content.trim()) {
        notify('Vui lòng nhập đầy đủ tiêu đề và nội dung!');
        return;
      }

      // Kiểm tra độ dài nội dung
      if (formData.title.trim().length < 3) {
        notify('Tiêu đề phải có ít nhất 3 ký tự!');
        return;
      }

      if (formData.content.trim().length < 10) {
        notify('Nội dung phải có ít nhất 10 ký tự!');
        return;
      }

      if (formData.title.trim().length > 200) {
        notify('Tiêu đề không được vượt quá 200 ký tự!');
        return;
      }

      if (formData.content.trim().length > 10000) {
        notify('Nội dung không được vượt quá 10.000 ký tự!');
        return;
      }
      
      // Set default deadline to 24 hours from now if not set
      const deadline = formData.voteDeadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

      const response = await axios.post(`${API_BASE_URL}/minutes`, {
        meeting: meetingId,
        title: formData.title,
        content: formData.content,
        voteDeadline: deadline,
        decisions: formData.decisions || []
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh all minutes data và chọn biên bản mới
      await fetchMinutes();
      setShowCreateModal(false);
      setFormData({ title: '', content: '', voteDeadline: '', decisions: [] });
      
      success('Tạo thống nhất thành công!');
      
    } catch (error) {
      notify('Lỗi tạo thống nhất: ' + (error.response?.data?.message || error.message));
    }
  };

  // Handle vote
  const handleVote = async () => {
    await submitForm(async () => {
      const token = localStorage.getItem('token');
      
      if (userVote) {
        // Update existing vote
        await axios.put(`${API_BASE_URL}/minutes/${activeMinutes._id}/vote`, {
          voteType: voteData.voteType,
          comment: voteData.comment
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // Create new vote
        await axios.post(`${API_BASE_URL}/minutes/${activeMinutes._id}/vote`, {
          voteType: voteData.voteType,
          comment: voteData.comment
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      fetchMinutes(); // Refresh data
      setShowVoteModal(false);
      setVoteData({ voteType: '', comment: '' });
      success(userVote ? 'Cập nhật phiếu bầu thành công!' : 'Bỏ phiếu thành công!');
    }, { 
      loadingText: userVote ? 'Đang cập nhật phiếu bầu...' : 'Đang bỏ phiếu...' 
    });
  };

  // Get export data
  const getExportData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/minutes/${activeMinutes._id}/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    } catch (error) {
      throw new Error('Không thể lấy dữ liệu thống nhất: ' + error.message);
    }
  };

  // Handle export to Excel
  const handleExportExcel = async () => {
    try {
      const exportData = await getExportData();
      const result = exportToExcel(exportData);
      
      if (result.success) {
        success('Xuất file Excel thành công!');
        setShowExportModal(false);
      } else {
        notify('Lỗi khi xuất file Excel: ' + result.error);
      }
    } catch (error) {
      notify('Lỗi khi xuất file Excel: ' + error.message);
    }
  };

  // Handle export to Word
  const handleExportWord = async () => {
    try {
      const exportData = await getExportData();
      const result = exportToWord(exportData);
      
      if (result.success) {
        success('Xuất file Word thành công!');
        setShowExportModal(false);
      } else {
        notify('Lỗi khi xuất file Word: ' + result.error);
      }
    } catch (error) {
      notify('Lỗi khi xuất file Word: ' + error.message);
    }
  };

  // Handle export to Text
  const handleExportText = async () => {
    try {
      const exportData = await getExportData();
      const result = exportToText(exportData);
      
      if (result.success) {
        success('Xuất file Text thành công!');
        setShowExportModal(false);
      } else {
        notify('Lỗi khi xuất file Text: ' + result.error);
      }
    } catch (error) {
      notify('Lỗi khi xuất file Text: ' + error.message);
    }
  };

  // Format vote type
  const formatVoteType = (voteType) => {
    switch (voteType) {
      case 'agree': return 'Đồng ý';
      case 'agree_with_comments': return 'Đồng ý có ý kiến';
      case 'disagree': return 'Không đồng ý';
      default: return voteType;
    }
  };

  // Get vote badge variant
  const getVoteBadgeVariant = (voteType) => {
    switch (voteType) {
      case 'agree': return 'success';
      case 'agree_with_comments': return 'warning';
      case 'disagree': return 'danger';
      default: return 'secondary';
    }
  };

  // Helper to truncate text
  const truncateText = (text, maxLength = 120) => {
    if (!text) return '';
    const plain = text.replace(/<[^>]+>/g, ''); // strip html tags
    return plain.length > maxLength ? plain.slice(0, maxLength) + '…' : plain;
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <CircularProgress animation="border" size="sm"  />
        <p className="mt-2 mb-0">Đang tải thống nhất...</p>
      </div>
    );
  }

  if (!activeMinutes) {
    return (
      <div className="minutes-empty">
        <div className="text-center py-4">
          <i className="fas fa-file-contract text-muted mb-3" style={{ fontSize: '3rem' }}></i>
          <h6>Chưa có thống nhất cuộc họp</h6>
          <p className="text-muted mb-3">
            Thống nhất giúp ghi lại các quyết định quan trọng và thu thập ý kiến từ người tham gia.
          </p>
          {canCreateNew && (
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <i className="fas fa-plus me-2"></i>
              Tạo thống nhất
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Handle switch minutes
  const handleSwitchMinutes = (minutesId) => {
    const selectedMinutes = allMinutes.find(m => m._id === minutesId);
    if (selectedMinutes) {
      setActiveMinutes(selectedMinutes);
      setSelectedMinutesId(minutesId);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft': return <Badge bg="secondary">Bản nháp</Badge>;
      case 'pending_review': return <Badge bg="info">Đang xem xét</Badge>;
      case 'pending_approval': return <Badge bg="warning">Đang phê duyệt</Badge>;
      case 'approved': return <Badge bg="success">Đã phê duyệt</Badge>;
      case 'rejected': return <Badge bg="danger">Bị từ chối</Badge>;
      default: return <Badge bg="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="minutes-content">
      {/* Minutes Selector */}
      {allMinutes.length > 1 && (
        <div className="minutes-selector mb-3">
          <Box>
            <Typography variant="body2" className="small fw-bold">Chọn thống nhất:</Typography>
            <Form.Select 
              size="sm" 
              value={selectedMinutesId || ''} 
              onChange={(e) => handleSwitchMinutes(e.target.value)}
            >
              {allMinutes.map(minutes => (
                <option key={minutes._id} value={minutes._id}>
                  {minutes.title} - {getStatusBadge(minutes.status).props.children} 
                  ({new Date(minutes.createdAt).toLocaleDateString('vi-VN')})
                </option>
              ))}
            </Form.Select>
          </Box>
        </div>
      )}

      {/* Create New Button */}
      {canCreateNew && activeMinutes && (activeMinutes.status === 'approved' || activeMinutes.isVotingClosed) && (
        <div className="create-new-section mb-3">
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={() => setShowCreateModal(true)}
            className="w-100"
          >
            <i className="fas fa-plus me-2"></i>
            Tạo thống nhất mới
          </Button>
        </div>
      )}

      {/* Minutes Header */}
      <Card className="minutes-card">
        <CardHeader>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <div className="flex-grow-1">
              <h6 className="mb-1 d-flex align-items-center gap-2">
                {activeMinutes.title}
                {getStatusBadge(activeMinutes.status)}
              </h6>
              <small className="text-muted">
                Thư ký: {activeMinutes.secretary?.fullName || 'Chưa xác định'} • 
                Hạn bỏ phiếu: {activeMinutes.voteDeadline ? new Date(activeMinutes.voteDeadline).toLocaleString('vi-VN') : 'Chưa xác định'}
                {activeMinutes.status === 'approved' && activeMinutes.approvedBy && (
                  <> • Phê duyệt: {activeMinutes.approvedBy.fullName}</>
                )}
              </small>
            </div>
            <div className="d-flex flex-wrap gap-2 action-buttons">
              {canVote && (
                <Button 
                  variant={userVote ? "warning" : "primary"} 
                  size="sm"
                  onClick={() => {
                    if (userVote) {
                      setVoteData({
                        voteType: userVote.voteType,
                        comment: userVote.comment || ''
                      });
                    }
                    setShowVoteModal(true);
                  }}
                >
                  <i className={`fas ${userVote ? 'fa-edit' : 'fa-vote-yea'} me-1`}></i>
                  {userVote ? 'Sửa phiếu' : 'Bỏ phiếu'}
                </Button>
              )}
              {!activeMinutes.isVotingClosed && canCreateMinutes && activeMinutes.status === 'draft' && (
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={() => setShowCloseVoteModal(true)}
                  title="Đóng bỏ phiếu"
                >
                  <i className="fas fa-lock me-1"></i>
                  Đóng phiếu
                </Button>
              )}
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => setShowExportModal(true)}
              >
                <i className="fas fa-download me-1"></i>
                Xuất file
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Content */}
          <div className="minutes-content-text mb-4">
            {(activeMinutes.content || '').split('\n').map((line, index) => (
              <p key={index} className="mb-2">{line || '\u00A0'}</p>
            ))}
          </div>

          {/* Decisions */}
          {activeMinutes.decisions && activeMinutes.decisions.length > 0 && (
            <div className="decisions-section mb-4">
              <h6>Các quyết định:</h6>
              {activeMinutes.decisions.map((decision, index) => (
                <div key={index} className="decision-item p-3 border rounded mb-2">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <h6 className="mb-1">{decision.title}</h6>
                      {decision.description && (
                        <p className="text-muted mb-2">{decision.description}</p>
                      )}
                      <div className="decision-meta">
                        {decision.responsible && (
                          <small className="me-3">
                            <i className="fas fa-user me-1"></i>
                            {decision.responsible.fullName}
                          </small>
                        )}
                        {decision.deadline && (
                          <small className="me-3">
                            <i className="fas fa-calendar me-1"></i>
                            {new Date(decision.deadline).toLocaleDateString('vi-VN')}
                          </small>
                        )}
                      </div>
                    </div>
                    <Badge bg="secondary">{decision.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Voting Statistics - Sidebar Compact */}
          <div className="voting-stats-sidebar mb-4">
            {/* Quick Stats Overview */}
            <div className="stats-overview mb-3">
              <div className="stat-item-compact">
                <div className="stat-number-compact">
                  {activeMinutes.metadata?.receivedVoteCount || 0}
                  <span className="stat-total-compact">/{activeMinutes.metadata?.requiredVoteCount || 0}</span>
                </div>
                <div className="stat-label-compact">Đã bỏ phiếu</div>
              </div>
              
              <div className="stat-item-compact">
                <div className="stat-number-compact">
                  {Math.round(activeMinutes.agreementRate || 0)}
                  <span className="stat-unit-compact">%</span>
                </div>
                <div className="stat-label-compact">Tỷ lệ đồng ý</div>
              </div>
              
              <div className="stat-item-compact">
                <div className="stat-status">
                  <i className={`fas ${!activeMinutes.isVotingClosed ? 
                    (activeMinutes.voteDeadline && new Date() < new Date(activeMinutes.voteDeadline) ? 'fa-clock text-success' : 'fa-exclamation-triangle text-warning') : 
                    'fa-lock text-danger'}`}></i>
                </div>
                <div className="stat-label-compact">
                  {!activeMinutes.isVotingClosed ? 
                    (activeMinutes.voteDeadline && new Date() < new Date(activeMinutes.voteDeadline) ? 'Đang mở' : 'Hết hạn') : 
                    'Đã đóng'}
                </div>
              </div>
            </div>

            {/* Participation Progress */}
            <div className="participation-progress mb-3">
              <div className="progress-header">
                <span className="progress-label">Tham gia bỏ phiếu</span>
                <span className="progress-percent">
                  {Math.round(((activeMinutes.metadata?.receivedVoteCount || 0) / (activeMinutes.metadata?.requiredVoteCount || 1)) * 100)}%
                </span>
              </div>
              <div className="progress-bar-simple">
                <div 
                  className="progress-fill-simple"
                  style={{
                    width: `${((activeMinutes.metadata?.receivedVoteCount || 0) / (activeMinutes.metadata?.requiredVoteCount || 1)) * 100}%`
                  }}
                ></div>
              </div>
            </div>

            {/* Vote Breakdown Compact */}
            <div className="vote-breakdown-compact">
              <div className="breakdown-header">
                <i className="fas fa-chart-bar me-2"></i>
                Phân tích chi tiết
              </div>
              
              <div className="vote-items">
                <div className="vote-item">
                  <div className="vote-item-header">
                    <div className="vote-icon agree">
                      <i className="fas fa-thumbs-up"></i>
                    </div>
                    <div className="vote-info">
                      <div className="vote-count">{activeMinutes.metadata?.agreeCount || 0}</div>
                      <div className="vote-label">Đồng ý</div>
                    </div>
                  </div>
                </div>
                
                <div className="vote-item">
                  <div className="vote-item-header">
                    <div className="vote-icon conditional">
                      <i className="fas fa-comment-alt"></i>
                    </div>
                    <div className="vote-info">
                      <div className="vote-count">{activeMinutes.metadata?.agreeWithCommentsCount || 0}</div>
                      <div className="vote-label">Có ý kiến</div>
                    </div>
                  </div>
                </div>
                
                <div className="vote-item">
                  <div className="vote-item-header">
                    <div className="vote-icon disagree">
                      <i className="fas fa-thumbs-down"></i>
                    </div>
                    <div className="vote-info">
                      <div className="vote-count">{activeMinutes.metadata?.disagreeCount || 0}</div>
                      <div className="vote-label">Không đồng ý</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Deadline Info Compact */}
            {!activeMinutes.isVotingClosed && (
              <div className="deadline-compact mt-3">
                <div className="deadline-info">
                  <div className="deadline-label">
                    <i className="fas fa-calendar-clock me-2"></i>
                    Hạn bỏ phiếu
                  </div>
                  <div className="deadline-time">
                    {activeMinutes.voteDeadline ? 
                      new Date(activeMinutes.voteDeadline).toLocaleDateString('vi-VN') + ' ' +
                      new Date(activeMinutes.voteDeadline).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : 
                      'Chưa xác định'
                    }
                  </div>
                  <div className={`deadline-status ${activeMinutes.voteDeadline && new Date() < new Date(activeMinutes.voteDeadline) ? 'status-active' : 'status-expired'}`}>
                    {activeMinutes.voteDeadline && new Date() < new Date(activeMinutes.voteDeadline) ? 'Còn thời gian' : 'Đã hết hạn'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Vote Status Info */}
          {activeMinutes && !activeMinutes.isVotingClosed && !canVote && !userVote && (
            <Alert variant="warning">
              <i className="fas fa-info-circle me-2"></i>
              <strong>Không thể bỏ phiếu:</strong>
              {!isAttendee && !isOrganizer && ' Bạn không phải là người tham gia hoặc tổ chức cuộc họp này.'}
              {(isAttendee || isOrganizer) && activeMinutes.voteDeadline && new Date() > new Date(activeMinutes.voteDeadline) && ' Đã hết hạn bỏ phiếu.'}
              {(isAttendee || isOrganizer) && !activeMinutes.voteDeadline && ' Chưa đặt hạn bỏ phiếu.'}
            </Alert>
          )}

          {/* User's Vote */}
          {userVote && (
            <Alert variant={getVoteBadgeVariant(userVote.voteType) === 'success' ? 'success' : 
                           getVoteBadgeVariant(userVote.voteType) === 'warning' ? 'warning' : 'danger'}>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <strong>Phiếu bầu của bạn:</strong> {formatVoteType(userVote.voteType)}
                  {userVote.comment && (
                    <div className="mt-1">
                      <small>Ý kiến: {userVote.comment}</small>
                    </div>
                  )}
                </div>
                <small className="text-muted">
                  {userVote.votedAt ? new Date(userVote.votedAt).toLocaleString('vi-VN') : ''}
                </small>
              </div>
            </Alert>
          )}

          {/* Voting Status */}
          {activeMinutes.isVotingClosed && (
            <Alert variant={activeMinutes.status === 'approved' ? "success" : "info"}>
              <i className={`fas ${activeMinutes.status === 'approved' ? 'fa-check-circle' : 'fa-lock'} me-2`}></i>
              {activeMinutes.status === 'approved' ? 'Thống nhất đã được phê duyệt' : 'Bỏ phiếu đã đóng'}
              {activeMinutes.status === 'approved' && activeMinutes.approvedAt && (
                <div className="mt-1">
                  <small>
                    Phê duyệt lúc {new Date(activeMinutes.approvedAt).toLocaleString('vi-VN')}
                    {activeMinutes.approvedBy && (
                      <> bởi {activeMinutes.approvedBy.fullName}</>
                    )}
                  </small>
                </div>
              )}
              {activeMinutes.status !== 'approved' && canCreateNew && (
                <div className="mt-2">
                  <small>
                    <i className="fas fa-info-circle me-1"></i>
                    Kết quả đã được ghi nhận. Bạn có thể tạo thống nhất mới cho lần họp tiếp theo.
                  </small>
                </div>
              )}
            </Alert>
          )}

          {!activeMinutes.isVotingClosed && activeMinutes.voteDeadline && new Date() > new Date(activeMinutes.voteDeadline) && (
            <Alert variant="warning">
              <i className="fas fa-clock me-2"></i>
              Đã hết hạn bỏ phiếu
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Minutes History List */}
      {allMinutes.length > 1 && (
        <div className="minutes-history mt-4">
          <h6 className="mb-3">Lịch sử Biên bản</h6>
          <div className="minutes-history-list">
            {allMinutes.map(minutes => (
              <div
                key={minutes._id}
                className={`history-item p-3 mb-2 rounded border ${minutes._id === selectedMinutesId ? 'active' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => handleSwitchMinutes(minutes._id)}
              >
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <strong>{minutes.title}</strong>
                      {getStatusBadge(minutes.status)}
                    </div>
                    <small className="text-muted">{truncateText(minutes.content, 100)}</small>
                  </div>
                  <small className="text-muted text-nowrap">
                    {new Date(minutes.createdAt).toLocaleDateString('vi-VN')}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Minutes Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Tạo thống nhất cuộc họp</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Box className="mb-3">
              <Typography variant="body2">Tiêu đề thống nhất *</Typography>
              <TextField
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Nhập tiêu đề thống nhất..."
                isInvalid={formData.title.trim().length > 0 && (formData.title.trim().length < 3 || formData.title.trim().length > 200)}
                isValid={formData.title.trim().length >= 3 && formData.title.trim().length <= 200}
              />
              <Form.Text className={`${formData.title.trim().length < 3 || formData.title.trim().length > 200 ? 'text-danger' : 'text-muted'}`}>
                {formData.title.length}/200 ký tự (tối thiểu 3 ký tự)
              </Form.Text>
            </Box>

            <Box className="mb-3">
              <Typography variant="body2">Nội dung thống nhất *</Typography>
              <TextField
                as="textarea"
                rows={6}
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                placeholder="Nhập nội dung chi tiết của thống nhất..."
                isInvalid={formData.content.trim().length > 0 && (formData.content.trim().length < 10 || formData.content.trim().length > 10000)}
                isValid={formData.content.trim().length >= 10 && formData.content.trim().length <= 10000}
              />
              <Form.Text className={`${formData.content.trim().length < 10 || formData.content.trim().length > 10000 ? 'text-danger' : 'text-muted'}`}>
                {formData.content.length}/10.000 ký tự (tối thiểu 10 ký tự)
              </Form.Text>
            </Box>

            <Box className="mb-3">
              <Typography variant="body2">Hạn chót bỏ phiếu</Typography>
              <TextField
                type="datetime-local"
                value={formData.voteDeadline}
                onChange={(e) => setFormData({...formData, voteDeadline: e.target.value})}
                min={new Date().toISOString().slice(0, 16)}
              />
              <Form.Text className="text-muted">
                Để trống sẽ tự động đặt hạn 24 giờ kể từ bây giờ
              </Form.Text>
            </Box>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Hủy
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCreateMinutes}
            disabled={
              !formData.title.trim() || 
              !formData.content.trim() ||
              formData.title.trim().length < 3 ||
              formData.title.trim().length > 200 ||
              formData.content.trim().length < 10 ||
              formData.content.trim().length > 10000
            }
          >
            Tạo thống nhất
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Vote Modal */}
      <Modal show={showVoteModal} onHide={() => setShowVoteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{userVote ? 'Cập nhật phiếu bầu' : 'Bỏ phiếu thống nhất'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Box className="mb-3">
              <Typography variant="body2">Lựa chọn của bạn *</Typography>
              <div>
                <Form.Check
                  type="radio"
                  name="voteType"
                  id="agree"
                  label="Đồng ý"
                  value="agree"
                  checked={voteData.voteType === 'agree'}
                  onChange={(e) => setVoteData({...voteData, voteType: e.target.value})}
                  className="mb-2"
                />
                <Form.Check
                  type="radio"
                  name="voteType"
                  id="agree_with_comments"
                  label="Đồng ý có ý kiến"
                  value="agree_with_comments"
                  checked={voteData.voteType === 'agree_with_comments'}
                  onChange={(e) => setVoteData({...voteData, voteType: e.target.value})}
                  className="mb-2"
                />
                <Form.Check
                  type="radio"
                  name="voteType"
                  id="disagree"
                  label="Không đồng ý"
                  value="disagree"
                  checked={voteData.voteType === 'disagree'}
                  onChange={(e) => setVoteData({...voteData, voteType: e.target.value})}
                />
              </div>
            </Box>

            <Box className="mb-3">
              <Typography variant="body2">Ý kiến của bạn (tùy chọn)</Typography>
              <TextField
                as="textarea"
                rows={3}
                value={voteData.comment}
                onChange={(e) => setVoteData({...voteData, comment: e.target.value})}
                placeholder="Nhập ý kiến của bạn về thống nhất này..."
                maxLength={1000}
              />
              <Form.Text className="text-muted">
                {voteData.comment.length}/1000 ký tự
              </Form.Text>
            </Box>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowVoteModal(false)}>
            Hủy
          </Button>
          <Button 
            variant="primary" 
            onClick={handleVote}
            disabled={!voteData.voteType}
          >
            {userVote ? 'Cập nhật' : 'Bỏ phiếu'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Export Modal */}
      <Modal show={showExportModal} onHide={() => setShowExportModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Xuất thống nhất</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Chọn định dạng file muốn xuất:</p>
          <div className="d-grid gap-2">
            <Button variant="outline-success" onClick={handleExportExcel}>
              <i className="fas fa-file-excel me-2"></i>
              Xuất ra Excel (.xls)
              <small className="d-block text-muted">Định dạng bảng tính với multiple sheets</small>
            </Button>
            <Button variant="outline-primary" onClick={handleExportWord}>
              <i className="fas fa-file-word me-2"></i>
              Xuất ra Word (.doc)
              <small className="d-block text-muted">Định dạng văn bản chuyên nghiệp</small>
            </Button>
            <Button variant="outline-secondary" onClick={handleExportText}>
              <i className="fas fa-file-alt me-2"></i>
              Xuất ra Text (.txt)
              <small className="d-block text-muted">Định dạng văn bản đơn giản</small>
            </Button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExportModal(false)}>
            Hủy
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Close Vote Confirmation Modal */}
      <Modal show={showCloseVoteModal} onHide={() => setShowCloseVoteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">
            <i className="fas fa-exclamation-triangle me-2"></i>
            Xác nhận đóng bỏ phiếu
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <p className="mb-2">
              <strong>Bạn có chắc chắn muốn đóng bỏ phiếu cho thống nhất này?</strong>
            </p>
            <p className="text-muted mb-3">
              Sau khi đóng, không ai có thể bỏ phiếu hoặc thay đổi phiếu bầu nữa. 
              Hành động này không thể hoàn tác.
            </p>
          </div>
          
          <div className="bg-light p-3 rounded mb-3">
            <h6 className="mb-2">Thống kê hiện tại:</h6>
            <div className="row text-center">
              <div className="col-4">
                <div className="text-success fw-bold">{activeMinutes?.metadata?.agreeCount || 0}</div>
                <small className="text-muted">Đồng ý</small>
              </div>
              <div className="col-4">
                <div className="text-warning fw-bold">{activeMinutes?.metadata?.agreeWithCommentsCount || 0}</div>
                <small className="text-muted">Có ý kiến</small>
              </div>
              <div className="col-4">
                <div className="text-danger fw-bold">{activeMinutes?.metadata?.disagreeCount || 0}</div>
                <small className="text-muted">Không đồng ý</small>
              </div>
            </div>
            <hr className="my-2" />
            <div className="text-center">
              <strong>{activeMinutes?.metadata?.receivedVoteCount || 0}/{activeMinutes?.metadata?.requiredVoteCount || 0}</strong> người đã bỏ phiếu
            </div>
          </div>

          <Alert variant="warning" className="mb-0">
            <i className="fas fa-info-circle me-2"></i>
            <strong>Lưu ý:</strong> Việc đóng bỏ phiếu sẽ ngay lập tức chặn tất cả các phiếu bầu mới và 
            cố định kết quả hiện tại.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCloseVoteModal(false)}>
            <i className="fas fa-times me-2"></i>
            Hủy bỏ
          </Button>
          <Button 
            variant="danger" 
            onClick={() => {
              handleCloseVoting();
              setShowCloseVoteModal(false);
            }}
          >
            <i className="fas fa-lock me-2"></i>
            Đóng bỏ phiếu
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MinutesContent; 