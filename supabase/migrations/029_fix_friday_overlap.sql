-- Migration: Fix Friday noon reservation transitions
-- The exclusion constraint in migration 007 doesn't allow Friday overlaps
-- We need to use a trigger-based approach instead

-- Drop the exclusion constraint that blocks all overlaps
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_no_overlap;
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_daterange_excl;

-- Drop any existing conflict trigger
DROP TRIGGER IF EXISTS prevent_reservation_conflicts ON reservations;
DROP FUNCTION IF EXISTS check_reservation_conflict() CASCADE;

-- Create function that allows Friday noon transitions
CREATE OR REPLACE FUNCTION check_reservation_conflict()
RETURNS TRIGGER AS $$
DECLARE
    conflict_record RECORD;
    new_start_dow INTEGER;
    new_end_dow INTEGER;
    existing_start_dow INTEGER;
    existing_end_dow INTEGER;
BEGIN
    -- Get day of week for new reservation dates (0 = Sunday, 5 = Friday)
    new_start_dow := EXTRACT(DOW FROM NEW.start_date);
    new_end_dow := EXTRACT(DOW FROM NEW.end_date);
    
    -- Check for overlapping reservations
    FOR conflict_record IN 
        SELECT id, start_date, end_date 
        FROM reservations 
        WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND daterange(start_date, end_date, '[]') && daterange(NEW.start_date, NEW.end_date, '[]')
    LOOP
        existing_start_dow := EXTRACT(DOW FROM conflict_record.start_date);
        existing_end_dow := EXTRACT(DOW FROM conflict_record.end_date);
        
        -- Allow Friday noon transitions:
        -- Case 1: New reservation starts on Friday, existing ends on same Friday
        IF NEW.start_date = conflict_record.end_date AND new_start_dow = 5 THEN
            CONTINUE;
        END IF;
        
        -- Case 2: New reservation ends on Friday, existing starts on same Friday  
        IF NEW.end_date = conflict_record.start_date AND new_end_dow = 5 THEN
            CONTINUE;
        END IF;
        
        -- Otherwise it's a real conflict
        RAISE EXCEPTION 'Reservation conflicts with existing booking from % to %', 
            conflict_record.start_date, conflict_record.end_date;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER prevent_reservation_conflicts
    BEFORE INSERT OR UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION check_reservation_conflict();
