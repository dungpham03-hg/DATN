import React, { useState, useEffect } from 'react';

import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

/**
 * Component hiển thị & quản lý Biên bản (Protocol)
 *  - Lấy danh sách protocol theo meetingId
 *  - Cho phép tạo protocol mới (admin / manager / secretary)
 *  - Hiển thị tóm tắt của các protocol, click để xem chi tiết
 */
const ProtocolContent = ({ meetingId, user }) => {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  const [protocols, setProtocols] = useState([]);
  const [activeProtocol, setActiveProtocol] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newData, setNewData] = useState({ title: '', content: '' });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canCreate = user && ['admin', 'manager', 'secretary'].includes(user.role);

  const fetchProtocols = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/protocols?meeting=${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = res.data.protocols || [];
      setProtocols(list);
      if (list.length) {
        const first = list[0];
        setActiveProtocol(first);
        setSelectedId(first._id);
      } else {
        setActiveProtocol(null);
        setSelectedId(null);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Không thể tải biên bản');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (meetingId) fetchProtocols();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  const handleCreate = async () => {
    try {
      if (!newData.title.trim() || !newData.content.trim()) {
        setError('Vui lòng nhập tiêu đề và nội dung');
        return;
      }
      setSaving(true);
      const token = localStorage.getItem('token');
      
      // Sử dụng FormData để upload files
      const formData = new FormData();
      formData.append('meeting', meetingId);
      formData.append('title', newData.title.trim());
      formData.append('content', newData.content);
      formData.append('decisions', JSON.stringify([]));
      
      // Thêm files
      selectedFiles.forEach(file => {
        formData.append('attachments', file);
      });
      
      await axios.post(`${API_BASE_URL}/protocols`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setShowCreateModal(false);
      setNewData({ title: '', content: '' });
      setSelectedFiles([]);
      fetchProtocols();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi tạo biên bản');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf': return 'fas fa-file-pdf text-danger';
      case 'doc':
      case 'docx': return 'fas fa-file-word text-primary';
      case 'xls':
      case 'xlsx': return 'fas fa-file-excel text-success';
      case 'ppt':
      case 'pptx': return 'fas fa-file-powerpoint text-warning';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return 'fas fa-file-image text-info';
      default: return 'fas fa-file text-secondary';
    }
  };

  const handleViewAttachment = async (protocolId, attachmentId, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/protocols/${protocolId}/attachments/${attachmentId}/view`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      // Get content type from response or determine from file extension
      const contentType = response.headers['content-type'] || getContentTypeFromFileName(fileName);
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Clean up the URL object after a short delay
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Error viewing attachment:', error);
      setError('Không thể xem file đính kèm');
    }
  };

  const getContentTypeFromFileName = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'doc': return 'application/msword';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xls': return 'application/vnd.ms-excel';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'ppt': return 'application/vnd.ms-powerpoint';
      case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      case 'txt': return 'text/plain';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      case 'gif': return 'image/gif';
      default: return 'application/octet-stream';
    }
  };

  const handleDownloadAttachment = async (protocolId, attachmentId, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/protocols/${protocolId}/attachments/${attachmentId}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      setError('Không thể tải xuống file đính kèm');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft': return <Badge bg="secondary">Bản nháp</Badge>;
      case 'pending': return <Badge bg="warning">Chờ duyệt</Badge>;
      case 'approved': return <Badge bg="success">Đã duyệt</Badge>;
      case 'rejected': return <Badge bg="danger">Từ chối</Badge>;
      default: return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const truncate = (text, len = 100) => {
    if (!text) return '';
    const plain = text.replace(/<[^>]+>/g, '');
    return plain.length > len ? plain.slice(0, len) + '…' : plain;
  };

  if (loading) return <div className="text-center py-3"><CircularProgress size="sm"  /> Đang tải...</div>;

  return (
    <div className="protocol-content">
      {/* Selector */}
      {protocols.length > 0 && (
        <Box className="mb-3">
          <Typography variant="body2" className="small fw-bold">Chọn biên bản:</Typography>
          <Form.Select
            size="sm"
            value={selectedId || ''}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedId(id);
              const p = protocols.find(p => p._id === id);
              setActiveProtocol(p);
            }}
          >
            {protocols.map(p => (
              <option key={p._id} value={p._id}>{p.title} - {p.status}</option>
            ))}
          </Form.Select>
        </Box>
      )}

      {/* Active protocol display */}
      {activeProtocol ? (
        <Card className="mb-3">
          <CardHeader className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <h6 className="mb-0">{activeProtocol.title}</h6>
              {getStatusBadge(activeProtocol.status)}
            </div>
            <div className="d-flex align-items-center gap-2">
              <small className="text-muted">{new Date(activeProtocol.createdAt).toLocaleDateString('vi-VN')}</small>
              {canCreate && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={async () => {
                    if (!window.confirm('Xoá biên bản này khỏi lịch sử? Thao tác không thể hoàn tác.')) return;
                    try {
                      const token = localStorage.getItem('token');
                      await axios.delete(`${API_BASE_URL}/protocols/${activeProtocol._id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      // làm mới danh sách
                      fetchProtocols();
                    } catch (err) {
                      setError(err.response?.data?.message || 'Không thể xoá biên bản');
                    }
                  }}
                  title="Xoá khỏi lịch sử"
                >
                  <i className="fas fa-trash-alt"></i>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="protocol-body" dangerouslySetInnerHTML={{ __html: activeProtocol.content }} />
            
            {/* Thông tin phê duyệt/từ chối */}
            {activeProtocol.status !== 'pending' && activeProtocol.status !== 'draft' && (
              <div className={`mt-3 p-3 rounded ${activeProtocol.status === 'approved' ? 'bg-success-subtle' : 'bg-danger-subtle'}`}>
                {activeProtocol.status === 'approved' ? (
                  <div className="text-success">
                    <div className="d-flex align-items-center mb-2">
                      <i className="fas fa-check-circle me-2"></i>
                      <strong>Đã phê duyệt</strong>
                    </div>
                    {activeProtocol.approvedBy && (
                      <div className="small">
                        <strong>Phê duyệt bởi:</strong> {activeProtocol.approvedBy.fullName}
                        {activeProtocol.approvedAt && (
                          <span> • {new Date(activeProtocol.approvedAt).toLocaleDateString('vi-VN')} {new Date(activeProtocol.approvedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-danger">
                    <div className="d-flex align-items-center mb-2">
                    </div>
                    {activeProtocol.rejectedBy && (
                      <div className="small mb-2">
                        <strong>Từ chối bởi:</strong> {activeProtocol.rejectedBy.fullName}
                        {activeProtocol.rejectedAt && (
                          <span> • {new Date(activeProtocol.rejectedAt).toLocaleDateString('vi-VN')} {new Date(activeProtocol.rejectedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                      </div>
                    )}
                    {activeProtocol.rejectionReason && (
                      <div className="small">
                        <strong>Lý do từ chối:</strong>
                        <div className="bg-white p-2 rounded mt-1">{activeProtocol.rejectionReason}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* File đính kèm */}
            {activeProtocol.attachments && activeProtocol.attachments.length > 0 && (
              <div className="mt-3">
                <h6 className="mb-2">
                  <i className="fas fa-paperclip me-2"></i>
                  File đính kèm ({activeProtocol.attachments.length})
                </h6>
                <div className="attachments-list">
                  {activeProtocol.attachments.map((attachment, index) => (
                    <div key={attachment._id || index} className="attachment-item border rounded p-2 mb-2">
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                          <i className={`${getFileIcon(attachment.name)} me-2`}></i>
                          <div>
                            <div className="attachment-name fw-medium">{attachment.name}</div>
                            <small className="text-muted">
                              {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : ''} • 
                              {attachment.uploadedAt ? new Date(attachment.uploadedAt).toLocaleDateString('vi-VN') : ''}
                            </small>
                          </div>
                        </div>
                        <div className="attachment-actions">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-1"
                            onClick={() => handleViewAttachment(activeProtocol._id, attachment._id, attachment.name)}
                            title="Xem file"
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => handleDownloadAttachment(activeProtocol._id, attachment._id, attachment.name)}
                            title="Tải xuống"
                          >
                            <i className="fas fa-download"></i>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="text-muted text-center py-4">
          Chưa có biên bản nào cho cuộc họp này.
        </div>
      )}

      {/* History list */}
      {protocols.length > 1 && (
        <div className="protocol-history-list">
          <h6 className="mb-2">Danh sách biên bản</h6>
          {protocols.map(p => (
            <div key={p._id} className="border rounded p-2 mb-2" style={{ cursor: 'pointer' }} onClick={() => {setSelectedId(p._id); setActiveProtocol(p);}}>
              <div className="d-flex justify-content-between align-items-start gap-2">
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center gap-2 mb-1"><strong>{p.title}</strong>{getStatusBadge(p.status)}</div>
                  <small className="text-muted">{truncate(p.content)}</small>
                  {p.status === 'rejected' && p.rejectionReason && (
                    <div className="mt-1">
                      <small className="text-danger">
                        <i className="fas fa-exclamation-triangle me-1"></i>
                        Lý do từ chối: {truncate(p.rejectionReason, 50)}
                      </small>
                    </div>
                  )}
                </div>
                <small className="text-muted text-nowrap">{new Date(p.createdAt).toLocaleDateString('vi-VN')}</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {canCreate && (
        <Button variant="primary" size="sm" className="w-100 mt-3" onClick={() => setShowCreateModal(true)}>
          <i className="fas fa-plus me-2"></i>Tạo biên bản mới
        </Button>
      )}

      {/* Modal create */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Tạo biên bản mới</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger" onClick={() => setError('')}>{error}</div>}
          <Box className="mb-3">
            <Typography variant="body2">Tiêu đề</Typography>
            <TextField value={newData.title} onChange={(e) => setNewData({...newData, title: e.target.value})} />
          </Box>
          <Box className="mb-3">
            <Typography variant="body2">Nội dung</Typography>
            <ReactQuill theme="snow" value={newData.content} onChange={(val) => setNewData({...newData, content: val})} placeholder="Nhập nội dung biên bản..." />
          </Box>
          
          {/* File Upload */}
          <Box className="mb-3">
            <Typography variant="body2">File đính kèm</Typography>
            <TextField
              type="file"
              multiple
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
            />
            <Form.Text className="text-muted">
              Chấp nhận các file: PDF, Word, Excel, PowerPoint, Text, Image. Tối đa 10 files, mỗi file 50MB.
            </Form.Text>
          </Box>
          
          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <Box className="mb-3">
              <Typography variant="body2">Files đã chọn:</Typography>
              <div className="selected-files-preview">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="selected-file-item border rounded p-2 mb-2">
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center">
                        <i className={`${getFileIcon(file.name)} me-2`}></i>
                        <div>
                          <div className="file-name">{file.name}</div>
                          <small className="text-muted">{(file.size / 1024).toFixed(1)} KB</small>
                        </div>
                      </div>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => removeFile(index)}
                        title="Xóa file"
                      >
                        <i className="fas fa-times"></i>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Box>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Hủy</Button>
          <Button variant="primary" onClick={handleCreate} disabled={saving}>
            {saving ? <CircularProgress size="sm" className="me-2"  /> : null}
            Lưu
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ProtocolContent; 