import React, { useState } from 'react';
import { InputField } from './InputField';
import { validateEmail } from '../utils/validation';
import { emailService } from '../utils/emailService';
import styles from './EmailTester.module.css';

export interface EmailTesterProps {
  className?: string;
}

interface EmailTesterState {
  email: string;
  error: string | null;
  touched: boolean;
  isSubmitting: boolean;
  successMessage: string | null;
  lastResult: any;
}

/**
 * EmailTester component for testing email functionality in admin panel
 */
export const EmailTester: React.FC<EmailTesterProps> = ({ className = '' }) => {
  const [state, setState] = useState<EmailTesterState>({
    email: 'samuel.t.ziegler@outlook.com', // Pre-filled for convenience
    error: null,
    touched: false,
    isSubmitting: false,
    successMessage: null,
    lastResult: null,
  });

  /**
   * Validate email input
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
   * Test email configuration
   */
  const testEmailConfig = async () => {
    console.log('🧪 Testing email configuration...');
    
    const emailError = validateEmailInput(state.email);
    
    setState(prev => ({
      ...prev,
      touched: true,
      error: emailError,
      successMessage: null,
    }));

    if (emailError) {
      return;
    }

    setState(prev => ({ ...prev, isSubmitting: true }));

    try {
      // Test the email service
      const result = await emailService.sendTestEmail(state.email);
      
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        lastResult: result,
        successMessage: result.success 
          ? `✅ Test email sent successfully! Check ${state.email} (and spam folder).`
          : null,
        error: result.success ? null : `❌ Email test failed: ${result.error}`,
      }));

    } catch (error: any) {
      console.error('Email test error:', error);
      
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        error: `❌ Email test failed: ${error.message || 'Unknown error'}`,
        lastResult: { success: false, error: error.message },
      }));
    }
  };

  /**
   * Test email service connection
   */
  const testConnection = async () => {
    setState(prev => ({ ...prev, isSubmitting: true, successMessage: null, error: null }));

    try {
      const result = await emailService.testConnection();
      
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        lastResult: result,
        successMessage: result.success 
          ? '✅ Email service connection successful!'
          : null,
        error: result.success ? null : `❌ Connection test failed: ${result.error}`,
      }));

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        error: `❌ Connection test failed: ${error.message || 'Unknown error'}`,
        lastResult: { success: false, error: error.message },
      }));
    }
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>📧 Email System Tester</h3>
        <p className={styles.description}>
          Test your email configuration and send test emails to verify everything is working.
        </p>
      </div>

      {/* Current Configuration Display */}
      <div className={styles.configInfo}>
        <h4>Current Configuration:</h4>
        <ul>
          <li><strong>Provider:</strong> {import.meta.env.VITE_EMAIL_PROVIDER || 'console'}</li>
          <li><strong>From Email:</strong> {import.meta.env.VITE_EMAIL_FROM || 'noreply@cabin.family'}</li>
          <li><strong>API Key:</strong> {import.meta.env.VITE_EMAIL_API_KEY ? '✅ Set' : '❌ Missing'}</li>
        </ul>
      </div>

      {/* Success/Error Messages */}
      {state.successMessage && (
        <div className={styles.successMessage} role="status" aria-live="polite">
          {state.successMessage}
        </div>
      )}

      {state.error && (
        <div className={styles.errorMessage} role="alert" aria-live="assertive">
          {state.error}
        </div>
      )}

      {/* Test Email Form */}
      <div className={styles.testForm}>
        <InputField
          label="Test Email Address"
          name="testEmail"
          type="email"
          value={state.email}
          error={state.error || undefined}
          touched={state.touched}
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
          placeholder="your.email@example.com"
          required
          disabled={state.isSubmitting}
        />

        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={styles.testButton}
            onClick={testEmailConfig}
            disabled={state.isSubmitting || !state.email.trim()}
          >
            {state.isSubmitting ? '📤 Sending Test Email...' : '📤 Send Test Email'}
          </button>

          <button
            type="button"
            className={styles.connectionButton}
            onClick={testConnection}
            disabled={state.isSubmitting}
          >
            {state.isSubmitting ? '🔄 Testing Connection...' : '🔄 Test Connection'}
          </button>
        </div>
      </div>

      {/* Last Result Display */}
      {state.lastResult && (
        <div className={styles.resultDisplay}>
          <h4>Last Test Result:</h4>
          <pre className={styles.resultJson}>
            {JSON.stringify(state.lastResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Help Text */}
      <div className={styles.helpText}>
        <h4>Troubleshooting:</h4>
        <ul>
          <li><strong>Console mode:</strong> Check browser console for email content</li>
          <li><strong>Resend mode:</strong> Check domain verification in Resend dashboard</li>
          <li><strong>SendGrid mode:</strong> Verify API key and sender verification</li>
          <li><strong>Network errors:</strong> Check internet connection and firewall</li>
        </ul>
      </div>
    </div>
  );
};

export default EmailTester;