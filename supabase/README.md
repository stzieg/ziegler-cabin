# Supabase Database Schema

This directory contains the database schema files for the cabin home page application.

## Files

- `migrations/001_initial_schema.sql` - Creates the main tables, indexes, and functions
- `migrations/002_rls_policies.sql` - Sets up Row Level Security policies
- `seed.sql` - Sample data for testing (optional)
- `test_schema.sql` - Test queries to verify the schema works correctly

## Database Tables

### profiles
Stores user profile information linked to Supabase Auth users.

**Columns:**
- `id` (UUID, Primary Key) - References auth.users.id
- `first_name` (TEXT, NOT NULL) - User's first name (1-50 characters)
- `last_name` (TEXT, NOT NULL) - User's last name (1-50 characters)
- `phone_number` (TEXT, NULLABLE) - User's phone number (optional, min 10 characters)
- `is_admin` (BOOLEAN, DEFAULT FALSE) - Admin flag
- `created_at` (TIMESTAMP, DEFAULT NOW()) - Profile creation timestamp
- `updated_at` (TIMESTAMP, DEFAULT NOW()) - Profile last update timestamp

**Constraints:**
- Names must be 1-50 characters long
- Phone number must be at least 10 characters if provided
- Automatic updated_at timestamp on updates

### invitations
Manages invitation tokens for user registration.

**Columns:**
- `id` (UUID, Primary Key) - Auto-generated UUID
- `email` (TEXT, NOT NULL) - Invited email address (validated format)
- `token` (TEXT, UNIQUE, NOT NULL) - Unique invitation token
- `created_by` (UUID, NOT NULL) - References auth.users.id (admin who sent invitation)
- `created_at` (TIMESTAMP, DEFAULT NOW()) - Invitation creation timestamp
- `expires_at` (TIMESTAMP, DEFAULT NOW() + 7 days) - Invitation expiration timestamp
- `used_at` (TIMESTAMP, NULLABLE) - Timestamp when invitation was used
- `used_by` (UUID, NULLABLE) - References auth.users.id (user who used invitation)
- `status` (TEXT, DEFAULT 'pending') - Invitation status: 'pending', 'used', or 'expired'

**Constraints:**
- Email format validation using regex
- Status must be one of: 'pending', 'used', 'expired'
- Token must be unique
- Expires 7 days after creation by default

## Indexes

Performance indexes are created on:
- `invitations.token` - For fast token lookups during registration
- `invitations.email` - For email-based queries
- `invitations.status` - For filtering by invitation status
- `invitations.created_by` - For admin invitation management
- `invitations.expires_at` - For expiration queries
- `profiles.is_admin` - For admin permission checks

## Row Level Security (RLS)

### Profiles Table Policies
- **Users can read own profile** - Users can only read their own profile data
- **Users can update own profile** - Users can only update their own profile data
- **Users can insert own profile** - Users can create their own profile during registration
- **Admins can read all profiles** - Admin users can read all user profiles
- **Admins can update any profile** - Admin users can update any user profile
- **Admins can delete profiles** - Admin users can delete user profiles

### Invitations Table Policies
- **Admins can read invitations** - Admin users can read all invitations
- **Admins can create invitations** - Admin users can create new invitations
- **Public can read invitation by token** - Anyone can read invitations by token (for registration validation)
- **System can update invitation status** - Allows marking invitations as used/expired
- **Admins can update own invitations** - Admins can update invitations they created
- **Admins can delete own invitations** - Admins can delete invitations they created

## Functions

### update_updated_at_column()
Trigger function that automatically updates the `updated_at` timestamp when a profile is modified.

### expire_old_invitations()
Utility function to mark expired invitations. Can be called manually or via a scheduled job.

### is_admin(user_id UUID)
Security definer function to check if a user has admin privileges. Used in RLS policies.

## Setup Instructions

1. **Run the migrations in order:**
   ```sql
   -- In Supabase SQL Editor, run these files in order:
   -- 1. migrations/001_initial_schema.sql
   -- 2. migrations/002_rls_policies.sql
   ```

2. **Optional: Load sample data:**
   ```sql
   -- Run seed.sql to load test data
   ```

3. **Verify the setup:**
   ```sql
   -- Run test_schema.sql to verify everything works correctly
   ```

## Testing the Schema

Use the queries in `test_schema.sql` to verify:
- Tables and columns are created correctly
- Indexes are in place
- RLS policies are active
- Constraints work as expected
- Sample data loads correctly

## Security Notes

- All tables have RLS enabled
- Admin functions use SECURITY DEFINER for privilege escalation
- Email validation prevents invalid email formats
- Invitation tokens are unique and time-limited
- User data is protected by user-specific policies

## Environment Variables Required

Make sure these environment variables are set in your application:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Maintenance

### Expiring Old Invitations
Run this query periodically to clean up expired invitations:
```sql
SELECT expire_old_invitations();
```

### Monitoring Invitation Usage
Check invitation status distribution:
```sql
SELECT status, COUNT(*) FROM invitations GROUP BY status;
```

### Admin Management
To make a user an admin:
```sql
UPDATE profiles SET is_admin = true WHERE id = 'user-uuid-here';
```