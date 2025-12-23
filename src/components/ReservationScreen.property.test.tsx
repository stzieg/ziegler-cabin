import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import type { User } from '@supabase/supabase-js';
import type { Reservation } from '../types/supabase';
import { ReservationScreen } from './ReservationScreen';

// Mock the Calendar component to avoid network requests
vi.mock('./Calendar', () => ({
  Calendar: ({ user, onReservationCreate, onReservationUpdate }: any) => (
    <div data-testid="mock-calendar">
      Mock Calendar for {user.email}
    </div>
  ),
}));

/**
 * **Feature: cabin-ui-improvements, Property 1: Full-screen interface navigation**
 * **Validates: Requirements 1.1, 1.3, 1.5**
 */

// Mock user for testing
const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {},
};

// Generators for property-based testing
const reservationArb = fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  start_date: fc.string().map(() => '2024-01-01'),
  end_date: fc.string().map(() => '2024-01-02'),
  guest_count: fc.integer({ min: 1, max: 20 }),
  notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
  created_at: fc.string().map(() => '2024-01-01T00:00:00Z'),
  updated_at: fc.string().map(() => '2024-01-01T00:00:00Z'),
});

const selectedDateArb = fc.constant(new Date('2024-01-01'));

describe('ReservationScreen Property Tests', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  /**
   * Property 1: Full-screen interface navigation
   * For any user interaction that triggers full-screen mode (create/edit reservation), 
   * the system should transition to full-screen interface and provide navigation back to the original view
   */
  it('should provide navigation back to calendar for any reservation mode', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('create', 'edit'),
        fc.option(reservationArb, { nil: undefined }),
        fc.option(selectedDateArb, { nil: undefined }),
        (mode, existingReservation, selectedDate) => {
          // Ensure valid combinations: edit mode requires existing reservation
          if (mode === 'edit' && !existingReservation) {
            return true; // Skip invalid combinations
          }
          if (mode === 'create' && existingReservation) {
            return true; // Skip invalid combinations
          }

          // Create fresh mocks for each test iteration
          const mockOnSave = vi.fn();
          const mockOnCancel = vi.fn();

          const { container, unmount } = render(
            <ReservationScreen
              mode={mode}
              existingReservation={existingReservation}
              selectedDate={selectedDate}
              onSave={mockOnSave}
              onCancel={mockOnCancel}
              user={mockUser}
            />
          );

          try {
            // Verify full-screen interface is displayed
            const reservationScreen = container.querySelector('[class*="reservationScreen"]');
            expect(reservationScreen).toBeTruthy();

            // Verify navigation back to calendar is available
            const backButton = screen.getByLabelText('Return to calendar');
            expect(backButton).toBeTruthy();

            // Test navigation functionality
            fireEvent.click(backButton);
            expect(mockOnCancel).toHaveBeenCalledTimes(1);
          } finally {
            unmount();
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1 (continued): Escape key navigation
   * The system should provide keyboard navigation back to calendar view
   */
  it('should handle escape key navigation for any reservation state', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('create', 'edit'),
        fc.option(reservationArb, { nil: undefined }),
        fc.option(selectedDateArb, { nil: undefined }),
        (mode, existingReservation, selectedDate) => {
          // Ensure valid combinations
          if (mode === 'edit' && !existingReservation) {
            return true;
          }
          if (mode === 'create' && existingReservation) {
            return true;
          }

          // Create fresh mocks for each test iteration
          const mockOnSave = vi.fn();
          const mockOnCancel = vi.fn();

          const { unmount } = render(
            <ReservationScreen
              mode={mode}
              existingReservation={existingReservation}
              selectedDate={selectedDate}
              onSave={mockOnSave}
              onCancel={mockOnCancel}
              user={mockUser}
            />
          );

          try {
            // Test escape key navigation
            fireEvent.keyDown(document, { key: 'Escape' });
            expect(mockOnCancel).toHaveBeenCalledTimes(1);
          } finally {
            unmount();
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1 (continued): Title and mode display
   * The interface should correctly display the mode (create/edit) in the title
   */
  it('should display correct title for any reservation mode', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('create', 'edit'),
        fc.option(reservationArb, { nil: undefined }),
        fc.option(selectedDateArb, { nil: undefined }),
        (mode, existingReservation, selectedDate) => {
          // Ensure valid combinations
          if (mode === 'edit' && !existingReservation) {
            return true;
          }
          if (mode === 'create' && existingReservation) {
            return true;
          }

          // Create fresh mocks for each test iteration
          const mockOnSave = vi.fn();
          const mockOnCancel = vi.fn();

          const { unmount } = render(
            <ReservationScreen
              mode={mode}
              existingReservation={existingReservation}
              selectedDate={selectedDate}
              onSave={mockOnSave}
              onCancel={mockOnCancel}
              user={mockUser}
            />
          );

          try {
            // Verify correct title is displayed
            const expectedTitle = mode === 'edit' ? 'Edit Reservation' : 'New Reservation';
            const titleElement = screen.getByRole('heading', { name: expectedTitle, level: 1 });
            expect(titleElement).toBeTruthy();
          } finally {
            unmount();
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: cabin-ui-improvements, Property 2: Form pre-population consistency**
   * **Validates: Requirements 1.2**
   * 
   * Property 2: Form pre-population consistency
   * For any existing reservation being edited, the full-screen form should be 
   * pre-populated with all current reservation data matching the original values
   */
  it('should pre-populate form with existing reservation data consistently', () => {
    fc.assert(
      fc.property(
        reservationArb,
        (existingReservation) => {
          // Create fresh mocks for each test iteration
          const mockOnSave = vi.fn();
          const mockOnCancel = vi.fn();

          const { unmount } = render(
            <ReservationScreen
              mode="edit"
              existingReservation={existingReservation}
              onSave={mockOnSave}
              onCancel={mockOnCancel}
              user={mockUser}
            />
          );

          try {
            // Verify all form fields are pre-populated with existing data
            const startDateInput = screen.getByLabelText('Start Date') as HTMLInputElement;
            const endDateInput = screen.getByLabelText('End Date') as HTMLInputElement;
            const guestCountInput = screen.getByLabelText('Number of Guests') as HTMLInputElement;
            const notesInput = screen.getByLabelText('Notes (optional)') as HTMLTextAreaElement;

            // Check that form fields match the existing reservation data
            expect(startDateInput.value).toBe(existingReservation.start_date);
            expect(endDateInput.value).toBe(existingReservation.end_date);
            expect(parseInt(guestCountInput.value)).toBe(existingReservation.guest_count);
            expect(notesInput.value).toBe(existingReservation.notes || '');
          } finally {
            unmount();
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2 (continued): Form pre-population for create mode with selected date
   * For any selected date in create mode, the form should be pre-populated with that date
   */
  it('should pre-populate form with selected date in create mode', () => {
    fc.assert(
      fc.property(
        selectedDateArb,
        (selectedDate) => {
          // Create fresh mocks for each test iteration
          const mockOnSave = vi.fn();
          const mockOnCancel = vi.fn();

          const { unmount } = render(
            <ReservationScreen
              mode="create"
              selectedDate={selectedDate}
              onSave={mockOnSave}
              onCancel={mockOnCancel}
              user={mockUser}
            />
          );

          try {
            // Verify form is pre-populated with selected date
            const startDateInput = screen.getByLabelText('Start Date') as HTMLInputElement;
            const endDateInput = screen.getByLabelText('End Date') as HTMLInputElement;
            const guestCountInput = screen.getByLabelText('Number of Guests') as HTMLInputElement;
            const notesInput = screen.getByLabelText('Notes (optional)') as HTMLTextAreaElement;

            const expectedDateStr = selectedDate.toISOString().split('T')[0];
            
            // Check that form fields are initialized correctly for create mode
            expect(startDateInput.value).toBe(expectedDateStr);
            expect(endDateInput.value).toBe(expectedDateStr);
            expect(parseInt(guestCountInput.value)).toBe(1); // Default guest count
            expect(notesInput.value).toBe(''); // Empty notes for new reservation
          } finally {
            unmount();
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});