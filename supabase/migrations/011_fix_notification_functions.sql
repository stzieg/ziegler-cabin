-- Fix notification functions to use correct table names

-- Function to create notification for all users (corrected)
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
    INNER JOIN profiles p ON u.id = p.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for new reservations (corrected)
CREATE OR REPLACE FUNCTION notify_new_reservation() RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
BEGIN
    -- Get the user's name
    SELECT COALESCE(p.first_name || ' ' || p.last_name, u.email)
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

-- Trigger function for maintenance task updates (corrected)
CREATE OR REPLACE FUNCTION notify_maintenance_update() RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    status_text TEXT;
BEGIN
    -- Get the user's name
    SELECT COALESCE(p.first_name || ' ' || p.last_name, u.email)
    INTO user_name
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE u.id = NEW.user_id;

    -- Determine status text
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        status_text := 'completed';
    ELSIF NEW.status = 'in_progress' AND (OLD.status IS NULL OR OLD.status != 'in_progress') THEN
        status_text := 'started';
    ELSE
        RETURN NEW; -- No notification needed
    END IF;

    -- Create notification for all users
    PERFORM create_notification_for_all_users(
        'Maintenance Update',
        user_name || ' ' || status_text || ' maintenance task: ' || NEW.title,
        'maintenance',
        NULL,
        NEW.id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;