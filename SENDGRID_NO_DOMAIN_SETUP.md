# SendGrid Setup Without a Domain

## You Don't Need a Domain!

SendGrid allows you to send emails using **Single Sender Verification** with any email address you own.

## Quick Setup Steps

### 1. Verify Your Personal Email in SendGrid

1. **Login to SendGrid:**
   - Go to https://app.sendgrid.com
   - Login with your account

2. **Create Single Sender:**
   - Go to **Settings** → **Sender Authentication**
   - Click **"Create a Single Sender"**
   - Fill out the form:
     - **From Name**: `Ziegler Cabin Management`
     - **From Email**: Your personal email (e.g., `sam@gmail.com`)
     - **Reply To**: Same as from email
     - Fill out address fields (can be your home address)

3. **Verify Email:**
   - SendGrid sends verification email to your address
   - Click the verification link
   - Status should show "Verified" ✅

### 2. Update Your Configuration

1. **Update .env file:**
   ```bash
   VITE_EMAIL_FROM=your-verified-email@gmail.com
   VITE_EMAIL_FROM_NAME=Ziegler Cabin Management
   ```

2. **Update proxy server:**
   - Edit `simple-email-proxy.cjs`
   - Change `FROM_EMAIL` to your verified email

### 3. Test Email Sending

1. **Start proxy server:**
   ```bash
   node simple-email-proxy.cjs
   ```

2. **Set SendGrid mode:**
   ```bash
   # In .env:
   VITE_EMAIL_PROVIDER=sendgrid
   ```

3. **Test in your app:**
   - Go to http://localhost:5175
   - Login as admin
   - Click "📧 Email Test" tab
   - Send test email to yourself

## What You'll See

**Success:**
```
✅ Email sent successfully! Message ID: abc123
```

**Common Errors:**
- `"not verified"` → Complete Single Sender Verification
- `"permissions"` → Check API key has Mail Send permissions
- `"CORS"` → Make sure proxy server is running

## Benefits of Single Sender

- ✅ **No domain needed** - use any email you own
- ✅ **Quick setup** - verify in minutes
- ✅ **Free** - no additional costs
- ✅ **Reliable** - works immediately after verification

## Alternative: Console Mode

For development/testing, you can always use:
```bash
VITE_EMAIL_PROVIDER=console
```

This logs emails to browser console - perfect for testing the invitation flow without sending real emails.

## Next Steps

1. **Verify your email** in SendGrid (5 minutes)
2. **Update configuration** with your verified email
3. **Test real email sending** through the proxy
4. **Deploy to production** when ready

No domain required - just use your personal email!