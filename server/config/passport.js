const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GithubStrategy = require('passport-github2').Strategy;
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
        
        // Nếu domain không được hỗ trợ, cho phép tạo user với role guest (khách)
        let userRole = 'guest'; // Mặc định là guest cho OAuth
        let userDepartment = null;
        let userPosition = null;
        let userPermissions = [];
        let isFromDomainAuth = false;
        
        if (domainValidation.isValid) {
          // Domain được hỗ trợ (domain công ty), sử dụng role từ cấu hình
          userRole = domainValidation.role;
          userDepartment = domainValidation.department;
          userPosition = domainValidation.position;
          userPermissions = domainValidation.permissions;
          isFromDomainAuth = true;
        } else {
          // Domain không được hỗ trợ (VD: Gmail, Yahoo), đây là guest → role = 'guest'
          console.log('⚠️  Domain không trong danh sách allowed (guest), sử dụng role: guest');
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
          isFromDomainAuth: isFromDomainAuth,
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

        // Validate domain để xác định role
        const domainValidation = DomainUtils.validateEmailDomain(email);
        let userRole = 'guest'; // Mặc định là guest cho OAuth
        
        if (domainValidation.isValid) {
          // Domain được hỗ trợ (domain công ty), sử dụng role từ cấu hình
          userRole = domainValidation.role;
        } else {
          // Domain không được hỗ trợ (Gmail, Yahoo, etc.), đây là guest
          console.log('⚠️  Domain không trong danh sách allowed (guest), sử dụng role: guest');
        }
        
        // Tạo user mới
        user = await User.create({
          email,
          fullName: profile.displayName || profile.username,
          githubId: profile.id,
          avatar: profile.photos?.[0]?.value,
          emailVerified: true,
          password: Math.random().toString(36).slice(-8),
          role: userRole,
          emailDomain: domainValidation.isValid ? domainValidation.domain : 'oauth',
          autoAssignedRole: userRole,
          isFromDomainAuth: domainValidation.isValid,
          domainPermissions: domainValidation.isValid ? domainValidation.permissions : [],
          department: domainValidation.isValid ? domainValidation.department : null,
          position: domainValidation.isValid ? domainValidation.position : null
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

module.exports = passport; 