import React, { useState, useEffect } from 'react';
import {
  Badge,
  Button,
  Alert
} from '@mui/material';
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const MinutesDraftEditor = ({ meetingId, user, organizerId, secretaryId }) => {
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('draft');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reviewer, setReviewer] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/meetings/${meetingId}/minutes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDraft(res.data.minutesDraft || '');
      setStatus(res.data.minutesStatus || 'draft');
      setReviewer(res.data.reviewer || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải biên bản');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (meetingId) fetchData();
    // eslint-disable-next-line
  }, [meetingId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/meetings/${meetingId}/minutes`, { minutesDraft: draft }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus('draft');
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi lưu');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/meetings/${meetingId}/minutes/submit`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus('pending');
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi gửi duyệt');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (approve) => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/meetings/${meetingId}/minutes/approve`, { approve }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(approve ? 'approved' : 'rejected');
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi phê duyệt');
    } finally {
      setSaving(false);
    }
  };

  const handleNewDraft = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/meetings/${meetingId}/minutes`, { minutesDraft: '' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDraft('');
      setStatus('draft');
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi tạo biên bản mới');
    } finally {
      setSaving(false);
    }
  };

  const renderStatusBadge = () => {
    switch (status) {
      case 'draft': return <Badge bg="secondary">Bản nháp</Badge>;
      case 'pending': return <Badge bg="warning">Chờ duyệt</Badge>;
      case 'approved': return <Badge bg="success">Đã duyệt</Badge>;
      case 'rejected': return <Badge bg="danger">Bị từ chối</Badge>;
      default: return null;
    }
  };

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      [{ size: ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ align: [] }],
      ['link'],
      ['clean']
    ]};

  const quillFormats = [
    'header', 'size', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'list', 'bullet', 'indent', 'align', 'link'
  ];

  const canEdit = (
    user?.role === 'admin' ||
    user?.role === 'manager' ||
    user?.role === 'secretary' ||
    user?.role === 'assistant' ||
    (organizerId && user?._id === organizerId) ||
    (secretaryId && user?._id === secretaryId)
  ) && status === 'draft';

  if (loading) return (
    <div className="text-center py-3"><CircularProgress size="sm"  /> Đang tải...</div>
  );

  return (
    <div className="minutes-draft-editor">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Nội dung Biên bản</h6>
        {renderStatusBadge()}
      </div>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

      <ReactQuill
        theme="snow"
        value={draft}
        onChange={setDraft}
        modules={quillModules}
        formats={quillFormats}
        readOnly={!canEdit || saving}
        className="minutes-rich-editor mb-2"
        placeholder="Nhập nội dung biên bản..."
      />

      {/* Buttons */}
      {canEdit && (
        <div className="d-flex gap-2">
          <Button variant="secondary" size="sm" disabled={saving} onClick={handleSave}>Lưu nháp</Button>
          <Button variant="primary" size="sm" disabled={saving || !draft.trim()} onClick={handleSubmit}>Gửi duyệt</Button>
        </div>
      )}

      {status === 'pending' && user && user._id && (
        <>
          { (user.role === 'admin' || (reviewer && reviewer._id === user._id)) && (
            <div className="d-flex gap-2 mt-2">
              <Button variant="success" size="sm" disabled={saving} onClick={() => handleApprove(true)}>Phê duyệt</Button>
              <Button variant="outline-danger" size="sm" disabled={saving} onClick={() => handleApprove(false)}>Từ chối</Button>
            </div>
          )}
          <small className="text-muted d-block mt-1">Đang chờ chủ trì phê duyệt...</small>
        </>
      )}

      {status === 'approved' && <Alert variant="success" className="mt-2">Biên bản đã được phê duyệt.</Alert>}
      {status === 'rejected' && <Alert variant="warning" className="mt-2">Biên bản bị từ chối.</Alert>}

      {(status === 'approved' || status === 'rejected') && (user?.role === 'admin' || user?.role === 'manager' || user?.role === 'secretary') && (
        <div className="mt-2">
          <Button variant="outline-primary" size="sm" disabled={saving} onClick={handleNewDraft}>
            <i className="fas fa-plus me-1"></i>
            Tạo biên bản mới
          </Button>
        </div>
      )}
    </div>
  );
};

export default MinutesDraftEditor; 