import React, { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import type { ReservationSwapRequest } from '../types/supabase';
import { supabase } from '../utils/supabase';
import {
  generateSwapResponseEmailHTML,
  generateSwapResponseEmailText,
  formatDateRange,
} from '../utils/swapEmailTemplates';
import styles from './SwapRequestsList.module.css';

interface SwapRequestsListProps {
  user: User;
  onSwapComplete?: () => void;
}

export const SwapRequestsList: React.FC<SwapRequestsListProps> = ({
  user,
  onSwapComplete,
}) => {
  const [incomingRequests, setIncomingRequests] = useState<ReservationSwapRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ReservationSwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadSwapRequests();
  }, [user.id]);

  const loadSwapRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load incoming requests (where user is the target)
      const { data: incoming, error: incomingError } = await supabase
        .from('reservation_swap_requests')
        .select(`
          *,
          requester_reservation:reservations!requester_reservation_id(*),
          target_reservation:reservations!target_reservation_id(*)
        `)
        .eq('target_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (incomingError) throw incomingError;

      // Get requester profiles
      if (incoming && incoming.length > 0) {
        const requesterIds = [...new Set(incoming.map(r => r.requester_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', requesterIds);

        const enrichedIncoming = incoming.map(req => ({
          ...req,
          requester_profile: profiles?.find(p => p.id === req.requester_id),
        }));
        setIncomingRequests(enrichedIncoming);
      } else {
        setIncomingRequests([]);
      }

      // Load outgoing requests (where user is the requester)
      const { data: outgoing, error: outgoingError } = await supabase
        .from('reservation_swap_requests')
        .select(`
          *,
          requester_reservation:reservations!requester_reservation_id(*),
          target_reservation:reservations!target_reservation_id(*)
        `)
        .eq('requester_id', user.id)
        .in('status', ['pending', 'accepted', 'declined'])
        .order('created_at', { ascending: false });

      if (outgoingError) throw outgoingError;

      // Get target user profiles
      if (outgoing && outgoing.length > 0) {
        const targetIds = [...new Set(outgoing.map(r => r.target_user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', targetIds);

        const enrichedOutgoing = outgoing.map(req => ({
          ...req,
          target_profile: profiles?.find(p => p.id === req.target_user_id),
        }));
        setOutgoingRequests(enrichedOutgoing);
      } else {
        setOutgoingRequests([]);
      }

    } catch (err) {
      console.error('Error loading swap requests:', err);
      setError('Failed to load swap requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (request: ReservationSwapRequest) => {
    try {
      setProcessingId(request.id);
      setError(null);

      // Call the database function to accept the swap
      const { error: acceptError } = await supabase
        .rpc('accept_swap_request', { request_id: request.id });

      if (acceptError) throw acceptError;

      // Send notification email to requester
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', request.requester_id)
        .single();

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      // Try to send email notification
      try {
        const emailData = {
          recipientEmail: '', // Would need to get from auth
          recipientName: requesterProfile 
            ? `${requesterProfile.first_name} ${requesterProfile.last_name}` 
            : 'Cabin Family Member',
          responderName: currentProfile 
            ? `${currentProfile.first_name} ${currentProfile.last_name}` 
            : 'A family member',
          offeredDates: formatDateRange(
            request.requester_reservation?.start_date || '',
            request.requester_reservation?.end_date || ''
          ),
          requestedDates: formatDateRange(
            request.target_reservation?.start_date || '',
            request.target_reservation?.end_date || ''
          ),
          accepted: true,
        };

        await fetch('/api/send-swap-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: emailData.recipientEmail,
            subject: 'Your swap request was accepted!',
            html: generateSwapResponseEmailHTML(emailData),
            text: generateSwapResponseEmailText(emailData),
            type: 'swap-response',
          }),
        });
      } catch (emailErr) {
        console.error('Failed to send response email:', emailErr);
      }

      // Create notification for requester
      await supabase.from('notifications').insert({
        user_id: request.requester_id,
        title: 'Swap Request Accepted!',
        message: `Your swap request was accepted. The reservations have been swapped.`,
        type: 'reservation',
      });

      await loadSwapRequests();
      onSwapComplete?.();

    } catch (err) {
      console.error('Error accepting swap:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept swap');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (request: ReservationSwapRequest) => {
    try {
      setProcessingId(request.id);
      setError(null);

      // Call the database function to decline
      const { error: declineError } = await supabase
        .rpc('decline_swap_request', { request_id: request.id });

      if (declineError) throw declineError;

      // Create notification for requester
      await supabase.from('notifications').insert({
        user_id: request.requester_id,
        title: 'Swap Request Declined',
        message: `Your swap request was declined.`,
        type: 'reservation',
      });

      await loadSwapRequests();

    } catch (err) {
      console.error('Error declining swap:', err);
      setError(err instanceof Error ? err.message : 'Failed to decline swap');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (request: ReservationSwapRequest) => {
    try {
      setProcessingId(request.id);
      setError(null);

      const { error: cancelError } = await supabase
        .from('reservation_swap_requests')
        .delete()
        .eq('id', request.id);

      if (cancelError) throw cancelError;

      await loadSwapRequests();

    } catch (err) {
      console.error('Error cancelling swap:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel swap request');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading swap requests...</div>;
  }

  const hasRequests = incomingRequests.length > 0 || outgoingRequests.length > 0;

  if (!hasRequests) {
    return (
      <div className={styles.empty}>
        <p>No swap requests at this time.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {error && <div className={styles.error}>{error}</div>}

      {incomingRequests.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Incoming Requests</h3>
          {incomingRequests.map(request => (
            <div key={request.id} className={styles.requestCard}>
              <div className={styles.requestHeader}>
                <span className={styles.requesterName}>
                  {request.requester_profile
                    ? `${request.requester_profile.first_name} ${request.requester_profile.last_name}`
                    : 'Someone'}
                </span>
                <span className={styles.badge}>Pending</span>
              </div>
              
              <div className={styles.swapDetails}>
                <div className={styles.dateBox}>
                  <span className={styles.dateLabel}>They're offering</span>
                  <span className={styles.dateValue}>
                    {formatDateRange(
                      request.requester_reservation?.start_date || '',
                      request.requester_reservation?.end_date || ''
                    )}
                  </span>
                </div>
                <div className={styles.swapArrow}>⇅</div>
                <div className={styles.dateBox}>
                  <span className={styles.dateLabel}>For your reservation</span>
                  <span className={styles.dateValue}>
                    {formatDateRange(
                      request.target_reservation?.start_date || '',
                      request.target_reservation?.end_date || ''
                    )}
                  </span>
                </div>
              </div>

              {request.message && (
                <div className={styles.message}>
                  <strong>Message:</strong> "{request.message}"
                </div>
              )}

              <div className={styles.actions}>
                <button
                  className={styles.acceptButton}
                  onClick={() => handleAccept(request)}
                  disabled={processingId === request.id}
                >
                  {processingId === request.id ? 'Processing...' : 'Accept'}
                </button>
                <button
                  className={styles.declineButton}
                  onClick={() => handleDecline(request)}
                  disabled={processingId === request.id}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {outgoingRequests.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Your Requests</h3>
          {outgoingRequests.map(request => (
            <div key={request.id} className={`${styles.requestCard} ${styles[request.status]}`}>
              <div className={styles.requestHeader}>
                <span className={styles.requesterName}>
                  To: {(request as any).target_profile
                    ? `${(request as any).target_profile.first_name} ${(request as any).target_profile.last_name}`
                    : 'Someone'}
                </span>
                <span className={`${styles.badge} ${styles[`badge${request.status.charAt(0).toUpperCase() + request.status.slice(1)}`]}`}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
              </div>
              
              <div className={styles.swapDetails}>
                <div className={styles.dateBox}>
                  <span className={styles.dateLabel}>You offered</span>
                  <span className={styles.dateValue}>
                    {formatDateRange(
                      request.requester_reservation?.start_date || '',
                      request.requester_reservation?.end_date || ''
                    )}
                  </span>
                </div>
                <div className={styles.swapArrow}>⇅</div>
                <div className={styles.dateBox}>
                  <span className={styles.dateLabel}>For their reservation</span>
                  <span className={styles.dateValue}>
                    {formatDateRange(
                      request.target_reservation?.start_date || '',
                      request.target_reservation?.end_date || ''
                    )}
                  </span>
                </div>
              </div>

              {request.status === 'pending' && (
                <div className={styles.actions}>
                  <button
                    className={styles.cancelButton}
                    onClick={() => handleCancel(request)}
                    disabled={processingId === request.id}
                  >
                    Cancel Request
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
