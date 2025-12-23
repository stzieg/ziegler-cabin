import React, { useState, useEffect, useRef, useCallback } from 'react';
import { InputField } from './InputField';
import { validateEmail, validatePassword, type FormErrors, debounce } from '../utils';
import { useAuth } from '../contexts/SupabaseProvider';
import { useKeyboardAccessibility } from '../hooks/useKeyboardAccessibility';
import type { LoginData } from '../types/supabase';
import styles from './LoginForm.module.css';

export interface LoginFormProps {
  onSubmit: (data: LoginData) => Promise<void>;
  onSwitchToRegister: () => void;
  isLoading?: boolean;
  error?: string;
}

interface LoginFormState {
  formData: LoginData;
  errors: Pick<FormErrors, 'email' | 'password'>;
  touched: Partial<Record<keyof LoginData, boolean>>;
  isSubmitted: boolean;
}

/**
 * LoginForm component for user authentication
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export const LoginForm: React.FC<LoginFormProps> = ({ 
  onSubmit, 
  onSwitchToRegister,
  isLoading = false,
  error
}) => {
  const { signIn } = useAuth();
  const containerRef = useRef<HTMLFormElement>(null);
  useKeyboardAccessibility({
    containerRef: containerRef as React.RefObject<HTMLElement>,
    scrollOffset: 120,
    autoHandle: true,
  });
  
  const [state, setState] = useState<LoginFormState>({
    formData: {
      email: '',
      password: '',
    },
    errors: {},
    touched: {},
    isSubmitted: false,
  });

  const firstInputRef = useRef<HTMLInputElement>(null);

  /**
   * Set focus to first input on mount for keyboard accessibility
   * Requirement 3.1
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      firstInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  /**
   * Validate login form data
   */
  const validateLoginForm = (formData: LoginData) => {
    const errors: Pick<FormErrors, 'email' | 'password'> = {};

    const emailResult = validateEmail(formData.email);
    if (!emailResult.isValid) {
      errors.email = emailResult.message;
    }

    const passwordResult = validatePassword(formData.password);
    if (!passwordResult.isValid) {
      errors.password = passwordResult.message;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  /**
   * Debounced validation function (300ms delay)
   */
  const debouncedValidate = useCallback(
    debounce((formData: LoginData) => {
      const { errors } = validateLoginForm(formData);
      setState((prev) => ({
        ...prev,
        errors,
      }));
    }, 300),
    []
  );

  /**
   * Handle input changes and update form state
   */
  const handleChange = (field: keyof LoginData) => (value: string) => {
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
   * Requirements: 3.2, 3.3
   */
  const handleBlur = (field: keyof LoginData) => () => {
    setState((prev) => {
      const newTouched = {
        ...prev.touched,
        [field]: true,
      };

      // Validate the form immediately on blur
      const { errors } = validateLoginForm(prev.formData);

      return {
        ...prev,
        touched: newTouched,
        errors,
      };
    });
  };

  /**
   * Handle keyboard events for accessibility
   * Requirements: 3.1
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  /**
   * Handle form submission
   * Requirements: 3.2, 3.3, 3.4
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    const allTouched: Partial<Record<keyof LoginData, boolean>> = {
      email: true,
      password: true,
    };

    // Validate the form
    const { isValid, errors } = validateLoginForm(state.formData);

    setState((prev) => ({
      ...prev,
      touched: allTouched,
      errors,
    }));

    // Prevent submission when validation fails (Requirement 3.3)
    if (!isValid) {
      return;
    }

    try {
      // Authenticate with Supabase (Requirement 3.2)
      await signIn(state.formData.email, state.formData.password);

      // Call parent onSubmit handler (Requirement 3.4)
      await onSubmit(state.formData);

      // Mark as successfully submitted
      setState(prev => ({
        ...prev,
        isSubmitted: true,
      }));
    } catch (error: any) {
      console.error('Login error:', error);
      // Display authentication error (Requirement 3.3)
      setState(prev => ({
        ...prev,
        errors: { ...prev.errors, password: error.message || 'Invalid email or password' },
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
      aria-label="Login form"
    >
      <h2 className={styles.title} id="form-title">Welcome Back</h2>
      
      {/* Display authentication error from parent component (Requirement 3.3) */}
      {error && (
        <div className={styles.errorMessage} role="alert" aria-live="polite">
          {error}
        </div>
      )}

      {state.isSubmitted && (
        <div className={styles.successMessage} role="status" aria-live="polite">
          Login successful! Redirecting...
        </div>
      )}

      <div className={styles.formFields}>
        <InputField
          ref={firstInputRef}
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
          placeholder="Enter your password"
          required
        />
      </div>

      <button
        type="submit"
        className={styles.submitButton}
        disabled={isLoading}
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>

      <div className={styles.switchForm}>
        <p>Don't have an account?</p>
        <button
          type="button"
          className={styles.switchButton}
          onClick={onSwitchToRegister}
        >
          Register with Invitation
        </button>
      </div>
    </form>
  );
};
