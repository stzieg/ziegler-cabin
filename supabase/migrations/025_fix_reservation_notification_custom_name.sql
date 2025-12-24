-- Migration: Fix reservation notification function to handle custom_name reservations
-- When user_id is null (custom name reservation), use the custom_name instead

-- Drop and recreate the function to handle custom_name reservations
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
  display_name TEXT;
BEGIN
  -- Get reservation details
  SELECT * INTO reservation_record FROM reservations WHERE id = reservation_id;
  
  -- Check if reservation exists
  IF NOT FOUND THEN
    RAISE WARNING 'Reservation with id % not found', reservation_id;
    RETURN;
  END IF;
  
  -- Determine display name - use custom_name if set, otherwise get from profile
  IF reservation_record.custom_name IS NOT NULL THEN
    display_name := reservation_record.custom_name;
  ELSIF reservation_record.user_id IS NOT NULL THEN
    -- Get user details
    SELECT * INTO user_record FROM profiles WHERE id = reservation_record.user_id;
    
    IF FOUND THEN
      display_name := user_record.first_name || ' ' || user_record.last_name;
    ELSE
      display_name := 'Unknown User';
    END IF;
  ELSE
    display_name := 'Unknown';
  END IF;
  
  -- Create notification title and message based on type
  CASE notification_type
    WHEN 'created' THEN
      notification_title := 'New Reservation Created';
      notification_message := format('Reservation by %s from %s to %s', 
        display_name,
        reservation_record.start_date, reservation_record.end_date);
    WHEN 'updated' THEN
      notification_title := 'Reservation Updated';
      notification_message := format('Reservation by %s updated for %s to %s', 
        display_name,
        reservation_record.start_date, reservation_record.end_date);
    WHEN 'cancelled' THEN
      notification_title := 'Reservation Cancelled';
      notification_message := format('Reservation by %s cancelled for %s to %s', 
        display_name,
        reservation_record.start_date, reservation_record.end_date);
    ELSE
      notification_title := 'Reservation Update';
      notification_message := format('Reservation by %s has been updated', 
        display_name);
  END CASE;
  
  -- Create notifications for all users (except the reservation creator if they have a user_id)
  INSERT INTO notifications (user_id, type, title, message, priority)
  SELECT 
    p.id,
    'reservation'::notification_type,
    notification_title,
    notification_message,
    'normal'::priority_level
  FROM profiles p
  WHERE reservation_record.user_id IS NULL 
     OR p.id != reservation_record.user_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the transaction
    RAISE WARNING 'Failed to create reservation notification: %', SQLERRM;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Also update any trigger that might be calling this function directly
-- to handle the case where user_id is null

-- Create or replace the trigger function for reservation notifications
CREATE OR REPLACE FUNCTION trigger_reservation_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM create_reservation_notification(NEW.id, 'created');
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM create_reservation_notification(NEW.id, 'updated');
  ELSIF TG_OP = 'DELETE' THEN
    -- For delete, we need to handle it differently since the record is gone
    -- Just skip notification for now
    NULL;
  END IF;
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the main operation if notification fails
    RAISE WARNING 'Reservation notification trigger failed: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS reservation_notification_trigger ON reservations;
CREATE TRIGGER reservation_notification_trigger
  AFTER INSERT OR UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_reservation_notification();
