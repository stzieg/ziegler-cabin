-- Seed data for testing the database schema
-- This file contains sample data to test the database schema and RLS policies

-- Note: This seed data is for testing purposes only
-- In production, users would be created through the authentication flow

-- Insert sample profiles (these would normally be created after user registration)
-- The user IDs here are examples - in real usage, they would come from auth.users

-- Sample admin user profile
INSERT INTO profiles (id, first_name, last_name, phone_number, is_admin, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Admin',
  'User',
  '(555) 123-4567',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Sample regular user profiles
INSERT INTO profiles (id, first_name, last_name, phone_number, is_admin, created_at, updated_at)
VALUES 
  (
    '00000000-0000-0000-0000-000000000002',
    'John',
    'Doe',
    '(555) 234-5678',
    false,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Jane',
    'Smith',
    '(555) 345-6789',
    false,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'Bob',
    'Johnson',
    NULL, -- Phone number is optional
    false,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Sample invitations
INSERT INTO invitations (email, token, created_by, created_at, expires_at, status)
VALUES 
  (
    'newuser1@example.com',
    'invitation-token-001',
    '00000000-0000-0000-0000-000000000001', -- Created by admin
    NOW(),
    NOW() + INTERVAL '7 days',
    'pending'
  ),
  (
    'newuser2@example.com',
    'invitation-token-002',
    '00000000-0000-0000-0000-000000000001', -- Created by admin
    NOW(),
    NOW() + INTERVAL '7 days',
    'pending'
  ),
  (
    'used@example.com',
    'invitation-token-003',
    '00000000-0000-0000-0000-000000000001', -- Created by admin
    NOW() - INTERVAL '2 days',
    NOW() + INTERVAL '5 days',
    'used'
  ),
  (
    'expired@example.com',
    'invitation-token-004',
    '00000000-0000-0000-0000-000000000001', -- Created by admin
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '3 days', -- Expired 3 days ago
    'expired'
  )
ON CONFLICT (token) DO NOTHING;

-- Update the used invitation to have proper used_at and used_by values
UPDATE invitations 
SET 
  used_at = NOW() - INTERVAL '1 day',
  used_by = '00000000-0000-0000-0000-000000000002'
WHERE token = 'invitation-token-003';