import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { Dashboard, TabType } from './Dashboard';
import { SupabaseProvider } from '../contexts/SupabaseProvider';

// Mock the auth context
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2023-01-01T00:00:00Z',
};

const mockAuthContext = {
  user: mockUser,
  profile: null,
  loading: false,
  session: { user: mockUser } as any,
  isConnected: true,
  lastError: null,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  clearError: vi.fn(),
  refreshProfile: vi.fn(),
  updateProfile: vi.fn(),
};

// Mock the useAuth hook
vi.mock('../contexts/SupabaseProvider', () => ({
  SupabaseProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => mockAuthContext,
}));

// Mock the tab components to avoid lazy loading issues in tests
vi.mock('./tabs/CalendarTab', () => ({
  CalendarTab: ({ user, formState }: any) => (
    <div data-testid="calendar-tab">
      Calendar Tab - User: {user.email}
      {formState && Object.keys(formState).length > 0 && (
        <div data-testid="form-state">{JSON.stringify(formState)}</div>
      )}
    </div>
  ),
}));

vi.mock('./tabs/MaintenanceTab', () => ({
  MaintenanceTab: ({ user, formState }: any) => (
    <div data-testid="maintenance-tab">
      Maintenance Tab - User: {user.email}
      {formState && Object.keys(formState).length > 0 && (
        <div data-testid="form-state">{JSON.stringify(formState)}</div>
      )}
    </div>
  ),
}));

vi.mock('./tabs/GalleryTab', () => ({
  GalleryTab: ({ user, formState }: any) => (
    <div data-testid="gallery-tab">
      Gallery Tab - User: {user.email}
      {formState && Object.keys(formState).length > 0 && (
        <div data-testid="form-state">{JSON.stringify(formState)}</div>
      )}
    </div>
  ),
}));

vi.mock('./tabs/NotificationsTab', () => ({
  NotificationsTab: ({ user, formState }: any) => (
    <div data-testid="notifications-tab">
      Notifications Tab - User: {user.email}
      {formState && Object.keys(formState).length > 0 && (
        <div data-testid="form-state">{JSON.stringify(formState)}</div>
      )}
    </div>
  ),
}));

describe('Dashboard Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * **Feature: cabin-dashboard-expansion, Property 1: Tab State Consistency**
   * **Validates: Requirements 1.2, 1.3**
   * 
   * Property: For any tab navigation interaction, the active tab state should always match the displayed content area
   */
  it('should maintain tab state consistency across all tab interactions', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.constantFrom('calendar', 'maintenance', 'gallery', 'notifications'),
        fc.constantFrom('calendar', 'maintenance', 'gallery', 'notifications'),
        async (initialTab: TabType, targetTab: TabType) => {
          // Clean up before each property test iteration
          cleanup();
          
          // Render Dashboard with initial tab
          const { container, unmount } = render(<Dashboard initialTab={initialTab} />);
          
          try {
            // Verify initial tab is active
            const initialTabButton = container.querySelector(`#tab-${initialTab}`) as HTMLElement;
            expect(initialTabButton).toHaveAttribute('aria-selected', 'true');
            
            // Click on target tab
            const targetTabButton = container.querySelector(`#tab-${targetTab}`) as HTMLElement;
            
            // Use act to ensure React state updates are processed
            await act(async () => {
              fireEvent.click(targetTabButton);
            });
            
            // Wait for the tab state to update
            await waitFor(() => {
              expect(targetTabButton).toHaveAttribute('aria-selected', 'true');
            });
            
            // Verify the previous tab is no longer active (unless it's the same tab)
            if (initialTab !== targetTab) {
              expect(initialTabButton).toHaveAttribute('aria-selected', 'false');
            }
            
            // For same-tab clicks, the button should remain active
            // For different-tab clicks, the target should become active
            expect(targetTabButton).toHaveAttribute('aria-selected', 'true');
            
            // Verify initial tab is no longer active (unless it's the same tab)
            if (initialTab !== targetTab) {
              expect(initialTabButton).toHaveAttribute('aria-selected', 'false');
            } else {
              // Same tab - should still be active
              expect(initialTabButton).toHaveAttribute('aria-selected', 'true');
            }
            
            // Verify only one tab is active at a time
            const allTabs = container.querySelectorAll('[role="tab"]');
            const activeTabs = Array.from(allTabs).filter(tab => tab.getAttribute('aria-selected') === 'true');
            expect(activeTabs).toHaveLength(1);
            expect(activeTabs[0]).toBe(targetTabButton);
            
            // Verify the correct tab panel is displayed
            const activeTabPanel = container.querySelector(`#tabpanel-${targetTab}`);
            expect(activeTabPanel).toBeInTheDocument();
            expect(activeTabPanel).toHaveAttribute('data-tab', targetTab);
          } finally {
            // Clean up after each iteration
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test keyboard navigation maintains tab state consistency
   */
  it('should maintain tab state consistency with keyboard navigation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('calendar', 'maintenance', 'gallery', 'notifications'),
        fc.constantFrom('ArrowLeft', 'ArrowRight', 'Home', 'End'),
        (initialTab: TabType, keyPress: string) => {
          // Clean up before each property test iteration
          cleanup();
          
          // Render Dashboard with initial tab
          const { container, unmount } = render(<Dashboard initialTab={initialTab} />);
          
          try {
            // Focus on the initial tab
            const initialTabButton = container.querySelector(`#tab-${initialTab}`) as HTMLElement;
            initialTabButton.focus();
            
            // Press the key
            fireEvent.keyDown(initialTabButton, { key: keyPress });
            
            // Verify exactly one tab is active
            const allTabs = container.querySelectorAll('[role="tab"]');
            const activeTabs = Array.from(allTabs).filter(tab => tab.getAttribute('aria-selected') === 'true');
            expect(activeTabs).toHaveLength(1);
            
            // Verify the active tab has corresponding tab panel displayed
            const activeTab = activeTabs[0];
            const activeTabId = activeTab.getAttribute('id');
            const expectedTabType = activeTabId?.replace('tab-', '') as TabType;
            
            const activeTabPanel = container.querySelector(`#tabpanel-${expectedTabType}`);
            expect(activeTabPanel).toBeInTheDocument();
            expect(activeTabPanel).toHaveAttribute('data-tab', expectedTabType);
          } finally {
            // Clean up after each iteration
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that tab state is preserved when switching between tabs multiple times
   */
  it('should maintain consistent state through multiple tab switches', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('calendar', 'maintenance', 'gallery', 'notifications'), { minLength: 2, maxLength: 10 }),
        (tabSequence: TabType[]) => {
          // Clean up before each property test iteration
          cleanup();
          
          // Render Dashboard
          const { container, unmount } = render(<Dashboard />);
          
          try {
            // Navigate through the tab sequence
            for (const targetTab of tabSequence) {
              const targetTabButton = container.querySelector(`#tab-${targetTab}`) as HTMLElement;
              fireEvent.click(targetTabButton);
              
              // Verify state consistency after each click
              expect(targetTabButton).toHaveAttribute('aria-selected', 'true');
              
              // Verify only one tab is active
              const allTabs = container.querySelectorAll('[role="tab"]');
              const activeTabs = Array.from(allTabs).filter(tab => tab.getAttribute('aria-selected') === 'true');
              expect(activeTabs).toHaveLength(1);
              expect(activeTabs[0]).toBe(targetTabButton);
              
              // Verify the correct tab panel is displayed
              const activeTabPanel = container.querySelector(`#tabpanel-${targetTab}`);
              expect(activeTabPanel).toBeInTheDocument();
              expect(activeTabPanel).toHaveAttribute('data-tab', targetTab);
            }
          } finally {
            // Clean up after each iteration
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});