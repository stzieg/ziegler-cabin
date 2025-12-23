-- Make maintenance task deletion admin-only

-- Drop the existing delete policy that allows users to delete their own tasks
DROP POLICY IF EXISTS "Users can delete own maintenance tasks" ON maintenance_tasks;

-- Create new policy that only allows admins to delete maintenance tasks
CREATE POLICY "Only admins can delete maintenance tasks" ON maintenance_tasks
  FOR DELETE USING (is_admin(auth.uid()));