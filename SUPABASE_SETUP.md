# Supabase Setup Guide

This project uses Supabase for authentication and database services. Follow these steps to set up your Supabase integration.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Wait for the project to be fully provisioned

## 2. Get Your Project Credentials

1. In your Supabase dashboard, go to Settings > API
2. Copy your Project URL and anon/public key

## 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your actual Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## 4. Set Up Database Schema

You'll need to create the following tables in your Supabase database:

### Profiles Table
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### Invitations Table
```sql
CREATE TABLE invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired'))
);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_status ON invitations(status);

-- Policies (add these based on your requirements)
```

## 5. Authentication Configuration

In your Supabase dashboard:

1. Go to Authentication > Settings
2. Configure your site URL (e.g., `http://localhost:5173` for development)
3. Set up email templates if needed
4. Configure any additional auth providers

## 6. Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. The application should now be able to connect to Supabase
3. Check the browser console for any connection errors

## Available Supabase Utilities

The project includes several utility functions in `src/utils/supabase.ts`:

- `getCurrentUser()` - Get the current authenticated user
- `getCurrentSession()` - Get the current session
- `signUp(email, password)` - Register a new user
- `signIn(email, password)` - Sign in an existing user
- `signOut()` - Sign out the current user
- `getUserProfile(userId)` - Get user profile data
- `upsertUserProfile(profile)` - Create or update user profile
- `getInvitationByToken(token)` - Get invitation by token
- `markInvitationAsUsed(token, userId)` - Mark invitation as used
- `createInvitation(email, createdBy)` - Create new invitation
- `getAllInvitations()` - Get all invitations (admin only)
- `isUserAdmin(userId)` - Check if user is admin

## TypeScript Types

All Supabase-related types are defined in `src/types/supabase.ts` and exported from `src/types/index.ts`.

## 7. Creating Your First Admin User

After running the database migrations, you need to create an admin user to manage invitations:

### Method 1: Using Supabase Dashboard (Recommended)

1. **Create a user account**
   - Go to Authentication > Users in your Supabase dashboard
   - Click "Add user" > "Create new user"
   - Enter an email and password
   - Click "Create user"
   - Copy the User UID (you'll need this in the next step)

2. **Make the user an admin**
   - Go to Table Editor > profiles
   - Click "Insert" > "Insert row"
   - Fill in the fields:
     - `id`: Paste the User UID you copied
     - `first_name`: Your first name
     - `last_name`: Your last name
     - `phone_number`: (optional) Your phone number
     - `is_admin`: Check this box (set to TRUE)
   - Click "Save"

3. **Test the admin login**
   - Go to http://localhost:5174/
   - Log in with the email and password you created
   - You should see the Admin Panel with invitation management

### Method 2: Using SQL Editor

Run this SQL in the Supabase SQL Editor (replace the values):

```sql
-- First, create the auth user (if not already created via dashboard)
-- Note: You'll need to use the dashboard to create auth users

-- Then, insert the profile with admin privileges
INSERT INTO profiles (id, first_name, last_name, phone_number, is_admin)
VALUES (
  'USER_UID_HERE',  -- Replace with the actual user UID from auth.users
  'John',           -- Replace with first name
  'Doe',            -- Replace with last name
  '555-1234',       -- Replace with phone number (optional)
  true              -- This makes them an admin
);
```

## 8. Testing the Full Flow

### Test Admin Functions

1. **Log in as admin**
   - Go to http://localhost:5174/
   - Enter your admin credentials
   - You should see the Admin Panel

2. **Create an invitation**
   - In the Admin Panel, enter an email address
   - Click "Send Invitation"
   - You should see the invitation appear in the list below
   - Copy the invitation token from the list

3. **Test registration with invitation**
   - Log out (if there's a logout button) or open an incognito window
   - Go to http://localhost:5174/
   - Click "Register" or "Sign Up"
   - Enter the invitation token
   - Fill in the registration form
   - Submit and verify the account is created

### Verify Database

Check that everything is working:

1. **Check profiles table**
   - Go to Table Editor > profiles
   - You should see your admin profile and any registered users

2. **Check invitations table**
   - Go to Table Editor > invitations
   - You should see your invitations with correct status (pending/used)

## Troubleshooting

### "User already registered" error
- The auth user exists but the profile doesn't
- Manually insert a profile record with the user's UID

### "Not authorized" or "Permission denied"
- Check that RLS policies are set up correctly (run migration 002)
- Verify the user has `is_admin = true` in the profiles table

### Invitation token not working
- Check that the invitation exists and status is 'pending'
- Verify the invitation hasn't expired (check `expires_at`)
- Make sure RLS policy "Public can read invitation by token" exists

### Can't see Admin Panel
- Verify `is_admin = true` in the profiles table for your user
- Check browser console for errors
- Verify the `is_admin()` function exists in the database

## Security Notes

- Never commit your `.env` file to version control
- The `.env` file is already added to `.gitignore`
- Use Row Level Security (RLS) policies to secure your data
- The anon key is safe to use in client-side code as it has limited permissions
- Only create admin users for trusted individuals
- Regularly review and expire old invitations