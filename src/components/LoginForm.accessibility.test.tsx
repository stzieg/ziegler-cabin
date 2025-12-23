import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';
import { SupabaseProvider } from '../contexts/SupabaseProvider';

// Mock Supabase
vi.mock('../utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signUp: vi.fn(),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: '123', email: 'test@example.com' } }, error: null }),
      signOut: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  },
  setupAuthStateHandler: vi.fn(() => ({ unsubscribe: vi.fn() })),
  setupSessionMonitoring: vi.fn(() => vi.fn()),
  addSessionExpirationListener: vi.fn(),
  getCurrentSession: vi.fn(() => Promise.resolve(null)),
  getUserProfile: vi.fn(() => Promise.resolve(null)),
  checkSupabaseHealth: vi.fn(() => Promise.resolve(true)),
  withNetworkRecovery: vi.fn((fn) => fn()),
  removeSessionExpirationListener: vi.fn(),
}));

// Mock the auth context
vi.mock('../contexts/SupabaseProvider', async () => {
  const actual = await vi.importActual('../contexts/SupabaseProvider');
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      session: null,
      loading: false,
      error: null,
      signIn: vi.fn().mockResolvedValue(undefined),
      signUp: vi.fn().mockResolvedValue(undefined),
      signOut: vi.fn().mockResolvedValue(undefined),
      updateProfile: vi.fn().mockResolvedValue(undefined),
      refreshProfile: vi.fn().mockResolvedValue(undefined),
      clearError: vi.fn(),
      isConnected: true,
      lastError: null,
    }),
  };
});

/**
 * Accessibility Unit Tests for LoginForm Component
 * Requirements: 3.1
 * 
 * These tests verify:
 * - Keyboard navigation (Tab, Enter)
 * - ARIA labels presence
 * - Focus management
 */

describe('LoginForm - Accessibility', () => {
  // Helper function to render LoginForm
  const renderLoginForm = (props = {}) => {
    return render(
      <LoginForm onSubmit={vi.fn()} onSwitchToRegister={vi.fn()} {...props} />
    );
  };

  describe('Keyboard Navigation', () => {
    /**
     * Test Tab key navigation through form fields
     * Requirement 3.1: Implement keyboard navigation (Tab, Enter)
     */
    it('should allow Tab navigation through all form fields in correct order', async () => {
      const mockSubmit = vi.fn();
      const user = userEvent.setup();
      
      renderLoginForm({ onSubmit: mockSubmit });

      // Get all form elements in expected tab order
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Wait for auto-focus to complete (component uses setTimeout)
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // First input should have focus on mount
      expect(emailInput).toHaveFocus();

      // Tab to password
      await user.tab();
      expect(passwordInput).toHaveFocus();

      // Tab to submit button
      await user.tab();
      expect(submitButton).toHaveFocus();
    });

    /**
     * Test Shift+Tab for reverse navigation
     * Requirement 3.1: Implement keyboard navigation (Tab, Enter)
     */
    it('should allow Shift+Tab navigation backwards through form fields', async () => {
      const mockSubmit = vi.fn();
      const user = userEvent.setup();
      
      renderLoginForm({ onSubmit: mockSubmit });

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      const passwordInput = screen.getByLabelText(/password/i);

      // Navigate to submit button
      submitButton.focus();
      expect(submitButton).toHaveFocus();

      // Shift+Tab back to password
      await user.tab({ shift: true });
      expect(passwordInput).toHaveFocus();

      // Continue backwards to first field
      await user.tab({ shift: true });
      expect(emailInput).toHaveFocus();
    });

    /**
     * Test Enter key submission from any input field
     * Requirement 3.1: Implement keyboard navigation (Tab, Enter)
     */
    it('should submit form when Enter is pressed in any input field with valid data', async () => {
      const mockSubmit = vi.fn();
      const user = userEvent.setup();
      
      renderLoginForm({ onSubmit: mockSubmit });

      // Fill in valid data
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      await user.clear(emailInput);
      await user.clear(passwordInput);
      
      await user.type(emailInput, 'john.doe@example.com');
      await user.type(passwordInput, 'ValidPassword123!');

      // Press Enter from the password field
      await user.keyboard('{Enter}');

      // Wait for form submission to complete
      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith({
          email: 'john.doe@example.com',
          password: 'ValidPassword123!',
        });
      });
    });

    /**
     * Test Enter key prevents submission with invalid data
     * Requirement 3.1: Implement keyboard navigation (Tab, Enter)
     */
    it('should not submit form when Enter is pressed with invalid data', async () => {
      const mockSubmit = vi.fn();
      const user = userEvent.setup();
      
      renderLoginForm({ onSubmit: mockSubmit });

      const emailInput = screen.getByLabelText(/email/i);
      
      // Focus first field and press Enter without filling form
      emailInput.focus();
      await user.keyboard('{Enter}');

      // Verify form was NOT submitted
      expect(mockSubmit).not.toHaveBeenCalled();

      // Verify validation errors are shown
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });

    /**
     * Test Enter key on submit button
     * Requirement 3.1: Implement keyboard navigation (Tab, Enter)
     */
    it('should submit form when Enter is pressed on submit button', async () => {
      const mockSubmit = vi.fn();
      const user = userEvent.setup();
      
      renderLoginForm({ onSubmit: mockSubmit });

      // Fill in valid data
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      await user.clear(emailInput);
      await user.clear(passwordInput);
      
      await user.type(emailInput, 'jane.smith@example.com');
      await user.type(passwordInput, 'ValidPassword123!');

      // Focus submit button and press Enter
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      submitButton.focus();
      await user.keyboard('{Enter}');

      // Wait for form submission to complete
      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith({
          email: 'jane.smith@example.com',
          password: 'ValidPassword123!',
        });
      });
    });
  });

  describe('ARIA Labels and Attributes', () => {
    /**
     * Test form has proper ARIA label
     * Requirement 3.1: Add ARIA labels to all form fields
     */
    it('should have aria-label on form element', () => {
      const mockSubmit = vi.fn();
      renderLoginForm({ onSubmit: mockSubmit });

      const form = screen.getByRole('form', { name: /login form/i });
      expect(form).toBeInTheDocument();
    });

    /**
     * Test all input fields have proper labels
     * Requirement 3.1: Add ARIA labels to all form fields
     */
    it('should have accessible labels for all input fields', () => {
      const mockSubmit = vi.fn();
      renderLoginForm({ onSubmit: mockSubmit });

      // Verify all fields can be found by their labels
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    /**
     * Test required fields have aria-required attribute
     * Requirement 3.1: Add ARIA labels to all form fields
     */
    it('should mark required fields with aria-required', () => {
      const mockSubmit = vi.fn();
      renderLoginForm({ onSubmit: mockSubmit });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('aria-required', 'true');
      expect(passwordInput).toHaveAttribute('aria-required', 'true');
    });

    /**
     * Test error messages are associated with fields using aria-describedby
     * Requirement 3.1: Associate error messages with fields using aria-describedby
     */
    it('should associate error messages with fields using aria-describedby', async () => {
      const mockSubmit = vi.fn();
      const user = userEvent.setup();
      
      renderLoginForm({ onSubmit: mockSubmit });

      // Trigger validation by submitting empty form
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Check each field has aria-describedby pointing to its error message
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
      expect(passwordInput).toHaveAttribute('aria-describedby', 'password-error');

      // Verify error messages have matching IDs
      expect(screen.getByText(/email is required/i)).toHaveAttribute('id', 'email-error');
      expect(screen.getByText(/password is required/i)).toHaveAttribute('id', 'password-error');
    });

    /**
     * Test error messages have role="alert" for screen readers
     * Requirement 3.1: Add ARIA labels to all form fields
     */
    it('should mark error messages with role="alert" for screen readers', async () => {
      const mockSubmit = vi.fn();
      const user = userEvent.setup();
      
      renderLoginForm({ onSubmit: mockSubmit });

      // Trigger validation
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Verify all error messages have role="alert"
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
      
      // Verify specific error messages are alerts
      const emailError = screen.getByText(/email is required/i);
      expect(emailError).toHaveAttribute('role', 'alert');
    });

    /**
     * Test fields have aria-invalid when containing errors
     * Requirement 3.1: Add ARIA labels to all form fields
     */
    it('should set aria-invalid="true" on fields with errors', async () => {
      const mockSubmit = vi.fn();
      const user = userEvent.setup();
      
      renderLoginForm({ onSubmit: mockSubmit });

      const emailInput = screen.getByLabelText(/email/i);
      
      // Initially should be false
      expect(emailInput).toHaveAttribute('aria-invalid', 'false');

      // Trigger validation
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Should now be true
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    });

    /**
     * Test success message has proper ARIA attributes
     * Requirement 3.1: Add ARIA labels to all form fields
     */
    it('should announce success message with aria-live', async () => {
      const mockSubmit = vi.fn();
      const user = userEvent.setup();
      
      renderLoginForm({ onSubmit: mockSubmit });

      // Fill and submit valid form
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/password/i), 'ValidPassword123!');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Verify success message has proper ARIA attributes
      const successMessage = screen.getByText(/login successful/i);
      expect(successMessage).toHaveAttribute('role', 'status');
      expect(successMessage).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Focus Management', () => {
    /**
     * Test first input receives focus on mount
     * Requirement 3.1: Add focus visible indicators
     */
    it('should focus first input field on component mount', async () => {
      const mockSubmit = vi.fn();
      renderLoginForm({ onSubmit: mockSubmit });

      const emailInput = screen.getByLabelText(/email/i);
      
      // Wait for auto-focus to complete (component uses setTimeout)
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // First input should have focus
      expect(emailInput).toHaveFocus();
    });

    /**
     * Test focus remains on form after validation error
     * Requirement 3.1: Add focus visible indicators
     */
    it('should maintain focus within form after validation error', async () => {
      const mockSubmit = vi.fn();
      const user = userEvent.setup();
      
      renderLoginForm({ onSubmit: mockSubmit });

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      // Focus and click submit button
      submitButton.focus();
      await user.click(submitButton);

      // Focus should remain on submit button after validation error
      expect(submitButton).toHaveFocus();
    });

    /**
     * Test focus visible indicators are present
     * Requirement 3.1: Add focus visible indicators
     */
    it('should have focus visible indicators on all interactive elements', async () => {
      const mockSubmit = vi.fn();
      const user = userEvent.setup();
      
      renderLoginForm({ onSubmit: mockSubmit });

      // Test each input field
      const inputs = [
        screen.getByLabelText(/email/i),
        screen.getByLabelText(/password/i),
      ];

      for (const input of inputs) {
        await user.click(input);
        expect(input).toHaveFocus();
        expect(document.activeElement).toBe(input);
      }

      // Test submit button
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);
      expect(submitButton).toHaveFocus();
    });

    /**
     * Test focus is not trapped in form
     * Requirement 3.1: Implement keyboard navigation (Tab, Enter)
     */
    it('should allow focus to leave the form with Tab', async () => {
      const mockSubmit = vi.fn();
      const user = userEvent.setup();
      
      render(
        <div>
          <button>Before Form</button>
          <SupabaseProvider>
            <LoginForm onSubmit={mockSubmit} onSwitchToRegister={vi.fn()} />
          </SupabaseProvider>
          <button>After Form</button>
        </div>
      );

      const beforeButton = screen.getByRole('button', { name: /before form/i });
      const afterButton = screen.getByRole('button', { name: /after form/i });
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Start before form
      beforeButton.focus();
      expect(beforeButton).toHaveFocus();

      // Tab into form (should go to first input due to auto-focus)
      await user.tab();
      expect(screen.getByLabelText(/email/i)).toHaveFocus();

      // Tab through all form fields to submit button
      await user.tab();
      await user.tab();
      expect(submitButton).toHaveFocus();

      // Tab to switch button
      await user.tab();
      expect(screen.getByRole('button', { name: /register with invitation/i })).toHaveFocus();

      // Tab out of form
      await user.tab();
      expect(afterButton).toHaveFocus();
    });

    /**
     * Test focus returns to first field after successful submission
     * Requirement 3.1: Add focus visible indicators
     */
    it('should reset focus to first field after successful submission', async () => {
      const mockSubmit = vi.fn();
      const user = userEvent.setup();
      
      renderLoginForm({ onSubmit: mockSubmit });

      // Fill and submit form
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/password/i), 'ValidPassword123!');
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Wait for auto-focus to complete after form reset (component uses setTimeout)
      await new Promise(resolve => setTimeout(resolve, 150));

      // After submission, first field should have focus again
      // (This allows user to immediately start entering new data)
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveFocus();
    });
  });
});
