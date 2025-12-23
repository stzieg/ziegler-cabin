-- Test notification triggers and debug issues

-- First, let's check if the trigger function works by testing it manually
-- This will help us debug if the issue is with the trigger or the function

-- Create a test function to debug the notification creation
CREATE OR REPLACE FUNCTION test_notification_trigger() RETURNS TEXT AS $$
DECLARE
    test_user_id UUID;
    result_text TEXT := '';
BEGIN
    -- Get a test user
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RETURN 'No users found in auth.users table';
    END IF;
    
    result_text := result_text || 'Found user: ' || test_user_id || E'\n';
    
    -- Test the notification function directly
    BEGIN
        PERFORM create_notification_for_all_users(
            'Test Notification',
            'This is a test notification to verify the system works',
            'admin',
            NULL,
            NULL
        );
        result_text := result_text || 'Successfully created test notification' || E'\n';
    EXCEPTION WHEN OTHERS THEN
        result_text := result_text || 'Error creating notification: ' || SQLERRM || E'\n';
    END;
    
    -- Check if notifications were created
    DECLARE
        notification_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO notification_count FROM notifications WHERE title = 'Test Notification';
        result_text := result_text || 'Notifications created: ' || notification_count || E'\n';
    END;
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION test_notification_trigger TO authenticated;