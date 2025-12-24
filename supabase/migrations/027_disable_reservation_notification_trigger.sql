-- Migration: Disable the problematic reservation notification trigger
-- The trigger is failing when creating reservations with custom_name (null user_id)
-- We'll disable it and handle notifications in the application layer instead

-- Drop all reservation-related triggers that might be causing issues
DROP TRIGGER IF EXISTS reservation_notification_trigger ON reservations;
DROP TRIGGER IF EXISTS notify_reservation_created ON reservations;
DROP TRIGGER IF EXISTS notify_reservation_updated ON reservations;
DROP TRIGGER IF EXISTS notify_reservation_deleted ON reservations;
DROP TRIGGER IF EXISTS reservation_created_trigger ON reservations;
DROP TRIGGER IF EXISTS reservation_updated_trigger ON reservations;
DROP TRIGGER IF EXISTS on_reservation_created ON reservations;
DROP TRIGGER IF EXISTS on_reservation_updated ON reservations;

-- List all triggers on reservations table (for debugging)
-- You can run this query manually to see what triggers exist:
-- SELECT trigger_name, event_manipulation, action_statement 
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'reservations';
