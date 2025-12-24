-- Migration: Fix RLS policies for admin reservation creation with custom names
-- Admins need to be able to create reservations where user_id is null

-- First, let's make sure the is_admin function exists and works correctly
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create own reservations" ON reservations;
DROP POLICY IF EXISTS "Admins can manage all reservations" ON reservations;
DROP POLICY IF EXISTS "Admins can insert reservations" ON reservations;

-- Recreate user policy - users can only create reservations for themselves
CREATE POLICY "Users can create own reservations" ON reservations
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND user_id IS NOT NULL
  );

-- Admin policy for SELECT, UPDATE, DELETE
CREATE POLICY "Admins can manage all reservations" ON reservations
  FOR ALL USING (is_admin(auth.uid()));

-- Separate INSERT policy for admins that allows null user_id
-- This is needed because WITH CHECK is evaluated differently than USING
CREATE POLICY "Admins can insert reservations" ON reservations
  FOR INSERT WITH CHECK (is_admin(auth.uid()));
