-- Fix photo upload notifications to use the standard notification function

-- Update the photo notification trigger to use the existing notification function
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

    -- Create notification for all users using the standard function
    PERFORM create_notification_for_all_users(
        'New Photo Uploaded',
        user_name || ' uploaded a new photo to the gallery',
        'general',
        NULL,
        NULL
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;