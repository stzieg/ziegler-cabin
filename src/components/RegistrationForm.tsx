import React, { useState, useEffect, useRef, useCallback } from 'react';
import { InputField } from './InputField';
import { validateForm, type FormErrors, debounce } from '../utils';
import { validateInvitationToken } from '../utils/invitations';
import { registerWithInvitation } from '../utils/auth';
import { useKeyboardAccessibility } from '../hooks/useKeyboardAccessibility';
import type { RegistrationData } from '../types/supabase';
import styles from './LoginForm.module.css'; // Reuse existing styles

export interface RegistrationFormProps {
  onSubmit: (data: RegistrationData) => void;
  onSwitchToLogin: () => void;
  isLoading?: boolean;
  invitationToken?: string;
}

interface RegistrationFormState {
  formData: RegistrationData;
  errors: FormErrors & { invitationToken?: string };
  touched: Partial<Record<keyof RegistrationData, boolean>>;
  isSubmitted: boolean;
  invitationValidated: boolean;
  invitationEmail: string;
}

/**
 * RegistrationForm component for user registration with invitation validation
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */
export const RegistrationForm: React.FC<RegistrationFormProps> = ({ 
  onSubmit, 
  onSwitchToLogin,
  isLoading = false,
  invitationToken = ''
}) => {
  const [state, setState] = useState<RegistrationFormState>({
    formData: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      password: '',
      invitationToken: invitationToken,
    },
    errors: {},
    touched: {},
    isSubmitted: false,
    invitationValidated: false,
    invitationEmail: '',
  });

  const firstInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLFormElement>(null);
  useKeyboardAccessibility({
    containerRef: containerRef as React.RefObject<HTMLElement>,
    scrollOffset: 120,
    autoHandle: true,
  });

  /**
   * Validate invitation token on component mount and when token changes
   * Requirements: 2.1, 2.3, 2.4
   */
  useEffect(() => {
    const validateToken = async () => {
      if (!invitationToken) {
        setState(prev => ({
          ...prev,
          errors: { ...prev.errors, invitationToken: 'Registration requires a valid invitation' },
          invitationValidated: false,
        }));
        return;
      }

      try {
        const invitation = await validateInvitationToken(invitationToken);
        
        if (!invitation) {
          setState(prev => ({
            ...prev,
            errors: { ...prev.errors, invitationToken: 'Invalid or expired invitation token' },
            invitationValidated: false,
          }));
          return;
        }

        // Pre-populate email from invitation (Requirement 2.1)
        setState(prev => ({
          ...prev,
          formData: {
            ...prev.formData,
            email: invitation.email,
            invitationToken: invitationToken,
          },
          errors: { ...prev.errors, invitationToken: undefined },
          invitationValidated: true,
          invitationEmail: invitation.email,
        }));
      } catch (error) {
        console.error('Error validating invitation token:', error);
        setState(prev => ({
          ...prev,
          errors: { ...prev.errors, invitationToken: 'Failed to validate invitation token' },
          invitationValidated: false,
        }));
      }
    };

    validateToken();
  }, [invitationToken]);

  /**
   * Set focus to first input on mount for keyboard accessibility
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      firstInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  /**
   * Debounced validation function (300ms delay)
   */
  const debouncedValidate = useCallback(
    debounce((formData: RegistrationData) => {
      const { errors } = validateForm(formData);
      setState((prev) => ({
        ...prev,
        errors: { ...errors, invitationToken: prev.errors.invitationToken },
      }));
    }, 300),
    []
  );

  /**
   * Handle input changes and update form state
   */
  const handleChange = (field: keyof RegistrationData) => (value: string) => {
    const newFormData = {
      ...state.formData,
      [field]: value,
    };

    setState((prev) => ({
      ...prev,
      formData: newFormData,
    }));

    // Only validate if field has been touched
    if (state.touched[field]) {
      debouncedValidate(newFormData);
    }
  };

  /**
   * Handle field blur events for validation
   */
  const handleBlur = (field: keyof RegistrationData) => () => {
    setState((prev) => {
      const newTouched = {
        ...prev.touched,
        [field]: true,
      };

      // Validate the form immediately on blur
      const { errors } = validateForm(prev.formData);

      return {
        ...prev,
        touched: newTouched,
        errors: { ...errors, invitationToken: prev.errors.invitationToken },
      };
    });
  };

  /**
   * Handle keyboard events for accessibility
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  /**
   * Handle form submission
   * Requirements: 2.2, 2.3
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check invitation validation first
    if (!state.invitationValidated) {
      setState(prev => ({
        ...prev,
        errors: { ...prev.errors, invitationToken: 'Valid invitation required for registration' },
      }));
      return;
    }

    // Mark all fields as touched
    const allTouched: Partial<Record<keyof RegistrationData, boolean>> = {
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
      password: true,
      invitationToken: true,
    };

    // Validate the form
    const { isValid, errors } = validateForm(state.formData);

    setState((prev) => ({
      ...prev,
      touched: allTouched,
      errors: { ...errors, invitationToken: prev.errors.invitationToken },
    }));

    // Prevent submission when validation fails (Requirement 2.3)
    if (!isValid || !state.invitationValidated) {
      return;
    }

    try {
      // Create account with Supabase Auth and mark invitation as used (Requirement 2.2)
      const result = await registerWithInvitation(
        state.formData.email, 
        state.formData.password, 
        {
          first_name: state.formData.firstName,
          last_name: state.formData.lastName,
          phone_number: state.formData.phoneNumber,
        },
        state.formData.invitationToken
      );

      // Clear form on successful submission
      setState(prev => ({
        ...prev,
        formData: {
          firstName: '',
          lastName: '',
          email: '',
          phoneNumber: '',
          password: '',
          invitationToken: '',
        },
        errors: {},
        touched: {},
        isSubmitted: true,
      }));

      // If email confirmation is NOT required, call onSubmit to proceed
      // Otherwise, show the success message and let user check email
      if (!result.requiresEmailConfirmation) {
        onSubmit(state.formData);
      }
      // If email confirmation IS required, the success message will show
      // and user needs to check their email before they can log in
    } catch (error: any) {
      console.error('Registration error:', error);
      setState(prev => ({
        ...prev,
        errors: { ...prev.errors, invitationToken: error.message || 'Registration failed' },
      }));
    }
  };

  return (
    <form 
      ref={containerRef}
      className={styles.form} 
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      noValidate
      aria-label="Registration form"
    >
      <h2 className={styles.title} id="form-title">Join Our Cabin Family</h2>
      
      {state.errors.invitationToken && (
        <div className={styles.errorMessage} role="alert" aria-live="polite">
          {state.errors.invitationToken}
        </div>
      )}

      {state.invitationValidated && (
        <div className={styles.successMessage} role="status" aria-live="polite">
          Welcome! You're invited to register with {state.invitationEmail}
        </div>
      )}

      {state.isSubmitted && (
        <div className={styles.successMessage} role="status" aria-live="polite">
          Registration successful! Please check your email to verify your account.
        </div>
      )}

      <div className={styles.formFields}>
        <InputField
          ref={firstInputRef}
          label="First Name"
          name="firstName"
          type="text"
          value={state.formData.firstName}
          error={state.errors.firstName}
          touched={state.touched.firstName}
          onChange={handleChange('firstName')}
          onBlur={handleBlur('firstName')}
          placeholder="Enter your first name"
          required
        />

        <InputField
          label="Last Name"
          name="lastName"
          type="text"
          value={state.formData.lastName}
          error={state.errors.lastName}
          touched={state.touched.lastName}
          onChange={handleChange('lastName')}
          onBlur={handleBlur('lastName')}
          placeholder="Enter your last name"
          required
        />

        <InputField
          label="Email"
          name="email"
          type="email"
          value={state.formData.email}
          error={state.errors.email}
          touched={state.touched.email}
          onChange={handleChange('email')}
          onBlur={handleBlur('email')}
          placeholder="your.email@example.com"
          required
          disabled={state.invitationValidated} // Email is pre-populated from invitation
        />

        <InputField
          label="Phone Number"
          name="phoneNumber"
          type="tel"
          value={state.formData.phoneNumber}
          error={state.errors.phoneNumber}
          touched={state.touched.phoneNumber}
          onChange={handleChange('phoneNumber')}
          onBlur={handleBlur('phoneNumber')}
          placeholder="(555) 123-4567"
          required
        />

        <InputField
          label="Password"
          name="password"
          type="password"
          value={state.formData.password}
          error={state.errors.password}
          touched={state.touched.password}
          onChange={handleChange('password')}
          onBlur={handleBlur('password')}
          placeholder="Create a secure password"
          required
        />
      </div>

      <button
        type="submit"
        className={styles.submitButton}
        disabled={isLoading || !state.invitationValidated}
        onTouchEnd={(e) => {
          if (!isLoading && state.invitationValidated) {
            e.preventDefault();
            handleSubmit(e as unknown as React.FormEvent);
          }
        }}
      >
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </button>

      <div className={styles.switchForm}>
        <p>Already have an account?</p>
        <button
          type="button"
          className={styles.switchButton}
          onClick={onSwitchToLogin}
        >
          Sign In
        </button>
      </div>
    </form>
  );
};