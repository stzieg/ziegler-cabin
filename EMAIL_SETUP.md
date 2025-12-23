# Email Setup Guide

## Current Status ✅

Your email functionality is **already working** in development mode! When you send an invitation, the email content will be logged to your browser console.

## How It Works

The email service is configured in `.env` with `VITE_EMAIL_PROVIDER=console`, which means:
- Invitations are created in the database ✅
- Email content is generated ✅
- Email is logged to browser console instead of being sent ✅

## Testing Email in Development

1. Start your dev server: `npm run dev`
2. Log in as admin
3. Go to the Admin Panel
4. Send an invitation
5. Open browser console (F12) to see the email content

You'll see output like:
```
=== EMAIL INVITATION ===
To: user@example.com
From: Cabin Management Team <noreply@cabin.family>
Subject: You're invited to join our cabin management system

--- TEXT CONTENT ---
[Email text content]

--- HTML CONTENT ---
[Email HTML content]
========================
```

## Setting Up Real Email Sending (Production)

When you're ready to send actual emails, choose one of these providers:

### Option 1: SendGrid (Recommended)

1. Sign up at https://sendgrid.com (free tier: 100 emails/day)
2. Create an API key
3. Update `.env`:
   ```
   VITE_EMAIL_PROVIDER=sendgrid
   VITE_EMAIL_API_KEY=your-sendgrid-api-key
   VITE_EMAIL_FROM=noreply@yourdomain.com
   ```

### Option 2: Resend (via Supabase Edge Function)

1. Sign up at https://resend.com (free tier: 100 emails/day)
2. Create a Supabase Edge Function to handle email sending
3. Update `.env`:
   ```
   VITE_EMAIL_PROVIDER=supabase
   VITE_EMAIL_API_KEY=your-supabase-service-role-key
   ```

### Option 3: Mailgun

1. Sign up at https://mailgun.com
2. Verify your domain
3. Update `.env`:
   ```
   VITE_EMAIL_PROVIDER=mailgun
   VITE_EMAIL_API_KEY=your-mailgun-api-key
   VITE_EMAIL_FROM=noreply@yourdomain.com
   ```

## Email Template

The invitation email includes:
- Personalized greeting with sender name
- Registration link with invitation token
- Expiration date (7 days)
- Both HTML and plain text versions
- Cabin-themed styling

## Troubleshooting

**Emails not appearing in console?**
- Make sure you're looking at the browser console (not terminal)
- Check that `.env` has `VITE_EMAIL_PROVIDER=console`
- Restart your dev server after changing `.env`

**Want to test with real emails?**
- Use a service like [Mailtrap](https://mailtrap.io) for testing
- Or set up SendGrid and use your own email address

## Next Steps

Your email system is ready to use! The console logging is perfect for development. When you deploy to production, just update the environment variables with your chosen email provider.
