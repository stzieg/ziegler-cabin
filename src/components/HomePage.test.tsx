import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomePage } from './HomePage';
import { SupabaseProvider } from '../contexts/SupabaseProvider';

// Mock Supabase
vi.mock('../utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  },
  setupAuthStateHandler: vi.fn(() => ({ unsubscribe: vi.fn() })),
  setupSessionMonitoring: vi.fn(() => vi.fn()),
  addSessionExpirationListener: vi.fn(),
  getCurrentSession: vi.fn().mockResolvedValue(null),
  getUserProfile: vi.fn().mockResolvedValue(null),
  checkSupabaseHealth: vi.fn().mockResolvedValue(true),
  withNetworkRecovery: vi.fn().mockImplementation((fn) => fn()),
  removeSessionExpirationListener: vi.fn(),
}));

/**
 * Unit Tests for HomePage Component - Responsive Behavior
 * Requirements: 4.1, 4.2, 4.3
 */

describe('HomePage - Responsive Behavior', () => {
  // Mock console.log to avoid cluttering test output
  beforeEach(() => {
    console.log = vi.fn();
  });

  // Helper function to render HomePage with SupabaseProvider
  const renderHomePage = () => {
    return render(
      <SupabaseProvider>
        <HomePage />
      </SupabaseProvider>
    );
  };

  /**
   * Test mobile viewport rendering (375px)
   * Requirement 4.1: WHEN a user accesses the home page on a mobile device 
   * THEN the system SHALL display a responsive layout optimized for small screens
   */
  it('should render correctly at mobile viewport (375px)', async () => {
    // Arrange: Set mobile viewport size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });

    // Trigger resize event
    window.dispatchEvent(new Event('resize'));

    // Act: Render the HomePage
    const { container } = renderHomePage();

    // Wait for loading to complete
    await screen.findByLabelText(/email/i);

    // Assert: Verify the page renders successfully
    expect(container).toBeInTheDocument();

    // Verify main layout elements are present
    const homePage = container.querySelector('[class*="homePage"]');
    expect(homePage).toBeInTheDocument();

    // Verify logo is present
    const logo = container.querySelector('[class*="logo"]');
    expect(logo).toBeInTheDocument();

    // Verify all form fields are present and accessible
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();

    // Verify all interactive elements are visible
    expect(screen.getByLabelText(/email/i)).toBeVisible();
    expect(screen.getByLabelText(/password/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  /**
   * Test tablet viewport rendering (768px)
   * Requirement 4.2: WHEN a user accesses the home page on a tablet 
   * THEN the system SHALL display a responsive layout optimized for medium screens
   */
  it('should render correctly at tablet viewport (768px)', async () => {
    // Arrange: Set tablet viewport size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    // Trigger resize event
    window.dispatchEvent(new Event('resize'));

    // Act: Render the HomePage
    const { container } = renderHomePage();

    // Wait for loading to complete
    await screen.findByLabelText(/email/i);

    // Assert: Verify the page renders successfully
    expect(container).toBeInTheDocument();

    // Verify main layout elements are present
    const homePage = container.querySelector('[class*="homePage"]');
    expect(homePage).toBeInTheDocument();

    // Verify logo is present
    const logo = container.querySelector('[class*="logo"]');
    expect(logo).toBeInTheDocument();

    // Verify all form fields are present and accessible
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();

    // Verify all interactive elements are visible
    expect(screen.getByLabelText(/email/i)).toBeVisible();
    expect(screen.getByLabelText(/password/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  /**
   * Test desktop viewport rendering (1024px+)
   * Requirement 4.3: WHEN a user accesses the home page on a desktop 
   * THEN the system SHALL display a responsive layout optimized for large screens
   */
  it('should render correctly at desktop viewport (1024px)', async () => {
    // Arrange: Set desktop viewport size
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

    // Trigger resize event
    window.dispatchEvent(new Event('resize'));

    // Act: Render the HomePage
    const { container } = renderHomePage();

    // Wait for loading to complete
    await screen.findByLabelText(/email/i);

    // Assert: Verify the page renders successfully
    expect(container).toBeInTheDocument();

    // Verify main layout elements are present
    const homePage = container.querySelector('[class*="homePage"]');
    expect(homePage).toBeInTheDocument();

    // Verify logo is present
    const logo = container.querySelector('[class*="logo"]');
    expect(logo).toBeInTheDocument();

    // Verify all form fields are present and accessible
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();

    // Verify all interactive elements are visible
    expect(screen.getByLabelText(/email/i)).toBeVisible();
    expect(screen.getByLabelText(/password/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  /**
   * Additional test: Large desktop viewport (1920px)
   * Verifies the layout works well on larger desktop screens
   */
  it('should render correctly at large desktop viewport (1920px)', async () => {
    // Arrange: Set large desktop viewport size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1080,
    });

    // Trigger resize event
    window.dispatchEvent(new Event('resize'));

    // Act: Render the HomePage
    const { container } = renderHomePage();

    // Wait for loading to complete
    await screen.findByLabelText(/email/i);

    // Assert: Verify the page renders successfully
    expect(container).toBeInTheDocument();

    // Verify main layout elements are present
    const homePage = container.querySelector('[class*="homePage"]');
    expect(homePage).toBeInTheDocument();

    // Verify all interactive elements remain accessible (LoginForm fields)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});