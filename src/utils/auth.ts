import { supabase } from './supabase';
import { markInvitationAsUsed } from './invitations';
import type { UserProfile } from '../types/supabase';

/**
 * Register a new user with invitation token validation
 * Requirements: 2.2 - Mark invitation as used after successful registration
 */
export const registerWithInvitation = async (
  email: string,
  password: string,
  profileData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>,
  invitationToken: string
): Promise<{ requiresEmailConfirmation: boolean }> => {
  try {
    // Create the user account with profile data in metadata
    // The database trigger handle_new_user() will create the profile
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          phone_number: profileData.phone_number,
        },
      },
    });
    
    if (signUpError) {
      console.error('SignUp error:', signUpError);
      throw new Error(signUpError.message || 'Failed to create account');
    }
    
    if (!data.user) {
      throw new Error('Failed to create user account');
    }

    // Check if email confirmation is required
    // If session is null but user exists, email confirmation is needed
    const requiresEmailConfirmation = !data.session;
    
    // Profile is created automatically by database trigger handle_new_user()
    // which reads from raw_user_meta_data
    
    // Mark invitation as used
    try {
      await markInvitationAsUsed(invitationToken, data.user.id);
    } catch (invitationError) {
      console.error('Error marking invitation as used:', invitationError);
      // Don't throw here as the user account was created successfully
    }

    return { requiresEmailConfirmation };
  } catch (error: any) {
    console.error('Registration with invitation error:', error);
    throw error;
  }
};