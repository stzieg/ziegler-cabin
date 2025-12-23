import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FullScreenDashboard } from './FullScreenDashboard';
import { SupabaseProvider } from '../contexts/SupabaseProvider';
import type { User } from '@supabase/supabase-js';

// Mock the auth context
const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  email_confirmed_at: '2024-01-01T00:00:00Z',
  phone: null,
  confirmed_at: '2024-01-01T00:00:00Z',
  last_sign_in_at: '2024-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {},
  identities: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockProfile = {
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  is_admin: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Mock the useAuth hook
vi.mock('../contexts/SupabaseProvider', () => ({
  SupabaseProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    user: mockUser,
    profile: mockProfile,
    loading: false,
    error: null,
    session: { user: mockUser },
    isConnected: true,
    lastError: null,
    clearError: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}));

// Mock lazy-loaded components
vi.mock('./tabs/CalendarTab', () => ({
  CalendarTab: () => <div data-testid="calendar-tab">Calendar Content</div>,
}));

vi.mock('./Weather', () => ({
  Weather: ({ compact }: { compact?: boolean }) => (
    <div data-testid="weather-widget" data-compact={compact}>
      Weather Widget
    </div>
  ),
}));

describe('FullScreenDashboard', () => {
  it('should render the dashboard with basic structure', () => {
    render(
      <SupabaseProvider>
        <FullScreenDashboard />
      </SupabaseProvider>
    );

    // Check for the main dashboard element
    const dashboard = screen.getByTestId('full-screen-dashboard');
    expect(dashboard).toBeInTheDocument();

    // Check for the title
    expect(screen.getByText('Cabin Dashboard')).toBeInTheDocument();

    // Check for navigation
    expect(screen.getByRole('navigation')).toBeInTheDocument();

    // Check for main content
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});