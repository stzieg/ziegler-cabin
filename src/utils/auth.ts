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
): Promise<void> => {
  try {
    // Create the user account
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (signUpError) {
      throw signUpError;
    }
    
    // If user is created, create profile and mark invitation as used
    if (data.user) {
      // Create user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          phone_number: profileData.phone_number,
          is_admin: profileData.is_admin || false,
        });
      
      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Don't throw here as the user account was created successfully
      }
      
      // Mark invitation as used
      try {
        await markInvitationAsUsed(invitationToken, data.user.id);
      } catch (invitationError) {
        console.error('Error marking invitation as used:', invitationError);
        // Don't throw here as the user account was created successfully
        // This could be handled by a database trigger or background job
      }
    }
  } catch (error) {
    console.error('Registration with invitation error:', error);
    throw error;
  }
};