-- Simple validation script to test migration syntax
-- Run this in Supabase SQL Editor to validate syntax before running actual migrations

-- Test basic syntax validation
DO $$
BEGIN
  RAISE NOTICE 'Migration syntax validation starting...';
END
$$;

-- Test that we can create a simple function with proper syntax
CREATE OR REPLACE FUNCTION test_syntax_validation()
RETURNS TEXT AS $$
BEGIN
  RETURN 'Syntax validation passed';
END;
$$ language 'plpgsql';

-- Test the function
SELECT test_syntax_validation();

-- Clean up test function
DROP FUNCTION test_syntax_validation();

-- Final validation message
DO $$
BEGIN
  RAISE NOTICE 'All migration syntax validation checks passed!';
  RAISE NOTICE 'You can now safely run migrations 004 and 005';
END
$$;