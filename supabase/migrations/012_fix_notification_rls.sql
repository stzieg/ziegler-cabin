-- Fix RLS policies for notifications

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- Recreate policies with better permissions
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow authenticated users to create notifications (for RPC functions)
CREATE POLICY "Authenticated users can create notifications" ON notifications
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Grant execute permissions on RPC functions to authenticated users
GRANT EXECUTE ON FUNCTION create_notification_for_all_users TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification_for_user TO authenticated;