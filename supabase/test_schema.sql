-- Test queries to verify the database schema and RLS policies work correctly
-- These queries can be run in the Supabase SQL editor to test the schema

-- Test 1: Verify tables exist and have correct structure
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'invitations')
ORDER BY table_name, ordinal_position;

-- Test 2: Verify indexes exist
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('profiles', 'invitations')
ORDER BY tablename, indexname;

-- Test 3: Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('profiles', 'invitations');

-- Test 4: List all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('profiles', 'invitations')
ORDER BY tablename, policyname;

-- Test 5: Verify constraints
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name IN ('profiles', 'invitations')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- Test 6: Verify functions exist
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name IN ('update_updated_at_column', 'expire_old_invitations', 'is_admin')
ORDER BY routine_name;

-- Test 7: Verify triggers exist
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('profiles', 'invitations')
ORDER BY event_object_table, trigger_name;

-- Test 8: Test sample data queries (these will work if seed data is loaded)
-- Count records in each table
SELECT 'profiles' as table_name, COUNT(*) as record_count FROM profiles
UNION ALL
SELECT 'invitations' as table_name, COUNT(*) as record_count FROM invitations;

-- Test invitation status distribution
SELECT 
  status,
  COUNT(*) as count
FROM invitations 
GROUP BY status
ORDER BY status;

-- Test admin users
SELECT 
  first_name,
  last_name,
  is_admin
FROM profiles 
WHERE is_admin = true;

-- Test invitation expiration logic
SELECT 
  email,
  status,
  created_at,
  expires_at,
  CASE 
    WHEN expires_at < NOW() AND status = 'pending' THEN 'Should be expired'
    ELSE 'Status correct'
  END as expiration_check
FROM invitations
ORDER BY created_at DESC;

-- Test 9: Verify email validation constraint
-- This should fail if email format is invalid
-- Uncomment to test:
-- INSERT INTO invitations (email, token, created_by) 
-- VALUES ('invalid-email', 'test-token', '00000000-0000-0000-0000-000000000001');

-- Test 10: Verify name length constraints
-- This should fail if names are too long or empty
-- Uncomment to test:
-- INSERT INTO profiles (id, first_name, last_name) 
-- VALUES ('test-id', '', 'Test'); -- Should fail: empty first_name
-- INSERT INTO profiles (id, first_name, last_name) 
-- VALUES ('test-id', 'A very long name that exceeds fifty characters limit', 'Test'); -- Should fail: too long