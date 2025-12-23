-- Row Level Security policies for dashboard expansion tables
-- Policies for reservations, maintenance_tasks, photos, and notifications

-- ============================================================================
-- RESERVATIONS TABLE POLICIES
-- ============================================================================

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can read all reservations" ON reservations;
DROP POLICY IF EXISTS "Users can create own reservations" ON reservations;
DROP POLICY IF EXISTS "Users can update own reservations" ON reservations;
DROP POLICY IF EXISTS "Users can delete own reservations" ON reservations;
DROP POLICY IF EXISTS "Admins can manage all reservations" ON reservations;

-- Users can read all reservations (to see calendar availability)
CREATE POLICY "Users can read all reservations" ON reservations
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can create their own reservations
CREATE POLICY "Users can create own reservations" ON reservations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own reservations
CREATE POLICY "Users can update own reservations" ON reservations
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own reservations
CREATE POLICY "Users can delete own reservations" ON reservations
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can manage all reservations
CREATE POLICY "Admins can manage all reservations" ON reservations
  FOR ALL USING (is_admin(auth.uid()));

-- ============================================================================
-- MAINTENANCE_TASKS TABLE POLICIES
-- ============================================================================

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can read all maintenance tasks" ON maintenance_tasks;
DROP POLICY IF EXISTS "Users can create maintenance tasks" ON maintenance_tasks;
DROP POLICY IF EXISTS "Users can update own maintenance tasks" ON maintenance_tasks;
DROP POLICY IF EXISTS "Users can delete own maintenance tasks" ON maintenance_tasks;
DROP POLICY IF EXISTS "Admins can manage all maintenance tasks" ON maintenance_tasks;

-- Users can read all maintenance tasks (for transparency)
CREATE POLICY "Users can read all maintenance tasks" ON maintenance_tasks
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can create maintenance tasks
CREATE POLICY "Users can create maintenance tasks" ON maintenance_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own maintenance tasks
CREATE POLICY "Users can update own maintenance tasks" ON maintenance_tasks
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own maintenance tasks
CREATE POLICY "Users can delete own maintenance tasks" ON maintenance_tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can manage all maintenance tasks
CREATE POLICY "Admins can manage all maintenance tasks" ON maintenance_tasks
  FOR ALL USING (is_admin(auth.uid()));

-- ============================================================================
-- PHOTOS TABLE POLICIES
-- ============================================================================

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can read all photos" ON photos;
DROP POLICY IF EXISTS "Users can upload photos" ON photos;
DROP POLICY IF EXISTS "Users can update own photos" ON photos;
DROP POLICY IF EXISTS "Users can delete own photos" ON photos;
DROP POLICY IF EXISTS "Admins can manage all photos" ON photos;

-- Users can read all photos (shared family gallery)
CREATE POLICY "Users can read all photos" ON photos
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can upload their own photos
CREATE POLICY "Users can upload photos" ON photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own photos (captions, tags, etc.)
CREATE POLICY "Users can update own photos" ON photos
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own photos
CREATE POLICY "Users can delete own photos" ON photos
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can manage all photos
CREATE POLICY "Admins can manage all photos" ON photos
  FOR ALL USING (is_admin(auth.uid()));

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can read all notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can create notifications for users" ON notifications;
DROP POLICY IF EXISTS "Admins can manage all notifications" ON notifications;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- System can create notifications for any user (for automated notifications)
-- This policy allows the application to create notifications triggered by various events
-- Limited to service role or authenticated users creating notifications for valid users
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (
    -- Allow service role to create notifications
    auth.role() = 'service_role' OR
    -- Allow authenticated users to create notifications for existing users
    (auth.role() = 'authenticated' AND 
     EXISTS (SELECT 1 FROM profiles WHERE id = user_id))
  );

-- Admins can read all notifications
CREATE POLICY "Admins can read all notifications" ON notifications
  FOR SELECT USING (is_admin(auth.uid()));

-- Admins can create notifications for any user
CREATE POLICY "Admins can create notifications for users" ON notifications
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- Admins can manage all notifications
CREATE POLICY "Admins can manage all notifications" ON notifications
  FOR ALL USING (is_admin(auth.uid()));

-- ============================================================================
-- HELPER FUNCTIONS FOR NOTIFICATION CREATION
-- ============================================================================

-- Function to create reservation notifications
CREATE OR REPLACE FUNCTION create_reservation_notification(
  reservation_id UUID,
  notification_type TEXT DEFAULT 'created'
)
RETURNS void AS $$
DECLARE
  reservation_record reservations%ROWTYPE;
  user_record profiles%ROWTYPE;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Get reservation details
  SELECT * INTO reservation_record FROM reservations WHERE id = reservation_id;
  
  -- Check if reservation exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation with id % not found', reservation_id;
  END IF;
  
  -- Get user details
  SELECT * INTO user_record FROM profiles WHERE id = reservation_record.user_id;
  
  -- Check if user exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile for reservation % not found', reservation_id;
  END IF;
  
  -- Create notification title and message based on type
  CASE notification_type
    WHEN 'created' THEN
      notification_title := 'New Reservation Created';
      notification_message := format('Reservation by %s %s from %s to %s', 
        user_record.first_name, user_record.last_name,
        reservation_record.start_date, reservation_record.end_date);
    WHEN 'updated' THEN
      notification_title := 'Reservation Updated';
      notification_message := format('Reservation by %s %s updated for %s to %s', 
        user_record.first_name, user_record.last_name,
        reservation_record.start_date, reservation_record.end_date);
    WHEN 'cancelled' THEN
      notification_title := 'Reservation Cancelled';
      notification_message := format('Reservation by %s %s cancelled for %s to %s', 
        user_record.first_name, user_record.last_name,
        reservation_record.start_date, reservation_record.end_date);
    ELSE
      notification_title := 'Reservation Update';
      notification_message := format('Reservation by %s %s has been updated', 
        user_record.first_name, user_record.last_name);
  END CASE;
  
  -- Create notifications for all users except the reservation creator
  INSERT INTO notifications (user_id, type, title, message, priority)
  SELECT 
    p.id,
    'reservation'::notification_type,
    notification_title,
    notification_message,
    'normal'::priority_level
  FROM profiles p
  WHERE p.id != reservation_record.user_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the transaction
    RAISE WARNING 'Failed to create reservation notification: %', SQLERRM;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to create maintenance notifications
CREATE OR REPLACE FUNCTION create_maintenance_notification(
  task_id UUID,
  notification_type TEXT DEFAULT 'created'
)
RETURNS void AS $$
DECLARE
  task_record maintenance_tasks%ROWTYPE;
  user_record profiles%ROWTYPE;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Get task details
  SELECT * INTO task_record FROM maintenance_tasks WHERE id = task_id;
  
  -- Check if task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Maintenance task with id % not found', task_id;
  END IF;
  
  -- Get user details
  SELECT * INTO user_record FROM profiles WHERE id = task_record.user_id;
  
  -- Check if user exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile for maintenance task % not found', task_id;
  END IF;
  
  -- Create notification title and message based on type
  CASE notification_type
    WHEN 'created' THEN
      notification_title := 'New Maintenance Task';
      notification_message := format('Maintenance task "%s" completed by %s %s', 
        task_record.title, user_record.first_name, user_record.last_name);
    WHEN 'reminder' THEN
      notification_title := 'Maintenance Reminder';
      notification_message := format('Recurring maintenance "%s" is due', task_record.title);
    ELSE
      notification_title := 'Maintenance Update';
      notification_message := format('Maintenance task "%s" has been updated', task_record.title);
  END CASE;
  
  -- Create notifications for all users
  INSERT INTO notifications (user_id, type, title, message, priority)
  SELECT 
    p.id,
    'maintenance'::notification_type,
    notification_title,
    notification_message,
    CASE WHEN notification_type = 'reminder' THEN 'high'::priority_level ELSE 'normal'::priority_level END
  FROM profiles p;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the transaction
    RAISE WARNING 'Failed to create maintenance notification: %', SQLERRM;
END;
$$ language 'plpgsql' SECURITY DEFINER;