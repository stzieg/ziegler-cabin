-- Migration to allow Friday noon reservation transitions
-- When one reservation ends on Friday (at noon) and another starts on the same Friday (at noon),
-- this should be allowed since they don't actually overlap in time.

-- Drop the existing exclusion constraint
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_daterange_excl;

-- Drop the existing trigger
DROP TRIGGER IF EXISTS prevent_reservation_conflicts ON reservations;

-- Create updated function that allows Friday transitions
CREATE OR REPLACE FUNCTION check_reservation_conflict()
RETURNS TRIGGER AS $$
DECLARE
    conflict_record RECORD;
BEGIN
    -- Check for overlapping reservations
    FOR conflict_record IN 
        SELECT id, start_date, end_date 
        FROM reservations 
        WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND daterange(start_date, end_date, '[]') && daterange(NEW.start_date, NEW.end_date, '[]')
    LOOP
        -- Allow Friday noon transitions:
        -- If new reservation starts on Friday and existing ends on same Friday
        IF NEW.start_date = conflict_record.end_date 
           AND EXTRACT(DOW FROM NEW.start_date) = 5 THEN
            CONTINUE;
        END IF;
        
        -- If new reservation ends on Friday and existing starts on same Friday
        IF NEW.end_date = conflict_record.start_date 
           AND EXTRACT(DOW FROM NEW.end_date) = 5 THEN
            CONTINUE;
        END IF;
        
        -- Otherwise it's a real conflict
        RAISE EXCEPTION 'Reservation conflicts with existing booking for dates % to %', 
            NEW.start_date, NEW.end_date;
    END LOOP;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate the trigger
CREATE TRIGGER prevent_reservation_conflicts
    BEFORE INSERT OR UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION check_reservation_conflict();
