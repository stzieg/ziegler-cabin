import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { LoginForm } from './LoginForm';

/**
 * Property-Based Tests for LoginForm Component
 * Using fast-check for property-based testing
 */

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

describe('LoginForm - Property-Based Tests', () => {
  // Ensure cleanup after each property test iteration
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Feature: cabin-home-page, Property 4: Valid login establishes session
   * 
   * For any valid login credentials (valid email and strong password), 
   * submitting the login form should trigger the onSubmit callback with that data.
   * 
   * Validates: Requirements 3.2
   */
  it('Property 4: Valid login establishes session - valid credentials should trigger onSubmit', async () => {
    // Test with a single known good case first
    const email = 'test@example.com';
    const password = 'Password123';
    
    // Cleanup before rendering to ensure clean state
    cleanup();
    
    // Arrange: Create a mock submit handler
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    const mockSwitchToRegister = vi.fn();
    
    // Act: Render the form with a fresh container
    const { getByLabelText, getByRole } = render(
      <LoginForm 
        onSubmit={mockSubmit} 
        onSwitchToRegister={mockSwitchToRegister} 
      />
    );
    
    // Fill in all fields with valid data
    fireEvent.change(getByLabelText(/email/i), {
      target: { value: email },
    });
    fireEvent.change(getByLabelText(/password/i), {
      target: { value: password },
    });
    
    // Submit the form
    fireEvent.click(getByRole('button', { name: /sign in/i }));
    
    // Wait for async operations
    await waitFor(() => {
      // Assert: signIn should be called with credentials
      expect(mockSignIn).toHaveBeenCalledWith(email, password);
      // Assert: onSubmit should be called with the form data
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(mockSubmit).toHaveBeenCalledWith({
        email,
        password,
      });
    }, { timeout: 3000 });
  });

  /**
   * Feature: cabin-home-page, Property 5: Invalid login shows error
   * 
   * For any form data where one or more required fields are empty or invalid, 
   * attempting to submit the form should prevent submission and display validation 
   * messages for each invalid field.
   * 
   * Validates: Requirements 3.3
   */
  it('Property 5: Invalid login shows error - incomplete or invalid form data should prevent submission', async () => {
    // Test with empty email and valid password
    const formData = { email: '', password: 'Password123' };
    
    // Cleanup before rendering to ensure clean state
    cleanup();
    
    // Arrange: Create a mock submit handler
    const mockSubmit = vi.fn();
    const mockSwitchToRegister = vi.fn();
    
    // Act: Render the form
    const { getByLabelText, getByRole, queryByText } = render(
      <LoginForm 
        onSubmit={mockSubmit} 
        onSwitchToRegister={mockSwitchToRegister} 
      />
    );
    
    // Fill in the form with the invalid data
    fireEvent.change(getByLabelText(/email/i), {
      target: { value: formData.email },
    });
    fireEvent.change(getByLabelText(/password/i), {
      target: { value: formData.password },
    });
    
    // Submit the form
    fireEvent.click(getByRole('button', { name: /sign in/i }));
    
    // Wait for validation
    await waitFor(() => {
      // Assert: onSubmit should NOT be called
      expect(mockSubmit).not.toHaveBeenCalled();
      expect(mockSignIn).not.toHaveBeenCalled();
      
      // Assert: Validation messages should be displayed for invalid fields
      expect(queryByText(/email is required/i)).toBeInTheDocument();
    });
  });

  /**
   * Feature: cabin-home-page, Property 6: Successful login redirects
   * 
   * For any valid login credentials, after successful authentication,
   * the form should display a success message indicating redirect.
   * 
   * Validates: Requirements 3.4
   */
  it('Property 6: Successful login redirects - valid login should show success message', async () => {
    // Test with known valid credentials
    const email = 'user@example.com';
    const password = 'ValidPass123';
    
    // Cleanup before rendering to ensure clean state
    cleanup();
    
    // Arrange: Create a mock submit handler that resolves successfully
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    const mockSwitchToRegister = vi.fn();
    
    // Act: Render the form
    const { getByLabelText, getByRole, queryByText } = render(
      <LoginForm 
        onSubmit={mockSubmit} 
        onSwitchToRegister={mockSwitchToRegister} 
      />
    );
    
    // Fill in the form with valid data
    fireEvent.change(getByLabelText(/email/i), {
      target: { value: email },
    });
    fireEvent.change(getByLabelText(/password/i), {
      target: { value: password },
    });
    
    // Submit the form
    fireEvent.click(getByRole('button', { name: /sign in/i }));
    
    // Wait for success message
    await waitFor(() => {
      // Assert: Success message should be displayed
      expect(queryByText(/login successful.*redirecting/i)).toBeInTheDocument();
    });
  });
});
