import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ErrorType,
  createAppError,
  getUserFriendlyMessage,
  isRetryableError,
  classifyError,
  processError,
  logError,
  withRetry,
  checkNetworkConnectivity,
  waitForNetworkRecovery,
} from './errorHandling';

// Mock console methods
const mockConsole = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  log: vi.fn(),
  group: vi.fn(),
  groupEnd: vi.fn(),
};

// Mock fetch for network connectivity tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('errorHandling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(console, mockConsole);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createAppError', () => {
    it('should create an error with all required properties', () => {
      const error = createAppError(
        ErrorType.NETWORK_ERROR,
        'Test error message',
        new Error('Original error'),
        'Custom user message'
      );

      expect(error.type).toBe(ErrorType.NETWORK_ERROR);
      expect(error.message).toBe('Test error message');
      expect(error.userMessage).toBe('Custom user message');
      expect(error.retryable).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.originalError).toBeInstanceOf(Error);
    });

    it('should generate user message when not provided', () => {
      const error = createAppError(
        ErrorType.AUTHENTICATION_ERROR,
        'Invalid credentials'
      );

      expect(error.userMessage).toBe('Authentication failed. Please check your credentials and try again.');
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return appropriate message for network errors', () => {
      const message = getUserFriendlyMessage(ErrorType.NETWORK_ERROR, 'Connection failed');
      expect(message).toBe('Unable to connect to the server. Please check your internet connection and try again.');
    });

    it('should return appropriate message for session expired', () => {
      const message = getUserFriendlyMessage(ErrorType.SESSION_EXPIRED, 'JWT expired');
      expect(message).toBe('Your session has expired. Please sign in again to continue.');
    });

    it('should return specific message for invalid login credentials', () => {
      const message = getUserFriendlyMessage(ErrorType.AUTHENTICATION_ERROR, 'Invalid login credentials');
      expect(message).toBe('Invalid email or password. Please check your credentials and try again.');
    });

    it('should return validation error message as-is', () => {
      const originalMessage = 'Email is required';
      const message = getUserFriendlyMessage(ErrorType.VALIDATION_ERROR, originalMessage);
      expect(message).toBe(originalMessage);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for retryable error types', () => {
      expect(isRetryableError(ErrorType.NETWORK_ERROR)).toBe(true);
      expect(isRetryableError(ErrorType.SUPABASE_CONNECTION_ERROR)).toBe(true);
      expect(isRetryableError(ErrorType.SESSION_EXPIRED)).toBe(true);
    });

    it('should return false for non-retryable error types', () => {
      expect(isRetryableError(ErrorType.AUTHENTICATION_ERROR)).toBe(false);
      expect(isRetryableError(ErrorType.VALIDATION_ERROR)).toBe(false);
      expect(isRetryableError(ErrorType.PERMISSION_ERROR)).toBe(false);
      expect(isRetryableError(ErrorType.UNKNOWN_ERROR)).toBe(false);
    });
  });

  describe('classifyError', () => {
    it('should classify network errors correctly', () => {
      const networkError = new TypeError('Failed to fetch');
      expect(classifyError(networkError)).toBe(ErrorType.NETWORK_ERROR);

      const networkError2 = { name: 'NetworkError' };
      expect(classifyError(networkError2)).toBe(ErrorType.NETWORK_ERROR);
    });

    it('should classify Supabase connection errors correctly', () => {
      const connectionError = { message: 'Failed to fetch' };
      expect(classifyError(connectionError)).toBe(ErrorType.SUPABASE_CONNECTION_ERROR);

      const networkError = { message: 'ERR_NETWORK' };
      expect(classifyError(networkError)).toBe(ErrorType.SUPABASE_CONNECTION_ERROR);
    });

    it('should classify session expiration errors correctly', () => {
      const sessionError = { message: 'JWT expired' };
      expect(classifyError(sessionError)).toBe(ErrorType.SESSION_EXPIRED);

      const tokenError = { status: 401 };
      expect(classifyError(tokenError)).toBe(ErrorType.SESSION_EXPIRED);
    });

    it('should classify authentication errors correctly', () => {
      const authError = { message: 'Invalid login credentials' };
      expect(classifyError(authError)).toBe(ErrorType.AUTHENTICATION_ERROR);

      const badRequestError = { status: 400 };
      expect(classifyError(badRequestError)).toBe(ErrorType.AUTHENTICATION_ERROR);
    });

    it('should classify permission errors correctly', () => {
      const permissionError = { status: 403 };
      expect(classifyError(permissionError)).toBe(ErrorType.PERMISSION_ERROR);

      const privilegeError = { message: 'insufficient_privilege' };
      expect(classifyError(privilegeError)).toBe(ErrorType.PERMISSION_ERROR);
    });

    it('should classify validation errors correctly', () => {
      const uniqueViolation = { code: '23505' };
      expect(classifyError(uniqueViolation)).toBe(ErrorType.VALIDATION_ERROR);

      const notNullViolation = { code: '23502' };
      expect(classifyError(notNullViolation)).toBe(ErrorType.VALIDATION_ERROR);
    });

    it('should default to unknown error for unrecognized errors', () => {
      const unknownError = { message: 'Something weird happened' };
      expect(classifyError(unknownError)).toBe(ErrorType.UNKNOWN_ERROR);
    });
  });

  describe('processError', () => {
    it('should process error and return AppError', () => {
      const originalError = new Error('Test error');
      const appError = processError(originalError, 'test context');

      expect(appError.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(appError.message).toBe('test context: Test error');
      expect(appError.originalError).toBe(originalError);
      expect(appError.userMessage).toBeTruthy();
      expect(appError.timestamp).toBeInstanceOf(Date);
    });

    it('should handle errors without context', () => {
      const originalError = new Error('Test error');
      const appError = processError(originalError);

      expect(appError.message).toBe('Test error');
    });
  });

  describe('logError', () => {
    it('should log network errors as warnings', () => {
      const appError = createAppError(ErrorType.NETWORK_ERROR, 'Network failed');
      logError(appError, 'test context');

      expect(mockConsole.warn).toHaveBeenCalledWith(
        '[test context] NETWORK_ERROR: Network failed',
        appError.originalError
      );
    });

    it('should log session expiration as info', () => {
      const appError = createAppError(ErrorType.SESSION_EXPIRED, 'Session expired');
      logError(appError);

      expect(mockConsole.info).toHaveBeenCalledWith(
        ' SESSION_EXPIRED: Session expired',
        appError.originalError
      );
    });

    it('should log unknown errors as errors', () => {
      const appError = createAppError(ErrorType.UNKNOWN_ERROR, 'Unknown error');
      logError(appError);

      expect(mockConsole.error).toHaveBeenCalledWith(
        ' UNKNOWN_ERROR: Unknown error',
        appError.originalError
      );
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const result = await withRetry(operation, 3, 100);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry retryable errors', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValue('success');

      const result = await withRetry(operation, 3, 10);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const authError = { message: 'Invalid login credentials' };
      const operation = vi.fn().mockRejectedValue(authError);

      await expect(withRetry(operation, 3, 10)).rejects.toMatchObject({
        type: ErrorType.AUTHENTICATION_ERROR,
      });

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should exhaust all retries for retryable errors', async () => {
      const networkError = new TypeError('Failed to fetch');
      const operation = vi.fn().mockRejectedValue(networkError);

      await expect(withRetry(operation, 3, 10)).rejects.toMatchObject({
        type: ErrorType.NETWORK_ERROR,
      });

      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('checkNetworkConnectivity', () => {
    it('should return true when network is available', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await checkNetworkConnectivity();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/vite.svg', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: expect.any(AbortSignal),
      });
    });

    it('should return false when network is unavailable', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await checkNetworkConnectivity();

      expect(result).toBe(false);
    });

    it('should return false when response is not ok', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const result = await checkNetworkConnectivity();

      expect(result).toBe(false);
    });
  });

  describe('waitForNetworkRecovery', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true when network recovers immediately', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const promise = waitForNetworkRecovery(10000, 2000);
      
      // Fast-forward time to trigger the first check
      await vi.advanceTimersByTimeAsync(0);
      
      const result = await promise;
      expect(result).toBe(true);
    });

    it('should return true when network recovers after some time', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({ ok: true });

      const promise = waitForNetworkRecovery(10000, 2000);
      
      // Advance through the retry attempts
      await vi.advanceTimersByTimeAsync(6000);
      
      const result = await promise;
      expect(result).toBe(true);
    });

    it('should return false when network does not recover within timeout', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const promise = waitForNetworkRecovery(5000, 2000);
      
      // Advance past the timeout
      await vi.advanceTimersByTimeAsync(6000);
      
      const result = await promise;
      expect(result).toBe(false);
    });
  });
});