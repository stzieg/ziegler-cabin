-- Add notification trigger for new maintenance task creation

-- Create trigger function for new maintenance tasks
CREATE OR REPLACE FUNCTION notify_new_maintenance_task() RETURNS TRIGGER AS $$
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
        'New Maintenance Task',
        user_name || ' created a new maintenance task: ' || NEW.title,
        'maintenance',
        NULL,
        NEW.id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new maintenance tasks
DROP TRIGGER IF EXISTS trigger_notify_new_maintenance_task ON maintenance_tasks;
CREATE TRIGGER trigger_notify_new_maintenance_task
    AFTER INSERT ON maintenance_tasks
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_maintenance_task();