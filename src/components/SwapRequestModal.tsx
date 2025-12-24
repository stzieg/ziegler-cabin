import React, { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Reservation } from '../types/supabase';
import { supabase } from '../utils/supabase';
import {
  generateSwapRequestEmailHTML,
  generateSwapRequestEmailText,
  formatDateRange,
} from '../utils/swapEmailTemplates';
import styles from './SwapRequestModal.module.css';

interface SwapRequestModalProps {
  targetReservation: Reservation;
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}

export const SwapRequestModal: React.FC<SwapRequestModalProps> = ({
  targetReservation,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const [userReservations, setUserReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<string>('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetUserEmail, setTargetUserEmail] = useState<string>('');
  const [targetUserName, setTargetUserName] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');

  useEffect(() => {
    loadUserReservations();
    loadUserDetails();
  }, []);

  const loadUserReservations = async () => {
    try {
      setLoading(true);
      
      // Get current user's future reservations
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error: fetchError } = await supabase
        .from('reservations')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('end_date', today)
        .order('start_date');

      if (fetchError) throw fetchError;

      setUserReservations(data || []);
    } catch (err) {
      console.error('Error loading reservations:', err);
      setError('Failed to load your reservations');
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetails = async () => {
    try {
      // Get target user's email and name
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', targetReservation.user_id)
        .single();

      if (targetProfile) {
        setTargetUserName(`${targetProfile.first_name} ${targetProfile.last_name}`);
      }

      // Get target user's email from auth (need to use a different approach)
      // For now, we'll need to store email in profiles or use a server function
      // Let's check if we have it in the profiles table
      const { data: authData } = await supabase.auth.admin?.getUserById(targetReservation.user_id) || {};
      if (authData?.user?.email) {
        setTargetUserEmail(authData.user.email);
      }

      // Get current user's name
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', currentUser.id)
        .single();

      if (currentProfile) {
        setCurrentUserName(`${currentProfile.first_name} ${currentProfile.last_name}`);
      }
    } catch (err) {
      console.error('Error loading user details:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReservation) {
      setError('Please select a reservation to offer');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const selectedRes = userReservations.find(r => r.id === selectedReservation);
      if (!selectedRes) {
        throw new Error('Selected reservation not found');
      }

      // Create the swap request in the database
      const { data: swapRequest, error: createError } = await supabase
        .from('reservation_swap_requests')
        .insert({
          requester_id: currentUser.id,
          requester_reservation_id: selectedReservation,
          target_user_id: targetReservation.user_id,
          target_reservation_id: targetReservation.id,
          message: message || null,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Get target user's email for sending notification
      // We need to fetch this from a secure endpoint or have it stored
      const { data: targetAuth } = await supabase
        .rpc('get_user_email', { user_id: targetReservation.user_id });

      const recipientEmail = targetAuth || targetUserEmail;

      if (recipientEmail) {
        // Generate email content
        const baseUrl = window.location.origin;
        const emailData = {
          recipientEmail,
          recipientName: targetUserName || 'Cabin Family Member',
          requesterName: currentUserName || 'A family member',
          offeredDates: formatDateRange(selectedRes.start_date, selectedRes.end_date),
          requestedDates: formatDateRange(targetReservation.start_date, targetReservation.end_date),
          message: message || undefined,
          acceptUrl: `${baseUrl}/swap-response?token=${swapRequest.token}&action=accept`,
          declineUrl: `${baseUrl}/swap-response?token=${swapRequest.token}&action=decline`,
          expiresAt: new Date(swapRequest.expires_at).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          }),
        };

        // Send email notification
        try {
          await fetch('/api/send-swap-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: recipientEmail,
              subject: `${currentUserName || 'Someone'} wants to swap cabin reservations with you`,
              html: generateSwapRequestEmailHTML(emailData),
              text: generateSwapRequestEmailText(emailData),
              type: 'swap-request',
            }),
          });
        } catch (emailErr) {
          console.error('Failed to send email notification:', emailErr);
          // Don't fail the whole operation if email fails
        }
      }

      // Create in-app notification for target user
      await supabase.from('notifications').insert({
        user_id: targetReservation.user_id,
        title: 'New Swap Request',
        message: `${currentUserName || 'Someone'} wants to swap their reservation (${formatDateRange(selectedRes.start_date, selectedRes.end_date)}) for yours (${formatDateRange(targetReservation.start_date, targetReservation.end_date)})`,
        type: 'reservation',
        related_reservation_id: targetReservation.id,
      });

      onSuccess();
    } catch (err) {
      console.error('Error creating swap request:', err);
      setError(err instanceof Error ? err.message : 'Failed to create swap request');
    } finally {
      setSubmitting(false);
    }
  };

  const targetDates = formatDateRange(targetReservation.start_date, targetReservation.end_date);
  const targetName = targetReservation.profiles 
    ? `${targetReservation.profiles.first_name} ${targetReservation.profiles.last_name}`
    : 'Another user';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          ×
        </button>
        
        <h2 className={styles.title}>Request Reservation Swap</h2>
        
        <div className={styles.targetInfo}>
          <p>You're requesting to swap with:</p>
          <div className={styles.reservationCard}>
            <strong>{targetName}</strong>
            <span className={styles.dates}>{targetDates}</span>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {loading ? (
          <div className={styles.loading}>Loading your reservations...</div>
        ) : userReservations.length === 0 ? (
          <div className={styles.noReservations}>
            <p>You don't have any upcoming reservations to offer for a swap.</p>
            <p>Create a reservation first, then you can request swaps.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Select a reservation to offer:</label>
              <div className={styles.reservationList}>
                {userReservations.map(res => (
                  <label key={res.id} className={styles.reservationOption}>
                    <input
                      type="radio"
                      name="reservation"
                      value={res.id}
                      checked={selectedReservation === res.id}
                      onChange={e => setSelectedReservation(e.target.value)}
                    />
                    <span className={styles.optionContent}>
                      <span className={styles.optionDates}>
                        {formatDateRange(res.start_date, res.end_date)}
                      </span>
                      {res.notes && (
                        <span className={styles.optionNotes}>{res.notes}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="message" className={styles.label}>
                Add a message (optional):
              </label>
              <textarea
                id="message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                className={styles.textarea}
                placeholder="e.g., Would love to swap because..."
                rows={3}
                maxLength={500}
              />
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting || !selectedReservation}
              >
                {submitting ? 'Sending Request...' : 'Send Swap Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
