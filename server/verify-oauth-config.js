// Script to verify Google OAuth configuration
require('dotenv').config();
const https = require('https');

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

console.log('='.repeat(60));
console.log('Google OAuth Configuration Verification');
console.log('='.repeat(60));
console.log('');

// Check environment variables
console.log('📋 Environment Variables:');
console.log('   CLIENT_ID:', clientId ? `${clientId.substring(0, 30)}...` : '❌ NOT SET');
console.log('   CLIENT_SECRET:', clientSecret ? `${clientSecret.substring(0, 20)}...` : '❌ NOT SET');
console.log('   CALLBACK_URL:', callbackUrl);
console.log('');

// Check configuration format
console.log('🔍 Configuration Format:');
const clientIdValid = clientId && clientId.includes('.apps.googleusercontent.com');
const clientSecretValid = clientSecret && clientSecret.startsWith('GOCSPX-');
console.log('   CLIENT_ID format:', clientIdValid ? '✅ Valid' : '❌ Invalid');
console.log('   CLIENT_SECRET format:', clientSecretValid ? '✅ Valid' : '❌ Invalid');
console.log('   CALLBACK_URL format:', callbackUrl.startsWith('http') ? '✅ Valid' : '❌ Invalid');
console.log('');

// Summary
console.log('='.repeat(60));
if (clientId && clientSecret && callbackUrl) {
  console.log('✅ All environment variables are set');
  console.log('');
  console.log('⚠️  IMPORTANT: Verify in Google Cloud Console:');
  console.log('   1. Go to: https://console.cloud.google.com/apis/credentials');
  console.log('   2. Select your OAuth 2.0 Client ID');
  console.log('   3. Check "Authorized redirect URIs" includes:');
  console.log(`      ${callbackUrl}`);
  console.log('   4. Make sure application type is "Web application"');
  console.log('');
  console.log('💡 If you still get "TokenError: Unauthorized":');
  console.log('   - Regenerate the client secret in Google Console');
  console.log('   - Update GOOGLE_CLIENT_SECRET in .env file');
  console.log('   - Restart your server');
} else {
  console.log('❌ Missing environment variables!');
  console.log('   Make sure .env file exists and has all required variables');
}
console.log('='.repeat(60));

