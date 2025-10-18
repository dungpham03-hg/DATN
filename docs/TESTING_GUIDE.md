# Hướng dẫn Kiểm thử - Dự án Quản lý Cuộc họp

## Tổng quan

Dự án sử dụng một quy trình kiểm thử toàn diện bao gồm:
- **Unit Tests**: Kiểm thử các component và function riêng lẻ
- **Integration Tests**: Kiểm thử tương tác giữa các module
- **E2E Tests**: Kiểm thử workflow người dùng từ đầu đến cuối
- **Performance Tests**: Kiểm thử hiệu suất và tải
- **Security Tests**: Kiểm thử bảo mật

## Cấu trúc Test

### Frontend (`client/`)
```
src/
├── __tests__/
│   ├── components/          # Component tests
│   ├── pages/              # Page tests  
│   ├── utils/              # Utility tests
│   ├── hooks/              # Custom hooks tests
│   ├── contexts/           # Context tests
│   └── mocks/              # Mock data và handlers
├── cypress/
│   ├── e2e/                # End-to-end tests
│   ├── fixtures/           # Test data
│   └── support/            # Helper commands
```

### Backend (`server/`)
```
tests/
├── unit/                   # Unit tests
│   ├── models/             # Model tests
│   ├── routes/             # Route tests
│   ├── middleware/         # Middleware tests
│   └── utils/              # Utility tests
├── integration/            # Integration tests
├── fixtures/               # Test data
└── setup.js               # Test setup
```

## Công cụ Kiểm thử

### Frontend
- **Jest**: Test runner và assertion library
- **React Testing Library**: Component testing utilities
- **MSW**: API mocking
- **Cypress**: E2E testing

### Backend
- **Jest**: Test runner và assertion library
- **Supertest**: HTTP assertion library
- **MongoDB Memory Server**: In-memory database cho testing

## Chạy Tests

### Frontend Tests
```bash
cd client

# Chạy tất cả unit tests
npm test

# Chạy tests với coverage
npm run test:coverage

# Chạy tests trong CI mode
npm run test:ci

# Chạy E2E tests
npm run test:e2e

# Mở Cypress Test Runner
npm run cypress:open
```

### Backend Tests
```bash
cd server

# Chạy tất cả tests
npm test

# Chạy unit tests
npm run test:unit

# Chạy integration tests
npm run test:integration

# Chạy tests với coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Docker Tests
```bash
# Chạy toàn bộ test suite trong Docker
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
```

## Viết Tests

### Unit Tests - Frontend

#### Component Tests
```javascript
import React from 'react';
import { render, screen, fireEvent } from '../utils/test-utils';
import MyComponent from '../components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const mockOnClick = jest.fn();
    render(<MyComponent onClick={mockOnClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(mockOnClick).toHaveBeenCalled();
  });
});
```

#### Hook Tests
```javascript
import { renderHook, act } from '@testing-library/react';
import useMyHook from '../hooks/useMyHook';

describe('useMyHook', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe(0);
  });

  it('should update state', () => {
    const { result } = renderHook(() => useMyHook());
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.value).toBe(1);
  });
});
```

### Unit Tests - Backend

#### Model Tests
```javascript
const User = require('../../models/User');

describe('User Model', () => {
  it('should create a valid user', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    };
    
    const user = new User(userData);
    const savedUser = await user.save();
    
    expect(savedUser._id).toBeDefined();
    expect(savedUser.email).toBe(userData.email);
  });

  it('should hash password before saving', async () => {
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });
    
    await user.save();
    expect(user.password).not.toBe('password123');
  });
});
```

### Integration Tests - Backend

#### API Tests
```javascript
const request = require('supertest');
const app = require('../../index');

describe('Auth API', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'admin123'
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });
});
```

### E2E Tests - Cypress

#### Page Tests
```javascript
describe('Meeting Management', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/meetings');
  });

  it('should create a new meeting', () => {
    cy.get('[data-testid="create-meeting-button"]').click();
    
    cy.fillField('meeting-title', 'Test Meeting');
    cy.fillField('meeting-description', 'Test Description');
    cy.fillField('start-time', '2024-01-15T10:00');
    cy.fillField('end-time', '2024-01-15T11:00');
    
    cy.get('[data-testid="create-meeting-button"]').click();
    
    cy.checkNotification('Tạo cuộc họp thành công', 'success');
    cy.url().should('include', '/meetings');
  });
});
```

## Best Practices

### 1. Naming Conventions
- Test files: `*.test.js` hoặc `*.spec.js`
- E2E tests: `*.cy.js`
- Describe blocks: Tên component/function được test
- Test cases: "should + hành động + kết quả mong đợi"

### 2. Test Structure (AAA Pattern)
```javascript
it('should do something', () => {
  // Arrange - Chuẩn bị data và mock
  const mockData = { id: 1, name: 'Test' };
  
  // Act - Thực hiện hành động
  const result = myFunction(mockData);
  
  // Assert - Kiểm tra kết quả
  expect(result).toBe(expectedValue);
});
```

### 3. Mock Guidelines
- Mock external dependencies (APIs, databases, third-party services)
- Sử dụng MSW cho API mocking trong frontend tests
- Mock MongoDB với Memory Server cho backend tests
- Không mock code của chính mình trừ khi cần thiết

### 4. Test Data
- Sử dụng fixtures cho test data phức tạp
- Tạo factory functions cho việc tạo test data
- Cleanup data sau mỗi test

### 5. Assertions
- Sử dụng specific assertions thay vì generic ones
- Test cả positive và negative cases
- Kiểm tra error handling

## Coverage Requirements

### Minimum Coverage Thresholds
- **Backend**: 70% (branches, functions, lines, statements)
- **Frontend**: 60% (branches, functions, lines, statements)

### Coverage Reports
```bash
# Frontend coverage
cd client && npm run test:coverage

# Backend coverage
cd server && npm run test:coverage

# View HTML reports
open client/coverage/lcov-report/index.html
open server/coverage/lcov-report/index.html
```

## CI/CD Integration

### GitHub Actions
Tests chạy tự động khi:
- Push code lên main/develop branches
- Tạo Pull Request
- Merge Pull Request

### Quality Gates
- Tất cả tests phải pass
- Coverage phải đạt minimum threshold
- Linting phải pass
- Security scan phải pass

## Debugging Tests

### Frontend
```bash
# Debug specific test
npm test -- --testNamePattern="should render correctly"

# Debug với Chrome DevTools
npm test -- --inspect-brk

# Verbose output
npm test -- --verbose
```

### Backend
```bash
# Debug specific test
npm test -- --testNamePattern="should create user"

# Debug với Node Inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Watch mode với specific file
npm test -- --watch User.test.js
```

### Cypress
```bash
# Open Cypress Test Runner (interactive mode)
npm run cypress:open

# Run specific test file
npx cypress run --spec "cypress/e2e/auth.cy.js"

# Debug mode
npx cypress run --headed --no-exit
```

## Performance Testing

### Load Testing với k6
```javascript
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
};

export default function() {
  let response = http.get('http://localhost:5000/api/meetings');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

## Troubleshooting

### Common Issues

#### 1. Tests timeout
```javascript
// Tăng timeout cho async operations
jest.setTimeout(10000);

// Hoặc trong specific test
it('should do something', async () => {
  // test code
}, 10000);
```

#### 2. Memory leaks trong tests
```javascript
// Cleanup sau mỗi test
afterEach(() => {
  jest.clearAllMocks();
  cleanup();
});
```

#### 3. Flaky E2E tests
```javascript
// Sử dụng explicit waits
cy.wait('@apiCall');
cy.get('[data-testid="element"]', { timeout: 10000 }).should('be.visible');

// Retry failed tests
npx cypress run --spec "cypress/e2e/flaky.cy.js" --config retries=2
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Cypress Documentation](https://docs.cypress.io/)
- [MSW Documentation](https://mswjs.io/docs/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)

## Liên hệ

Nếu có câu hỏi về testing, vui lòng liên hệ:
- Team Lead: [email]
- QA Team: [email]
- Slack Channel: #testing
