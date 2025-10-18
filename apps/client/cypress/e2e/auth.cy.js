describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  describe('Login Page', () => {
    it('should display login form', () => {
      cy.get('[data-testid="email-input"]').should('be.visible');
      cy.get('[data-testid="password-input"]').should('be.visible');
      cy.get('[data-testid="login-button"]').should('be.visible');
      cy.get('[data-testid="login-button"]').should('contain.text', 'Đăng nhập');
    });

    it('should show validation errors for empty fields', () => {
      cy.get('[data-testid="login-button"]').click();
      
      cy.get('[data-testid="email-error"]').should('be.visible');
      cy.get('[data-testid="password-error"]').should('be.visible');
    });

    it('should show error for invalid email format', () => {
      cy.fillField('email-input', 'invalid-email');
      cy.get('[data-testid="login-button"]').click();
      
      cy.get('[data-testid="email-error"]')
        .should('be.visible')
        .and('contain.text', 'Email không hợp lệ');
    });

    it('should login successfully with valid credentials', () => {
      // Intercept login API
      cy.intercept('POST', '/api/auth/login', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            user: {
              _id: '507f1f77bcf86cd799439011',
              name: 'Test Admin',
              email: 'admin@example.com',
              role: 'admin'
            },
            token: 'mock-jwt-token'
          }
        }
      }).as('loginRequest');

      cy.fillField('email-input', Cypress.env('adminEmail'));
      cy.fillField('password-input', Cypress.env('adminPassword'));
      cy.get('[data-testid="login-button"]').click();

      cy.wait('@loginRequest');
      cy.url().should('not.include', '/login');
      cy.url().should('include', '/dashboard');
    });

    it('should show error message for invalid credentials', () => {
      cy.intercept('POST', '/api/auth/login', {
        statusCode: 401,
        body: {
          success: false,
          message: 'Email hoặc mật khẩu không hợp lệ'
        }
      }).as('loginError');

      cy.fillField('email-input', 'wrong@example.com');
      cy.fillField('password-input', 'wrongpassword');
      cy.get('[data-testid="login-button"]').click();

      cy.wait('@loginError');
      cy.checkNotification('Email hoặc mật khẩu không hợp lệ', 'error');
    });

    it('should show loading state during login', () => {
      cy.intercept('POST', '/api/auth/login', (req) => {
        req.reply((res) => {
          res.delay(1000);
          res.send({
            statusCode: 200,
            body: { success: true, data: { user: {}, token: 'token' } }
          });
        });
      }).as('slowLogin');

      cy.fillField('email-input', Cypress.env('adminEmail'));
      cy.fillField('password-input', Cypress.env('adminPassword'));
      cy.get('[data-testid="login-button"]').click();

      cy.get('[data-testid="login-button"]')
        .should('be.disabled')
        .and('contain.text', 'Đang xử lý...');
      
      cy.get('[data-testid="loading-spinner"]').should('be.visible');
    });

    it('should toggle password visibility', () => {
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'password');
      
      cy.get('[data-testid="toggle-password"]').click();
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'text');
      
      cy.get('[data-testid="toggle-password"]').click();
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'password');
    });
  });

  describe('OAuth Login', () => {
    it('should display OAuth buttons', () => {
      cy.get('[data-testid="google-login"]').should('be.visible');
      cy.get('[data-testid="github-login"]').should('be.visible');
      cy.get('[data-testid="microsoft-login"]').should('be.visible');
    });

    it('should handle Google OAuth login', () => {
      // Mock OAuth popup
      cy.window().then((win) => {
        cy.stub(win, 'open').returns({
          closed: false,
          location: { href: 'http://localhost:3000/auth/callback?token=oauth-token' }
        });
      });

      cy.get('[data-testid="google-login"]').click();
      
      // Verify OAuth flow initiated
      cy.window().its('open').should('have.been.called');
    });
  });

  describe('Logout Flow', () => {
    beforeEach(() => {
      // Login first
      cy.login();
      cy.visit('/dashboard');
    });

    it('should logout successfully', () => {
      cy.intercept('POST', '/api/auth/logout', {
        statusCode: 200,
        body: { success: true, message: 'Đăng xuất thành công' }
      }).as('logoutRequest');

      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();

      cy.wait('@logoutRequest');
      cy.url().should('include', '/login');
      cy.checkNotification('Đăng xuất thành công', 'success');
    });

    it('should clear user data on logout', () => {
      cy.logout();
      
      // Verify localStorage is cleared
      cy.window().its('localStorage').invoke('getItem', 'token').should('be.null');
      cy.window().its('localStorage').invoke('getItem', 'user').should('be.null');
    });
  });

  describe('Protected Routes', () => {
    it('should redirect to login for unauthenticated users', () => {
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
    });

    it('should redirect to dashboard after login', () => {
      cy.visit('/meetings');
      cy.url().should('include', '/login');
      
      cy.login();
      cy.url().should('include', '/meetings');
    });

    it('should handle expired token', () => {
      // Set expired token
      cy.window().its('localStorage').invoke('setItem', 'token', 'expired-token');
      
      cy.intercept('GET', '/api/auth/me', {
        statusCode: 401,
        body: { success: false, message: 'Token expired' }
      }).as('tokenExpired');

      cy.visit('/dashboard');
      
      cy.wait('@tokenExpired');
      cy.url().should('include', '/login');
      cy.checkNotification('Phiên đăng nhập đã hết hạn', 'warning');
    });
  });

  describe('Role-based Access', () => {
    it('should allow admin access to all pages', () => {
      cy.login('admin@example.com', 'admin123');
      
      cy.visit('/users');
      cy.url().should('include', '/users');
      
      cy.visit('/meetings');
      cy.url().should('include', '/meetings');
      
      cy.visit('/reports');
      cy.url().should('include', '/reports');
    });

    it('should restrict technician access', () => {
      cy.login('technician@example.com', 'tech123');
      
      cy.visit('/users');
      cy.url().should('include', '/403'); // Forbidden page
      
      cy.visit('/meetings');
      cy.url().should('include', '/meetings'); // Should have access
    });

    it('should show appropriate navigation items based on role', () => {
      cy.login('secretary@example.com', 'secretary123');
      
      cy.get('[data-testid="nav-meetings"]').should('be.visible');
      cy.get('[data-testid="nav-minutes"]').should('be.visible');
      cy.get('[data-testid="nav-users"]').should('not.exist');
      cy.get('[data-testid="nav-reports"]').should('be.visible');
    });
  });

  describe('Session Management', () => {
    it('should maintain session across page refreshes', () => {
      cy.login();
      cy.visit('/dashboard');
      
      cy.reload();
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="user-name"]').should('be.visible');
    });

    it('should handle concurrent sessions', () => {
      cy.login();
      
      // Simulate login from another tab/device
      cy.window().then((win) => {
        win.localStorage.setItem('token', 'new-token-from-another-session');
      });
      
      // Next API call should handle token conflict
      cy.visit('/meetings');
      cy.get('[data-testid="session-conflict-modal"]').should('be.visible');
    });
  });

  describe('Password Reset Flow', () => {
    beforeEach(() => {
      cy.visit('/forgot-password');
    });

    it('should send password reset email', () => {
      cy.intercept('POST', '/api/auth/forgot-password', {
        statusCode: 200,
        body: { success: true, message: 'Email đặt lại mật khẩu đã được gửi' }
      }).as('forgotPassword');

      cy.fillField('email-input', 'user@example.com');
      cy.get('[data-testid="send-reset-button"]').click();

      cy.wait('@forgotPassword');
      cy.checkNotification('Email đặt lại mật khẩu đã được gửi', 'success');
    });

    it('should handle invalid email for password reset', () => {
      cy.intercept('POST', '/api/auth/forgot-password', {
        statusCode: 404,
        body: { success: false, message: 'Email không tồn tại trong hệ thống' }
      }).as('invalidEmail');

      cy.fillField('email-input', 'nonexistent@example.com');
      cy.get('[data-testid="send-reset-button"]').click();

      cy.wait('@invalidEmail');
      cy.checkNotification('Email không tồn tại trong hệ thống', 'error');
    });
  });
});
