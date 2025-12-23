import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from './LoginForm';

// Mock the useAuth hook
const mockSignIn = vi.fn();
const mockUseAuth = {
  signIn: mockSignIn,
  user: null,
  profile: null,
  session: null,
  loading: false,
  error: null,
  signUp: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  refreshProfile: vi.fn(),
};

vi.mock('../contexts/SupabaseProvider', () => ({
  useAuth: () => mockUseAuth,
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue(undefined);
  });

  it('should render all required fields', () => {
    const mockSubmit = vi.fn();
    const mockSwitchToRegister = vi.fn();
    
    render(
      <LoginForm onSubmit={mockSubmit} onSwitchToRegister={mockSwitchToRegister} />
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should call onSubmit with valid form data', async () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    const mockSwitchToRegister = vi.fn();
    
    render(
      <LoginForm onSubmit={mockSubmit} onSwitchToRegister={mockSwitchToRegister} />
    );

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'john.doe@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Password123' },
    });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Wait for async operations
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('john.doe@example.com', 'Password123');
      expect(mockSubmit).toHaveBeenCalledWith({
        email: 'john.doe@example.com',
        password: 'Password123',
      });
    });
  });

  it('should prevent submission with invalid data', async () => {
    const mockSubmit = vi.fn();
    const mockSwitchToRegister = vi.fn();
    
    render(
      <LoginForm onSubmit={mockSubmit} onSwitchToRegister={mockSwitchToRegister} />
    );

    // Try to submit empty form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Wait for validation
    await waitFor(() => {
      // Verify onSubmit was NOT called
      expect(mockSubmit).not.toHaveBeenCalled();
      expect(mockSignIn).not.toHaveBeenCalled();

      // Verify error messages are displayed
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('should maintain form data when validation fails', async () => {
    const mockSubmit = vi.fn();
    const mockSwitchToRegister = vi.fn();
    
    render(
      <LoginForm onSubmit={mockSubmit} onSwitchToRegister={mockSwitchToRegister} />
    );

    // Fill in partial data
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'invalid-email' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'short' },
    });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Wait for validation
    await waitFor(() => {
      // Verify form data is maintained
      expect(screen.getByLabelText(/email/i)).toHaveValue('invalid-email');
      expect(screen.getByLabelText(/password/i)).toHaveValue('short');
    });
  });

  it('should display success message after valid submission', async () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    const mockSwitchToRegister = vi.fn();
    
    render(
      <LoginForm onSubmit={mockSubmit} onSwitchToRegister={mockSwitchToRegister} />
    );

    // Verify success message is not initially displayed
    expect(screen.queryByText(/login successful/i)).not.toBeInTheDocument();

    // Fill in valid data
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'john.doe@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Password123' },
    });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/login successful.*redirecting/i)).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(/login successful.*redirecting/i);
    });
  });

  it('should display error message when authentication fails', async () => {
    const mockSubmit = vi.fn();
    const mockSwitchToRegister = vi.fn();
    
    // Mock signIn to reject with an error
    mockSignIn.mockRejectedValue(new Error('Invalid email or password'));
    
    render(
      <LoginForm onSubmit={mockSubmit} onSwitchToRegister={mockSwitchToRegister} />
    );

    // Fill in data
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'wrong@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'WrongPassword123' },
    });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });
});
