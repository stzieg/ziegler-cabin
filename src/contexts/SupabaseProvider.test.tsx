import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { SupabaseProvider, useAuth } from './SupabaseProvider';
import { supabase } from '../utils/supabase';

// Mock Supabase client
vi.mock('../utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
  getCurrentUser: vi.fn(),
  getCurrentSession: vi.fn(),
  getUserProfile: vi.fn(),
}));

// Test component that uses the auth context
const TestComponent: React.FC = () => {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="loading">{auth.loading.toString()}</div>
      <div data-testid="user">{auth.user ? 'authenticated' : 'unauthenticated'}</div>
      <div data-testid="error">{auth.error || 'no-error'}</div>
    </div>
  );
};

describe('SupabaseProvider', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Default mock implementations
    const mockSubscription = { unsubscribe: vi.fn() };
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: mockSubscription }
    });
    
    // Mock the utility functions that are actually called
    const { getCurrentSession, getUserProfile } = await import('../utils/supabase');
    (getCurrentSession as any).mockResolvedValue(null);
    (getUserProfile as any).mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('should initialize Supabase connection and set up auth state listener', async () => {
    render(
      <SupabaseProvider>
        <TestComponent />
      </SupabaseProvider>
    );

    // Wait for initialization to complete
    await waitFor(() => {
      const loadingElement = screen.getByTestId('loading');
      expect(loadingElement.textContent).toBe('false');
    }, { timeout: 2000 });

    // Verify that Supabase auth methods were called during initialization
    const { getCurrentSession } = await import('../utils/supabase');
    expect(getCurrentSession).toHaveBeenCalled();
    expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();

    // Verify the auth state change listener was set up with a callback
    const onAuthStateChangeCall = (supabase.auth.onAuthStateChange as any).mock.calls[0];
    expect(onAuthStateChangeCall).toBeDefined();
    expect(typeof onAuthStateChangeCall[0]).toBe('function');

    // Verify initial state
    const userElement = screen.getByTestId('user');
    expect(userElement.textContent).toBe('unauthenticated');

    const errorElement = screen.getByTestId('error');
    expect(errorElement.textContent).toBe('no-error');
  });

  it('should handle initialization errors gracefully', async () => {
    // Mock getCurrentSession to throw an error
    const { getCurrentSession } = await import('../utils/supabase');
    (getCurrentSession as any).mockRejectedValue(new Error('Network error'));

    render(
      <SupabaseProvider>
        <TestComponent />
      </SupabaseProvider>
    );

    // Wait for error handling to complete
    await waitFor(() => {
      const loadingElement = screen.getByTestId('loading');
      expect(loadingElement.textContent).toBe('false');
    }, { timeout: 2000 });

    // Verify that initialization was attempted
    expect(getCurrentSession).toHaveBeenCalled();
    expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();

    // Verify error state is set appropriately
    const errorElement = screen.getByTestId('error');
    expect(errorElement.textContent).toContain('Failed to initialize authentication');

    // Verify user remains unauthenticated on error
    const userElement = screen.getByTestId('user');
    expect(userElement.textContent).toBe('unauthenticated');
  });

  it('should establish session when valid session exists', async () => {
    const mockSession = {
      user: { id: 'test-user-id', email: 'test@example.com' },
      access_token: 'mock-token',
      refresh_token: 'mock-refresh-token',
    };

    const mockProfile = {
      id: 'test-user-id',
      first_name: 'Test',
      last_name: 'User',
      phone_number: null,
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { getCurrentSession, getUserProfile } = await import('../utils/supabase');
    (getCurrentSession as any).mockResolvedValue(mockSession);
    (getUserProfile as any).mockResolvedValue(mockProfile);

    render(
      <SupabaseProvider>
        <TestComponent />
      </SupabaseProvider>
    );

    // Wait for session establishment
    await waitFor(() => {
      const userElement = screen.getByTestId('user');
      expect(userElement.textContent).toBe('authenticated');
    }, { timeout: 2000 });

    // Verify session was loaded
    expect(getCurrentSession).toHaveBeenCalled();
    expect(getUserProfile).toHaveBeenCalledWith('test-user-id');

    // Verify no errors occurred
    const errorElement = screen.getByTestId('error');
    expect(errorElement.textContent).toBe('no-error');
  });

  it('should handle expired sessions appropriately', async () => {
    // Mock session retrieval returning null (expired session cleared by Supabase)
    const { getCurrentSession } = await import('../utils/supabase');
    (getCurrentSession as any).mockResolvedValue(null);

    render(
      <SupabaseProvider>
        <TestComponent />
      </SupabaseProvider>
    );

    // Wait for initialization to complete
    await waitFor(() => {
      const loadingElement = screen.getByTestId('loading');
      expect(loadingElement.textContent).toBe('false');
    }, { timeout: 2000 });

    // Verify session was checked
    expect(getCurrentSession).toHaveBeenCalled();

    // Verify user is not authenticated (expired session)
    const userElement = screen.getByTestId('user');
    expect(userElement.textContent).toBe('unauthenticated');

    // Verify no errors occurred (expired sessions are handled gracefully)
    const errorElement = screen.getByTestId('error');
    expect(errorElement.textContent).toBe('no-error');
  });

  it('should throw error when useAuth is used outside SupabaseProvider', () => {
    const TestComponentOutsideProvider: React.FC = () => {
      useAuth(); // This should throw
      return <div>Should not render</div>;
    };

    expect(() => {
      render(<TestComponentOutsideProvider />);
    }).toThrow('useAuth must be used within a SupabaseProvider');
  });
});