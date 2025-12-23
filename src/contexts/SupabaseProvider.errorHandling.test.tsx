import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SupabaseProvider, useAuth } from './SupabaseProvider';

// Define ErrorType locally to avoid import issues in mocks
const ErrorType = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  SUPABASE_CONNECTION_ERROR: 'SUPABASE_CONNECTION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

// Mock Supabase utilities
vi.mock('../utils/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
  getCurrentSession: vi.fn(),
  getUserProfile: vi.fn(),
  setupAuthStateHandler: vi.fn(() => ({ unsubscribe: vi.fn() })),
  setupSessionMonitoring: vi.fn(() => vi.fn()),
  addSessionExpirationListener: vi.fn(),
  removeSessionExpirationListener: vi.fn(),
  withNetworkRecovery: vi.fn(),
  checkSupabaseHealth: vi.fn(),
}));

// Mock error handling utilities
vi.mock('../utils/errorHandling', () => ({
  processError: vi.fn((error, context) => ({
    type: ErrorType.NETWORK_ERROR,
    message: `${context}: ${error.message}`,
    userMessage: 'Network error occurred',
    retryable: true,
    timestamp: new Date(),
    originalError: error,
  })),
  logError: vi.fn(),
  ErrorType,
}));

// Test component to access auth context
const TestComponent = () => {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="loading">{auth.loading.toString()}</div>
      <div data-testid="error">{auth.error || 'no error'}</div>
      <div data-testid="connected">{auth.isConnected.toString()}</div>
      <div data-testid="user">{auth.user?.email || 'no user'}</div>
      <button onClick={() => auth.clearError()}>Clear Error</button>
      <button onClick={() => auth.signIn('test@example.com', 'password')}>Sign In</button>
    </div>
  );
};

describe('SupabaseProvider Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with loading state', async () => {
    const { getCurrentSession, checkSupabaseHealth } = await import('../utils/supabase');
    (getCurrentSession as any).mockResolvedValue(null);
    (checkSupabaseHealth as any).mockResolvedValue(true);

    render(
      <SupabaseProvider>
        <TestComponent />
      </SupabaseProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
  });

  it('should handle Supabase connection failures during initialization', async () => {
    const { getCurrentSession, checkSupabaseHealth, withNetworkRecovery } = await import('../utils/supabase');
    const connectionError = new Error('Connection failed');
    
    (checkSupabaseHealth as any).mockResolvedValue(false);
    (withNetworkRecovery as any).mockRejectedValue({
      type: ErrorType.SUPABASE_CONNECTION_ERROR,
      message: 'Connection failed',
      userMessage: 'Connection to our services is temporarily unavailable.',
      retryable: true,
    });

    render(
      <SupabaseProvider>
        <TestComponent />
      </SupabaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('Connection to our services is temporarily unavailable.');
    });
  });

  it('should handle network errors during sign in', async () => {
    const { getCurrentSession, checkSupabaseHealth, supabase } = await import('../utils/supabase');
    
    (getCurrentSession as any).mockResolvedValue(null);
    (checkSupabaseHealth as any).mockResolvedValue(true);
    
    const networkError = new Error('Network error');
    (supabase.auth.signInWithPassword as any).mockRejectedValue(networkError);

    render(
      <SupabaseProvider>
        <TestComponent />
      </SupabaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Trigger sign in
    const signInButton = screen.getByText('Sign In');
    signInButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Network error occurred');
      expect(screen.getByTestId('connected')).toHaveTextContent('false');
    });
  });

  it('should handle session expiration', async () => {
    const { getCurrentSession, checkSupabaseHealth, setupAuthStateHandler } = await import('../utils/supabase');
    
    (getCurrentSession as any).mockResolvedValue({
      user: { id: '123', email: 'test@example.com' },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    });
    (checkSupabaseHealth as any).mockResolvedValue(true);

    let authStateCallback: (event: string, session: any) => void;
    (setupAuthStateHandler as any).mockImplementation((callback) => {
      authStateCallback = callback;
      return { unsubscribe: vi.fn() };
    });

    render(
      <SupabaseProvider>
        <TestComponent />
      </SupabaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Simulate session expiration
    authStateCallback!('TOKEN_REFRESHED', null);

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('no user');
    });
  });

  it('should clear errors when clearError is called', async () => {
    const { getCurrentSession, checkSupabaseHealth } = await import('../utils/supabase');
    
    (getCurrentSession as any).mockResolvedValue(null);
    (checkSupabaseHealth as any).mockResolvedValue(false);

    render(
      <SupabaseProvider>
        <TestComponent />
      </SupabaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error')).not.toHaveTextContent('no error');
    });

    // Clear the error
    const clearButton = screen.getByText('Clear Error');
    clearButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('no error');
    });
  });

  it('should handle profile loading errors with network recovery', async () => {
    const { getCurrentSession, checkSupabaseHealth, withNetworkRecovery, getUserProfile } = await import('../utils/supabase');
    
    const mockSession = {
      user: { id: '123', email: 'test@example.com' },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
    
    (getCurrentSession as any).mockResolvedValue(mockSession);
    (checkSupabaseHealth as any).mockResolvedValue(true);
    
    const profileError = new Error('Profile load failed');
    (withNetworkRecovery as any).mockRejectedValue({
      type: ErrorType.NETWORK_ERROR,
      message: 'Profile load failed',
      userMessage: 'Unable to load profile data',
      retryable: true,
    });

    render(
      <SupabaseProvider>
        <TestComponent />
      </SupabaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Unable to load profile data');
      expect(screen.getByTestId('connected')).toHaveTextContent('false');
    });
  });

  it('should restore connection status on successful operations', async () => {
    const { getCurrentSession, checkSupabaseHealth, supabase } = await import('../utils/supabase');
    
    (getCurrentSession as any).mockResolvedValue(null);
    (checkSupabaseHealth as any).mockResolvedValue(false); // Start disconnected
    
    render(
      <SupabaseProvider>
        <TestComponent />
      </SupabaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('false');
    });

    // Mock successful sign in
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: { id: '123', email: 'test@example.com' } },
      error: null,
    });

    // Trigger sign in
    const signInButton = screen.getByText('Sign In');
    signInButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('true');
    });
  });

  it('should handle session monitoring cleanup', async () => {
    const { getCurrentSession, checkSupabaseHealth, setupSessionMonitoring, removeSessionExpirationListener } = await import('../utils/supabase');
    
    (getCurrentSession as any).mockResolvedValue(null);
    (checkSupabaseHealth as any).mockResolvedValue(true);
    
    const mockCleanup = vi.fn();
    (setupSessionMonitoring as any).mockReturnValue(mockCleanup);

    const { unmount } = render(
      <SupabaseProvider>
        <TestComponent />
      </SupabaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Unmount component
    unmount();

    // Verify cleanup was called
    expect(mockCleanup).toHaveBeenCalled();
    expect(removeSessionExpirationListener).toHaveBeenCalled();
  });
});