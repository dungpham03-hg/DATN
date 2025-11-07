# Quy trình Kiểm thử - Dự án Quản lý Cuộc họp

## 🎯 Tổng quan

Dự án đã được thiết lập với quy trình kiểm thử toàn diện bao gồm:

- ✅ **Unit Tests**: Jest + React Testing Library (Frontend), Jest + Supertest (Backend)
- ✅ **Integration Tests**: API endpoints và database interactions
- ✅ **E2E Tests**: Cypress cho user workflows
- ✅ **CI/CD Pipeline**: GitHub Actions với automated testing
- ✅ **Code Coverage**: Minimum 70% backend, 60% frontend
- ✅ **Security Testing**: Dependency scanning và vulnerability checks

## 🚀 Quick Start

### Cài đặt Dependencies
```bash
# Cài đặt tất cả dependencies
npm install

# Hoặc cài đặt riêng lẻ
npm run install:client
npm run install:server
```

### Chạy Tests

#### Tất cả Tests
```bash
npm test
```

#### Frontend Tests
```bash
npm run test:client
npm run test:coverage:client
```

#### Backend Tests
```bash
npm run test:server
npm run test:coverage:server
```

#### E2E Tests
```bash
npm run test:e2e
npm run test:e2e:open  # Interactive mode
```

#### Docker Tests
```bash
npm run test:docker
```

## 📊 Coverage Reports

### Xem Coverage Reports
```bash
# Sau khi chạy tests với coverage
open client/coverage/lcov-report/index.html
open server/coverage/lcov-report/index.html
```

### Coverage Thresholds
- **Backend**: 70% (branches, functions, lines, statements)
- **Frontend**: 60% (branches, functions, lines, statements)

## 🏗️ Cấu trúc Test

### Frontend Tests
```
client/src/
├── __tests__/
│   ├── components/          # Component tests
│   │   ├── Auth/
│   │   │   └── DomainLogin.test.jsx
│   │   └── Meetings/
│   │       └── MeetingCard.test.jsx
│   ├── utils/
│   │   ├── test-utils.jsx   # Test utilities
│   │   └── dateUtils.test.js
│   └── mocks/
│       ├── handlers.js      # MSW handlers
│       └── server.js        # MSW server setup
├── cypress/
│   ├── e2e/
│   │   ├── auth.cy.js
│   │   └── meetings.cy.js
│   ├── fixtures/
│   └── support/
└── setupTests.js
```

### Backend Tests
```
server/tests/
├── unit/
│   ├── models/
│   │   ├── User.test.js
│   │   └── Meeting.test.js
│   └── utils/
├── integration/
│   ├── auth.test.js
│   └── meetings.test.js
├── fixtures/
│   └── testData.js
└── setup.js
```

## 🔧 Test Commands Chi tiết

### Development
```bash
# Watch mode cho frontend
cd client && npm test

# Watch mode cho backend
cd server && npm run test:watch

# Chạy specific test file
cd client && npm test -- MeetingCard.test.jsx
cd server && npm test -- User.test.js
```

### CI/CD
```bash
# CI mode (no watch, exit after completion)
npm run test:client
npm run test:server

# Coverage reports
npm run test:coverage
```

### E2E Testing
```bash
# Headless mode
npm run test:e2e

# Interactive mode với Cypress UI
npm run test:e2e:open

# Specific test file
cd client && npx cypress run --spec "cypress/e2e/auth.cy.js"
```

## 🐳 Docker Testing

### Test trong Docker Environment
```bash
# Chạy toàn bộ test suite trong Docker
npm run test:docker

# Hoặc manual
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
docker-compose -f docker-compose.test.yml down
```

## 📝 Viết Tests Mới

### Frontend Component Test
```javascript
// client/src/__tests__/components/MyComponent.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '../../utils/test-utils';
import MyComponent from '../../../components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Backend API Test
```javascript
// server/tests/integration/myapi.test.js
const request = require('supertest');
const app = require('../../index');

describe('My API', () => {
  it('should return data', async () => {
    const response = await request(app)
      .get('/api/my-endpoint')
      .expect(200);
    
    expect(response.body.success).toBe(true);
  });
});
```

### E2E Test
```javascript
// client/cypress/e2e/my-feature.cy.js
describe('My Feature', () => {
  beforeEach(() => {
    cy.login();
  });

  it('should work correctly', () => {
    cy.visit('/my-page');
    cy.get('[data-testid="my-button"]').click();
    cy.checkNotification('Success message', 'success');
  });
});
```

## 🔍 Debugging Tests

### Frontend
```bash
# Debug với Chrome DevTools
cd client && npm test -- --inspect-brk

# Verbose output
cd client && npm test -- --verbose

# Specific test pattern
cd client && npm test -- --testNamePattern="should render"
```

### Backend
```bash
# Debug với Node Inspector
cd server && node --inspect-brk node_modules/.bin/jest --runInBand

# Specific test file
cd server && npm test -- User.test.js
```

### Cypress
```bash
# Debug mode
cd client && npx cypress run --headed --no-exit

# Specific spec
cd client && npx cypress run --spec "cypress/e2e/auth.cy.js"
```

## 🚨 CI/CD Pipeline

### GitHub Actions
Tests chạy tự động khi:
- Push lên `main` hoặc `develop` branches
- Tạo Pull Request
- Merge Pull Request

### Pipeline Stages
1. **Lint**: Code quality checks
2. **Unit Tests**: Frontend và Backend
3. **Integration Tests**: API endpoints
4. **E2E Tests**: User workflows
5. **Security Scan**: Dependency vulnerabilities
6. **Build & Deploy**: Docker images và deployment

### Quality Gates
- ✅ Tất cả tests phải pass
- ✅ Coverage thresholds phải đạt
- ✅ Linting phải pass
- ✅ Security scan phải pass

## 📈 Performance Testing

### Load Testing với k6
```bash
# Cài đặt k6
brew install k6  # macOS
# hoặc theo hướng dẫn tại https://k6.io/docs/getting-started/installation/

# Chạy performance tests
k6 run tests/performance/load-test.js
```

## 🛠️ Tools và Libraries

### Frontend
- **Jest**: Test runner
- **React Testing Library**: Component testing
- **MSW**: API mocking
- **Cypress**: E2E testing
- **@testing-library/user-event**: User interaction simulation

### Backend
- **Jest**: Test runner
- **Supertest**: HTTP testing
- **MongoDB Memory Server**: In-memory database
- **Mongoose**: ODM với test utilities

### CI/CD
- **GitHub Actions**: Automation
- **Docker**: Containerized testing
- **Codecov**: Coverage reporting
- **Snyk**: Security scanning

## 📚 Best Practices

### 1. Test Naming
```javascript
// ✅ Good
describe('UserService', () => {
  it('should create user with valid data', () => {});
  it('should throw error for invalid email', () => {});
});

// ❌ Bad
describe('User tests', () => {
  it('test 1', () => {});
  it('user creation', () => {});
});
```

### 2. Test Structure (AAA)
```javascript
it('should calculate total price correctly', () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }];
  
  // Act
  const total = calculateTotal(items);
  
  // Assert
  expect(total).toBe(30);
});
```

### 3. Mock External Dependencies
```javascript
// ✅ Good - Mock external API
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// ✅ Good - Mock database
beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
});
```

### 4. Use Data-testid
```jsx
// ✅ Good
<button data-testid="submit-button">Submit</button>

// ❌ Bad - fragile selectors
<button className="btn btn-primary">Submit</button>
```

## 🆘 Troubleshooting

### Common Issues

#### Tests timeout
```javascript
// Tăng timeout
jest.setTimeout(10000);

// Hoặc trong specific test
it('should do async operation', async () => {
  // test code
}, 10000);
```

#### Memory leaks
```javascript
afterEach(() => {
  jest.clearAllMocks();
  cleanup();
});
```

#### Flaky E2E tests
```javascript
// Sử dụng explicit waits
cy.wait('@apiCall');
cy.get('[data-testid="element"]', { timeout: 10000 });

// Retry mechanism
npx cypress run --config retries=2
```

## 📞 Support

Nếu gặp vấn đề với testing:

1. Kiểm tra [TESTING_GUIDE.md](TESTING_GUIDE.md) chi tiết
2. Xem logs trong CI/CD pipeline
3. Chạy tests locally để debug
4. Liên hệ team qua Slack #testing

## 📄 Documentation

- [Chi tiết Testing Guide](TESTING_GUIDE.md)
- [Development Guide](../development/DEVELOPMENT_GUIDE.md)
- [API Documentation](../api/README.md)

---

**Happy Testing! 🧪✨**
