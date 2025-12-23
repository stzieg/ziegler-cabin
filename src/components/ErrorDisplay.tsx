import React from 'react';
import { ErrorType, type AppError } from '../utils/errorHandling';
import styles from './ErrorDisplay.module.css';

export interface ErrorDisplayProps {
  error: AppError | string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

/**
 * ErrorDisplay component for showing user-friendly error messages
 * Requirements: 7.4, 5.5 - Display user-friendly error messages
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  className = '',
}) => {
  if (!error) {
    return null;
  }

  // Handle string errors (legacy support)
  const appError: AppError = typeof error === 'string' 
    ? {
        type: ErrorType.UNKNOWN_ERROR,
        message: error,
        userMessage: error,
        retryable: false,
        timestamp: new Date(),
      }
    : error;

  const getErrorIcon = (type: ErrorType): string => {
    switch (type) {
      case ErrorType.NETWORK_ERROR:
      case ErrorType.SUPABASE_CONNECTION_ERROR:
        return '🌐';
      case ErrorType.SESSION_EXPIRED:
        return '⏰';
      case ErrorType.AUTHENTICATION_ERROR:
        return '🔐';
      case ErrorType.VALIDATION_ERROR:
        return '⚠️';
      case ErrorType.PERMISSION_ERROR:
        return '🚫';
      default:
        return '❌';
    }
  };

  const getErrorSeverity = (type: ErrorType): 'error' | 'warning' | 'info' => {
    switch (type) {
      case ErrorType.NETWORK_ERROR:
      case ErrorType.SUPABASE_CONNECTION_ERROR:
        return 'warning';
      case ErrorType.SESSION_EXPIRED:
        return 'info';
      case ErrorType.AUTHENTICATION_ERROR:
      case ErrorType.VALIDATION_ERROR:
      case ErrorType.PERMISSION_ERROR:
      case ErrorType.UNKNOWN_ERROR:
      default:
        return 'error';
    }
  };

  const severity = getErrorSeverity(appError.type);
  const icon = getErrorIcon(appError.type);

  return (
    <div 
      className={`${styles.errorDisplay} ${styles[severity]} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className={styles.errorContent}>
        <div className={styles.errorHeader}>
          <span className={styles.errorIcon} aria-hidden="true">
            {icon}
          </span>
          <span className={styles.errorMessage}>
            {appError.userMessage}
          </span>
        </div>

        {showDetails && import.meta.env.DEV && (
          <details className={styles.errorDetails}>
            <summary className={styles.errorSummary}>
              Technical Details (Development Only)
            </summary>
            <div className={styles.errorDetailsContent}>
              <p><strong>Type:</strong> {appError.type}</p>
              <p><strong>Timestamp:</strong> {appError.timestamp.toLocaleString()}</p>
              <p><strong>Retryable:</strong> {appError.retryable ? 'Yes' : 'No'}</p>
              {appError.message && (
                <p><strong>Technical Message:</strong> {appError.message}</p>
              )}
              {appError.originalError && (
                <pre className={styles.errorStack}>
                  {appError.originalError.toString()}
                </pre>
              )}
            </div>
          </details>
        )}

        <div className={styles.errorActions}>
          {appError.retryable && onRetry && (
            <button
              type="button"
              className={`${styles.errorButton} ${styles.retryButton}`}
              onClick={onRetry}
            >
              Try Again
            </button>
          )}
          
          {onDismiss && (
            <button
              type="button"
              className={`${styles.errorButton} ${styles.dismissButton}`}
              onClick={onDismiss}
              aria-label="Dismiss error"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * NetworkErrorDisplay - Specialized component for network errors
 */
export const NetworkErrorDisplay: React.FC<{
  onRetry?: () => void;
  onDismiss?: () => void;
}> = ({ onRetry, onDismiss }) => {
  const networkError: AppError = {
    type: ErrorType.NETWORK_ERROR,
    message: 'Network connection failed',
    userMessage: 'Unable to connect to the server. Please check your internet connection and try again.',
    retryable: true,
    timestamp: new Date(),
  };

  return (
    <ErrorDisplay
      error={networkError}
      onRetry={onRetry}
      onDismiss={onDismiss}
    />
  );
};

/**
 * SetupRequiredDisplay - Specialized component for missing Supabase setup
 */
export const SetupRequiredDisplay: React.FC<{
  onDismiss?: () => void;
}> = ({ onDismiss }) => {
  const setupError: AppError = {
    type: ErrorType.SUPABASE_CONNECTION_ERROR,
    message: 'Supabase not configured',
    userMessage: '▼ Setup Required: This app needs Supabase credentials to function. See QUICK_START.md for setup instructions.',
    retryable: false,
    timestamp: new Date(),
  };

  return (
    <ErrorDisplay
      error={setupError}
      onDismiss={onDismiss}
      showDetails={false}
    />
  );
};

/**
 * SessionExpiredDisplay - Specialized component for session expiration
 */
export const SessionExpiredDisplay: React.FC<{
  onSignIn?: () => void;
  onDismiss?: () => void;
}> = ({ onSignIn, onDismiss }) => {
  const sessionError: AppError = {
    type: ErrorType.SESSION_EXPIRED,
    message: 'Session has expired',
    userMessage: 'Your session has expired. Please sign in again to continue.',
    retryable: true, // Make it retryable so the button shows
    timestamp: new Date(),
  };

  return (
    <ErrorDisplay
      error={sessionError}
      onRetry={onSignIn}
      onDismiss={onDismiss}
    />
  );
};