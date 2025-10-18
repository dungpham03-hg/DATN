// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command for login
Cypress.Commands.add('login', (email = 'admin@example.com', password = 'admin123') => {
  cy.session([email, password], () => {
    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type(email);
    cy.get('[data-testid="password-input"]').type(password);
    cy.get('[data-testid="login-button"]').click();
    cy.url().should('not.include', '/login');
    cy.window().its('localStorage.token').should('exist');
  });
});

// Custom command for logout
Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();
  cy.url().should('include', '/login');
});

// Custom command để tạo meeting
Cypress.Commands.add('createMeeting', (meetingData = {}) => {
  const defaultMeeting = {
    title: 'Test Meeting',
    description: 'Test meeting description',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
    location: 'Conference Room A',
    ...meetingData
  };

  cy.visit('/meetings/create');
  cy.get('[data-testid="meeting-title"]').type(defaultMeeting.title);
  cy.get('[data-testid="meeting-description"]').type(defaultMeeting.description);
  cy.get('[data-testid="meeting-location"]').type(defaultMeeting.location);
  
  // Set start time
  cy.get('[data-testid="start-time"]').click();
  cy.get('[data-testid="start-time"]').clear().type(defaultMeeting.startTime);
  
  // Set end time
  cy.get('[data-testid="end-time"]').click();
  cy.get('[data-testid="end-time"]').clear().type(defaultMeeting.endTime);
  
  cy.get('[data-testid="create-meeting-button"]').click();
});

// Custom command để wait cho API response
Cypress.Commands.add('waitForApi', (alias, timeout = 10000) => {
  cy.wait(alias, { timeout });
});

// Custom command để check notification
Cypress.Commands.add('checkNotification', (message, type = 'success') => {
  cy.get(`[data-testid="notification-${type}"]`)
    .should('be.visible')
    .and('contain.text', message);
});

// Custom command để navigate với loading check
Cypress.Commands.add('navigateAndWait', (path) => {
  cy.visit(path);
  cy.get('[data-testid="loading-spinner"]').should('not.exist');
});

// Custom command để fill form field
Cypress.Commands.add('fillField', (testId, value) => {
  cy.get(`[data-testid="${testId}"]`).clear().type(value);
});

// Custom command để select dropdown option
Cypress.Commands.add('selectOption', (testId, value) => {
  cy.get(`[data-testid="${testId}"]`).click();
  cy.get(`[data-value="${value}"]`).click();
});

// Custom command để upload file
Cypress.Commands.add('uploadFile', (testId, fileName) => {
  cy.get(`[data-testid="${testId}"]`).selectFile(`cypress/fixtures/${fileName}`);
});

// Custom command để check table data
Cypress.Commands.add('checkTableRow', (rowIndex, columnData) => {
  Object.entries(columnData).forEach(([column, value]) => {
    cy.get(`[data-testid="table-row-${rowIndex}"]`)
      .find(`[data-testid="column-${column}"]`)
      .should('contain.text', value);
  });
});

// Custom command để wait cho element visible
Cypress.Commands.add('waitForElement', (selector, timeout = 10000) => {
  cy.get(selector, { timeout }).should('be.visible');
});

// Override type command để support special characters
Cypress.Commands.overwrite('type', (originalFn, element, text, options) => {
  if (options && options.parseSpecialCharSequences === false) {
    return originalFn(element, text, options);
  }
  return originalFn(element, text, { parseSpecialCharSequences: false, ...options });
});
