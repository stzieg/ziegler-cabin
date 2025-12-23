-- Bootstrap script to create your first admin user
-- Run this in the Supabase SQL Editor after running the migrations

-- INSTRUCTIONS:
-- 1. First, create a user account through Supabase Auth:
--    - Go to Authentication > Users in your Supabase dashboard
--    - Click "Add user" > "Create new user"
--    - Enter your email and password
--    - Click "Create user"
--    - Copy the user's UUID (it will look like: 12345678-1234-1234-1234-123456789abc)
--
-- 2. Replace 'YOUR_USER_ID_HERE' below with your actual user UUID
-- 3. Replace 'your.email@example.com' with your actual email
-- 4. Run this script in the SQL Editor

-- Create admin profile for your user
INSERT INTO profiles (id, first_name, last_name, phone_number, is_admin, created_at, updated_at)
VALUES (
  'YOUR_USER_ID_HERE'::uuid,  -- Replace with your user UUID from step 1
  'Admin',                      -- Your first name
  'User',                       -- Your last name
  NULL,                         -- Optional: your phone number
  true,                         -- Make this user an admin
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET is_admin = true;  -- If profile exists, just make them admin

-- Verify the admin was created
SELECT id, first_name, last_name, is_admin, created_at
FROM profiles
WHERE is_admin = true;

-- You should see your admin user in the results!
-- Now you can log in and send invitations to other users.
