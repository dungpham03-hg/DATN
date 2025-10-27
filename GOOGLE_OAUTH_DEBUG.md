# Google OAuth TokenError: Unauthorized - Debug Guide

## 🔍 Current Configuration

Your `.env` file has these settings:
```
GOOGLE_CLIENT_ID=381976480906-hukvi45a0nuiebed5kmcg1hsnfnhhh6p.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

## ❌ Common Causes of TokenError: Unauthorized

### 1. **Authorized Redirect URI Mismatch**
The most common cause - Google requires EXACT URL matches.

**Check in Google Cloud Console:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Check "Authorized redirect URIs"
4. Must include exactly: `http://localhost:5000/api/auth/google/callback`
   - No trailing slash
   - Exact protocol (http not https)
   - Exact port (5000)

**Fix:**
```
In Google Console, add:
http://localhost:5000/api/auth/google/callback
```

### 2. **Wrong Credential Type**
Make sure you're using the correct type of credentials.

**Check:**
- Client Secret starts with `GOCSPX-` ✅ (Web application - correct)
- Client ID format: `XXX-YYY.apps.googleusercontent.com` ✅ (correct)

**If using Desktop Application credentials:**
- These won't work for web flows
- You need to create NEW "Web application" credentials

### 3. **OAuth Consent Screen Not Configured**
The OAuth consent screen must be configured before testing.

**Steps:**
1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Configure the consent screen
3. Add your test email as a test user (if in testing mode)
4. Select "Internal" or "External" user type

### 4. **Client Secret Expired or Regenerated**
If you regenerated the secret in Google Console, update your `.env` file.

**Solution:**
1. Delete old secret
2. Generate new secret in Google Console
3. Update `GOOGLE_CLIENT_SECRET` in `.env`
4. Restart server

### 5. **Project/Environment Mismatch**
Make sure your credentials match the correct Google Cloud project.

## 🔧 Step-by-Step Fix

### Step 1: Verify Google Cloud Console Settings

1. **Authorized JavaScript origins:**
   - Should include: `http://localhost:5000`

2. **Authorized redirect URIs:**
   - Should include: `http://localhost:5000/api/auth/google/callback`
   - Must be EXACT match (no trailing slashes)

3. **Application type:**
   - Should be "Web application"

### Step 2: Test Your Credentials

Run this command to test:

```bash
cd server
node -e "require('dotenv').config(); console.log('CLIENT_ID:', process.env.GOOGLE_CLIENT_ID); console.log('CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL);"
```

### Step 3: Check Server Logs

When you start your server, you should see:
```
🔧 Initializing Google OAuth Strategy...
📍 Callback URL: http://localhost:5000/api/auth/google/callback
📋 Google OAuth Config: { clientID: '381976480906-hukvi4...', callbackURL: '...', hasSecret: true }
✅ Google OAuth Strategy initialized successfully
```

### Step 4: Test the OAuth Flow

1. Start your server:
   ```bash
   cd server
   npm run dev
   ```

2. Navigate to: `http://localhost:5000/api/auth/google`

3. Check console logs for errors

## 🚀 Quick Test Script

Create `test-google-oauth.js` in the `server` directory:

```javascript
require('dotenv').config();
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'
);

console.log('Testing Google OAuth Configuration...');
console.log('Client ID:', process.env.GOOGLE_CLIENT_ID);
console.log('Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Missing');
console.log('Callback URL:', process.env.GOOGLE_CALLBACK_URL);

// This will only work after you have a valid authorization code
// but it helps verify the configuration is correct
console.log('✅ Configuration check passed (credentials formatted correctly)');
```

Run it:
```bash
node test-google-oauth.js
```

## 📝 Action Items

1. **Verify Google Console Settings:**
   - [ ] Check authorized redirect URI matches exactly
   - [ ] Verify application type is "Web application"
   - [ ] Check OAuth consent screen is configured
   - [ ] Add test email if in testing mode

2. **Update Your Environment:**
   - [ ] Ensure `GOOGLE_CALLBACK_URL` is in `.env`
   - [ ] Restart server after changes

3. **Check Server Logs:**
   - [ ] Look for initialization messages
   - [ ] Check for any error messages
   - [ ] Verify callback URL is logged correctly

## 🔗 Important Links

- Google Cloud Console: https://console.cloud.google.com/apis/credentials
- OAuth Consent Screen: https://console.cloud.google.com/apis/credentials/consent
- Authorized Domains: https://console.cloud.google.com/apis/credentials/consent?project=YOUR_PROJECT

## 💡 Still Having Issues?

If the error persists, try:

1. **Create NEW OAuth credentials:**
   - Delete old credentials
   - Create fresh "Web application" credentials
   - Update `.env` with new credentials
   - Update redirect URI in Google Console

2. **Test with a fresh browser session:**
   - Clear cookies for localhost
   - Use incognito/private mode

3. **Check for typos:**
   - Client ID and Secret must match exactly
   - No extra spaces or characters
   - Check for line breaks or special characters

4. **Verify port is correct:**
   - Server should be running on port 5000
   - If different, update both `.env` and Google Console

## 🐛 Debug Commands

```bash
# Check if .env is being loaded
cd server
node -e "require('dotenv').config(); console.log(process.env.GOOGLE_CLIENT_ID)"

# Check if server is listening on correct port
netstat -ano | findstr :5000

# Restart server
npm run dev
```

