import { describe, it, vi, beforeEach, afterEach, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegistrationForm } from './RegistrationForm';
import { SupabaseProvider } from '../contexts/SupabaseProvider';

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
}));

describe('RegistrationForm - Unit Tests', () => {
  const mockOnSubmit = vi.fn();
  const mockOnSwitchToLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test registration with valid invitation token
   * Requirements: 2.1, 2.2
   */
  it('should register successfully with valid invitation token', async () => {
    const { validateInvitationToken } = await import('../utils/invitations');
    const { registerWithInvitation } = await import('../utils/auth');

    const validInvitation = {
      id: 'invitation-id',
      email: 'test@example.com',
      token: 'valid-token',
      created_by: 'admin-id',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending' as const,
    };

    vi.mocked(validateInvitationToken).mockResolvedValue(validInvitation);
    vi.mocked(registerWithInvitation).mockResolvedValue();

    render(
      <SupabaseProvider>
        <RegistrationForm
          onSubmit={mockOnSubmit}
          onSwitchToLogin={mockOnSwitchToLogin}
          invitationToken="valid-token"
        />
      </SupabaseProvider>
    );

    // Wait for invitation validation and email pre-population
    await waitFor(() => {
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: 'John' }
    });
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: 'Doe' }
    });
    fireEvent.change(screen.getByLabelText(/phone number/i), {
      target: { value: '1234567890' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Password123' }
    });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    // Verify registration was called with correct data
    await waitFor(() => {
      expect(registerWithInvitation).toHaveBeenCalledWith(
        'test@example.com',
        'Password123',
        {
          first_name: 'John',
          last_name: 'Doe',
          phone_number: '1234567890',
        },
        'valid-token'
      );
    });

    // Verify onSubmit was called
    expect(mockOnSubmit).toHaveBeenCalledWith({
      firstName: 'John',
      lastName: 'Doe',
      email: 'test@example.com',
      phoneNumber: '1234567890',
      password: 'Password123',
      invitationToken: 'valid-token',
    });
  });

  /**
   * Test registration with invalid invitation token
   * Requirements: 2.3
   */
  it('should show error with invalid invitation token', async () => {
    const { validateInvitationToken } = await import('../utils/invitations');

    vi.mocked(validateInvitationToken).mockResolvedValue(null);

    render(
      <SupabaseProvider>
        <RegistrationForm
          onSubmit={mockOnSubmit}
          onSwitchToLogin={mockOnSwitchToLogin}
          invitationToken="invalid-token"
        />
      </SupabaseProvider>
    );

    // Wait for validation to complete
    await waitFor(() => {
      expect(screen.getByText(/invalid or expired invitation token/i)).toBeInTheDocument();
    });

    // Verify the submit button is disabled
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();

    // Verify onSubmit is not called when form is submitted
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  /**
   * Test registration with expired invitation token
   * Requirements: 2.4
   */
  it('should show error with expired invitation token', async () => {
    const { validateInvitationToken } = await import('../utils/invitations');

    // Mock expired invitation (returns null for expired invitations)
    vi.mocked(validateInvitationToken).mockResolvedValue(null);

    render(
      <SupabaseProvider>
        <RegistrationForm
          onSubmit={mockOnSubmit}
          onSwitchToLogin={mockOnSwitchToLogin}
          invitationToken="expired-token"
        />
      </SupabaseProvider>
    );

    // Wait for validation to complete
    await waitFor(() => {
      expect(screen.getByText(/invalid or expired invitation token/i)).toBeInTheDocument();
    });

    // Verify the submit button is disabled
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();
  });

  /**
   * Test registration without invitation token
   * Requirements: 2.1
   */
  it('should show error when no invitation token is provided', async () => {
    render(
      <SupabaseProvider>
        <RegistrationForm
          onSubmit={mockOnSubmit}
          onSwitchToLogin={mockOnSwitchToLogin}
          invitationToken=""
        />
      </SupabaseProvider>
    );

    // Wait for validation to complete
    await waitFor(() => {
      expect(screen.getByText(/registration requires a valid invitation/i)).toBeInTheDocument();
    });

    // Verify the submit button is disabled
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();
  });

  /**
   * Test form validation with invitation
   * Requirements: 2.5
   */
  it('should validate password strength requirements', async () => {
    const { validateInvitationToken } = await import('../utils/invitations');

    const validInvitation = {
      id: 'invitation-id',
      email: 'test@example.com',
      token: 'valid-token',
      created_by: 'admin-id',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending' as const,
    };

    vi.mocked(validateInvitationToken).mockResolvedValue(validInvitation);

    render(
      <SupabaseProvider>
        <RegistrationForm
          onSubmit={mockOnSubmit}
          onSwitchToLogin={mockOnSwitchToLogin}
          invitationToken="valid-token"
        />
      </SupabaseProvider>
    );

    // Wait for invitation validation
    await waitFor(() => {
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });

    // Fill out form with weak password
    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: 'John' }
    });
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: 'Doe' }
    });
    fireEvent.change(screen.getByLabelText(/phone number/i), {
      target: { value: '1234567890' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'weak' }
    });

    // Blur the password field to trigger validation
    fireEvent.blur(screen.getByLabelText(/password/i));

    // Wait for validation error
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters long/i)).toBeInTheDocument();
    });
  });

  /**
   * Test switch to login functionality
   */
  it('should call onSwitchToLogin when switch button is clicked', async () => {
    const { validateInvitationToken } = await import('../utils/invitations');

    vi.mocked(validateInvitationToken).mockResolvedValue(null);

    render(
      <SupabaseProvider>
        <RegistrationForm
          onSubmit={mockOnSubmit}
          onSwitchToLogin={mockOnSwitchToLogin}
          invitationToken=""
        />
      </SupabaseProvider>
    );

    // Click the switch to login button
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mockOnSwitchToLogin).toHaveBeenCalled();
  });
});