-- Fix reservation constraint by ensuring btree_gist extension is enabled
-- This extension is required for the EXCLUDE USING gist constraint on daterange

-- Enable the btree_gist extension (required for exclusion constraints on non-btree types)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Drop the existing exclusion constraint if it exists (it may be broken)
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_daterange_excl;

-- Drop the trigger-based conflict check (we'll rely on the exclusion constraint)
DROP TRIGGER IF EXISTS prevent_reservation_conflicts ON reservations;
DROP FUNCTION IF EXISTS check_reservation_conflict();

-- Recreate the exclusion constraint properly
-- Note: This prevents any overlapping date ranges
ALTER TABLE reservations 
ADD CONSTRAINT reservations_no_overlap 
EXCLUDE USING gist (daterange(start_date, end_date, '[]') WITH &&);
