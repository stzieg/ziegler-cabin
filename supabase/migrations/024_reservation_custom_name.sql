-- Migration: Add custom_name field to reservations for admin-created reservations
-- This allows admins to create reservations for future users by typing their name

-- Add custom_name column to reservations table
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS custom_name VARCHAR(100);

-- Make user_id nullable (for reservations with custom names)
ALTER TABLE reservations 
ALTER COLUMN user_id DROP NOT NULL;

-- Add constraint: either user_id or custom_name must be set
ALTER TABLE reservations
ADD CONSTRAINT reservations_user_or_custom_name_check 
CHECK (user_id IS NOT NULL OR custom_name IS NOT NULL);

-- Add index for custom_name lookups
CREATE INDEX IF NOT EXISTS idx_reservations_custom_name 
ON reservations(custom_name) 
WHERE custom_name IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN reservations.custom_name IS 'Custom name for reservations created by admins for future users';
