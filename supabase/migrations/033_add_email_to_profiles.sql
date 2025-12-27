-- Migration: Add email to profiles
-- Adds email column to profiles table for easier access to user emails

-- Add email column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Function to sync email from auth.users to profiles
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET email = NEW.email
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing profiles with emails from auth.users
-- This needs to be run by an admin or via a secure function
-- For now, we'll create a function that can be called to sync emails

CREATE OR REPLACE FUNCTION sync_all_profile_emails()
RETURNS void AS $$
BEGIN
    UPDATE public.profiles p
    SET email = u.email
    FROM auth.users u
    WHERE p.id = u.id
    AND (p.email IS NULL OR p.email != u.email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update the auto_create_profile function to include email
CREATE OR REPLACE FUNCTION public.auto_create_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name, email, is_admin)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        NEW.email,
        false
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
        email = COALESCE(EXCLUDED.email, profiles.email);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the sync function to populate existing emails
SELECT sync_all_profile_emails();
