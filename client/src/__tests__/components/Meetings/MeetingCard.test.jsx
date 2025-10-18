import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { render, mockMeeting, createMockUser } from '../../utils/test-utils';
import MeetingCard from '../../../components/Meetings/MeetingCard';

describe('MeetingCard Component', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnJoin = jest.fn();

  const defaultProps = {
    meeting: mockMeeting,
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    onJoin: mockOnJoin
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders meeting information correctly', () => {
    render(<MeetingCard {...defaultProps} />);
    
    expect(screen.getByText(mockMeeting.title)).toBeInTheDocument();
    expect(screen.getByText(mockMeeting.description)).toBeInTheDocument();
    expect(screen.getByText(mockMeeting.location)).toBeInTheDocument();
  });

  it('displays meeting time correctly', () => {
    render(<MeetingCard {...defaultProps} />);
    
    // Check if start and end times are displayed
    expect(screen.getByText(/10:00/)).toBeInTheDocument();
    expect(screen.getByText(/11:00/)).toBeInTheDocument();
  });

  it('shows meeting status badge', () => {
    render(<MeetingCard {...defaultProps} />);
    
    expect(screen.getByText(/scheduled/i)).toBeInTheDocument();
  });

  it('displays organizer information', () => {
    render(<MeetingCard {...defaultProps} />);
    
    expect(screen.getByText(mockMeeting.organizer.name)).toBeInTheDocument();
  });

  it('shows attendees count', () => {
    render(<MeetingCard {...defaultProps} />);
    
    expect(screen.getByText(/1 người tham gia/i)).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    render(<MeetingCard {...defaultProps} />);
    
    const editButton = screen.getByRole('button', { name: /chỉnh sửa/i });
    fireEvent.click(editButton);
    
    expect(mockOnEdit).toHaveBeenCalledWith(mockMeeting);
  });

  it('calls onDelete when delete button is clicked', () => {
    render(<MeetingCard {...defaultProps} />);
    
    const deleteButton = screen.getByRole('button', { name: /xóa/i });
    fireEvent.click(deleteButton);
    
    expect(mockOnDelete).toHaveBeenCalledWith(mockMeeting._id);
  });

  it('calls onJoin when join button is clicked', () => {
    const ongoingMeeting = {
      ...mockMeeting,
      status: 'ongoing'
    };
    
    render(<MeetingCard {...defaultProps} meeting={ongoingMeeting} />);
    
    const joinButton = screen.getByRole('button', { name: /tham gia/i });
    fireEvent.click(joinButton);
    
    expect(mockOnJoin).toHaveBeenCalledWith(ongoingMeeting._id);
  });

  it('hides action buttons for non-organizer users', () => {
    const nonOrganizerUser = createMockUser('secretary', { _id: 'different-id' });
    
    render(
      <MeetingCard {...defaultProps} />,
      { authValue: { user: nonOrganizerUser, token: 'token' } }
    );
    
    expect(screen.queryByRole('button', { name: /chỉnh sửa/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /xóa/i })).not.toBeInTheDocument();
  });

  it('shows different status colors for different meeting statuses', () => {
    const { rerender } = render(<MeetingCard {...defaultProps} />);
    
    // Scheduled meeting
    expect(screen.getByText(/scheduled/i)).toHaveClass('status-scheduled');
    
    // Ongoing meeting
    const ongoingMeeting = { ...mockMeeting, status: 'ongoing' };
    rerender(<MeetingCard {...defaultProps} meeting={ongoingMeeting} />);
    expect(screen.getByText(/ongoing/i)).toHaveClass('status-ongoing');
    
    // Completed meeting
    const completedMeeting = { ...mockMeeting, status: 'completed' };
    rerender(<MeetingCard {...defaultProps} meeting={completedMeeting} />);
    expect(screen.getByText(/completed/i)).toHaveClass('status-completed');
  });

  it('shows priority indicator for high priority meetings', () => {
    const highPriorityMeeting = {
      ...mockMeeting,
      priority: 'high'
    };
    
    render(<MeetingCard {...defaultProps} meeting={highPriorityMeeting} />);
    
    expect(screen.getByTestId('priority-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('priority-indicator')).toHaveClass('priority-high');
  });

  it('handles missing meeting data gracefully', () => {
    const incompleteMeeting = {
      _id: 'test-id',
      title: 'Test Meeting',
      // Missing other fields
    };
    
    render(<MeetingCard {...defaultProps} meeting={incompleteMeeting} />);
    
    expect(screen.getByText('Test Meeting')).toBeInTheDocument();
    // Should not crash when optional fields are missing
  });
});
