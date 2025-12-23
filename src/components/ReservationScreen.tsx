import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Reservation } from '../types/supabase';
import { Calendar } from './Calendar';
import { useOrientation } from '../hooks/useOrientation';
import { useKeyboardAccessibility } from '../hooks/useKeyboardAccessibility';
import styles from './ReservationScreen.module.css';

export interface ReservationScreenProps {
  mode: 'create' | 'edit';
  existingReservation?: Reservation;
  selectedDate?: Date;
  onSave: (reservation: Reservation) => void;
  onCancel: () => void;
  user: User;
}

interface ReservationFormData {
  startDate: string;
  endDate: string;
  guestCount: number;
  notes: string;
}

interface ValidationErrors {
  startDate?: string;
  endDate?: string;
  guestCount?: string;
  notes?: string;
}

/**
 * Full-screen reservation interface component
 * Requirements: 1.1, 1.3, 1.5, 4.2
 */
export const ReservationScreen: React.FC<ReservationScreenProps> = ({
  mode,
  existingReservation,
  selectedDate,
  onSave,
  onCancel,
  user,
}) => {
  const [formData, setFormData] = useState<ReservationFormData>({
    startDate: '',
    endDate: '',
    guestCount: 1,
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isDirty, setIsDirty] = useState(false);

  // Refs for orientation and keyboard handling
  const containerRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);

  // Custom hooks for enhanced mobile experience
  const orientation = useOrientation();
  const { keyboardState, scrollToField } = useKeyboardAccessibility({
    containerRef: mainContentRef,
    scrollOffset: 120,
    autoHandle: true,
  });

  /**
   * Initialize form data based on mode and existing data
   * Requirements: 1.2 - Form pre-population for editing
   * Enhanced with data persistence during navigation
   */
  useEffect(() => {
    const persistenceKey = `reservation-form-${mode}-${existingReservation?.id || 'new'}`;
    
    if (mode === 'edit' && existingReservation) {
      // For edit mode, always start with existing reservation data
      const initialData = {
        startDate: existingReservation.start_date,
        endDate: existingReservation.end_date,
        guestCount: existingReservation.guest_count,
        notes: existingReservation.notes || '',
      };
      
      // Check if there's persisted data for this specific reservation
      const persistedData = localStorage.getItem(persistenceKey);
      if (persistedData) {
        try {
          const parsed = JSON.parse(persistedData);
          // Use persisted data if it exists and is more recent
          setFormData(parsed);
          setIsDirty(true);
        } catch {
          // If parsing fails, use initial data
          setFormData(initialData);
        }
      } else {
        setFormData(initialData);
      }
    } else if (mode === 'create') {
      // For create mode, check for persisted draft data first
      const persistedData = localStorage.getItem(persistenceKey);
      if (persistedData) {
        try {
          const parsed = JSON.parse(persistedData);
          setFormData(parsed);
          setIsDirty(true);
        } catch {
          // If parsing fails, use default or selected date
          const dateStr = selectedDate?.toISOString().split('T')[0] || '';
          setFormData({
            startDate: dateStr,
            endDate: dateStr,
            guestCount: 1,
            notes: '',
          });
        }
      } else if (selectedDate) {
        const dateStr = selectedDate.toISOString().split('T')[0];
        setFormData({
          startDate: dateStr,
          endDate: dateStr,
          guestCount: 1,
          notes: '',
        });
      }
    }
  }, [mode, existingReservation, selectedDate]);

  /**
   * Validate individual form field
   * Requirements: 5.4 - Real-time validation feedback
   */
  const validateField = useCallback((field: keyof ReservationFormData, value: string | number, allData?: ReservationFormData): string | undefined => {
    const data = allData || formData;
    
    switch (field) {
      case 'startDate':
        if (!value || value === '') return 'Start date is required';
        if (data.endDate && value > data.endDate) return 'Start date must be before end date';
        break;
      case 'endDate':
        if (!value || value === '') return 'End date is required';
        if (data.startDate && value < data.startDate) return 'End date must be after start date';
        break;
      case 'guestCount':
        const count = typeof value === 'number' ? value : parseInt(value.toString());
        if (isNaN(count) || count < 1) return 'At least 1 guest is required';
        if (count > 20) return 'Maximum 20 guests allowed';
        break;
      case 'notes':
        if (typeof value === 'string' && value.length > 1000) return 'Notes must be less than 1000 characters';
        break;
    }
    return undefined;
  }, [formData]);

  /**
   * Handle form field changes with validation and persistence
   * Requirements: 5.4 - Real-time validation feedback
   * Enhanced with data persistence during navigation and interruptions
   */
  const handleFieldChange = useCallback((field: keyof ReservationFormData, value: string | number) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    setIsDirty(true);
    
    // Clear general error on input change
    setError(null);
    
    // Validate the changed field and related fields
    const newValidationErrors = { ...validationErrors };
    
    // Validate the current field
    const fieldError = validateField(field, value, newData);
    if (fieldError) {
      newValidationErrors[field] = fieldError;
    } else {
      delete newValidationErrors[field];
    }
    
    // Re-validate related fields for date dependencies
    if (field === 'startDate' && newData.endDate) {
      const endDateError = validateField('endDate', newData.endDate, newData);
      if (endDateError) {
        newValidationErrors.endDate = endDateError;
      } else {
        delete newValidationErrors.endDate;
      }
    } else if (field === 'endDate' && newData.startDate) {
      const startDateError = validateField('startDate', newData.startDate, newData);
      if (startDateError) {
        newValidationErrors.startDate = startDateError;
      } else {
        delete newValidationErrors.startDate;
      }
    }
    
    setValidationErrors(newValidationErrors);
    
    // Persist form data to localStorage for recovery
    const persistenceKey = `reservation-form-${mode}-${existingReservation?.id || 'new'}`;
    try {
      localStorage.setItem(persistenceKey, JSON.stringify(newData));
    } catch (error) {
      console.warn('Failed to persist form data:', error);
    }
  }, [formData, validationErrors, validateField, mode, existingReservation?.id]);

  /**
   * Handle calendar date selection
   * Requirements: 2.1, 2.2 - Calendar-form synchronization
   */
  // const handleDateSelect = useCallback((startDate: string, endDate: string) => {
  //   setFormData(prev => ({
  //     ...prev,
  //     startDate,
  //     endDate,
  //   }));
  //   setError(null);
  // }, []);

  /**
   * Validate entire form
   * Requirements: 5.4 - Comprehensive validation feedback
   */
  const validateForm = useCallback((): ValidationErrors => {
    const errors: ValidationErrors = {};
    
    // Validate all fields
    Object.keys(formData).forEach(key => {
      const field = key as keyof ReservationFormData;
      const error = validateField(field, formData[field], formData);
      if (error) {
        errors[field] = error;
      }
    });
    
    return errors;
  }, [formData, validateField]);

  /**
   * Handle form submission with enhanced error recovery
   * Requirements: 1.2, 5.5 - Form submission with error handling and recovery
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setError(null);

      // Comprehensive form validation
      const errors = validateForm();
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        throw new Error('Please correct the validation errors before submitting');
      }

      // Clear validation errors if all pass
      setValidationErrors({});

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
      
      // Clear persisted data on successful save
      const persistenceKey = `reservation-form-${mode}-${existingReservation?.id || 'new'}`;
      localStorage.removeItem(persistenceKey);
      setIsDirty(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save reservation';
      
      // Provide specific guidance based on error type, but preserve original message
      if (errorMessage.toLowerCase().includes('network') && !errorMessage.toLowerCase().includes('database')) {
        setError('Network error: Please check your connection and try again');
      } else if (errorMessage.toLowerCase().includes('conflict') || errorMessage.toLowerCase().includes('overlap')) {
        setError('Date conflict: The selected dates overlap with an existing reservation');
      } else if (errorMessage.toLowerCase().includes('validation') && errorMessage.toLowerCase().includes('correct')) {
        setError('Please check the form for errors and try again');
      } else {
        // Preserve original error message for all other cases
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Enhanced cancel handler with data persistence cleanup
   * Requirements: 1.3 - Navigation back to calendar
   */
  const handleCancel = useCallback(() => {
    if (isDirty) {
      // Optionally warn user about unsaved changes
      const confirmCancel = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmCancel) return;
      
      // Clear persisted data on cancel
      const persistenceKey = `reservation-form-${mode}-${existingReservation?.id || 'new'}`;
      localStorage.removeItem(persistenceKey);
    }
    onCancel();
  }, [isDirty, mode, existingReservation?.id, onCancel]);

  /**
   * Handle escape key to cancel
   * Requirements: 1.3 - Navigation back to calendar
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleCancel]);

  /**
   * Cleanup persisted data on unmount if form was successfully submitted
   */
  useEffect(() => {
    return () => {
      // Only cleanup if component is unmounting due to successful submission
      // (not due to navigation away)
      if (!isDirty) {
        const persistenceKey = `reservation-form-${mode}-${existingReservation?.id || 'new'}`;
        localStorage.removeItem(persistenceKey);
      }
    };
  }, [isDirty, mode, existingReservation?.id]);

  return (
    <div 
      ref={containerRef}
      className={`${styles.reservationScreen} ${
        orientation.isChanging ? styles.orientationTransition : ''
      } ${
        orientation.type === 'landscape' ? styles.landscape : styles.portrait
      } ${
        keyboardState.isVisible ? styles.keyboardVisible : ''
      }`}
      data-orientation={orientation.type}
      data-keyboard-visible={keyboardState.isVisible}
    >
      {/* Header with navigation */}
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          onClick={handleCancel}
          aria-label="Return to calendar"
        >
          ← Back to Calendar
        </button>
        <h1 className={styles.title}>
          {mode === 'edit' ? 'Edit Reservation' : 'New Reservation'}
        </h1>
      </header>

      {/* Main content area with integrated calendar and form */}
      <main 
        ref={mainContentRef}
        className={styles.mainContent}
        style={{
          paddingBottom: keyboardState.isVisible ? `${keyboardState.height + 20}px` : undefined,
        }}
      >
        <div className={styles.contentGrid}>
          {/* Calendar section */}
          <section className={styles.calendarSection}>
            <h2 className={styles.sectionTitle}>Select Dates</h2>
            <div className={styles.calendarContainer}>
              <Calendar
                user={user}
                onReservationCreate={() => {}} // Handled by parent
                onReservationUpdate={() => {}} // Handled by parent
              />
            </div>
          </section>

          {/* Form section */}
          <section className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Reservation Details</h2>
            
            {error && (
              <div className={styles.errorMessage} role="alert">
                {error}
              </div>
            )}

            {isDirty && (
              <div className={styles.draftNotice}>
                <small>Draft saved automatically</small>
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
                    className={`${styles.input} ${validationErrors.startDate ? styles.inputError : ''}`}
                    required
                  />
                  {validationErrors.startDate && (
                    <div className={styles.fieldError} role="alert">
                      {validationErrors.startDate}
                    </div>
                  )}
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
                    className={`${styles.input} ${validationErrors.endDate ? styles.inputError : ''}`}
                    required
                  />
                  {validationErrors.endDate && (
                    <div className={styles.fieldError} role="alert">
                      {validationErrors.endDate}
                    </div>
                  )}
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
                    className={`${styles.input} ${validationErrors.guestCount ? styles.inputError : ''}`}
                    required
                  />
                  {validationErrors.guestCount && (
                    <div className={styles.fieldError} role="alert">
                      {validationErrors.guestCount}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="notes" className={styles.label}>
                    Notes (optional)
                  </label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                    className={`${styles.textarea} ${validationErrors.notes ? styles.inputError : ''}`}
                    rows={4}
                    placeholder="Add any special requests or notes..."
                    maxLength={1000}
                  />
                  {validationErrors.notes && (
                    <div className={styles.fieldError} role="alert">
                      {validationErrors.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Form actions */}
              <div className={styles.formActions}>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : (mode === 'edit' ? 'Update Reservation' : 'Create Reservation')}
                </button>
                
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
};