import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Reservation } from '../types/supabase';
import { supabase } from '../utils/supabase';
import { useOrientation } from '../hooks/useOrientation';
import { useKeyboardAccessibility } from '../hooks/useKeyboardAccessibility';
import styles from './CalendarFormIntegration.module.css';

export interface CalendarFormIntegrationProps {
  user: User;
  mode: 'create' | 'edit';
  existingReservation?: Reservation;
  selectedDate?: Date;
  onSave: (reservation: Reservation) => void;
  onCancel: () => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  reservations: Reservation[];
  isInSelectedRange: boolean;
  isConflicted: boolean;
}

interface ReservationFormData {
  startDate: string;
  endDate: string;
  guestCount: number;
  notes: string;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * Integrated Calendar and Form Component
 * Requirements: 2.1, 2.2, 2.4, 2.3, 2.5
 */
export const CalendarFormIntegration: React.FC<CalendarFormIntegrationProps> = ({
  user,
  mode,
  existingReservation,
  selectedDate,
  onSave,
  onCancel,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs for orientation and keyboard handling
  const containerRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Custom hooks for enhanced mobile experience
  const orientation = useOrientation();
  const { keyboardState } = useKeyboardAccessibility({
    containerRef: mainContentRef,
    scrollOffset: 100,
    autoHandle: true,
  });
  
  // Form state
  const [formData, setFormData] = useState<ReservationFormData>({
    startDate: '',
    endDate: '',
    guestCount: 1,
    notes: '',
  });
  
  // Calendar selection state
  const [selectedRange, setSelectedRange] = useState<DateRange | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<string | null>(null);

  /**
   * Initialize form data based on mode and existing data
   * Requirements: 1.2 - Form pre-population for editing
   */
  useEffect(() => {
    if (mode === 'edit' && existingReservation) {
      const formState = {
        startDate: existingReservation.start_date,
        endDate: existingReservation.end_date,
        guestCount: existingReservation.guest_count,
        notes: existingReservation.notes || '',
      };
      setFormData(formState);
      setSelectedRange({
        startDate: existingReservation.start_date,
        endDate: existingReservation.end_date,
      });
    } else if (mode === 'create' && selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const formState = {
        startDate: dateStr,
        endDate: dateStr,
        guestCount: 1,
        notes: '',
      };
      setFormData(formState);
      setSelectedRange({
        startDate: dateStr,
        endDate: dateStr,
      });
    }
  }, [mode, existingReservation, selectedDate]);

  /**
   * Load reservations for the current month
   * Requirements: 2.1 - Display existing reservations
   */
  const loadReservations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data: reservationsData, error: fetchError } = await supabase
        .from('reservations')
        .select('*')
        .gte('start_date', startOfMonth.toISOString().split('T')[0])
        .lte('end_date', endOfMonth.toISOString().split('T')[0])
        .order('start_date');

      if (fetchError) {
        throw fetchError;
      }

      let enrichedReservations = reservationsData || [];
      
      if (reservationsData && reservationsData.length > 0) {
        const userIds = [...new Set(reservationsData.map(r => r.user_id))];
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);

        if (!profilesError && profilesData) {
          enrichedReservations = reservationsData.map(reservation => ({
            ...reservation,
            profiles: profilesData.find(profile => profile.id === reservation.user_id)
          }));
        }
      }

      setReservations(enrichedReservations || []);
    } catch (err) {
      console.error('Error loading reservations:', err);
      
      if (err instanceof Error && err.message.includes('relation "reservations" does not exist')) {
        setReservations([]);
        setError('Database not fully set up. Please run migrations to enable reservations.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load reservations');
        setReservations([]);
      }
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  /**
   * Check if a date range conflicts with existing reservations
   * Requirements: 2.3, 2.5 - Conflict detection and prevention
   */
  const checkReservationConflict = useCallback((startDate: string, endDate: string): Reservation[] => {
    return reservations.filter(reservation => {
      if (existingReservation && reservation.id === existingReservation.id) return false;
      
      return (
        startDate <= reservation.end_date && endDate >= reservation.start_date
      );
    });
  }, [reservations, existingReservation]);

  /**
   * Get reservations that include a specific date
   */
  const getReservationsForDate = useCallback((date: Date): Reservation[] => {
    const dateStr = date.toISOString().split('T')[0];
    return reservations.filter(reservation => {
      return dateStr >= reservation.start_date && dateStr <= reservation.end_date;
    });
  }, [reservations]);

  /**
   * Check if a date is in the selected range
   */
  const isDateInSelectedRange = useCallback((date: Date): boolean => {
    if (!selectedRange) return false;
    const dateStr = date.toISOString().split('T')[0];
    return dateStr >= selectedRange.startDate && dateStr <= selectedRange.endDate;
  }, [selectedRange]);

  /**
   * Check if a date has conflicts
   */
  const isDateConflicted = useCallback((date: Date): boolean => {
    if (!selectedRange) return false;
    const conflicts = checkReservationConflict(selectedRange.startDate, selectedRange.endDate);
    return conflicts.some(reservation => {
      const dateStr = date.toISOString().split('T')[0];
      return dateStr >= reservation.start_date && dateStr <= reservation.end_date;
    });
  }, [selectedRange, checkReservationConflict]);

  /**
   * Generate calendar days for the current month
   * Requirements: 2.1 - Monthly calendar view with visual feedback
   */
  const generateCalendarDays = useCallback((): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
    
    const days: CalendarDay[] = [];
    const today = new Date();
    
    // Add days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        reservations: getReservationsForDate(date),
        isInSelectedRange: isDateInSelectedRange(date),
        isConflicted: isDateConflicted(date),
      });
    }
    
    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString(),
        reservations: getReservationsForDate(date),
        isInSelectedRange: isDateInSelectedRange(date),
        isConflicted: isDateConflicted(date),
      });
    }
    
    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        reservations: getReservationsForDate(date),
        isInSelectedRange: isDateInSelectedRange(date),
        isConflicted: isDateConflicted(date),
      });
    }
    
    return days;
  }, [currentDate, getReservationsForDate, isDateInSelectedRange, isDateConflicted]);

  /**
   * Handle calendar date selection with range support
   * Requirements: 2.1, 2.2, 2.4 - Calendar-form synchronization and visual feedback
   */
  const handleDateClick = useCallback((date: Date) => {
    if (!date) return;
    
    const dateStr = date.toISOString().split('T')[0];
    
    if (!isSelecting) {
      // Start new selection
      setIsSelecting(true);
      setSelectionStart(dateStr);
      const newRange = { startDate: dateStr, endDate: dateStr };
      setSelectedRange(newRange);
      
      // Update form immediately (Requirements: 2.2 - Real-time synchronization)
      setFormData(prev => ({
        ...prev,
        startDate: dateStr,
        endDate: dateStr,
      }));
    } else {
      // Complete selection
      if (selectionStart) {
        const startDate = selectionStart <= dateStr ? selectionStart : dateStr;
        const endDate = selectionStart <= dateStr ? dateStr : selectionStart;
        
        const newRange = { startDate, endDate };
        setSelectedRange(newRange);
        
        // Update form immediately (Requirements: 2.2 - Real-time synchronization)
        setFormData(prev => ({
          ...prev,
          startDate,
          endDate,
        }));
      }
      
      setIsSelecting(false);
      setSelectionStart(null);
    }
    
    setError(null);
  }, [isSelecting, selectionStart]);

  /**
   * Handle form field changes
   * Requirements: 2.2 - Form-calendar synchronization
   */
  const handleFieldChange = useCallback((field: keyof ReservationFormData, value: string | number) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Update calendar selection when dates change in form
      if (field === 'startDate' || field === 'endDate') {
        if (newData.startDate && newData.endDate) {
          setSelectedRange({
            startDate: newData.startDate,
            endDate: newData.endDate,
          });
        }
      }
      
      return newData;
    });
    setError(null);
  }, []);

  /**
   * Handle form submission
   * Requirements: 2.3, 2.5 - Conflict detection and prevention
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setError(null);

      // Validate form data
      if (!formData.startDate || !formData.endDate) {
        throw new Error('Please select start and end dates');
      }

      if (formData.startDate > formData.endDate) {
        throw new Error('End date must be after start date');
      }

      if (formData.guestCount < 1 || formData.guestCount > 20) {
        throw new Error('Guest count must be between 1 and 20');
      }

      // Check for conflicts (Requirements: 2.3, 2.5)
      const conflicts = checkReservationConflict(formData.startDate, formData.endDate);
      if (conflicts.length > 0) {
        const conflictDetails = conflicts.map(r => `${r.start_date} to ${r.end_date}`).join(', ');
        throw new Error(`Reservation conflicts with existing booking(s): ${conflictDetails}`);
      }

      // Create reservation object
      const reservationData: Reservation = {
        id: existingReservation?.id || '',
        user_id: user.id,
        start_date: formData.startDate,
        end_date: formData.endDate,
        guest_count: formData.guestCount,
        notes: formData.notes || undefined,
        created_at: existingReservation?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await onSave(reservationData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Check for current conflicts
  const currentConflicts = selectedRange ? checkReservationConflict(selectedRange.startDate, selectedRange.endDate) : [];

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading calendar...</div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`${styles.container} ${
        orientation.isChanging ? styles.orientationTransition : ''
      } ${
        orientation.type === 'landscape' ? styles.landscape : styles.portrait
      } ${
        keyboardState.isVisible ? styles.keyboardVisible : ''
      }`}
      data-orientation={orientation.type}
      data-keyboard-visible={keyboardState.isVisible}
    >
      <div 
        ref={mainContentRef}
        className={styles.contentGrid}
        style={{
          paddingBottom: keyboardState.isVisible ? `${keyboardState.height + 20}px` : undefined,
        }}
      >
        {/* Calendar Section */}
        <section className={styles.calendarSection}>
          <div className={styles.calendarHeader}>
            <button
              className={styles.navButton}
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              aria-label="Previous month"
            >
              ←
            </button>
            <h2 className={styles.monthTitle}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              className={styles.navButton}
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              aria-label="Next month"
            >
              →
            </button>
          </div>

          {/* Day Headers */}
          <div className={styles.dayHeaders}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className={styles.dayHeader}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className={styles.calendarGrid}>
            {calendarDays.map((day, index) => (
              <button
                key={index}
                className={`${styles.calendarDay} ${
                  day.isCurrentMonth ? styles.currentMonth : styles.otherMonth
                } ${day.isToday ? styles.today : ''} ${
                  day.reservations.length > 0 ? styles.hasReservation : ''
                } ${day.isInSelectedRange ? styles.selectedRange : ''} ${
                  day.isConflicted ? styles.conflicted : ''
                }`}
                onClick={() => handleDateClick(day.date)}
                disabled={!day.isCurrentMonth}
              >
                <span className={styles.dayNumber}>{day.date.getDate()}</span>
                {day.reservations.length > 0 && (
                  <div className={styles.reservationIndicator}>
                    {day.reservations.map((reservation) => (
                      <div key={reservation.id} className={styles.reservationName}>
                        {reservation.profiles 
                          ? `${reservation.profiles.first_name} ${reservation.profiles.last_name}`
                          : 'Reserved'
                        }
                      </div>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Selection Instructions */}
          <div className={styles.selectionInstructions}>
            {isSelecting ? (
              <p>Click another date to complete your selection</p>
            ) : (
              <p>Click a date to start selecting your reservation period</p>
            )}
          </div>
        </section>

        {/* Form Section */}
        <section className={styles.formSection}>
          <h2 className={styles.sectionTitle}>
            {mode === 'edit' ? 'Edit Reservation' : 'New Reservation'}
          </h2>
          
          {/* Error Display */}
          {error && (
            <div className={styles.errorMessage} role="alert">
              {error}
            </div>
          )}

          {/* Conflict Warning */}
          {currentConflicts.length > 0 && (
            <div className={styles.conflictWarning} role="alert">
              <strong>Conflict detected:</strong> Your selected dates overlap with existing reservations.
              <ul>
                {currentConflicts.map(conflict => (
                  <li key={conflict.id}>
                    {conflict.start_date} to {conflict.end_date}
                    {conflict.profiles && ` (${conflict.profiles.first_name} ${conflict.profiles.last_name})`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="startDate" className={styles.label}>
                  Start Date
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleFieldChange('startDate', e.target.value)}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="endDate" className={styles.label}>
                  End Date
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleFieldChange('endDate', e.target.value)}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="guestCount" className={styles.label}>
                  Number of Guests
                </label>
                <input
                  id="guestCount"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.guestCount}
                  onChange={(e) => handleFieldChange('guestCount', parseInt(e.target.value) || 1)}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="notes" className={styles.label}>
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  className={styles.textarea}
                  rows={4}
                  placeholder="Add any special requests or notes..."
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={isSubmitting || currentConflicts.length > 0}
              >
                {isSubmitting ? 'Saving...' : (mode === 'edit' ? 'Update Reservation' : 'Create Reservation')}
              </button>
              
              <button
                type="button"
                className={styles.cancelButton}
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};