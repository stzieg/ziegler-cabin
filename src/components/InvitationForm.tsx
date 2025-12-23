import React, { useState, useRef, useEffect } from 'react';
import { InputField } from './InputField';
import { validateEmail } from '../utils/validation';
import { createAndSendInvitation } from '../utils/invitations';
import type { Invitation } from '../types/supabase';
import styles from './InvitationForm.module.css';

export interface InvitationFormProps {
  onInvitationSent: (invitation: Invitation) => void;
  userId: string;
}

interface InvitationFormState {
  email: string;
  error: string | null;
  touched: boolean;
  isSubmitting: boolean;
  successMessage: string | null;
}

/**
 * InvitationForm component for admin interface
 * Requirements: 8.1, 8.2
 */
export const InvitationForm: React.FC<InvitationFormProps> = ({ 
  onInvitationSent, 
  userId 
}) => {
  const [state, setState] = useState<InvitationFormState>({
    email: '',
    error: null,
    touched: false,
    isSubmitting: false,
    successMessage: null,
  });

  const emailInputRef = useRef<HTMLInputElement>(null);

  /**
   * Set focus to email input on mount for accessibility
   * Requirement 8.1
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      emailInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  /**
   * Clear success message after 5 seconds
   */
  useEffect(() => {
    if (state.successMessage) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, successMessage: null }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.successMessage]);

  /**
   * Validate email input
   * Requirement 8.2
   */
  const validateEmailInput = (email: string) => {
    const result = validateEmail(email);
    return result.isValid ? null : result.message || 'Invalid email';
  };

  /**
   * Handle email input changes
   */
  const handleEmailChange = (value: string) => {
    setState(prev => ({
      ...prev,
      email: value,
      // Only show validation errors if the field has been blurred at least once
      error: prev.touched ? validateEmailInput(value) : null,
      successMessage: null,
    }));
  };

  /**
   * Handle email input blur
   */
  const handleEmailBlur = () => {
    setState(prev => ({
      ...prev,
      touched: true,
      error: validateEmailInput(prev.email),
    }));
  };

  /**
   * Handle form submission
   * Requirements: 8.1, 8.2
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark as touched and validate
    const emailError = validateEmailInput(state.email);
    
    setState(prev => ({
      ...prev,
      touched: true,
      error: emailError,
      successMessage: null,
    }));

    // Prevent submission if validation fails
    if (emailError) {
      return;
    }

    setState(prev => ({ ...prev, isSubmitting: true }));

    try {
      // Create and send invitation (Requirements 8.2, 8.3)
      const invitation = await createAndSendInvitation(
        state.email, 
        userId
      );
      
      // Notify parent component
      onInvitationSent(invitation);
      
      // Show success message and clear form
      setState({
        email: '',
        error: null,
        touched: false,
        isSubmitting: false,
        successMessage: `Invitation sent successfully to ${invitation.email}! They will receive an email with registration instructions.`,
      });

      // Reset focus to email input
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 100);

    } catch (error: any) {
      console.error('Error sending invitation:', error);
      
      // Handle specific error types for better user experience
      let errorMessage = 'Failed to send invitation. Please try again.';
      
      if (error.message?.includes('already has a pending invitation')) {
        errorMessage = 'This email already has a pending invitation. Please check the invitation list.';
      } else if (error.message?.includes('email')) {
        errorMessage = 'Failed to send invitation email. Please check the email address and try again.';
      } else if (error.message?.includes('network') || error.message?.includes('connection')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        error: errorMessage,
      }));
    }
  };

  /**
   * Handle keyboard events for accessibility
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <form 
      className={styles.form} 
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      noValidate
      aria-label="Send invitation form"
      aria-describedby="form-description"
    >
      <div className={styles.description} id="form-description">
        <p>Send an invitation to a family member to join the cabin management system.</p>
      </div>

      {/* Success message */}
      {state.successMessage && (
        <div 
          className={styles.successMessage} 
          role="status" 
          aria-live="polite"
          aria-atomic="true"
        >
          {state.successMessage}
        </div>
      )}

      {/* Form error message - only show after user has interacted */}
      {state.touched && state.error && !state.successMessage && (
        <div 
          className={styles.errorMessage} 
          role="alert" 
          aria-live="assertive"
          aria-atomic="true"
        >
          {state.error}
        </div>
      )}

      <fieldset className={styles.formFields}>
        <legend className="visually-hidden">Invitation Details</legend>
        <InputField
          ref={emailInputRef}
          label="Email Address"
          name="invitationEmail"
          type="email"
          value={state.email}
          error={state.error || undefined}
          touched={state.touched}
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
          placeholder="family.member@example.com"
          required
          disabled={state.isSubmitting}
          aria-describedby="email-help"
        />
        <div id="email-help" className="visually-hidden">
          Enter the email address of the person you want to invite to the cabin management system.
        </div>
      </fieldset>

      <button
        type="submit"
        className={styles.submitButton}
        disabled={state.isSubmitting || !state.email.trim()}
        aria-describedby="submit-help"
        aria-live="polite"
      >
        {state.isSubmitting ? 'Sending Invitation...' : 'Send Invitation'}
      </button>

      <div id="submit-help" className={styles.helpText}>
        The invitation will be valid for 7 days and include a registration link.
      </div>
    </form>
  );
};