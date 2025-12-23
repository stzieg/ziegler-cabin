# How to Run Database Migrations

Your Supabase credentials are now configured, but you need to set up the database tables. Here's how:

## Option 1: Using Supabase Dashboard (Easiest - 5 minutes)

1. **Go to your Supabase project**
   - Visit [supabase.com/dashboard](https://supabase.com/dashboard)
   - Open your project: `atzgamzxqddgcflxshaw`

2. **Open the SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run migrations in order (IMPORTANT: Must be run in this exact order)**

   **Migration 1 - Initial Schema:**
   - Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
   - Paste it into the SQL editor
   - Click "Run" (or press Ctrl+Enter)
   - You should see "Success. No rows returned"

   **Migration 2 - RLS Policies:**
   - Click "New Query" again
   - Copy the entire contents of `supabase/migrations/002_rls_policies.sql`
   - Paste it into the SQL editor
   - Click "Run"
   - You should see "Success. No rows returned"

   **Migration 3 - Dashboard Expansion Schema:**
   - Click "New Query" again
   - Copy the entire contents of `supabase/migrations/003_dashboard_expansion_schema.sql`
   - Paste it into the SQL editor
   - Click "Run"
   - You should see "Success. No rows returned"

   **Migration 4 - Dashboard RLS Policies:**
   - Click "New Query" again
   - **Option A (Recommended):** Copy the entire contents of `supabase/migrations/004_dashboard_expansion_rls_simple.sql`
   - **Option B (Full version):** Copy the entire contents of `supabase/migrations/004_dashboard_expansion_rls.sql`
   - Paste it into the SQL editor
   - Click "Run"
   - You should see "Success. No rows returned"
   
   **Note:** If you get "missing FROM-clause entry for table 'old'" error with Option B, use Option A instead.

   **Migration 5 - Photo Storage Setup:**
   - Click "New Query" again
   - **Option A (Dashboard Safe):** Copy the entire contents of `supabase/migrations/005_photo_storage_setup_dashboard.sql`
   - **Option B (CLI Only):** Copy the entire contents of `supabase/migrations/005_photo_storage_setup_simple.sql`
   - Paste it into the SQL editor
   - Click "Run"
   - You should see "Success. No rows returned"
   
   **Note:** If you get "must be owner of table objects" error, use Option A. This creates the storage bucket without trying to modify system table permissions.

4. **Verify the tables were created**
   - Click on "Table Editor" in the left sidebar
   - You should see these tables: `profiles`, `invitations`, `reservations`, `maintenance_tasks`, `photos`, `notifications`

5. **Verify the storage bucket was created**
   - Click on "Storage" in the left sidebar
   - You should see a `photos` bucket
   - If not, create it manually (see troubleshooting below)

6. **Set up Storage Policies (Important for Photo Gallery)**
   
   Since the dashboard migration can't set up storage policies automatically, you need to set them up manually:
   
   - Go to "Storage" in the left sidebar
   - Click on the `photos` bucket
   - Click on "Policies" tab
   - Click "New Policy"
   - Select "Custom" policy
   - **Policy 1 - Upload Policy:**
     - Name: `Users can upload photos to own folder`
     - Allowed operation: `INSERT`
     - Target roles: `authenticated`
     - Policy definition: `bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]`
   - Click "Save policy"
   
   - **Policy 2 - View Policy:**
     - Click "New Policy" again
     - Name: `Users can view all photos`
     - Allowed operation: `SELECT`
     - Target roles: `authenticated`
     - Policy definition: `bucket_id = 'photos'`
   - Click "Save policy"
   
   - **Policy 3 - Update Policy:**
     - Click "New Policy" again
     - Name: `Users can update own photos`
     - Allowed operation: `UPDATE`
     - Target roles: `authenticated`
     - Policy definition: `bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]`
   - Click "Save policy"
   
   - **Policy 4 - Delete Policy:**
     - Click "New Policy" again
     - Name: `Users can delete own photos`
     - Allowed operation: `DELETE`
     - Target roles: `authenticated`
     - Policy definition: `bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]`
   - Click "Save policy"

7. **Refresh your app**
   - Go back to http://localhost:5174/
   - The error should be gone and photo gallery should work!

## Option 2: Using Supabase CLI (For developers)

### Install Supabase CLI

**macOS (using Homebrew):**
```bash
brew install supabase/tap/supabase
```

**macOS/Linux (using npm):**
```bash
npm install -g supabase
```

**Windows (using Scoop):**
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Run Migrations with CLI

```bash
# Link to your project
supabase link --project-ref atzgamzxqddgcflxshaw

# Run all migrations
supabase db push
```

**Note:** If you get "command not found: supabase", use Option 1 (Supabase Dashboard) instead.

## What These Migrations Do

### Migration 001 - Initial Schema
- Creates `profiles` table for user information
- Creates `invitations` table for invitation-only registration
- Sets up indexes for performance
- Enables Row Level Security (RLS)
- Creates helper functions (`is_admin()`)

### Migration 002 - RLS Policies
- Sets up security policies so users can only see their own data
- Allows admins to manage invitations
- Protects sensitive data

### Migration 003 - Dashboard Expansion Schema
- Creates `reservations` table for cabin bookings
- Creates `maintenance_tasks` table for property maintenance
- Creates `photos` table for family photo gallery
- Creates `notifications` table for system alerts
- Sets up enums for notification types and priorities

### Migration 004 - Dashboard RLS Policies
- Sets up security policies for all dashboard tables
- Allows users to see all reservations (for calendar availability)
- Users can only modify their own data
- Admins have full access to everything
- Creates notification helper functions

### Migration 005 - Photo Storage Setup
- Creates `photos` storage bucket for file uploads
- Sets up storage security policies
- Users can upload to their own folder
- All users can view all photos (shared family gallery)
- Adds photo metadata validation and cleanup triggers

## After Running Migrations

You'll need to create an admin user to send invitations. See `SUPABASE_SETUP.md` for details on:
- Creating your first admin user
- Sending invitations
- Testing the full flow

## Troubleshooting

### "relation already exists" error
- This means the tables are already created
- You can skip this migration or drop the tables first
- The migrations include `DROP POLICY IF EXISTS` to handle conflicts

### "function is_admin does not exist" error
- Make sure you ran migration 001 first
- The `is_admin()` function is created in the first migration
- Run migrations in the exact order: 001 → 002 → 003 → 004 → 005

### "permission denied" error
- Make sure you're using the correct Supabase project
- Check that you're logged in to the Supabase dashboard
- Verify you have admin access to the project

### Photo storage bucket not created automatically
- Go to Storage in Supabase dashboard
- Click "New Bucket"
- Name: `photos`
- Public bucket: ✅ Enabled
- File size limit: `10485760` (10MB)
- Allowed MIME types: `image/jpeg,image/png,image/gif,image/webp`

### Still seeing connection errors?
- Make sure you ran ALL FIVE migrations in order
- Check the browser console (F12) for specific errors
- Verify all tables exist in Table Editor
- Check that storage bucket exists in Storage section

### Photo upload fails
- Verify the `photos` storage bucket exists
- Check that RLS policies are applied (migration 005)
- Ensure file is under 10MB and is a valid image type
- Check browser console for detailed error messages

## Next Steps

1. ✅ Run both migrations (you're here!)
2. ✅ Create an admin user
3. ✅ Test the login/registration flow
4. ✅ Start using the app!

---

**Quick Check**: After running migrations, you should see the login form without any error messages!
