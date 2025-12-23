import { supabase } from './supabase';
import type { Invitation } from '../types/supabase';

/**
 * Generate a cryptographically secure invitation token
 */
export const generateInvitationToken = (): string => {
  // Use crypto.randomUUID() for a secure, unique token
  return crypto.randomUUID();
};

/**
 * Create a new invitation with token generation
 */
export const createInvitation = async (email: string, createdBy: string): Promise<Invitation> => {
  const token = generateInvitationToken();
  
  const { data, error } = await supabase
    .from('invitations')
    .insert({
      email,
      token,
      created_by: createdBy,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating invitation:', error);
    throw new Error(`Failed to create invitation: ${error.message}`);
  }
  
  return data;
};

/**
 * Validate an invitation token
 * Returns the invitation if valid, null if invalid/expired
 */
export const validateInvitationToken = async (token: string): Promise<Invitation | null> => {
  if (!token || token.trim() === '') {
    return null;
  }

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .single();
  
  if (error) {
    console.error('Error validating invitation token:', error);
    return null;
  }
  
  // Check if invitation exists
  if (!data) {
    return null;
  }
  
  // Check if invitation is already used
  if (data.status === 'used') {
    return null;
  }
  
  // Check if invitation is expired
  const now = new Date();
  const expiresAt = new Date(data.expires_at);
  
  if (now > expiresAt || data.status === 'expired') {
    // Mark as expired if not already
    if (data.status !== 'expired') {
      await markInvitationAsExpired(token);
    }
    return null;
  }
  
  return data;
};

/**
 * Mark an invitation as used
 */
export const markInvitationAsUsed = async (token: string, userId: string): Promise<Invitation> => {
  const { data, error } = await supabase
    .from('invitations')
    .update({
      used_at: new Date().toISOString(),
      used_by: userId,
      status: 'used',
    })
    .eq('token', token)
    .select()
    .single();
  
  if (error) {
    console.error('Error marking invitation as used:', error);
    throw new Error(`Failed to mark invitation as used: ${error.message}`);
  }
  
  return data;
};

/**
 * Mark an invitation as expired
 */
export const markInvitationAsExpired = async (token: string): Promise<Invitation> => {
  const { data, error } = await supabase
    .from('invitations')
    .update({
      status: 'expired',
    })
    .eq('token', token)
    .select()
    .single();
  
  if (error) {
    console.error('Error marking invitation as expired:', error);
    throw new Error(`Failed to mark invitation as expired: ${error.message}`);
  }
  
  return data;
};

/**
 * Get all invitations (admin only)
 */
export const getAllInvitations = async (): Promise<Invitation[]> => {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error getting invitations:', error);
    throw new Error(`Failed to get invitations: ${error.message}`);
  }
  
  return data || [];
};

/**
 * Get invitations by status
 */
export const getInvitationsByStatus = async (status: 'pending' | 'used' | 'expired'): Promise<Invitation[]> => {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error getting invitations by status:', error);
    throw new Error(`Failed to get invitations by status: ${error.message}`);
  }
  
  return data || [];
};

/**
 * Check if an email already has a pending invitation
 */
export const hasPendingInvitation = async (email: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('invitations')
    .select('id')
    .eq('email', email)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString());
  
  if (error) {
    console.error('Error checking pending invitation:', error);
    return false;
  }
  
  return (data && data.length > 0) || false;
};

/**
 * Expire old invitations (utility function)
 */
export const expireOldInvitations = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('invitations')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())
    .select('id');
  
  if (error) {
    console.error('Error expiring old invitations:', error);
    throw new Error(`Failed to expire old invitations: ${error.message}`);
  }
  
  return data?.length || 0;
};

/**
 * Send invitation email using the email service
 * Requirements: 8.2, 8.3
 */
export const sendInvitationEmail = async (invitation: Invitation, senderName?: string): Promise<void> => {
  const { emailService } = await import('./emailService');
  
  // Generate invitation URL
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : import.meta.env.VITE_APP_URL || 'http://localhost:5175';
  const invitationUrl = `${baseUrl}/register?token=${invitation.token}`;
  
  try {
    // Send invitation email
    const result = await emailService.sendInvitationEmail(
      invitation.email,
      invitationUrl,
      invitation.expires_at,
      senderName
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to send invitation email');
    }
    
    console.log('Invitation email sent successfully:', {
      to: invitation.email,
      messageId: result.messageId,
      invitationUrl,
      expiresAt: invitation.expires_at,
    });
  } catch (error: any) {
    console.error('Error sending invitation email:', error);
    throw new Error(`Failed to send invitation email: ${error.message}`);
  }
};

/**
 * Get sender name from user profile
 */
const getSenderName = async (userId: string): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      return 'Cabin Administrator';
    }
    
    return `${data.first_name} ${data.last_name}`.trim() || 'Cabin Administrator';
  } catch (error) {
    console.error('Error getting sender name:', error);
    return 'Cabin Administrator';
  }
};

/**
 * Create and send invitation (combines creation and email sending)
 * Requirements: 8.2, 8.3
 */
export const createAndSendInvitation = async (
  email: string, 
  createdBy: string, 
  senderName?: string
): Promise<Invitation> => {
  // Check if email already has a pending invitation
  const hasPending = await hasPendingInvitation(email);
  if (hasPending) {
    throw new Error('This email already has a pending invitation');
  }
  
  // Create the invitation
  const invitation = await createInvitation(email, createdBy);
  
  // Get sender name if not provided
  const finalSenderName = senderName || await getSenderName(createdBy);
  
  // Send the invitation email
  await sendInvitationEmail(invitation, finalSenderName);
  
  return invitation;
};

/**
 * Delete an invitation
 * Requirements: 8.4
 */
export const deleteInvitation = async (invitationId: string): Promise<void> => {
  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId);
  
  if (error) {
    console.error('Error deleting invitation:', error);
    throw new Error(`Failed to delete invitation: ${error.message}`);
  }
  
  console.log('Invitation deleted successfully:', invitationId);
};

/**
 * Get invitation statistics
 */
export const getInvitationStats = async (): Promise<{
  total: number;
  pending: number;
  used: number;
  expired: number;
}> => {
  const { data, error } = await supabase
    .from('invitations')
    .select('status');
  
  if (error) {
    console.error('Error getting invitation stats:', error);
    return { total: 0, pending: 0, used: 0, expired: 0 };
  }
  
  const stats = {
    total: data?.length || 0,
    pending: 0,
    used: 0,
    expired: 0,
  };
  
  data?.forEach(invitation => {
    stats[invitation.status as keyof typeof stats]++;
  });
  
  return stats;
};