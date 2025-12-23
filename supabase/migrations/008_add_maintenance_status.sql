-- Add status column to maintenance_tasks table
-- Allows tracking whether a task is 'in_progress' or 'completed'

ALTER TABLE maintenance_tasks 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress' 
CHECK (status IN ('in_progress', 'completed'));

-- Update existing tasks to be 'completed' since they were logged as done
UPDATE maintenance_tasks SET status = 'completed' WHERE status IS NULL;
