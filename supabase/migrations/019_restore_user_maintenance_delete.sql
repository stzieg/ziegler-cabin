-- Restore ability for users to delete their own maintenance tasks

-- Drop the admin-only delete policy
DROP POLICY IF EXISTS "Only admins can delete maintenance tasks" ON maintenance_tasks;

-- Restore the original policy allowing users to delete their own tasks
CREATE POLICY "Users can delete own maintenance tasks" ON maintenance_tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Keep the admin policy for managing all tasks (this already exists but ensuring it's there)
-- The "Admins can manage all maintenance tasks" policy should already cover admin deletion