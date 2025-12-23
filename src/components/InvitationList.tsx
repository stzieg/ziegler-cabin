import React, { useState } from 'react';
import type { Invitation } from '../types/supabase';
import { deleteInvitation } from '../utils/invitations';
import styles from './InvitationList.module.css';

export interface InvitationListProps {
  invitations: Invitation[];
  onRefresh: () => void;
  isLoading?: boolean;
}

/**
 * InvitationList component for displaying and managing sent invitations
 * Requirements: 8.4
 */
export const InvitationList: React.FC<InvitationListProps> = ({ 
  invitations, 
  onRefresh, 
  isLoading = false 
}) => {
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  /**
   * Format date for display
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get status badge class based on invitation status
   */
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return styles.statusPending;
      case 'used':
        return styles.statusUsed;
      case 'expired':
        return styles.statusExpired;
      default:
        return styles.statusDefault;
    }
  };

  /**
   * Check if invitation is expired based on expires_at date
   */
  const isExpired = (invitation: Invitation) => {
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    return now > expiresAt;
  };

  /**
   * Get display status (handles expired invitations that haven't been marked as expired)
   */
  const getDisplayStatus = (invitation: Invitation) => {
    if (invitation.status === 'expired' || isExpired(invitation)) {
      return 'expired';
    }
    return invitation.status;
  };

  /**
   * Handle invitation deletion
   */
  const handleDeleteInvitation = async (invitationId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete the invitation for ${email}?`)) {
      return;
    }

    setDeletingIds(prev => new Set(prev).add(invitationId));

    try {
      await deleteInvitation(invitationId);
      onRefresh(); // Refresh the list after deletion
    } catch (error: any) {
      console.error('Error deleting invitation:', error);
      alert(`Failed to delete invitation: ${error.message}`);
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitationId);
        return newSet;
      });
    }
  };

  /**
   * Handle keyboard events for refresh button
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRefresh();
    }
  };

  return (
    <div className={styles.container} role="region" aria-labelledby="invitations-title">
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h3 className={styles.title} id="invitations-title">Sent Invitations</h3>
          <p className={styles.subtitle} aria-live="polite">
            {invitations.length} invitation{invitations.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={onRefresh}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          aria-label="Refresh invitations list"
          aria-describedby="refresh-help"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
        <div id="refresh-help" className="visually-hidden">
          Click to reload the list of sent invitations
        </div>
      </div>

      {isLoading && invitations.length === 0 ? (
        <div className={styles.loading} role="status" aria-live="polite">
          <p>Loading invitations...</p>
        </div>
      ) : invitations.length === 0 ? (
        <div className={styles.empty} role="status">
          <p>No invitations have been sent yet.</p>
          <p className={styles.emptySubtext}>
            Use the form above to send your first invitation.
          </p>
        </div>
      ) : (
        <div className={styles.listContainer}>
          <div className={styles.list} role="list" aria-label="List of sent invitations">
            {invitations.map((invitation) => {
              const displayStatus = getDisplayStatus(invitation);
              
              return (
                <article 
                  key={invitation.id} 
                  className={styles.invitationItem}
                  role="listitem"
                  aria-labelledby={`invitation-${invitation.id}-email`}
                  aria-describedby={`invitation-${invitation.id}-details`}
                >
                  <header className={styles.invitationHeader}>
                    <div className={styles.emailContainer}>
                      <span 
                        className={styles.email}
                        id={`invitation-${invitation.id}-email`}
                      >
                        {invitation.email}
                      </span>
                      <span 
                        className={`${styles.statusBadge} ${getStatusBadgeClass(displayStatus)}`}
                        aria-label={`Status: ${displayStatus}`}
                        role="status"
                      >
                        {displayStatus}
                      </span>
                    </div>
                    <div className={styles.actionButtons} role="group" aria-label="Invitation actions">
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => handleDeleteInvitation(invitation.id, invitation.email)}
                        disabled={deletingIds.has(invitation.id)}
                        aria-label={`Delete invitation for ${invitation.email}`}
                        aria-describedby={`delete-help-${invitation.id}`}
                        title="Delete invitation"
                      >
                        <span aria-hidden="true">
                          {deletingIds.has(invitation.id) ? '...' : '🗑️'}
                        </span>
                        <span className="visually-hidden">
                          {deletingIds.has(invitation.id) ? 'Deleting...' : 'Delete'}
                        </span>
                      </button>
                      <div id={`delete-help-${invitation.id}`} className="visually-hidden">
                        This will permanently remove the invitation and prevent the recipient from using it to register.
                      </div>
                    </div>
                  </header>
                  
                  <div 
                    className={styles.invitationDetails}
                    id={`invitation-${invitation.id}-details`}
                    role="group"
                    aria-label="Invitation details"
                  >
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel} id={`sent-label-${invitation.id}`}>Sent:</span>
                      <time 
                        className={styles.detailValue}
                        dateTime={invitation.created_at}
                        aria-labelledby={`sent-label-${invitation.id}`}
                      >
                        {formatDate(invitation.created_at)}
                      </time>
                    </div>
                    
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel} id={`expires-label-${invitation.id}`}>Expires:</span>
                      <time 
                        className={styles.detailValue}
                        dateTime={invitation.expires_at}
                        aria-labelledby={`expires-label-${invitation.id}`}
                      >
                        {formatDate(invitation.expires_at)}
                      </time>
                    </div>
                    
                    {invitation.used_at && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel} id={`used-label-${invitation.id}`}>Used:</span>
                        <time 
                          className={styles.detailValue}
                          dateTime={invitation.used_at}
                          aria-labelledby={`used-label-${invitation.id}`}
                        >
                          {formatDate(invitation.used_at)}
                        </time>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};