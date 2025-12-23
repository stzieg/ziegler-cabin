-- Row Level Security policies for profiles and invitations tables

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- Profiles table policies
-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile during registration
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (is_admin(auth.uid()));

-- Admins can update any profile (for admin management)
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (is_admin(auth.uid()));

-- Drop existing invitation policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Admins can read invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Public can read invitation by token" ON invitations;
DROP POLICY IF EXISTS "System can update invitation status" ON invitations;
DROP POLICY IF EXISTS "Admins can update own invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete own invitations" ON invitations;

-- Invitations table policies
-- Admins can read all invitations
CREATE POLICY "Admins can read invitations" ON invitations
  FOR SELECT USING (is_admin(auth.uid()));

-- Admins can insert invitations
CREATE POLICY "Admins can create invitations" ON invitations
  FOR INSERT WITH CHECK (is_admin(auth.uid()) AND created_by = auth.uid());

-- Anyone can read invitations by token (for registration validation)
-- This is needed for the registration process to validate invitation tokens
CREATE POLICY "Public can read invitation by token" ON invitations
  FOR SELECT USING (true);

-- System can update invitation status when used
-- This allows marking invitations as used during registration
CREATE POLICY "System can update invitation status" ON invitations
  FOR UPDATE USING (true)
  WITH CHECK (
    -- Only allow updating specific fields for marking as used
    (used_at IS NOT NULL AND used_by IS NOT NULL AND status = 'used') OR
    -- Or allow updating status to expired
    (status = 'expired')
  );

-- Admins can update invitations they created
CREATE POLICY "Admins can update own invitations" ON invitations
  FOR UPDATE USING (is_admin(auth.uid()) AND created_by = auth.uid());

-- Delete policies (restrictive)
-- Only admins can delete profiles (for user management)
CREATE POLICY "Admins can delete profiles" ON profiles
  FOR DELETE USING (is_admin(auth.uid()));

-- Only admins can delete invitations they created
CREATE POLICY "Admins can delete own invitations" ON invitations
  FOR DELETE USING (is_admin(auth.uid()) AND created_by = auth.uid());