import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/SupabaseProvider';
import { InvitationForm } from './InvitationForm';
import { InvitationList } from './InvitationList';
import { TestNotificationButton } from './TestNotificationButton';
import { isUserAdmin } from '../utils/supabase';
import { getAllInvitations } from '../utils/invitations';
import type { Invitation } from '../types/supabase';
import styles from './AdminPanel.module.css';

export interface AdminPanelProps {
  user: any; // Supabase User type
  isAdmin: boolean;
}

/**
 * AdminPanel component for admin-only features
 * Requirements: 8.1, 8.2, 8.4
 */
export const AdminPanel: React.FC<AdminPanelProps> = () => {
  const { user: authUser } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminVerified, setAdminVerified] = useState(false);

  /**
   * Verify admin permissions on mount
   * Requirement 8.1
   */
  useEffect(() => {
    const verifyAdminStatus = async () => {
      if (!authUser?.id) {
        setAdminVerified(false);
        setIsLoading(false);
        return;
      }

      try {
        const adminStatus = await isUserAdmin(authUser.id);
        setAdminVerified(adminStatus);
      } catch (error) {
        console.error('Error verifying admin status:', error);
        setAdminVerified(false);
        setError('Failed to verify admin permissions');
      } finally {
        setIsLoading(false);
      }
    };

    verifyAdminStatus();
  }, [authUser?.id]);

  /**
   * Load invitations when admin is verified
   * Requirement 8.4
   */
  useEffect(() => {
    const loadInvitations = async () => {
      if (!adminVerified) return;

      try {
        setIsLoading(true);
        const invitationData = await getAllInvitations();
        setInvitations(invitationData);
        setError(null);
      } catch (error: any) {
        console.error('Error loading invitations:', error);
        setError('Failed to load invitations');
      } finally {
        setIsLoading(false);
      }
    };

    loadInvitations();
  }, [adminVerified]);

  /**
   * Handle successful invitation creation
   * Requirement 8.2
   */
  const handleInvitationSent = (newInvitation: Invitation) => {
    setInvitations(prev => [newInvitation, ...prev]);
  };

  /**
   * Refresh invitations list
   * Requirement 8.4
   */
  const handleRefresh = async () => {
    if (!adminVerified) return;

    try {
      setIsLoading(true);
      const invitationData = await getAllInvitations();
      setInvitations(invitationData);
      setError(null);
    } catch (error: any) {
      console.error('Error refreshing invitations:', error);
      setError('Failed to refresh invitations');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state during initial admin verification
  if (isLoading && !adminVerified) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <p>Verifying admin permissions...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!adminVerified) {
    return (
      <div className={styles.container}>
        <div className={styles.accessDenied}>
          <h2>Access Denied</h2>
          <p>You don't have permission to access the admin panel.</p>
          {error && (
            <p className={styles.errorText}>{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <main className={styles.container} role="main" aria-labelledby="admin-panel-title">
      <header className={styles.header}>
        <h1 className={styles.title} id="admin-panel-title">Admin Panel</h1>
        <p className={styles.subtitle}>Manage invitations and user access</p>
      </header>

      {error && (
        <div className={styles.errorMessage} role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      <div className={styles.content}>
        <section className={styles.section} aria-labelledby="send-invitation-title">
          <h2 className={styles.sectionTitle} id="send-invitation-title">Send Invitation</h2>
          <InvitationForm 
            onInvitationSent={handleInvitationSent}
            userId={authUser?.id || ''}
          />
        </section>

        <section className={styles.section} aria-labelledby="test-notifications-title">
          <h2 className={styles.sectionTitle} id="test-notifications-title">Test Notifications</h2>
          <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
            Create test notifications to verify the system is working
          </p>
          <TestNotificationButton />
        </section>

        <section className={styles.section} aria-labelledby="invitation-management-title">
          <h2 className={styles.sectionTitle} id="invitation-management-title">Invitation Management</h2>
          <InvitationList 
            invitations={invitations}
            onRefresh={handleRefresh}
            isLoading={isLoading}
          />
        </section>
      </div>
    </main>
  );
};