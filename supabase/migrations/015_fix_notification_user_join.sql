-- Fix notification functions to handle users without profiles

-- Update the function to create notifications for all users, even those without profiles
CREATE OR REPLACE FUNCTION create_notification_for_all_users(
    p_title TEXT,
    p_message TEXT,
    p_type TEXT,
    p_related_reservation_id UUID DEFAULT NULL,
    p_related_maintenance_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO notifications (user_id, title, message, type, related_reservation_id, related_maintenance_id)
    SELECT 
        u.id,
        p_title,
        p_message,
        p_type,
        p_related_reservation_id,
        p_related_maintenance_id
    FROM auth.users u
    -- Use LEFT JOIN instead of INNER JOIN to include users without profiles
    LEFT JOIN profiles p ON u.id = p.id
    -- Only include users who have profiles OR are confirmed (to avoid including unconfirmed signups)
    WHERE p.id IS NOT NULL OR u.email_confirmed_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update the trigger function to be more robust
CREATE OR REPLACE FUNCTION notify_new_reservation() RETURNS TRIGGER AS $$
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

    -- Create notification for all users
    PERFORM create_notification_for_all_users(
        'New Reservation',
        user_name || ' made a reservation for ' || 
        TO_CHAR(NEW.start_date, 'Mon DD') || ' - ' || 
        TO_CHAR(NEW.end_date, 'Mon DD, YYYY'),
        'reservation',
        NEW.id,
        NULL
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;