-- Migration: Allow all authenticated users to read profile names
-- This enables showing reservation owner names on the calendar for all users

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

-- Create a new policy that allows all authenticated users to read all profiles
-- This is needed so users can see who has reservations on the calendar
CREATE POLICY "Authenticated users can read all profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

-- Note: Users can still only UPDATE their own profile (existing policy)
-- Admins retain full access through their existing policies
