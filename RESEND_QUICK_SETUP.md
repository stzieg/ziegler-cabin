# Resend.com Quick Setup (SendGrid Alternative)

## Why Switch to Resend?
- ✅ **3,000 emails/month free** (vs SendGrid's 100)
- ✅ **No credit card required**
- ✅ **Instant delivery** - no IP assignment issues
- ✅ **Developer-friendly** - similar API to SendGrid
- ✅ **Better deliverability** - newer service with good reputation

## 5-Minute Setup

### Step 1: Create Resend Account
1. Go to https://resend.com
2. Sign up with your email
3. Verify email address

### Step 2: Get API Key
1. Go to API Keys in dashboard
2. Create new API key
3. Copy the key (starts with `re_`)

### Step 3: Update Your Configuration

**Update .env:**
```
VITE_EMAIL_PROVIDER=resend
VITE_EMAIL_API_KEY=re_your_api_key_here
VITE_EMAIL_FROM=zieglercabin@outlook.com
```

**Update simple-email-proxy.cjs:**
```javascript
// Change SendGrid API call to Resend
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: FROM_EMAIL,
    to: [to],
    subject,
    html,
    text
  })
});
```

### Step 4: Test Immediately
- Restart proxy server
- Send test email
- Should deliver in 1-2 minutes

## Benefits Over SendGrid
- **No IP assignment issues**
- **Better free tier**
- **Faster setup**
- **Modern API**
- **Excellent deliverability**

## Verification Requirements
Resend requires sender verification just like SendGrid:
1. Add your sender email in dashboard
2. Verify via email link
3. Start sending immediately

Much simpler than SendGrid's complex verification process!