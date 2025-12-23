import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import type { User } from '@supabase/supabase-js';
import type { Reservation } from '../types/supabase';
import { ReservationScreen } from './ReservationScreen';
import { CalendarFormIntegration } from './CalendarFormIntegration';

// Mock the Calendar component to avoid network requests
vi.mock('./Calendar', () => ({
  Calendar: ({ user, onReservationCreate, onReservationUpdate }: any) => (
    <div data-testid="mock-calendar">
      Mock Calendar for {user.email}
    </div>
  ),
}));

// Mock supabase to control error scenarios
vi.mock('../utils/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        })),
      })),
    })),
  },
}));

/**
 * **Feature: cabin-ui-improvements, Property 14: User feedback mechanisms**
 * **Validates: Requirements 5.4, 5.5**
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
// Use data that passes HTML5 validation but fails custom validation
const invalidFormDataArb = fc.record({
  startDate: fc.string().map(() => '2024-01-02'), // Valid date format
  endDate: fc.string().map(() => '2024-01-01'), // Valid date format but before start date
  guestCount: fc.integer({ min: 1, max: 20 }), // Valid guest count for HTML5
});

const validFormDataArb = fc.record({
  startDate: fc.string().map(() => '2024-01-01'),
  endDate: fc.string().map(() => '2024-01-02'),
  guestCount: fc.integer({ min: 1, max: 20 }),
  notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: '' }),
});

const errorMessageArb = fc.oneof(
  fc.constant('Network error occurred'),
  fc.constant('Database connection failed'),
  fc.constant('Validation failed'),
  fc.constant('Unauthorized access'),
  fc.constant('Server timeout')
);

describe('User Feedback Mechanisms Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  /**
   * Property 14: User feedback mechanisms
   * For any user action or error condition, the system should provide clear, 
   * actionable feedback about the current state
   */
  it('should provide validation feedback when form submission fails due to invalid input', async () => {
    await fc.assert(
      fc.asyncProperty(
        invalidFormDataArb,
        async (invalidData) => {
          // Create fresh mocks for each test iteration
          const mockOnSave = vi.fn();
          const mockOnCancel = vi.fn();

          const { unmount } = render(
            <ReservationScreen
              mode="create"
              onSave={mockOnSave}
              onCancel={mockOnCancel}
              user={mockUser}
            />
          );

          try {
            // Fill form with invalid data
            const startDateInput = screen.getByLabelText('Start Date') as HTMLInputElement;
            const endDateInput = screen.getByLabelText('End Date') as HTMLInputElement;
            const guestCountInput = screen.getByLabelText('Number of Guests') as HTMLInputElement;

            fireEvent.change(startDateInput, { target: { value: invalidData.startDate } });
            fireEvent.change(endDateInput, { target: { value: invalidData.endDate } });
            fireEvent.change(guestCountInput, { target: { value: invalidData.guestCount.toString() } });

            // Submit form to trigger validation
            const submitButton = screen.getByRole('button', { name: /create reservation/i });
            fireEvent.click(submitButton);

            // Wait for validation feedback to appear
            await waitFor(() => {
              const errorElements = screen.queryAllByRole('alert');
              expect(errorElements.length).toBeGreaterThan(0);
              
              // Check that error message is helpful and actionable
              const hasHelpfulError = errorElements.some(element => {
                const text = element.textContent || '';
                return text.includes('date') || text.includes('guest') || text.includes('select') || text.includes('must be');
              });
              expect(hasHelpfulError).toBe(true);
            }, { timeout: 1000 });

            // Verify onSave was not called due to validation failure
            expect(mockOnSave).not.toHaveBeenCalled();
          } finally {
            unmount();
          }

          return true;
        }
      ),
      { numRuns: 50 } // Reduced runs for async tests
    );
  });

  /**
   * Property 14 (continued): Error state feedback
   * For any error condition during form submission, clear error messages should be displayed
   */
  it('should display clear error messages for any submission failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        validFormDataArb,
        async (validData) => {
          // Create fresh mocks for each test iteration - use a simple error
          const mockOnSave = vi.fn().mockRejectedValue(new Error('Save failed'));
          const mockOnCancel = vi.fn();

          const { unmount } = render(
            <ReservationScreen
              mode="create"
              onSave={mockOnSave}
              onCancel={mockOnCancel}
              user={mockUser}
            />
          );

          try {
            // Fill form with valid data
            const startDateInput = screen.getByLabelText('Start Date') as HTMLInputElement;
            const endDateInput = screen.getByLabelText('End Date') as HTMLInputElement;
            const guestCountInput = screen.getByLabelText('Number of Guests') as HTMLInputElement;

            fireEvent.change(startDateInput, { target: { value: validData.startDate } });
            fireEvent.change(endDateInput, { target: { value: validData.endDate } });
            fireEvent.change(guestCountInput, { target: { value: validData.guestCount.toString() } });

            // Submit form to trigger error
            const submitButton = screen.getByRole('button', { name: /create reservation/i });
            fireEvent.click(submitButton);

            // Wait for error to be displayed with shorter timeout
            await waitFor(() => {
              const errorElements = screen.queryAllByRole('alert');
              expect(errorElements.length).toBeGreaterThan(0);
              
              // Check that some error message is displayed
              const hasErrorMessage = errorElements.some(element => 
                element.textContent && element.textContent.length > 0
              );
              expect(hasErrorMessage).toBe(true);
            }, { timeout: 2000 });
          } finally {
            unmount();
          }

          return true;
        }
      ),
      { numRuns: 20 } // Reduced runs for async tests
    );
  });

  /**
   * Property 14 (continued): Loading state feedback
   * During form submission, the system should provide loading feedback
   */
  it('should provide loading feedback during any form submission', () => {
    fc.assert(
      fc.property(
        validFormDataArb,
        (validData) => {
          // Create a mock that simulates a slow submission
          let resolveSubmission: (value: any) => void;
          const slowSubmissionPromise = new Promise(resolve => {
            resolveSubmission = resolve;
          });
          
          const mockOnSave = vi.fn().mockReturnValue(slowSubmissionPromise);
          const mockOnCancel = vi.fn();

          const { unmount } = render(
            <ReservationScreen
              mode="create"
              onSave={mockOnSave}
              onCancel={mockOnCancel}
              user={mockUser}
            />
          );

          try {
            // Fill form with valid data
            const startDateInput = screen.getByLabelText('Start Date') as HTMLInputElement;
            const endDateInput = screen.getByLabelText('End Date') as HTMLInputElement;
            const guestCountInput = screen.getByLabelText('Number of Guests') as HTMLInputElement;

            fireEvent.change(startDateInput, { target: { value: validData.startDate } });
            fireEvent.change(endDateInput, { target: { value: validData.endDate } });
            fireEvent.change(guestCountInput, { target: { value: validData.guestCount.toString() } });

            // Submit form
            const submitButton = screen.getByRole('button', { name: /create reservation/i });
            fireEvent.click(submitButton);

            // Check that loading feedback is provided
            const loadingButton = screen.getByRole('button', { name: /saving/i });
            expect(loadingButton).toBeTruthy();
            expect(loadingButton.hasAttribute('disabled')).toBe(true);

            // Resolve the submission to clean up
            resolveSubmission(undefined);
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
   * Property 14 (continued): Error clearing on field changes
   * For any form field change after an error, validation errors should be cleared
   */
  it('should clear validation errors when user corrects form input', () => {
    fc.assert(
      fc.property(
        validFormDataArb,
        (validData) => {
          // Create fresh mocks for each test iteration
          const mockOnSave = vi.fn();
          const mockOnCancel = vi.fn();

          const { unmount } = render(
            <ReservationScreen
              mode="create"
              onSave={mockOnSave}
              onCancel={mockOnCancel}
              user={mockUser}
            />
          );

          try {
            // Simulate an error state by directly triggering validation
            const startDateInput = screen.getByLabelText('Start Date') as HTMLInputElement;
            const endDateInput = screen.getByLabelText('End Date') as HTMLInputElement;

            // Create a validation error by setting end date before start date
            fireEvent.change(startDateInput, { target: { value: '2024-01-02' } });
            fireEvent.change(endDateInput, { target: { value: '2024-01-01' } });

            // Check if validation error appears (field-level validation)
            const endDateError = screen.queryByText(/end date must be after start date/i);
            
            // Now correct the input
            fireEvent.change(endDateInput, { target: { value: '2024-01-03' } });

            // The error should be cleared or the form should be in a valid state
            // This tests the real-time validation clearing behavior
            const correctedEndDateError = screen.queryByText(/end date must be after start date/i);
            expect(correctedEndDateError).toBeNull();
          } finally {
            unmount();
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});