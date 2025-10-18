describe('Meeting Management', () => {
  beforeEach(() => {
    cy.login();
  });

  describe('Meeting List Page', () => {
    beforeEach(() => {
      cy.visit('/meetings');
    });

    it('should display meetings list', () => {
      cy.waitForApi('@getMeetings');
      
      cy.get('[data-testid="meetings-list"]').should('be.visible');
      cy.get('[data-testid="meeting-card"]').should('have.length.at.least', 1);
    });

    it('should show meeting information correctly', () => {
      cy.waitForApi('@getMeetings');
      
      cy.get('[data-testid="meeting-card"]').first().within(() => {
        cy.get('[data-testid="meeting-title"]').should('be.visible');
        cy.get('[data-testid="meeting-time"]').should('be.visible');
        cy.get('[data-testid="meeting-location"]').should('be.visible');
        cy.get('[data-testid="meeting-status"]').should('be.visible');
        cy.get('[data-testid="meeting-organizer"]').should('be.visible');
      });
    });

    it('should filter meetings by status', () => {
      cy.get('[data-testid="status-filter"]').click();
      cy.get('[data-value="scheduled"]').click();
      
      cy.waitForApi('@getMeetings');
      
      cy.get('[data-testid="meeting-card"]').each(($card) => {
        cy.wrap($card).find('[data-testid="meeting-status"]').should('contain.text', 'Đã lên lịch');
      });
    });

    it('should search meetings by title', () => {
      cy.get('[data-testid="search-input"]').type('Weekly Team');
      cy.get('[data-testid="search-button"]').click();
      
      cy.waitForApi('@getMeetings');
      
      cy.get('[data-testid="meeting-card"]').should('have.length.at.least', 1);
      cy.get('[data-testid="meeting-title"]').should('contain.text', 'Weekly Team');
    });

    it('should navigate to create meeting page', () => {
      cy.get('[data-testid="create-meeting-button"]').click();
      cy.url().should('include', '/meetings/create');
    });

    it('should show pagination when there are many meetings', () => {
      // Mock API response with pagination
      cy.intercept('GET', '/api/meetings*', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            meetings: Array(10).fill().map((_, i) => ({
              _id: `meeting-${i}`,
              title: `Meeting ${i}`,
              startTime: new Date().toISOString(),
              endTime: new Date().toISOString(),
              status: 'scheduled'
            })),
            totalPages: 3,
            currentPage: 1,
            totalMeetings: 25
          }
        }
      }).as('getMeetingsWithPagination');

      cy.reload();
      cy.waitForApi('@getMeetingsWithPagination');
      
      cy.get('[data-testid="pagination"]').should('be.visible');
      cy.get('[data-testid="page-2"]').click();
      
      cy.url().should('include', 'page=2');
    });
  });

  describe('Create Meeting', () => {
    beforeEach(() => {
      cy.visit('/meetings/create');
    });

    it('should display create meeting form', () => {
      cy.get('[data-testid="meeting-title"]').should('be.visible');
      cy.get('[data-testid="meeting-description"]').should('be.visible');
      cy.get('[data-testid="start-time"]').should('be.visible');
      cy.get('[data-testid="end-time"]').should('be.visible');
      cy.get('[data-testid="meeting-location"]').should('be.visible');
      cy.get('[data-testid="create-meeting-button"]').should('be.visible');
    });

    it('should create meeting successfully', () => {
      cy.intercept('POST', '/api/meetings', {
        statusCode: 201,
        body: {
          success: true,
          data: {
            _id: 'new-meeting-id',
            title: 'New Test Meeting',
            description: 'Test description',
            startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
            location: 'Conference Room A',
            status: 'scheduled'
          }
        }
      }).as('createMeeting');

      cy.createMeeting({
        title: 'New Test Meeting',
        description: 'Test description',
        location: 'Conference Room A'
      });

      cy.wait('@createMeeting');
      cy.checkNotification('Tạo cuộc họp thành công', 'success');
      cy.url().should('include', '/meetings');
    });

    it('should show validation errors for required fields', () => {
      cy.get('[data-testid="create-meeting-button"]').click();
      
      cy.get('[data-testid="title-error"]').should('be.visible');
      cy.get('[data-testid="start-time-error"]').should('be.visible');
      cy.get('[data-testid="end-time-error"]').should('be.visible');
    });

    it('should validate end time is after start time', () => {
      const now = new Date();
      const startTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
      const endTime = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hour from now

      cy.fillField('meeting-title', 'Test Meeting');
      cy.fillField('start-time', startTime.toISOString().slice(0, 16));
      cy.fillField('end-time', endTime.toISOString().slice(0, 16));
      
      cy.get('[data-testid="create-meeting-button"]').click();
      
      cy.get('[data-testid="end-time-error"]')
        .should('be.visible')
        .and('contain.text', 'Thời gian kết thúc phải sau thời gian bắt đầu');
    });

    it('should add and remove attendees', () => {
      cy.get('[data-testid="add-attendee-button"]').click();
      cy.get('[data-testid="attendee-search"]').type('manager@example.com');
      cy.get('[data-testid="attendee-option"]').first().click();
      
      cy.get('[data-testid="attendee-chip"]').should('contain.text', 'Manager User');
      
      cy.get('[data-testid="remove-attendee"]').click();
      cy.get('[data-testid="attendee-chip"]').should('not.exist');
    });

    it('should select meeting room', () => {
      cy.get('[data-testid="room-selector"]').click();
      cy.get('[data-testid="room-option"]').first().click();
      
      cy.get('[data-testid="selected-room"]').should('be.visible');
    });

    it('should handle room booking conflict', () => {
      cy.intercept('POST', '/api/meetings', {
        statusCode: 409,
        body: {
          success: false,
          message: 'Phòng họp đã được đặt trong thời gian này'
        }
      }).as('roomConflict');

      cy.createMeeting();
      
      cy.wait('@roomConflict');
      cy.checkNotification('Phòng họp đã được đặt trong thời gian này', 'error');
    });
  });

  describe('Meeting Details', () => {
    beforeEach(() => {
      cy.intercept('GET', '/api/meetings/*', { fixture: 'meeting-detail.json' }).as('getMeetingDetail');
      cy.visit('/meetings/507f1f77bcf86cd799439012');
    });

    it('should display meeting details', () => {
      cy.waitForApi('@getMeetingDetail');
      
      cy.get('[data-testid="meeting-title"]').should('contain.text', 'Weekly Team Meeting');
      cy.get('[data-testid="meeting-description"]').should('be.visible');
      cy.get('[data-testid="meeting-time"]').should('be.visible');
      cy.get('[data-testid="meeting-location"]').should('be.visible');
      cy.get('[data-testid="meeting-organizer"]').should('be.visible');
      cy.get('[data-testid="attendees-list"]').should('be.visible');
    });

    it('should show action buttons for organizer', () => {
      cy.get('[data-testid="edit-meeting-button"]').should('be.visible');
      cy.get('[data-testid="delete-meeting-button"]').should('be.visible');
      cy.get('[data-testid="start-meeting-button"]').should('be.visible');
    });

    it('should edit meeting', () => {
      cy.get('[data-testid="edit-meeting-button"]').click();
      cy.url().should('include', '/meetings/507f1f77bcf86cd799439012/edit');
    });

    it('should delete meeting with confirmation', () => {
      cy.intercept('DELETE', '/api/meetings/*', {
        statusCode: 200,
        body: { success: true, message: 'Xóa cuộc họp thành công' }
      }).as('deleteMeeting');

      cy.get('[data-testid="delete-meeting-button"]').click();
      
      cy.get('[data-testid="confirm-dialog"]').should('be.visible');
      cy.get('[data-testid="confirm-delete"]').click();
      
      cy.wait('@deleteMeeting');
      cy.checkNotification('Xóa cuộc họp thành công', 'success');
      cy.url().should('include', '/meetings');
    });

    it('should start meeting', () => {
      cy.intercept('POST', '/api/meetings/*/start', {
        statusCode: 200,
        body: { success: true, data: { meetingLink: 'https://meet.google.com/abc-defg' } }
      }).as('startMeeting');

      cy.get('[data-testid="start-meeting-button"]').click();
      
      cy.wait('@startMeeting');
      cy.get('[data-testid="meeting-link"]').should('be.visible');
    });

    it('should join ongoing meeting', () => {
      // Mock ongoing meeting
      cy.intercept('GET', '/api/meetings/*', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            _id: '507f1f77bcf86cd799439012',
            title: 'Ongoing Meeting',
            status: 'ongoing',
            meetingLink: 'https://meet.google.com/abc-defg'
          }
        }
      }).as('getOngoingMeeting');

      cy.reload();
      cy.waitForApi('@getOngoingMeeting');
      
      cy.get('[data-testid="join-meeting-button"]').should('be.visible');
      cy.get('[data-testid="join-meeting-button"]').click();
      
      // Should open meeting link in new tab
      cy.window().its('open').should('have.been.called');
    });
  });

  describe('Meeting Calendar View', () => {
    beforeEach(() => {
      cy.visit('/meetings/calendar');
    });

    it('should display calendar view', () => {
      cy.get('[data-testid="calendar-view"]').should('be.visible');
      cy.get('[data-testid="calendar-month"]').should('be.visible');
      cy.get('[data-testid="calendar-navigation"]').should('be.visible');
    });

    it('should navigate between months', () => {
      cy.get('[data-testid="prev-month"]').click();
      cy.get('[data-testid="next-month"]').click();
    });

    it('should show meetings on calendar', () => {
      cy.get('[data-testid="calendar-event"]').should('have.length.at.least', 1);
    });

    it('should create meeting by clicking on date', () => {
      cy.get('[data-testid="calendar-date"]').first().click();
      cy.get('[data-testid="quick-create-modal"]').should('be.visible');
      
      cy.fillField('quick-title', 'Quick Meeting');
      cy.get('[data-testid="quick-create-button"]').click();
      
      cy.url().should('include', '/meetings/create');
    });

    it('should switch between calendar views', () => {
      cy.get('[data-testid="view-month"]').click();
      cy.get('[data-testid="calendar-month-view"]').should('be.visible');
      
      cy.get('[data-testid="view-week"]').click();
      cy.get('[data-testid="calendar-week-view"]').should('be.visible');
      
      cy.get('[data-testid="view-day"]').click();
      cy.get('[data-testid="calendar-day-view"]').should('be.visible');
    });
  });

  describe('Meeting Search and Filters', () => {
    beforeEach(() => {
      cy.visit('/meetings');
    });

    it('should search meetings by multiple criteria', () => {
      cy.get('[data-testid="advanced-search"]').click();
      
      cy.fillField('search-title', 'Team');
      cy.selectOption('search-status', 'scheduled');
      cy.selectOption('search-organizer', 'admin@example.com');
      
      cy.get('[data-testid="apply-filters"]').click();
      
      cy.waitForApi('@getMeetings');
      cy.url().should('include', 'title=Team');
      cy.url().should('include', 'status=scheduled');
    });

    it('should filter by date range', () => {
      cy.get('[data-testid="date-range-filter"]').click();
      
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      cy.fillField('start-date', today.toISOString().split('T')[0]);
      cy.fillField('end-date', nextWeek.toISOString().split('T')[0]);
      
      cy.get('[data-testid="apply-date-filter"]').click();
      
      cy.waitForApi('@getMeetings');
    });

    it('should save and load search preferences', () => {
      cy.get('[data-testid="search-input"]').type('Weekly');
      cy.get('[data-testid="status-filter"]').select('scheduled');
      
      cy.get('[data-testid="save-search"]').click();
      cy.fillField('search-name', 'My Weekly Meetings');
      cy.get('[data-testid="confirm-save"]').click();
      
      cy.reload();
      
      cy.get('[data-testid="saved-searches"]').click();
      cy.get('[data-testid="saved-search-item"]').contains('My Weekly Meetings').click();
      
      cy.get('[data-testid="search-input"]').should('have.value', 'Weekly');
    });
  });

  describe('Responsive Design', () => {
    it('should work on mobile devices', () => {
      cy.viewport('iphone-x');
      cy.visit('/meetings');
      
      cy.get('[data-testid="mobile-menu"]').should('be.visible');
      cy.get('[data-testid="meetings-list"]').should('be.visible');
      
      // Test mobile-specific interactions
      cy.get('[data-testid="meeting-card"]').first().click();
      cy.get('[data-testid="meeting-actions"]').should('be.visible');
    });

    it('should work on tablet devices', () => {
      cy.viewport('ipad-2');
      cy.visit('/meetings');
      
      cy.get('[data-testid="meetings-list"]').should('be.visible');
      cy.get('[data-testid="sidebar"]').should('be.visible');
    });
  });
});
