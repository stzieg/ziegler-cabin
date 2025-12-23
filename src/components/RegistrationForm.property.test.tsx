import { describe, it, vi, beforeEach, afterEach, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegistrationForm } from './RegistrationForm';
import { SupabaseProvider } from '../contexts/SupabaseProvider';
import * as fc from 'fast-check';

// Mock the invitation utilities
vi.mock('../utils/invitations', () => ({
  validateInvitationToken: vi.fn(),
}));

// Mock the auth utilities
vi.mock('../utils/auth', () => ({
  registerWithInvitation: vi.fn(),
}));

// Mock Supabase
vi.mock('../utils/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    },
  },
  getCurrentSession: vi.fn(() => Promise.resolve(null)),
  getUserProfile: vi.fn(() => Promise.resolve(null)),
  setupAuthStateHandler: vi.fn(() => ({ unsubscribe: vi.fn() })),
  setupSessionMonitoring: vi.fn(() => vi.fn()),
  addSessionExpirationListener: vi.fn(),
  checkSupabaseHealth: vi.fn(() => Promise.resolve(true)),
  withNetworkRecovery: vi.fn((fn) => fn()),
  removeSessionExpirationListener: vi.fn(),
}));

describe('RegistrationForm - Property-Based Tests', () => {
  const mockOnSubmit = vi.fn();
  const mockOnSwitchToLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.log to avoid noise in tests
    console.log = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * **Feature: cabin-home-page, Property 1: Valid registration creates account**
   * **Validates: Requirements 2.2**
   * 
   * Property: For any valid registration data with a valid invitation token,
   * submitting the registration form should trigger account creation
   */
  it('Property 1: Valid registration creates account', async () => {
    const { validateInvitationToken } = await import('../utils/invitations');
    const { registerWithInvitation } = await import('../utils/auth');

    fc.assert(
      fc.asyncProperty(
        // Generate simple valid data to avoid complex filtering
        fc.constantFrom('John', 'Jane', 'Bob', 'Alice', 'Charlie'),
        fc.constantFrom('Smith', 'Johnson', 'Williams', 'Brown', 'Davis'),
        fc.constantFrom('test@example.com', 'user@test.com', 'admin@site.org'),
        fc.constantFrom('1234567890', '9876543210', '5555555555'),
        fc.constantFrom('Password123', 'SecurePass1', 'MyPass456'),
        fc.uuid(),
        async (firstName, lastName, email, phoneNumber, password, invitationToken) => {
          // Mock valid invitation
          vi.mocked(validateInvitationToken).mockResolvedValue({
            id: 'invitation-id',
            email: email,
            token: invitationToken,
            created_by: 'admin-id',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending' as const,
          });

          // Mock successful registration
          vi.mocked(registerWithInvitation).mockResolvedValue();

          render(
            <SupabaseProvider>
              <RegistrationForm
                onSubmit={mockOnSubmit}
                onSwitchToLogin={mockOnSwitchToLogin}
                invitationToken={invitationToken}
              />
            </SupabaseProvider>
          );

          // Wait for invitation validation
          await waitFor(() => {
            expect(screen.getByDisplayValue(email)).toBeInTheDocument();
          }, { timeout: 3000 });

          // Fill out the form with valid data
          fireEvent.change(screen.getByLabelText(/first name/i), {
            target: { value: firstName }
          });
          fireEvent.change(screen.getByLabelText(/last name/i), {
            target: { value: lastName }
          });
          fireEvent.change(screen.getByLabelText(/phone number/i), {
            target: { value: phoneNumber }
          });
          fireEvent.change(screen.getByLabelText(/password/i), {
            target: { value: password }
          });

          // Submit the form
          fireEvent.click(screen.getByRole('button', { name: /create account/i }));

          // Wait for form submission
          await waitFor(() => {
            expect(registerWithInvitation).toHaveBeenCalledWith(
              email,
              password,
              {
                first_name: firstName,
                last_name: lastName,
                phone_number: phoneNumber,
              },
              invitationToken
            );
          }, { timeout: 3000 });

          // Verify onSubmit was called
          expect(mockOnSubmit).toHaveBeenCalledWith({
            firstName,
            lastName,
            email,
            phoneNumber,
            password,
            invitationToken,
          });
        }
      ),
      { numRuns: 10 } // Reduce runs for faster testing
    );
  });
});