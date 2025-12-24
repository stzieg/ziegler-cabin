-- Migration: Notify admins when a new user joins
-- This trigger fires when a profile is created (which happens on user signup)

-- Function to notify admins when a new user joins
CREATE OR REPLACE FUNCTION notify_new_user_joined()
RETURNS TRIGGER AS $$
DECLARE
    admin_id UUID;
    user_name TEXT;
BEGIN
    -- Build the user's display name
    user_name := TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));
    IF user_name = '' THEN
        user_name := 'A new user';
    END IF;

    -- Create notification for all admins
    FOR admin_id IN 
        SELECT id FROM profiles WHERE is_admin = true
    LOOP
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (
            admin_id,
            'New Member Joined',
            user_name || ' has joined the cabin family!',
            'admin'
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS trigger_notify_new_user_joined ON profiles;
CREATE TRIGGER trigger_notify_new_user_joined
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_user_joined();
