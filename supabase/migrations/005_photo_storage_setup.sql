-- Photo storage setup migration
-- Creates storage bucket and policies for photo uploads

-- Create the photos storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Note: RLS on storage.objects is enabled by default in Supabase
-- We don't need to explicitly enable it via CLI

-- Ensure the is_admin function exists (should be created in 001_initial_schema.sql)
-- If it doesn't exist, create a simple version
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
    RETURNS BOOLEAN AS $func$
    BEGIN
        RETURN EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = user_id AND is_admin = true
        );
    END;
    $func$ language 'plpgsql' SECURITY DEFINER;
  END IF;
END
$$;

-- Note: Storage policies need to be set up manually through the Supabase Dashboard
-- due to permission restrictions when using CLI migrations.
-- See RUN_MIGRATIONS.md for detailed instructions on setting up storage policies.

-- Function to clean up orphaned storage files when photo records are deleted
CREATE OR REPLACE FUNCTION cleanup_photo_storage()
RETURNS TRIGGER AS $$
DECLARE
  file_path TEXT;
BEGIN
  -- Extract the storage path from the URL
  -- Assuming URL format: https://[project].supabase.co/storage/v1/object/public/photos/[user_id]/[filename]
  IF OLD.url IS NOT NULL AND OLD.url LIKE '%/storage/v1/object/public/photos/%' THEN
    -- Extract the file path after 'photos/'
    file_path := substring(OLD.url from '/photos/(.+)$');
    
    IF file_path IS NOT NULL THEN
      -- Delete the file from storage (this will be handled by a separate cleanup job)
      -- For now, we'll log it for manual cleanup
      RAISE NOTICE 'Photo file should be cleaned up: %', file_path;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ language 'plpgsql';

-- Trigger to clean up storage when photo records are deleted
DROP TRIGGER IF EXISTS cleanup_photo_storage_trigger ON photos;
CREATE TRIGGER cleanup_photo_storage_trigger
  AFTER DELETE ON photos
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_photo_storage();

-- Create a function to validate photo metadata
CREATE OR REPLACE FUNCTION validate_photo_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure filename is not empty
  IF NEW.filename IS NULL OR length(trim(NEW.filename)) = 0 THEN
    RAISE EXCEPTION 'Photo filename cannot be empty';
  END IF;
  
  -- Ensure URL is not empty
  IF NEW.url IS NULL OR length(trim(NEW.url)) = 0 THEN
    RAISE EXCEPTION 'Photo URL cannot be empty';
  END IF;
  
  -- Validate metadata structure if provided
  IF NEW.metadata IS NOT NULL THEN
    -- Check if size is a positive number
    IF (NEW.metadata->>'size')::numeric <= 0 THEN
      RAISE EXCEPTION 'Photo size must be positive';
    END IF;
    
    -- Check if dimensions are positive if provided
    IF NEW.metadata->'dimensions' IS NOT NULL THEN
      IF (NEW.metadata->'dimensions'->>'width')::numeric <= 0 OR 
         (NEW.metadata->'dimensions'->>'height')::numeric <= 0 THEN
        RAISE EXCEPTION 'Photo dimensions must be positive';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to validate photo metadata on insert/update
DROP TRIGGER IF EXISTS validate_photo_metadata_trigger ON photos;
CREATE TRIGGER validate_photo_metadata_trigger
  BEFORE INSERT OR UPDATE ON photos
  FOR EACH ROW
  EXECUTE FUNCTION validate_photo_metadata();