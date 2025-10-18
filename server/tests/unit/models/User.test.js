const mongoose = require('mongoose');
const User = require('../../../models/User');
const { testUsers } = require('../../fixtures/testData');

describe('User Model', () => {
  describe('Validation', () => {
    it('should create a valid user', async () => {
      const userData = testUsers.admin;
      const user = new User(userData);
      
      const savedUser = await user.save();
      
      expect(savedUser._id).toBeDefined();
      expect(savedUser.name).toBe(userData.name);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.role).toBe(userData.role);
      expect(savedUser.isActive).toBe(true);
    });

    it('should require name field', async () => {
      const userData = { ...testUsers.admin };
      delete userData.name;
      
      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow('Tên là bắt buộc');
    });

    it('should require email field', async () => {
      const userData = { ...testUsers.admin };
      delete userData.email;
      
      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow('Email là bắt buộc');
    });

    it('should require unique email', async () => {
      const userData = testUsers.admin;
      
      // Create first user
      const user1 = new User(userData);
      await user1.save();
      
      // Try to create second user with same email
      const user2 = new User(userData);
      
      await expect(user2.save()).rejects.toThrow();
    });

    it('should validate email format', async () => {
      const userData = {
        ...testUsers.admin,
        email: 'invalid-email'
      };
      
      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow('Email không hợp lệ');
    });

    it('should validate role enum', async () => {
      const userData = {
        ...testUsers.admin,
        role: 'invalid-role'
      };
      
      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow();
    });

    it('should set default values correctly', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };
      
      const user = new User(userData);
      const savedUser = await user.save();
      
      expect(savedUser.role).toBe('technician'); // default role
      expect(savedUser.isActive).toBe(true); // default active
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    it('should validate password length', async () => {
      const userData = {
        ...testUsers.admin,
        password: '123' // Too short
      };
      
      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow('Mật khẩu phải có ít nhất 6 ký tự');
    });

    it('should validate name length', async () => {
      const userData = {
        ...testUsers.admin,
        name: 'A'.repeat(101) // Too long
      };
      
      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow('Tên không được vượt quá 100 ký tự');
    });
  });

  describe('Methods', () => {
    let user;

    beforeEach(async () => {
      user = new User(testUsers.admin);
      await user.save();
    });

    it('should hash password before saving', async () => {
      expect(user.password).not.toBe(testUsers.admin.password);
      expect(user.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash pattern
    });

    it('should compare password correctly', async () => {
      const isMatch = await user.comparePassword(testUsers.admin.password);
      expect(isMatch).toBe(true);
      
      const isNotMatch = await user.comparePassword('wrongpassword');
      expect(isNotMatch).toBe(false);
    });

    it('should generate auth token', () => {
      const token = user.generateAuthToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });

    it('should convert to JSON without password', () => {
      const userJSON = user.toJSON();
      
      expect(userJSON.password).toBeUndefined();
      expect(userJSON.name).toBe(testUsers.admin.name);
      expect(userJSON.email).toBe(testUsers.admin.email);
    });

    it('should get full name correctly', () => {
      const fullName = user.getFullName();
      expect(fullName).toBe(testUsers.admin.name);
    });

    it('should check if user is admin', () => {
      expect(user.isAdmin()).toBe(true);
      
      user.role = 'technician';
      expect(user.isAdmin()).toBe(false);
    });

    it('should check if user can manage meetings', () => {
      // Admin can manage
      expect(user.canManageMeetings()).toBe(true);
      
      // Manager can manage
      user.role = 'manager';
      expect(user.canManageMeetings()).toBe(true);
      
      // Secretary can manage
      user.role = 'secretary';
      expect(user.canManageMeetings()).toBe(true);
      
      // Technician cannot manage
      user.role = 'technician';
      expect(user.canManageMeetings()).toBe(false);
    });
  });

  describe('Statics', () => {
    beforeEach(async () => {
      // Create test users
      await User.create(testUsers.admin);
      await User.create(testUsers.manager);
      await User.create(testUsers.secretary);
    });

    it('should find by email', async () => {
      const user = await User.findByEmail(testUsers.admin.email);
      
      expect(user).toBeDefined();
      expect(user.email).toBe(testUsers.admin.email);
    });

    it('should find active users', async () => {
      // Deactivate one user
      await User.findOneAndUpdate(
        { email: testUsers.secretary.email },
        { isActive: false }
      );
      
      const activeUsers = await User.findActive();
      
      expect(activeUsers).toHaveLength(2);
      expect(activeUsers.every(user => user.isActive)).toBe(true);
    });

    it('should find by role', async () => {
      const admins = await User.findByRole('admin');
      const managers = await User.findByRole('manager');
      
      expect(admins).toHaveLength(1);
      expect(managers).toHaveLength(1);
      expect(admins[0].role).toBe('admin');
      expect(managers[0].role).toBe('manager');
    });

    it('should get user statistics', async () => {
      const stats = await User.getStatistics();
      
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(3);
      expect(stats.byRole.admin).toBe(1);
      expect(stats.byRole.manager).toBe(1);
      expect(stats.byRole.secretary).toBe(1);
    });
  });

  describe('Middleware', () => {
    it('should update updatedAt on save', async () => {
      const user = new User(testUsers.admin);
      await user.save();
      
      const originalUpdatedAt = user.updatedAt;
      
      // Wait a bit and update
      await new Promise(resolve => setTimeout(resolve, 10));
      user.name = 'Updated Name';
      await user.save();
      
      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should not hash password if not modified', async () => {
      const user = new User(testUsers.admin);
      await user.save();
      
      const originalPassword = user.password;
      
      user.name = 'Updated Name';
      await user.save();
      
      expect(user.password).toBe(originalPassword);
    });
  });
});
