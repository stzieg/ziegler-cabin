# Getting Started - Complete Setup Guide

This guide will take you from zero to a fully working cabin management app in about 10 minutes.

## Prerequisites

- ✅ Supabase account created
- ✅ Project created in Supabase
- ✅ `.env` file updated with your credentials (no quotes!)
- ✅ Dev server running (`npm run dev`)

## Setup Checklist

### ☐ Step 1: Run Database Migrations (2 minutes)

**What**: Create the database tables and security policies

**How**:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project
2. Click "SQL Editor" → "New Query"
3. Copy and paste `supabase/migrations/001_initial_schema.sql`
4. Click "Run"
5. Click "New Query" again
6. Copy and paste `supabase/migrations/002_rls_policies.sql`
7. Click "Run"

**Verify**: Go to "Table Editor" - you should see `profiles` and `invitations` tables

📖 **Detailed guide**: See `RUN_MIGRATIONS.md`

---

### ☐ Step 2: Create Your Admin User (3 minutes)

**What**: Create your first user account and make yourself an admin

**How**:

**2a. Create Auth User**
1. Go to "Authentication" → "Users" in Supabase Dashboard
2. Click "Add user" → "Create new user"
3. Enter your email: `your.email@example.com`
4. Enter a password (min 8 characters)
5. Click "Create user"
6. **Copy the User UID** (looks like: `abc12345-...`)

**2b. Create Admin Profile**
1. Go to "SQL Editor" → "New Query"
2. Paste this SQL (replace `YOUR_USER_ID` with the UID from 2a):

```sql
INSERT INTO profiles (id, first_name, last_name, is_admin)
VALUES (
  'YOUR_USER_ID_HERE'::uuid,  -- Paste your UID here
  'Your Name',                 -- Your first name
  'Last Name',                 -- Your last name
  true                         -- Makes you admin
);
```

3. Click "Run"

**Verify**: You should see "Success. 1 row(s) affected"

📖 **Detailed guide**: See `BOOTSTRAP_ADMIN.md`

---

### ☐ Step 3: Log In (1 minute)

**What**: Test that everything works

**How**:
1. Go to http://localhost:5174/ (or whatever port your dev server is on)
2. You should see the login form (no error messages!)
3. Enter your email and password from Step 2a
4. Click "Log In"

**Success**: You should see:
- "Welcome to the Cabin!" message
- Two tabs: "Profile" and "Admin Panel"
- Your name displayed

**Troubleshooting**:
- Still seeing errors? Check browser console (F12)
- Can't log in? Verify the profile was created in Step 2b
- No "Admin Panel" tab? Check that `is_admin = true` in the profiles table

---

### ☐ Step 4: Send Your First Invitation (2 minutes)

**What**: Invite a family member to join

**How**:
1. Click the "Admin Panel" tab
2. Enter a family member's email address
3. Click "Send Invitation"
4. You should see "Invitation sent successfully!"

**What happens**:
- An invitation record is created in the database
- The invitation is valid for 7 days
- The family member can use it to register

**Note**: Email sending is not configured yet, so you'll need to:
- Manually share the invitation token with them, OR
- Set up email service (see `SUPABASE_SETUP.md` for details)

---

### ☐ Step 5: Test Registration (Optional - 2 minutes)

**What**: Test the registration flow with an invitation

**How**:
1. In Admin Panel, note the invitation token you just created
2. Open an incognito/private browser window
3. Go to: `http://localhost:5174/?token=YOUR_INVITATION_TOKEN`
4. You should see the registration form with the email pre-filled
5. Fill in the details and register

**Success**: The new user can now log in!

---

## Quick Troubleshooting

### "Unable to connect to server"
- ✅ Check `.env` file has no quotes around values
- ✅ Restart dev server after changing `.env`
- ✅ Verify credentials are correct in Supabase dashboard

### "relation 'profiles' does not exist"
- ✅ Run the migrations (Step 1)
- ✅ Check Table Editor to verify tables exist

### Can't log in
- ✅ Verify user exists in Authentication > Users
- ✅ Verify profile exists in Table Editor > profiles
- ✅ Check that the profile `id` matches the auth user `id`

### Don't see Admin Panel
- ✅ Check `is_admin = true` in profiles table
- ✅ Try logging out and back in
- ✅ Check browser console for errors

### Invitation not working
- ✅ Check invitation exists in Table Editor > invitations
- ✅ Verify `status = 'pending'` and not expired
- ✅ Make sure using the correct token in the URL

---

## What's Next?

Now that your app is set up:

1. **Customize your profile**
   - Click "Profile" tab
   - Update your information
   - Add a phone number

2. **Invite family members**
   - Use Admin Panel to send invitations
   - Share the registration link with them
   - They can register and start using the app

3. **Set up email (optional)**
   - Configure email service in Supabase
   - Invitations will be sent automatically
   - See `SUPABASE_SETUP.md` for details

4. **Add more features**
   - The app is ready for you to extend
   - Add cabin booking, calendar, etc.
   - See the spec files in `.kiro/specs/cabin-home-page/`

---

## Summary

After completing these steps, you should have:

- ✅ Database tables created
- ✅ Admin user account
- ✅ Ability to log in
- ✅ Ability to send invitations
- ✅ Fully functional cabin management app!

**Total time**: ~10 minutes

**Need help?** Check the detailed guides:
- `RUN_MIGRATIONS.md` - Database setup
- `BOOTSTRAP_ADMIN.md` - Admin user creation
- `SUPABASE_SETUP.md` - Advanced configuration
- `QUICK_START.md` - Quick reference

---

**You're all set! Enjoy your cabin management app! 🏡**
