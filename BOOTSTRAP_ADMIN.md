# How to Create Your First Admin User

Since the app uses invitation-only registration, you need to bootstrap your first admin user directly in Supabase. Here's how:

## Step-by-Step Guide

### Step 1: Create a User in Supabase Auth (2 minutes)

1. **Go to your Supabase Dashboard**
   - Visit [supabase.com/dashboard](https://supabase.com/dashboard)
   - Open your project: `atzgamzxqddgcflxshaw`

2. **Navigate to Authentication**
   - Click "Authentication" in the left sidebar
   - Click "Users" tab

3. **Create a new user**
   - Click the "Add user" button (top right)
   - Select "Create new user"
   - Enter your email (e.g., `sam@example.com`)
   - Enter a password (at least 8 characters)
   - Click "Create user"

4. **Copy the User ID**
   - After creating the user, you'll see them in the users list
   - Click on the user to see details
   - Copy the **User UID** (looks like: `12345678-1234-1234-1234-123456789abc`)
   - Keep this handy for the next step!

### Step 2: Create Admin Profile (1 minute)

1. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

2. **Run the bootstrap script**
   - Open the file `supabase/bootstrap_admin.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - **IMPORTANT**: Replace `'YOUR_USER_ID_HERE'` with your actual User UID from Step 1
   - **IMPORTANT**: Update the first_name and last_name if desired
   - Click "Run" (or press Ctrl+Enter)

3. **Verify it worked**
   - You should see a result showing your admin user
   - The `is_admin` column should be `true`

### Step 3: Log In and Test (1 minute)

1. **Go to your app**
   - Visit http://localhost:5174/
   - You should see the login form

2. **Log in with your credentials**
   - Enter the email you used in Step 1
   - Enter the password you created
   - Click "Log In"

3. **You should now be logged in!**
   - You'll see "Welcome to the Cabin!"
   - You'll see tabs for "Profile" and "Admin Panel"

### Step 4: Send Invitations to Others

1. **Click the "Admin Panel" tab**
   - You'll see the invitation management interface

2. **Send an invitation**
   - Enter a family member's email address
   - Click "Send Invitation"
   - They'll receive an email with a registration link

3. **The invitation includes:**
   - A unique token (valid for 7 days)
   - A registration link
   - Instructions for signing up

## Quick Reference SQL

If you prefer to do it all in one SQL command:

```sql
-- 1. First create the user in Authentication > Users in the dashboard
-- 2. Then run this (replace the UUID and details):

INSERT INTO profiles (id, first_name, last_name, phone_number, is_admin)
VALUES (
  'YOUR_USER_UUID_HERE'::uuid,
  'Your First Name',
  'Your Last Name',
  NULL,  -- or '555-1234' for phone
  true   -- makes you an admin
);
```

## Alternative: Create Multiple Admins

If you want to make multiple users admins:

```sql
-- Make an existing user an admin
UPDATE profiles 
SET is_admin = true 
WHERE id = 'USER_UUID_HERE'::uuid;

-- Verify all admins
SELECT id, first_name, last_name, is_admin 
FROM profiles 
WHERE is_admin = true;
```

## Troubleshooting

### "User already exists" error
- The user was already created in Auth
- Just proceed to Step 2 to create the profile

### "Profile already exists" error
- The profile was already created
- Use this to make them admin:
  ```sql
  UPDATE profiles SET is_admin = true WHERE id = 'YOUR_UUID'::uuid;
  ```

### "Cannot insert into profiles" error
- Make sure you ran the migrations first (see `RUN_MIGRATIONS.md`)
- Check that the `profiles` table exists in Table Editor

### Can't log in after creating user
- Make sure you created the profile in Step 2
- Check that the UUID matches exactly
- Verify the user exists in Authentication > Users

### Don't see "Admin Panel" tab after logging in
- Check that `is_admin` is `true` in the profiles table
- Try logging out and back in
- Check the browser console for errors

## Security Note

⚠️ **Important**: Only make trusted family members admins! Admins can:
- Send invitations to new users
- See all invitations
- Manage user access

For regular family members, just send them an invitation - they don't need admin access.

## What's Next?

After creating your admin user:

1. ✅ Log in to test the app
2. ✅ Update your profile information
3. ✅ Send invitations to family members
4. ✅ They register using the invitation link
5. ✅ Everyone can now use the cabin management system!

---

**Quick Check**: After completing these steps, you should be able to log in and see the Admin Panel tab!
