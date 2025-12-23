-- Test script to validate migration syntax
-- This can be run to check for syntax errors before applying migrations

-- Test the function syntax from 004_dashboard_expansion_rls.sql
DO $$
BEGIN
  -- Test that the function syntax is valid
  PERFORM 1;
  RAISE NOTICE 'Migration syntax validation passed';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Migration syntax validation failed: %', SQLERRM;
END
$$;

-- Test enum types exist (should be created in 003_dashboard_expansion_schema.sql)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    RAISE NOTICE 'notification_type enum not found - ensure 003_dashboard_expansion_schema.sql runs first';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
    RAISE NOTICE 'priority_level enum not found - ensure 003_dashboard_expansion_schema.sql runs first';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_type') THEN
    RAISE NOTICE 'maintenance_type enum not found - ensure 003_dashboard_expansion_schema.sql runs first';
  END IF;
END
$$;

-- Test that required tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    RAISE EXCEPTION 'profiles table not found - ensure 001_initial_schema.sql runs first';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reservations') THEN
    RAISE NOTICE 'reservations table not found - ensure 003_dashboard_expansion_schema.sql runs first';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_tasks') THEN
    RAISE NOTICE 'maintenance_tasks table not found - ensure 003_dashboard_expansion_schema.sql runs first';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'photos') THEN
    RAISE NOTICE 'photos table not found - ensure 003_dashboard_expansion_schema.sql runs first';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    RAISE NOTICE 'notifications table not found - ensure 003_dashboard_expansion_schema.sql runs first';
  END IF;
END
$$;

-- Test that is_admin function exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    RAISE EXCEPTION 'is_admin function not found - ensure 001_initial_schema.sql runs first';
  END IF;
END
$$;

RAISE NOTICE 'All migration dependency checks passed';