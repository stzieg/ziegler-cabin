import React, { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Reservation } from '../../types/supabase';
import { Calendar } from '../Calendar';
import { ReservationScreen } from '../ReservationScreen';
import { SwapRequestsList } from '../SwapRequestsList';
import { ViewTransition } from '../ViewTransition';
import { ViewStateProvider, useViewState } from '../../contexts/ViewStateProvider';
import { supabase } from '../../utils/supabase';
import styles from './CalendarTab.module.css';

interface CalendarTabProps {
  user: User;
  formState?: Record<string, any>;
  isAdmin?: boolean;
}

/**
 * Calendar Tab Content - Internal component that uses ViewState
 */
const CalendarTabContent: React.FC<CalendarTabProps> = ({ user, isAdmin }) => {
  const [notifications, setNotifications] = useState<string[]>([]);
  const [showSwapRequests, setShowSwapRequests] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { navigateToCalendar, clearReservationState, viewState, reservationState } = useViewState();

  /**
   * Handle new reservation creation
   * Requirements: 2.2, 2.5 - Reservation creation with notifications
   */
  const handleReservationCreate = (reservation: Reservation) => {
    setNotifications(prev => [
      ...prev,
      `New reservation created for ${reservation.start_date} to ${reservation.end_date}`
    ]);
    
    // In a real app, this would trigger email notifications
    console.log('Reservation created:', reservation);
  };

  /**
   * Handle reservation updates
   * Requirements: 2.3, 2.5 - Reservation editing with notifications
   */
  const handleReservationUpdate = (reservation: Reservation) => {
    setNotifications(prev => [
      ...prev,
      `Reservation updated for ${reservation.start_date} to ${reservation.end_date}`
    ]);
    
    // In a real app, this would trigger email notifications
    console.log('Reservation updated:', reservation);
  };

  /**
   * Handle date click to create new reservation
   * Requirements: 1.1 - Transition to full-screen interface
   */
  // const handleDateClick = (date: Date) => {
  //   navigateToReservation({
  //     mode: 'create',
  //     selectedDate: date,
  //   });
  // };

  /**
   * Handle reservation edit
   * Requirements: 1.2 - Edit existing reservation with pre-population
   */
  // const handleReservationEdit = (reservation: Reservation) => {
  //   navigateToReservation({
  //     mode: 'edit',
  //     existingReservation: reservation,
  //   });
  // };

  /**
   * Handle reservation save from full-screen interface
   * Requirements: 1.2, 2.2 - Save reservation and return to calendar
   */
  const handleReservationSave = async (reservation: Reservation) => {
    try {
      if (reservationState?.mode === 'edit' && reservationState.existingReservation) {
        // Update existing reservation
        const { data, error } = await supabase
          .from('reservations')
          .update({
            start_date: reservation.start_date,
            end_date: reservation.end_date,
            guest_count: reservation.guest_count,
            notes: reservation.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', reservationState.existingReservation.id)
          .select()
          .single();

        if (error) throw error;
        handleReservationUpdate(data);
      } else {
        // Create new reservation
        const { data, error } = await supabase
          .from('reservations')
          .insert({
            user_id: user.id,
            start_date: reservation.start_date,
            end_date: reservation.end_date,
            guest_count: reservation.guest_count,
            notes: reservation.notes,
          })
          .select()
          .single();

        if (error) throw error;
        handleReservationCreate(data);
      }

      // Navigate back to calendar
      clearReservationState();
      navigateToCalendar();
    } catch (error) {
      console.error('Error saving reservation:', error);
      throw error; // Re-throw to let ReservationScreen handle the error display
    }
  };

  /**
   * Handle reservation cancel
   * Requirements: 1.3 - Navigation back to calendar
   */
  const handleReservationCancel = () => {
    clearReservationState();
    navigateToCalendar();
  };

  if (viewState.currentView === 'reservation' && reservationState) {
    return (
      <ViewTransition currentView="reservation" animationType="slide">
        <ReservationScreen
          mode={reservationState.mode}
          existingReservation={reservationState.existingReservation}
          selectedDate={reservationState.selectedDate}
          onSave={handleReservationSave}
          onCancel={handleReservationCancel}
          user={user}
        />
      </ViewTransition>
    );
  }

  return (
    <ViewTransition currentView="calendar" animationType="fade">
      <div className={styles.calendarTab}>
        {/* Notification area */}
        {notifications.length > 0 && (
          <div className={styles.notificationArea}>
            {notifications.map((notification, index) => (
              <div key={index} className={styles.notificationItem}>
                ✓ {notification}
              </div>
            ))}
            <button 
              onClick={() => setNotifications([])}
              className={styles.clearNotificationsButton}
            >
              Clear notifications
            </button>
          </div>
        )}

        {/* Swap Requests Toggle */}
        <div className={styles.swapRequestsToggle}>
          <button
            className={`${styles.toggleButton} ${showSwapRequests ? styles.active : ''}`}
            onClick={() => setShowSwapRequests(!showSwapRequests)}
          >
            {showSwapRequests ? 'Hide Swap Requests' : 'View Swap Requests'}
          </button>
        </div>

        {/* Swap Requests Panel */}
        {showSwapRequests && (
          <div className={styles.swapRequestsPanel}>
            <SwapRequestsList 
              user={user} 
              onSwapComplete={() => setRefreshKey(k => k + 1)}
            />
          </div>
        )}

        {/* Main Calendar Component */}
        <div className={styles.calendarContainer}>
          <Calendar
            key={refreshKey}
            user={user}
            isAdmin={isAdmin}
            onReservationCreate={handleReservationCreate}
            onReservationUpdate={handleReservationUpdate}
          />
        </div>
      </div>
    </ViewTransition>
  );
};

/**
 * Calendar Tab Component - Reservation scheduling interface
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.2, 1.1, 1.2, 1.3, 1.5, 4.2
 */
export const CalendarTab: React.FC<CalendarTabProps> = ({ user, formState, isAdmin }) => {
  return (
    <ViewStateProvider>
      <CalendarTabContent user={user} formState={formState} isAdmin={isAdmin} />
    </ViewStateProvider>
  );
};