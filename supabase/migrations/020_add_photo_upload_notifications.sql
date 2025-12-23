-- Add notification trigger for photo uploads

-- Create trigger function for new photo uploads
CREATE OR REPLACE FUNCTION notify_new_photo() RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
BEGIN
    -- Get the user's name, with fallback to email if no profile exists
    SELECT COALESCE(
        CASE 
            WHEN p.first_name IS NOT NULL AND p.last_name IS NOT NULL 
            THEN p.first_name || ' ' || p.last_name
            WHEN p.first_name IS NOT NULL 
            THEN p.first_name
            ELSE NULL
        END,
        u.email,
        'A user'
    )
    INTO user_name
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE u.id = NEW.user_id;

    -- Create notification for all users except the uploader
    INSERT INTO notifications (user_id, title, message, type, created_at)
    SELECT 
        u.id,
        'New Photo Uploaded',
        user_name || ' uploaded a new photo to the gallery',
        'general',
        NOW()
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    -- Only include users who have profiles OR are confirmed (to avoid including unconfirmed signups)
    WHERE (p.id IS NOT NULL OR u.email_confirmed_at IS NOT NULL)
    -- Don't notify the person who uploaded the photo
    AND u.id != NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new photo uploads
DROP TRIGGER IF EXISTS trigger_notify_new_photo ON photos;
CREATE TRIGGER trigger_notify_new_photo
    AFTER INSERT ON photos
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_photo();