import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Reservation } from '../types/supabase';

export type ViewMode = 'calendar' | 'reservation';

export interface ViewState {
  currentView: ViewMode;
  isTransitioning: boolean;
  previousView?: ViewMode;
}

export interface ReservationFormState {
  mode: 'create' | 'edit';
  selectedDate?: Date;
  existingReservation?: Reservation;
  formData?: {
    startDate: string;
    endDate: string;
    guestCount: number;
    notes: string;
  };
}

interface ViewStateContextType {
  viewState: ViewState;
  reservationState: ReservationFormState | null;
  
  // View transition methods
  navigateToCalendar: () => void;
  navigateToReservation: (state: ReservationFormState) => void;
  
  // Form data persistence
  updateReservationFormData: (formData: Partial<ReservationFormState['formData']>) => void;
  clearReservationState: () => void;
}

const ViewStateContext = createContext<ViewStateContextType | undefined>(undefined);

interface ViewStateProviderProps {
  children: ReactNode;
}

/**
 * ViewStateProvider - Manages view transitions and form state persistence
 * Requirements: 1.5, 4.2 - State management for transitions and form data
 */
export const ViewStateProvider: React.FC<ViewStateProviderProps> = ({ children }) => {
  const [viewState, setViewState] = useState<ViewState>({
    currentView: 'calendar',
    isTransitioning: false,
  });
  
  const [reservationState, setReservationState] = useState<ReservationFormState | null>(null);

  /**
   * Navigate to calendar view
   * Requirements: 1.3 - Navigation back to calendar
   */
  const navigateToCalendar = useCallback(() => {
    setViewState(prev => ({
      currentView: 'calendar',
      isTransitioning: true,
      previousView: prev.currentView,
    }));
    
    // Clear transitioning state after animation
    setTimeout(() => {
      setViewState(prev => ({ ...prev, isTransitioning: false }));
    }, 300);
  }, []);

  /**
   * Navigate to reservation view with state
   * Requirements: 1.1, 1.2 - Full-screen reservation interface with pre-population
   */
  const navigateToReservation = useCallback((state: ReservationFormState) => {
    setReservationState(state);
    setViewState(prev => ({
      currentView: 'reservation',
      isTransitioning: true,
      previousView: prev.currentView,
    }));
    
    // Clear transitioning state after animation
    setTimeout(() => {
      setViewState(prev => ({ ...prev, isTransitioning: false }));
    }, 300);
  }, []);

  /**
   * Update reservation form data for persistence
   * Requirements: 1.5 - Form data persistence during navigation
   */
  const updateReservationFormData = useCallback((formData: Partial<ReservationFormState['formData']>) => {
    setReservationState(prev => {
      if (!prev) return null;
      
      return {
        ...prev,
        formData: {
          ...prev.formData,
          ...formData,
        } as ReservationFormState['formData'],
      };
    });
  }, []);

  /**
   * Clear reservation state
   * Requirements: 1.5 - State cleanup
   */
  const clearReservationState = useCallback(() => {
    setReservationState(null);
  }, []);

  const contextValue: ViewStateContextType = {
    viewState,
    reservationState,
    navigateToCalendar,
    navigateToReservation,
    updateReservationFormData,
    clearReservationState,
  };

  return (
    <ViewStateContext.Provider value={contextValue}>
      {children}
    </ViewStateContext.Provider>
  );
};

/**
 * Hook to use view state context
 */
export const useViewState = (): ViewStateContextType => {
  const context = useContext(ViewStateContext);
  if (context === undefined) {
    throw new Error('useViewState must be used within a ViewStateProvider');
  }
  return context;
};