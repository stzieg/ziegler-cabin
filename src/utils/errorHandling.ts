import { AuthError, PostgrestError } from '@supabase/supabase-js';

// Error types for comprehensive error handling
export const ErrorType = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  SUPABASE_CONNECTION_ERROR: 'SUPABASE_CONNECTION_ERROR',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorType = typeof ErrorType[keyof typeof ErrorType];

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error | AuthError | PostgrestError;
  userMessage: string;
  retryable: boolean;
  timestamp: Date;
}

/**
 * Create a standardized error object
 */
export const createAppError = (
  type: ErrorType,
  message: string,
  originalError?: Error | AuthError | PostgrestError,
  userMessage?: string
): AppError => {
  return {
    type,
    message,
    originalError,
    userMessage: userMessage || getUserFriendlyMessage(type, message),
    retryable: isRetryableError(type),
    timestamp: new Date(),
  };
};

/**
 * Get user-friendly error messages based on error type
 */
export const getUserFriendlyMessage = (type: ErrorType, message: string): string => {
  switch (type) {
    case ErrorType.NETWORK_ERROR:
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    
    case ErrorType.SUPABASE_CONNECTION_ERROR:
      return 'Connection to our services is temporarily unavailable. Please try again in a moment.';
    
    case ErrorType.SESSION_EXPIRED:
      return 'Your session has expired. Please sign in again to continue.';
    
    case ErrorType.AUTHENTICATION_ERROR:
      if (message.toLowerCase().includes('invalid login credentials')) {
        return 'Invalid email or password. Please check your credentials and try again.';
      }
      if (message.toLowerCase().includes('email not confirmed')) {
        return 'Please check your email and click the confirmation link before signing in.';
      }
      if (message.toLowerCase().includes('user not found')) {
        return 'No account found with this email address. Please check your email or register for a new account.';
      }
      return 'Authentication failed. Please check your credentials and try again.';
    
    case ErrorType.VALIDATION_ERROR:
      return message; // Validation errors are already user-friendly
    
    case ErrorType.PERMISSION_ERROR:
      return 'You do not have permission to perform this action.';
    
    case ErrorType.UNKNOWN_ERROR:
    default:
      return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  }
};

/**
 * Determine if an error is retryable
 */
export const isRetryableError = (type: ErrorType): boolean => {
  switch (type) {
    case ErrorType.NETWORK_ERROR:
    case ErrorType.SUPABASE_CONNECTION_ERROR:
    case ErrorType.SESSION_EXPIRED:
      return true;
    
    case ErrorType.AUTHENTICATION_ERROR:
    case ErrorType.VALIDATION_ERROR:
    case ErrorType.PERMISSION_ERROR:
    case ErrorType.UNKNOWN_ERROR:
    default:
      return false;
  }
};

/**
 * Classify errors based on their characteristics
 */
export const classifyError = (error: any): ErrorType => {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return ErrorType.NETWORK_ERROR;
  }
  
  if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
    return ErrorType.NETWORK_ERROR;
  }

  // Supabase connection errors
  if (error.message?.includes('Failed to fetch') || 
      error.message?.includes('NetworkError') ||
      error.message?.includes('ERR_NETWORK') ||
      error.message?.includes('ERR_INTERNET_DISCONNECTED')) {
    return ErrorType.SUPABASE_CONNECTION_ERROR;
  }

  // Session expiration errors
  if (error.message?.includes('JWT expired') ||
      error.message?.includes('refresh_token_not_found') ||
      error.message?.includes('invalid_token') ||
      error.status === 401) {
    return ErrorType.SESSION_EXPIRED;
  }

  // Authentication errors
  if (error.message?.includes('Invalid login credentials') ||
      error.message?.includes('Email not confirmed') ||
      error.message?.includes('User not found') ||
      error.message?.includes('Signup not allowed') ||
      error.status === 400) {
    return ErrorType.AUTHENTICATION_ERROR;
  }

  // Permission errors
  if (error.status === 403 || 
      error.message?.includes('insufficient_privilege') ||
      error.message?.includes('permission denied')) {
    return ErrorType.PERMISSION_ERROR;
  }

  // Validation errors (PostgrestError with specific codes)
  if (error.code === '23505' || // unique_violation
      error.code === '23502' || // not_null_violation
      error.code === '23514' || // check_violation
      error.message?.includes('violates')) {
    return ErrorType.VALIDATION_ERROR;
  }

  return ErrorType.UNKNOWN_ERROR;
};

/**
 * Process and standardize any error
 */
export const processError = (error: any, context?: string): AppError => {
  const type = classifyError(error);
  const message = error.message || 'Unknown error occurred';
  const contextMessage = context ? `${context}: ${message}` : message;
  
  return createAppError(type, contextMessage, error);
};

/**
 * Log errors for debugging with appropriate level
 */
export const logError = (appError: AppError, context?: string): void => {
  const logContext = context ? `[${context}]` : '';
  const logMessage = `${logContext} ${appError.type}: ${appError.message}`;
  
  // Log with appropriate level based on error type
  switch (appError.type) {
    case ErrorType.NETWORK_ERROR:
    case ErrorType.SUPABASE_CONNECTION_ERROR:
      console.warn(logMessage, appError.originalError);
      break;
    
    case ErrorType.SESSION_EXPIRED:
      console.info(logMessage, appError.originalError);
      break;
    
    case ErrorType.AUTHENTICATION_ERROR:
    case ErrorType.VALIDATION_ERROR:
      console.warn(logMessage, appError.originalError);
      break;
    
    case ErrorType.PERMISSION_ERROR:
    case ErrorType.UNKNOWN_ERROR:
    default:
      console.error(logMessage, appError.originalError);
      break;
  }

  // In development, also log the full error details
  if (import.meta.env.DEV) {
    console.group(`Error Details - ${appError.type}`);
    console.log('Timestamp:', appError.timestamp.toISOString());
    console.log('User Message:', appError.userMessage);
    console.log('Retryable:', appError.retryable);
    console.log('Original Error:', appError.originalError);
    console.groupEnd();
  }
};

/**
 * Retry mechanism for retryable operations
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  context?: string
): Promise<T> => {
  let lastError: AppError | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const appError = processError(error, context);
      lastError = appError;
      
      logError(appError, `Attempt ${attempt}/${maxRetries}`);
      
      // Don't retry if error is not retryable
      if (!appError.retryable) {
        throw appError;
      }
      
      // Don't delay on the last attempt
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  // All retries exhausted
  if (lastError) {
    logError(lastError, `All ${maxRetries} attempts failed`);
    throw lastError;
  }
  
  throw createAppError(ErrorType.UNKNOWN_ERROR, 'Retry mechanism failed unexpectedly');
};

/**
 * Check if the current environment has network connectivity
 */
export const checkNetworkConnectivity = async (): Promise<boolean> => {
  try {
    // Try to fetch a small resource to check connectivity
    const response = await fetch('/vite.svg', { 
      method: 'HEAD',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Network recovery utility
 */
export const waitForNetworkRecovery = async (
  maxWaitTime: number = 30000, // 30 seconds
  checkInterval: number = 2000  // 2 seconds
): Promise<boolean> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    if (await checkNetworkConnectivity()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  return false;
};