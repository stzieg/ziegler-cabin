-- Debug maintenance task deletion issues

-- Create a function to test deletion permissions
CREATE OR REPLACE FUNCTION test_maintenance_delete_permissions(task_id_param UUID)
RETURNS TEXT AS $$
DECLARE
    current_user_id UUID;
    task_user_id UUID;
    is_user_admin BOOLEAN;
    result_text TEXT := '';
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    result_text := result_text || 'Current user ID: ' || COALESCE(current_user_id::TEXT, 'NULL') || E'\n';
    
    -- Get task user_id
    SELECT user_id INTO task_user_id FROM maintenance_tasks WHERE id = task_id_param;
    result_text := result_text || 'Task user ID: ' || COALESCE(task_user_id::TEXT, 'NULL') || E'\n';
    
    -- Check if user is admin
    is_user_admin := is_admin(current_user_id);
    result_text := result_text || 'Is admin: ' || is_user_admin || E'\n';
    
    -- Check if user owns the task
    result_text := result_text || 'User owns task: ' || (current_user_id = task_user_id) || E'\n';
    
    -- Check if task exists
    IF task_user_id IS NULL THEN
        result_text := result_text || 'Task not found!' || E'\n';
    END IF;
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION test_maintenance_delete_permissions TO authenticated;