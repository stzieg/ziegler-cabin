import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorDisplay, NetworkErrorDisplay, SessionExpiredDisplay } from './ErrorDisplay';
import { ErrorType, type AppError } from '../utils/errorHandling';

describe('ErrorDisplay', () => {
  const mockError: AppError = {
    type: ErrorType.AUTHENTICATION_ERROR,
    message: 'Invalid credentials',
    userMessage: 'Invalid email or password. Please check your credentials and try again.',
    retryable: false,
    timestamp: new Date('2023-01-01T00:00:00Z'),
  };

  it('should render error message', () => {
    render(<ErrorDisplay error={mockError} />);
    
    expect(screen.getByText('Invalid email or password. Please check your credentials and try again.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should render nothing when error is null', () => {
    const { container } = render(<ErrorDisplay error={null} />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should handle string errors', () => {
    render(<ErrorDisplay error="Simple error message" />);
    
    expect(screen.getByText('Simple error message')).toBeInTheDocument();
  });

  it('should show retry button for retryable errors', () => {
    const retryableError: AppError = {
      ...mockError,
      type: ErrorType.NETWORK_ERROR,
      retryable: true,
    };
    const onRetry = vi.fn();

    render(<ErrorDisplay error={retryableError} onRetry={onRetry} />);
    
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should not show retry button for non-retryable errors', () => {
    const onRetry = vi.fn();

    render(<ErrorDisplay error={mockError} onRetry={onRetry} />);
    
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  it('should show dismiss button when onDismiss is provided', () => {
    const onDismiss = vi.fn();

    render(<ErrorDisplay error={mockError} onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByText('Dismiss');
    expect(dismissButton).toBeInTheDocument();
    
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should apply correct CSS classes based on error type', () => {
    const networkError: AppError = {
      ...mockError,
      type: ErrorType.NETWORK_ERROR,
    };

    const { rerender } = render(<ErrorDisplay error={networkError} />);
    const alertElement = screen.getByRole('alert');
    expect(alertElement.className).toContain('warning');

    const sessionError: AppError = {
      ...mockError,
      type: ErrorType.SESSION_EXPIRED,
    };

    rerender(<ErrorDisplay error={sessionError} />);
    expect(screen.getByRole('alert').className).toContain('info');

    rerender(<ErrorDisplay error={mockError} />);
    expect(screen.getByRole('alert').className).toContain('error');
  });

  it('should show appropriate icons for different error types', () => {
    const networkError: AppError = {
      ...mockError,
      type: ErrorType.NETWORK_ERROR,
    };

    render(<ErrorDisplay error={networkError} />);
    expect(screen.getByText('🌐')).toBeInTheDocument();
  });

  it('should show technical details in development mode', () => {
    // Mock development environment
    const originalEnv = import.meta.env.DEV;
    (import.meta.env as any).DEV = true;

    const errorWithDetails: AppError = {
      ...mockError,
      originalError: new Error('Original error message'),
    };

    render(<ErrorDisplay error={errorWithDetails} showDetails={true} />);
    
    expect(screen.getByText('Technical Details (Development Only)')).toBeInTheDocument();
    
    // Click to expand details
    fireEvent.click(screen.getByText('Technical Details (Development Only)'));
    
    expect(screen.getByText('Type:')).toBeInTheDocument();
    expect(screen.getByText('AUTHENTICATION_ERROR')).toBeInTheDocument();
    expect(screen.getByText('Retryable:')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();

    // Restore environment
    (import.meta.env as any).DEV = originalEnv;
  });

  it('should apply custom className', () => {
    render(<ErrorDisplay error={mockError} className="custom-class" />);
    
    expect(screen.getByRole('alert')).toHaveClass('custom-class');
  });
});

describe('NetworkErrorDisplay', () => {
  it('should render network error with retry button', () => {
    const onRetry = vi.fn();
    
    render(<NetworkErrorDisplay onRetry={onRetry} />);
    
    expect(screen.getByText('Unable to connect to the server. Please check your internet connection and try again.')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('🌐')).toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    
    render(<NetworkErrorDisplay onRetry={onRetry} />);
    
    fireEvent.click(screen.getByText('Try Again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should show dismiss button when onDismiss is provided', () => {
    const onDismiss = vi.fn();
    
    render(<NetworkErrorDisplay onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByText('Dismiss');
    expect(dismissButton).toBeInTheDocument();
    
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('SessionExpiredDisplay', () => {
  it('should render session expired error', () => {
    render(<SessionExpiredDisplay />);
    
    expect(screen.getByText('Your session has expired. Please sign in again to continue.')).toBeInTheDocument();
    expect(screen.getByText('⏰')).toBeInTheDocument();
  });

  it('should show sign in button when onSignIn is provided', () => {
    const onSignIn = vi.fn();
    
    render(<SessionExpiredDisplay onSignIn={onSignIn} />);
    
    const signInButton = screen.getByText('Try Again');
    expect(signInButton).toBeInTheDocument();
    
    fireEvent.click(signInButton);
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('should show dismiss button when onDismiss is provided', () => {
    const onDismiss = vi.fn();
    
    render(<SessionExpiredDisplay onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByText('Dismiss');
    expect(dismissButton).toBeInTheDocument();
    
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should not show retry button for session expired errors', () => {
    render(<SessionExpiredDisplay />);
    
    // Session expired errors are not retryable, so no "Try Again" button should appear
    // unless onSignIn is provided (which changes the button text)
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });
});