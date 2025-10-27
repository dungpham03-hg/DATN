const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GithubStrategy = require('passport-github2').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const User = require('../models/User');
const { DomainUtils } = require('./domainConfig');

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  console.log('🔧 Initializing Google OAuth Strategy...');
  console.log('📍 Callback URL:', process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback");
  
  try {
    // Log config without exposing secrets
    console.log('📋 Google OAuth Config:', {
      clientID: process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...` : 'NOT SET',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback",
      hasSecret: !!process.env.GOOGLE_CLIENT_SECRET
    });
    
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback",
        scope: ['profile', 'email']
      },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('🔍 Google OAuth Strategy - Profile:', {
          id: profile.id,
          emails: profile.emails?.map(e => e.value),
          displayName: profile.displayName
        });
        
        if (!profile.emails || !profile.emails[0]) {
          console.error('❌ No email found in Google profile');
          return done(new Error('Không thể lấy email từ Google account'), null);
        }

        const email = profile.emails[0].value;
        console.log('📧 Email from profile:', email);

        // Kiểm tra xem user đã tồn tại chưa
        let user = await User.findOne({ email: email });
        console.log('🔍 Existing user found:', user ? 'Yes' : 'No');
        
        if (user) {
          // Cập nhật thông tin nếu cần
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
            console.log('✅ Updated user with Google ID');
          }
          console.log('✅ Returning existing user:', user._id);
          return done(null, user);
        }

        // Validate domain and assign role
        const domainValidation = DomainUtils.validateEmailDomain(profile.emails[0].value);
        console.log('🔍 Domain validation:', domainValidation);
        
        // Nếu domain không được hỗ trợ, cho phép tạo user với role mặc định
        let userRole = 'employee';
        let userDepartment = 'N/A';
        let userPosition = 'Nhân viên';
        let userPermissions = ['view_meetings', 'join_meetings', 'view_minutes'];
        
        if (domainValidation.isValid) {
          // Domain được hỗ trợ, sử dụng role từ cấu hình
          userRole = domainValidation.role;
          userDepartment = domainValidation.department;
          userPosition = domainValidation.position;
          userPermissions = domainValidation.permissions;
        } else {
          // Domain không được hỗ trợ (VD: Gmail), cho phép với role mặc định
          console.log('⚠️  Domain không trong danh sách allowed, sử dụng role mặc định: employee');
        }

        // Tạo user mới
        user = await User.create({
          email: profile.emails[0].value,
          fullName: profile.displayName,
          googleId: profile.id,
          avatar: profile.photos?.[0]?.value,
          emailVerified: true,
          password: Math.random().toString(36).slice(-8), // Random password
          role: userRole,
          emailDomain: domainValidation.isValid ? domainValidation.domain : 'oauth',
          autoAssignedRole: userRole,
          isFromDomainAuth: domainValidation.isValid,
          domainPermissions: userPermissions,
          department: userDepartment,
          position: userPosition
        });
        
        console.log('✅ Created new user:', user._id);
        done(null, user);
      } catch (error) {
        console.error('❌ Google Strategy Error:', error);
        done(error, null);
      }
    }
  ));
  console.log('✅ Google OAuth Strategy initialized successfully');
  } catch (initError) {
    console.error('❌ Failed to initialize Google OAuth Strategy:', initError);
    console.error('💡 Please check your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file');
  }
} else {
  console.warn('⚠️  GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET chưa cấu hình. Bỏ qua thiết lập Google OAuth.');
}

// Github Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GithubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:5000/api/auth/github/callback",
      scope: ['user:email', 'read:user'],
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('GitHub Profile:', profile);
        
        // Lấy email từ Github profile
        let email;
        
        // Thử lấy email từ emails array
        if (profile.emails && profile.emails.length > 0) {
          email = profile.emails[0].value;
        }
        
        // Nếu không có email, trả về lỗi
        if (!email) {
          return done(new Error('Không thể lấy email từ GitHub account. Vui lòng cho phép truy cập email trong cài đặt GitHub.'), null);
        }

        // Kiểm tra user đã tồn tại
        let user = await User.findOne({ 
          $or: [
            { email: email },
            { githubId: profile.id }
          ]
        });
        
        if (user) {
          // Cập nhật thông tin nếu cần
          let needsUpdate = false;
          
          if (!user.githubId) {
            user.githubId = profile.id;
            needsUpdate = true;
          }
          
          if (profile.photos && profile.photos[0] && !user.avatar) {
            user.avatar = profile.photos[0].value;
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            await user.save();
          }
          
          return done(null, user);
        }

        // Tạo user mới
        user = await User.create({
          email,
          fullName: profile.displayName || profile.username,
          githubId: profile.id,
          avatar: profile.photos?.[0]?.value,
          emailVerified: true,
          password: Math.random().toString(36).slice(-8),
          role: 'employee'
        });

        done(null, user);
      } catch (error) {
        console.error('GitHub Strategy Error:', error);
        done(error, null);
      }
    }
  ));
} else {
  console.warn('⚠️  GITHUB_CLIENT_ID hoặc GITHUB_CLIENT_SECRET chưa cấu hình. Bỏ qua thiết lập GitHub OAuth.');
}

// Microsoft Strategy với Domain Validation
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  passport.use(new MicrosoftStrategy({
      clientID: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      callbackURL: process.env.MICROSOFT_CALLBACK_URL || "http://localhost:5000/api/auth/microsoft/callback",
      scope: ['user.read', 'openid', 'profile', 'email'],
      tenant: process.env.MICROSOFT_TENANT_ID || 'common'
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('Microsoft Profile:', profile);
        
        if (!profile.emails || !profile.emails[0]) {
          return done(new Error('Không thể lấy email từ Microsoft account'), null);
        }

        const email = profile.emails[0].value;
        
        // Validate domain
        const domainValidation = DomainUtils.validateEmailDomain(email);
        
        if (!domainValidation.isValid) {
          return done(new Error(`Domain không được hỗ trợ: ${domainValidation.error}`), null);
        }

        // Kiểm tra user đã tồn tại
        let user = await User.findOne({ 
          $or: [
            { email: email },
            { microsoftId: profile.id }
          ]
        });
        
        if (user) {
          // Cập nhật thông tin nếu cần
          let needsUpdate = false;
          
          if (!user.microsoftId) {
            user.microsoftId = profile.id;
            needsUpdate = true;
          }
          
          // Cập nhật thông tin từ domain nếu user từ domain auth
          if (user.isFromDomainAuth) {
            if (user.autoAssignedRole !== domainValidation.role) {
              user.autoAssignedRole = domainValidation.role;
              user.role = domainValidation.role;
              needsUpdate = true;
            }
            
            if (JSON.stringify(user.domainPermissions) !== JSON.stringify(domainValidation.permissions)) {
              user.domainPermissions = domainValidation.permissions;
              needsUpdate = true;
            }
          }
          
          if (profile.photos && profile.photos[0] && !user.avatar) {
            user.avatar = profile.photos[0].value;
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            await user.save();
          }
          
          return done(null, user);
        }

        // Tạo user mới với domain role
        user = await User.create({
          email: email,
          fullName: profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim(),
          microsoftId: profile.id,
          avatar: profile.photos?.[0]?.value,
          emailVerified: true,
          password: Math.random().toString(36).slice(-8), // Random password
          role: domainValidation.role,
          emailDomain: domainValidation.domain,
          autoAssignedRole: domainValidation.role,
          isFromDomainAuth: true,
          domainPermissions: domainValidation.permissions,
          department: domainValidation.department,
          position: domainValidation.position
        });

        done(null, user);
      } catch (error) {
        console.error('Microsoft Strategy Error:', error);
        done(error, null);
      }
    }
  ));
} else {
  console.warn('⚠️  MICROSOFT_CLIENT_ID hoặc MICROSOFT_CLIENT_SECRET chưa cấu hình. Bỏ qua thiết lập Microsoft OAuth.');
}

module.exports = passport; 