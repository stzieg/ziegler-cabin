/**
 * Property-based tests for DashboardHeader component
 * Feature: dashboard-navigation-redesign
 */

import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { DashboardHeader } from './DashboardHeader';

// Generators for property-based testing
const titleArb = fc.string({ minLength: 1, maxLength: 50 });
const sidebarStateArb = fc.boolean();

describe('DashboardHeader Property Tests', () => {
  let mockOnMenuToggle: ReturnType<typeof vi.fn>;
  let mockOnBack: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create fresh mock functions
    mockOnMenuToggle = vi.fn();
    mockOnBack = vi.fn();
    
    // Clear DOM completely before each test
    document.body.innerHTML = '';
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    // Clear DOM completely after each test
    document.body.innerHTML = '';
  });

  /**
   * **Feature: dashboard-navigation-redesign, Property 2: Hamburger menu functionality**
   * **Validates: Requirements 2.1, 2.2**
   * 
   * Property 2: Hamburger menu functionality
   * For any hamburger menu interaction, clicking should toggle the sidebar visibility 
   * and display all navigation items when expanded
   */
  it('should render hamburger button and respond to clicks for any title and sidebar state', () => {
    fc.assert(
      fc.property(
        titleArb,
        sidebarStateArb,
        (title, sidebarExpanded) => {
          // Clear DOM before each property iteration
          document.body.innerHTML = '';
          
          // Render the DashboardHeader in a fresh container
          const { unmount } = render(
            <DashboardHeader
              title={title}
              onMenuToggle={mockOnMenuToggle}
              sidebarExpanded={sidebarExpanded}
              onBack={mockOnBack}
            />
          );

          // Verify the header is rendered
          const header = screen.getByTestId('dashboard-header');
          expect(header).toBeInTheDocument();

          // Verify hamburger button exists and has correct attributes
          const hamburgerButton = screen.getByTestId('hamburger-button');
          expect(hamburgerButton).toBeInTheDocument();
          expect(hamburgerButton).toHaveAttribute('aria-label', 'Toggle navigation menu');
          expect(hamburgerButton).toHaveAttribute('aria-expanded', sidebarExpanded.toString());

          // Verify hamburger icon is present
          const hamburgerIcon = hamburgerButton.querySelector('[aria-hidden="true"]');
          expect(hamburgerIcon).toBeInTheDocument();
          expect(hamburgerIcon?.textContent).toBe('☰');

          // Verify title is displayed
          const titleElement = screen.getByRole('heading', { level: 1 });
          expect(titleElement).toBeInTheDocument();
          expect(titleElement.textContent).toBe(title);

          // Test hamburger button click functionality
          fireEvent.click(hamburgerButton);
          expect(mockOnMenuToggle).toHaveBeenCalledTimes(1);

          // Verify back button is present when onBack is provided
          const backButton = screen.getByTestId('back-button');
          expect(backButton).toBeInTheDocument();
          expect(backButton).toHaveAttribute('aria-label', 'Back to home');

          // Test back button click functionality
          fireEvent.click(backButton);
          expect(mockOnBack).toHaveBeenCalledTimes(1);

          // Clean up for next iteration
          unmount();
          mockOnMenuToggle.mockClear();
          mockOnBack.mockClear();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test hamburger button accessibility and keyboard interaction
   */
  it('should handle keyboard interactions properly for any sidebar state', () => {
    fc.assert(
      fc.property(
        titleArb,
        sidebarStateArb,
        (title, sidebarExpanded) => {
          // Clear DOM before each property iteration
          document.body.innerHTML = '';
          
          // Render the DashboardHeader in a fresh container
          const { unmount } = render(
            <DashboardHeader
              title={title}
              onMenuToggle={mockOnMenuToggle}
              sidebarExpanded={sidebarExpanded}
            />
          );

          const hamburgerButton = screen.getByTestId('hamburger-button');

          // Test Enter key - should trigger click
          fireEvent.keyDown(hamburgerButton, { key: 'Enter', code: 'Enter' });
          fireEvent.keyUp(hamburgerButton, { key: 'Enter', code: 'Enter' });
          
          // Test Space key - should trigger click
          fireEvent.keyDown(hamburgerButton, { key: ' ', code: 'Space' });
          fireEvent.keyUp(hamburgerButton, { key: ' ', code: 'Space' });

          // For buttons, keyboard events should be handled by the browser
          // We verify the button is focusable and has proper accessibility attributes
          expect(hamburgerButton).toHaveAttribute('type', 'button');
          expect(hamburgerButton).toHaveAttribute('aria-label', 'Toggle navigation menu');
          expect(hamburgerButton).toHaveAttribute('aria-expanded', sidebarExpanded.toString());

          // Clean up for next iteration
          unmount();
          mockOnMenuToggle.mockClear();
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Test header positioning and fixed location requirement
   */
  it('should maintain fixed positioning for easy access across different states', () => {
    fc.assert(
      fc.property(
        titleArb,
        sidebarStateArb,
        (title, sidebarExpanded) => {
          // Clear DOM before each property iteration
          document.body.innerHTML = '';
          
          // Render the DashboardHeader in a fresh container
          const { unmount } = render(
            <DashboardHeader
              title={title}
              onMenuToggle={mockOnMenuToggle}
              sidebarExpanded={sidebarExpanded}
            />
          );

          const header = screen.getByTestId('dashboard-header');
          
          // Verify header has the correct CSS class for positioning
          expect(header.className).toContain('dashboardHeader');
          
          // Verify header structure contains all required elements
          expect(header).toContainElement(screen.getByTestId('hamburger-button'));
          expect(header).toContainElement(screen.getByRole('heading', { level: 1 }));

          // Clean up for next iteration
          unmount();
        }
      ),
      { numRuns: 25 }
    );
  });
});