import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import type { Reservation } from '../types/supabase';
import styles from './UnlinkedReservations.module.css';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
}

interface UnlinkedReservationsProps {
  onReservationLinked?: () => void;
}

/**
 * UnlinkedReservations component - Shows reservations with custom names that need to be linked to users
 */
export const UnlinkedReservations: React.FC<UnlinkedReservationsProps> = ({ onReservationLinked }) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load reservations with custom names (unlinked)
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select('*')
        .not('custom_name', 'is', null)
        .order('start_date', { ascending: true });

      if (reservationsError) throw reservationsError;

      // Load all users for linking
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .order('last_name');

      if (usersError) throw usersError;

      setReservations(reservationsData || []);
      setUsers(usersData || []);
    } catch (err) {
      console.error('Error loading unlinked reservations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (reservationId: string) => {
    const userId = selectedUserId[reservationId];
    if (!userId) {
      setError('Please select a user to link');
      return;
    }

    try {
      setLinkingId(reservationId);
      setError(null);

      const { error: updateError } = await supabase
        .from('reservations')
        .update({
          user_id: userId,
          custom_name: null,
        })
        .eq('id', reservationId);

      if (updateError) throw updateError;

      // Remove from list
      setReservations(prev => prev.filter(r => r.id !== reservationId));
      onReservationLinked?.();
    } catch (err) {
      console.error('Error linking reservation:', err);
      setError(err instanceof Error ? err.message : 'Failed to link reservation');
    } finally {
      setLinkingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Loading unlinked reservations...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {error && (
        <div className={styles.error}>{error}</div>
      )}

      {reservations.length === 0 ? (
        <div className={styles.empty}>
          <p>✓ All reservations are linked to users</p>
        </div>
      ) : (
        <>
          <p className={styles.description}>
            These reservations have custom names and need to be linked to registered users 
            for swap functionality to work.
          </p>
          
          <div className={styles.list}>
            {reservations.map(reservation => (
              <div key={reservation.id} className={styles.item}>
                <div className={styles.info}>
                  <span className={styles.customName}>{reservation.custom_name}</span>
                  <span className={styles.dates}>
                    {formatDate(reservation.start_date)} - {formatDate(reservation.end_date)}
                  </span>
                </div>
                
                <div className={styles.actions}>
                  <select
                    value={selectedUserId[reservation.id] || ''}
                    onChange={(e) => setSelectedUserId(prev => ({
                      ...prev,
                      [reservation.id]: e.target.value
                    }))}
                    className={styles.userSelect}
                    disabled={linkingId === reservation.id}
                  >
                    <option value="">Select user...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={() => handleLink(reservation.id)}
                    disabled={!selectedUserId[reservation.id] || linkingId === reservation.id}
                    className={styles.linkButton}
                  >
                    {linkingId === reservation.id ? 'Linking...' : 'Link'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <button onClick={loadData} className={styles.refreshButton} disabled={loading}>
        Refresh
      </button>
    </div>
  );
};
