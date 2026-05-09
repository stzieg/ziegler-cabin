-- Send photo upload notifications from the application after the upload batch completes.
-- The old row-level trigger created one notification per inserted photo.

DROP TRIGGER IF EXISTS trigger_notify_new_photo ON photos;
DROP FUNCTION IF EXISTS notify_new_photo();
