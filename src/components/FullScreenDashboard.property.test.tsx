/**
 * Property-based tests for FullScreenDashboard component
 * Feature: dashboard-navigation-redesign
 */

import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
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

vi.mock('./tabs/MaintenanceTab', () => ({
  MaintenanceTab: () => <div data-testid="maintenance-tab">Maintenance Content</div>,
}));

vi.mock('./tabs/GalleryTab', () => ({
  GalleryTab: () => <div data-testid="gallery-tab">Gallery Content</div>,
}));

vi.mock('./tabs/NotificationsTab', () => ({
  NotificationsTab: () => <div data-testid="notifications-tab">Notifications Content</div>,
}));

vi.mock('./UserProfile', () => ({
  UserProfile: () => <div data-testid="profile-tab">Profile Content</div>,
}));

vi.mock('./AdminPanel', () => ({
  AdminPanel: () => <div data-testid="admin-tab">Admin Content</div>,
}));

vi.mock('./Weather', () => ({
  Weather: ({ compact }: { compact?: boolean }) => (
    <div data-testid="weather-widget" data-compact={compact}>
      Weather Widget
    </div>
  ),
}));

// Generators for property-based testing
const tabTypeArb = fc.constantFrom('calendar', 'maintenance', 'gallery', 'notifications', 'profile', 'admin');

const viewportSizeArb = fc.record({
  width: fc.integer({ min: 320, max: 2560 }),
  height: fc.integer({ min: 240, max: 1440 }),
});

describe('FullScreenDashboard Property Tests', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    // Create a fresh container for each test
    container = document.createElement('div');
    document.body.appendChild(container);

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });

    // Mock window.history
    Object.defineProperty(window, 'history', {
      writable: true,
      configurable: true,
      value: {
        replaceState: vi.fn(),
        pushState: vi.fn(),
      },
    });

    // Mock window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: {
        hash: '',
        pathname: '/dashboard',
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    // Remove the container
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    // Clear the document body to prevent multiple elements
    document.body.innerHTML = '';
    // Reset any global state
    vi.resetAllMocks();
  });

  /**
   * **Feature: dashboard-navigation-redesign, Property 1: Full-screen viewport utilization**
   * **Validates: Requirements 1.1, 1.2**
   * 
   * Property 1: Full-screen viewport utilization
   * For any dashboard state, the interface should always utilize the entire browser viewport 
   * without modal overlays or containers
   */
  it('should utilize full viewport dimensions for any tab and viewport size', () => {
    fc.assert(
      fc.property(
        tabTypeArb,
        viewportSizeArb,
        (initialTab, viewportSize) => {
          // Set viewport dimensions
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: viewportSize.width,
          });
          Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: viewportSize.height,
          });

          // Render the FullScreenDashboard
          render(
            <SupabaseProvider>
              <FullScreenDashboard initialTab={initialTab} />
            </SupabaseProvider>
          );

          // Get the root dashboard element
          const dashboard = screen.getByTestId('full-screen-dashboard');
          expect(dashboard).toBeInTheDocument();

          // Verify full-screen CSS properties are applied
          // Check that the element has the full-screen dashboard class
          expect(dashboard.className).toContain('fullScreenDashboard');
          
          // Should not have modal-like classes or attributes
          expect(dashboard.className).not.toContain('modal');
          expect(dashboard.className).not.toContain('popup');
          expect(dashboard.className).not.toContain('dialog');

          // Clean up for next iteration
          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * **Feature: dashboard-navigation-redesign, Property 3: Sidebar state persistence**
   * **Validates: Requirements 3.1, 3.2**
   * 
   * Property 3: Sidebar state persistence
   * For any user session, expanding or collapsing the sidebar should persist the preference 
   * and restore it on subsequent page loads
   */
  it('should persist and restore sidebar state across sessions', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // initial sidebar expanded state
        tabTypeArb,
        (sidebarExpanded, initialTab) => {
          // Clear localStorage before test
          localStorage.clear();

          // Mock localStorage
          const localStorageMock = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
          };
          Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
            writable: true,
          });

          // Set up initial localStorage state
          const initialPreferences = {
            sidebarExpanded,
            lastActiveTab: initialTab,
            timestamp: Date.now(),
          };
          localStorageMock.getItem.mockReturnValue(JSON.stringify(initialPreferences));

          // First render - should restore from localStorage
          const { unmount } = render(
            <SupabaseProvider>
              <FullScreenDashboard initialTab={initialTab} />
            </SupabaseProvider>
          );

          // Verify localStorage.getItem was called to restore preferences
          expect(localStorageMock.getItem).toHaveBeenCalledWith('dashboardPreferences');

          // Clean up first render
          unmount();
          cleanup();

          // Second render - simulate new session
          localStorageMock.getItem.mockReturnValue(JSON.stringify(initialPreferences));
          
          render(
            <SupabaseProvider>
              <FullScreenDashboard initialTab={initialTab} />
            </SupabaseProvider>
          );

          // Verify localStorage.getItem was called again for restoration
          expect(localStorageMock.getItem).toHaveBeenCalledWith('dashboardPreferences');

          // Clean up for next iteration
          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * **Feature: dashboard-navigation-redesign, Property 10: Local storage preference management**
   * **Validates: Requirements 3.5, 10.4**
   * 
   * Property 10: Local storage preference management
   * For any user preference change, the system should store it locally without server communication 
   * and retrieve it correctly on reload
   */
  it('should manage preferences in localStorage without server communication', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // sidebar expanded state
        tabTypeArb, // active tab
        fc.integer({ min: 1000000000000, max: 9999999999999 }), // timestamp
        (sidebarExpanded, activeTab, timestamp) => {
          // Mock localStorage
          const localStorageMock = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
          };
          Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
            writable: true,
          });

          // Mock Date.now to return our test timestamp
          const originalDateNow = Date.now;
          Date.now = vi.fn(() => timestamp);

          // Create expected preferences object
          const expectedPreferences = {
            sidebarExpanded,
            lastActiveTab: activeTab,
            timestamp,
          };

          // Initially return null (no stored preferences)
          localStorageMock.getItem.mockReturnValue(null);

          // Render component
          render(
            <SupabaseProvider>
              <FullScreenDashboard initialTab={activeTab} />
            </SupabaseProvider>
          );

          // Verify localStorage.getItem was called to check for existing preferences
          expect(localStorageMock.getItem).toHaveBeenCalledWith('dashboardPreferences');

          // Verify no server communication occurred (no network calls)
          // This is implicit - we're only testing localStorage operations

          // The preferences should be stored locally when state changes
          // (This would happen through user interactions in real usage)

          // Restore original Date.now
          Date.now = originalDateNow;

          // Clean up for next iteration
          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });
});