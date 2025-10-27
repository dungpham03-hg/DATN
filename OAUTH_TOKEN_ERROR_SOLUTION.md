# ✅ Solution: TokenError: Unauthorized

## What I Fixed

### 1. Passport Configuration (`server/config/passport.js`)
- ✅ Removed `proxy: true` setting that was causing token exchange issues
- ✅ Added proper `scope: ['profile', 'email']` 
- ✅ Added comprehensive logging for debugging
- ✅ Added error handling for initialization

### 2. Environment Variables (`server/.env`)
- ✅ Added `GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback`
- ✅ Verified `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are present

### 3. Auth Routes (`server/routes/auth.js`)
- ✅ Added logging for OAuth initiation
- ✅ Added callback error detection
- ✅ Added global error handler for OAuth routes

## Critical Issue: Google Cloud Console Configuration

The **TokenError: Unauthorized** error typically means one of these:

### ❌ Most Likely Issue: Authorized Redirect URI Mismatch

In Google Cloud Console, your **Authorized redirect URIs** must include:

```
http://localhost:5000/api/auth/google/callback
```

**Steps to Fix:**

1. Go to: https://console.cloud.google.com/apis/credentials

2. Find your OAuth 2.0 Client (Client ID: `381976480906-hukvi45a0nuiebed5kmcg1hsnfnhhh6p`)

3. Under **"Authorized redirect URIs"**, add/edit:
   ```
   http://localhost:5000/api/auth/google/callback
   ```

4. **IMPORTANT:** 
   - No trailing slash
   - Use `http` not `https` for localhost
   - Port must be `5000`
   - Path must be `/api/auth/google/callback`

5. Click **SAVE**

6. Restart your server

### Also Check:

1. **Application Type** should be "Web application" (not Desktop app)
2. **OAuth consent screen** should be configured
3. If in testing mode, add your test email

## How to Test

### 1. Restart Server
```bash
cd server
npm run dev
```

You should see:
```
🔧 Initializing Google OAuth Strategy...
📍 Callback URL: http://localhost:5000/api/auth/google/callback
📋 Google OAuth Config: { clientID: '381976480906-huk...', ... }
✅ Google OAuth Strategy initialized successfully
```

### 2. Test OAuth Flow

Visit: `http://localhost:5000/api/auth/google`

### 3. Watch for Errors

**Success:**
- Redirects to Google sign-in
- After signing in, redirects back with token
- Console shows: `✅ Google OAuth Strategy - Profile: ...`

**Failure:**
- If you see "redirect_uri_mismatch" → Check Google Console settings
- If you see "TokenError: Unauthorized" → Check client secret is correct
- If you see "invalid_client" → Regenerate credentials

## Common Errors and Solutions

### Error: "redirect_uri_mismatch"
**Solution:** Add exact URL to Google Console as shown above

### Error: "invalid_client"
**Solution:** 
1. Regenerate client secret in Google Console
2. Update `GOOGLE_CLIENT_SECRET` in `.env`
3. Restart server

### Error: "access_denied"
**Solution:**
1. Check OAuth consent screen is configured
2. Add test user email if in testing mode

## Quick Checklist

- [ ] Google Console has redirect URI: `http://localhost:5000/api/auth/google/callback`
- [ ] `.env` file has all three Google OAuth variables
- [ ] Server has been restarted
- [ ] Using "Web application" credentials (not Desktop)
- [ ] OAuth consent screen is configured

## Still Not Working?

Try these:

1. **Verify your credentials in Google Console:**
   ```
   Client ID: 381976480906-hukvi45a0nuiebed5kmcg1hsnfnhhh6p.apps.googleusercontent.com
   ```

2. **Create fresh credentials:**
   - Delete old OAuth credentials
   - Create new "Web application" type
   - Copy new Client ID and Secret
   - Update `.env` file
   - Restart server

3. **Check server is running on correct port:**
   ```bash
   netstat -ano | findstr :5000
   ```

## Need More Help?

Check these files:
- `GOOGLE_OAUTH_DEBUG.md` - Detailed debugging guide
- `OAUTH_FIX_SUMMARY.md` - Summary of all fixes

