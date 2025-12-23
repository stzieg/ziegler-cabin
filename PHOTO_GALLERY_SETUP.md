# Photo Gallery Setup Guide

The photo gallery system requires proper Supabase configuration for both database and storage. Follow these steps to set up photo uploads.

## Prerequisites

- Supabase project configured
- Database migrations applied
- Supabase CLI installed (for local development)

## Setup Steps

### 1. Apply Database Migrations

**If you have Supabase CLI installed:**
```bash
supabase db push
```

**If you don't have Supabase CLI (most users):**
Follow the detailed instructions in `RUN_MIGRATIONS.md` to run all 5 migrations through the Supabase Dashboard.

This will apply all migrations including:
- `001_initial_schema.sql` - Creates profiles, invitations, and helper functions
- `002_rls_policies.sql` - Sets up basic RLS policies
- `003_dashboard_expansion_schema.sql` - Creates the photos table and other dashboard tables
- `004_dashboard_expansion_rls.sql` - Sets up Row Level Security policies for dashboard
- `005_photo_storage_setup.sql` - Creates storage bucket and storage policies

### 2. Verify Storage Bucket

The migration should automatically create the 'photos' storage bucket. You can verify this in your Supabase dashboard:

1. Go to Storage in your Supabase dashboard
2. Check that a 'photos' bucket exists
3. Verify the bucket is set to public
4. Check that the allowed MIME types include: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
5. Verify the file size limit is set to 10MB (10485760 bytes)

### 3. Manual Bucket Creation (if needed)

If the bucket wasn't created automatically, create it manually:

1. In Supabase Dashboard → Storage
2. Click "New Bucket"
3. Name: `photos`
4. Public bucket: ✅ Enabled
5. File size limit: `10485760` (10MB)
6. Allowed MIME types: `image/jpeg,image/png,image/gif,image/webp`

### 4. Storage Policies

The following RLS policies should be automatically created:

- **Upload**: Users can upload photos to their own folder (`user_id/filename`)
- **View**: All authenticated users can view all photos (shared family gallery)
- **Update**: Users can update their own photos
- **Delete**: Users can delete their own photos
- **Admin**: Admins can manage all photos

## Troubleshooting

### Migration Issues

#### "Function is_admin does not exist"
- Ensure migrations run in order: `001` → `002` → `003` → `004` → `005`
- The `is_admin()` function is created in `001_initial_schema.sql`
- Run: `supabase db reset` then `supabase db push` to apply all migrations

#### "Relation does not exist" errors
- Tables are created in `003_dashboard_expansion_schema.sql`
- RLS policies in `004_dashboard_expansion_rls.sql` depend on these tables
- Ensure migration `003` runs successfully before `004`

#### "Policy already exists" errors
- The updated `004_dashboard_expansion_rls.sql` includes `DROP POLICY IF EXISTS` statements
- If you get conflicts, manually drop policies: `DROP POLICY IF EXISTS "policy_name" ON table_name;`
- Then re-run the migration

### Common Issues

#### "Photo storage bucket not found"
- Run `supabase db push` to apply migrations
- Manually create the 'photos' bucket in Supabase dashboard
- Check that bucket name is exactly 'photos' (lowercase)

#### "Permission denied" errors
- Verify RLS policies are applied
- Check that user is authenticated
- Ensure policies match the expected folder structure (`user_id/filename`)

#### "File upload fails silently"
- Check browser console for detailed error messages
- Verify file size is under 10MB
- Ensure file type is supported (JPEG, PNG, GIF, WebP)
- Check Supabase project quotas and limits

#### "Database error" on photo save
- Verify photos table exists (`SELECT * FROM photos LIMIT 1;`)
- Check that user_id references are valid
- Ensure metadata JSON is properly formatted

### Migration Order

The migrations must be applied in this exact order:
1. `001_initial_schema.sql` - Creates profiles, invitations, and `is_admin()` function
2. `002_rls_policies.sql` - Creates RLS policies for profiles and invitations
3. `003_dashboard_expansion_schema.sql` - Creates dashboard tables and enums
4. `004_dashboard_expansion_rls.sql` - Creates RLS policies for dashboard tables
5. `005_photo_storage_setup.sql` - Creates storage bucket and storage policies

### Validating Migration Success

Before testing the photo gallery, validate that migrations applied correctly:

```sql
-- Check that all required tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('profiles', 'reservations', 'maintenance_tasks', 'photos', 'notifications');

-- Check that enums exist
SELECT typname FROM pg_type 
WHERE typname IN ('notification_type', 'priority_level', 'maintenance_type');

-- Check that is_admin function exists
SELECT proname FROM pg_proc WHERE proname = 'is_admin';

-- Check that storage bucket exists
SELECT name FROM storage.buckets WHERE name = 'photos';

-- Check RLS policies exist
SELECT schemaname, tablename, policyname FROM pg_policies 
WHERE tablename IN ('reservations', 'maintenance_tasks', 'photos', 'notifications');
```

### Testing the Setup

1. Log into the application
2. Navigate to the Gallery tab
3. Click "Upload Photos"
4. Select a valid image file (< 10MB)
5. Add caption and tags (optional)
6. Click "Upload"

If successful, the photo should appear in the gallery immediately.

### File Organization

Photos are stored in Supabase Storage with the following structure:
```
photos/
├── [user-id-1]/
│   ├── 1640995200000.jpg
│   └── 1640995300000.png
├── [user-id-2]/
│   ├── 1640995400000.gif
│   └── 1640995500000.webp
```

Each file is named with a timestamp to ensure uniqueness and prevent conflicts.

## Features

### Supported File Types
- JPEG/JPG
- PNG
- GIF
- WebP

### File Size Limits
- Maximum: 10MB per file
- Recommended: Under 5MB for better performance

### Metadata Capture
- File size and dimensions
- Upload timestamp
- User-provided caption and tags
- Album organization (optional)

### Gallery Features
- Responsive grid and list views
- Sort by date or filename
- Filter by album
- Full-size photo viewer
- Mobile-optimized interface
- Touch-friendly interactions

## Security

- All uploads require authentication
- Users can only upload to their own folder
- All users can view all photos (shared family gallery)
- Users can only modify/delete their own photos
- Admins have full access to all photos
- File type validation prevents malicious uploads
- File size limits prevent abuse