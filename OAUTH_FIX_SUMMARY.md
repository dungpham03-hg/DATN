# Google OAuth TokenError: Unauthorized - Fix Summary

## 🔧 What Was Fixed

### 1. **Removed Proxy Setting** (Line 29 in `server/config/passport.js`)
- **Before**: `proxy: true` was causing issues with token exchange
- **After**: Removed `proxy: true` from Google Strategy configuration
- **Impact**: The proxy setting was interfering with the OAuth token exchange process

### 2. **Added Scope Configuration** (Line 29 in `server/config/passport.js`)
- **Before**: No scope specified in strategy config
- **After**: Added `scope: ['profile', 'email']` to ensure proper permission requests
- **Impact**: Ensures Google properly requests email and profile access

### 3. **Added Error Handling and Logging** (Lines 25-101 in `server/config/passport.js`)
- Added console logs to track initialization
- Added try-catch block around strategy registration
- Added detailed error messages for debugging

### 4. **Updated Environment Example** (`server/env.example`)
- Added missing `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL` variables
- Provided examples for both local development and production

## 🔍 What You Need to Check

### 1. **Environment Variables**
Make sure your `.env` file in the `server/` directory contains:

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

### 2. **Google Cloud Console Configuration**
Verify in Google Cloud Console that:

1. **Client ID and Secret are correct**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Select your OAuth 2.0 credentials
   - Copy the exact Client ID and Client Secret

2. **Authorized redirect URIs**
   - Must include: `http://localhost:5000/api/auth/google/callback` (for development)
   - Or your production URL: `https://your-domain.com/api/auth/google/callback`
   - The exact URL matters - check for trailing slashes!

3. **Application Type**
   - If using "Web application" type, make sure the Client ID matches
   - Client secret must be the one from the "Web application" credential, not "Desktop application"

4. **API Consent Screen**
   - Go to: https://console.cloud.google.com/apis/credentials/consent
   - Make sure user type is configured
   - Add your email as a test user if in testing mode

### 3. **Common Issues**

#### Issue 1: "TokenError: Unauthorized"
**Possible causes:**
- Client ID or Client Secret mismatch
- Callback URL doesn't match Google Console
- Using incorrect credential type (Web vs Desktop)

**Solution:**
```bash
# Check environment variables
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET
echo $GOOGLE_CALLBACK_URL
```

#### Issue 2: Invalid Client Secret
**Symptoms:** OAuth redirects but fails at token exchange

**Solution:**
1. Delete old secret in Google Console
2. Generate new secret
3. Update `.env` file
4. Restart server

#### Issue 3: Redirect URI Mismatch
**Error message:** "redirect_uri_mismatch"

**Solution:**
- In Google Console, add exact URL: `http://localhost:5000/api/auth/google/callback`
- No trailing slash
- Match protocol (http vs https)
- Match port number

## 🚀 Testing Steps

### 1. Restart Your Server
```bash
cd server
npm run dev
```

Look for these log messages:
```
🔧 Initializing Google OAuth Strategy...
📍 Callback URL: http://localhost:5000/api/auth/google/callback
✅ Google OAuth Strategy initialized successfully
```

### 2. Test OAuth Flow
1. Navigate to: `http://localhost:5000/api/auth/google`
2. You should be redirected to Google's sign-in page
3. After signing in, you should be redirected back with a token

### 3. Check Console Logs
Watch for these success messages:
```
🔍 Google OAuth Strategy - Profile: {...}
✅ Returning existing user: <user_id>
OR
✅ Created new user: <user_id>
🎫 Generated token: <token>
🔄 Redirecting to: <client_url>
```

## 📝 Quick Checklist

- [ ] `.env` file exists in `server/` directory
- [ ] `GOOGLE_CLIENT_ID` is set in `.env`
- [ ] `GOOGLE_CLIENT_SECRET` is set in `.env`
- [ ] `GOOGLE_CALLBACK_URL` matches the redirect URI in Google Console
- [ ] Server has been restarted after changes
- [ ] Google Console has correct redirect URI configured
- [ ] Client ID matches credential type (Web application)
- [ ] User has granted necessary permissions

## 🔗 Useful Links

- Google Cloud Console: https://console.cloud.google.com/apis/credentials
- API Consent Screen: https://console.cloud.google.com/apis/credentials/consent
- OAuth 2.0 Documentation: https://developers.google.com/identity/protocols/oauth2

## 💡 Still Having Issues?

If you're still seeing the error, check these:

1. **Clear browser cache and cookies** for localhost
2. **Check server logs** for detailed error messages
3. **Verify MongoDB is running** (for user creation)
4. **Test with a different Google account**
5. **Check if your Google account has 2FA enabled** (shouldn't matter but can sometimes cause issues)

## 📞 Next Steps

1. Update your `.env` file with correct credentials
2. Restart the server
3. Try the OAuth flow again
4. Check the console for the log messages mentioned above

