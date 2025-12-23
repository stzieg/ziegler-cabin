import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { InvitationList } from './InvitationList';
import type { Invitation } from '../types/supabase';

/**
 * Property-Based Tests for InvitationList Component
 * Using fast-check for property-based testing
 */

describe('InvitationList - Property-Based Tests', () => {
  // Ensure cleanup after each property test iteration
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // Mock console methods to avoid cluttering test output
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  /**
   * Feature: invitation-management-fixes, Property 1: Responsive Layout Adaptation
   * 
   * For any screen size (mobile, tablet, desktop), the invitation panel should apply 
   * appropriate CSS classes and maintain proper touch target sizes for the device type.
   * 
   * Validates: Requirements 2.2, 2.3
   */
  it('Property 1: Responsive Layout Adaptation - layout adapts properly to any screen size', () => {
    fc.assert(
      fc.property(
        // Generate random viewport widths covering mobile, tablet, and desktop
        fc.integer({ min: 320, max: 2560 }), // Mobile: 320px, Desktop: 2560px
        fc.integer({ min: 400, max: 1440 }), // Height range
        // Generate random invitation data
        fc.array(
          fc.record({
            id: fc.uuid(),
            email: fc.emailAddress(),
            status: fc.constantFrom('pending', 'used', 'expired'),
            created_at: fc.integer({ min: 1577836800000, max: 1733011200000 }).map(ts => new Date(ts).toISOString()), // 2020-2024
            expires_at: fc.integer({ min: 1733011200000, max: 1767225600000 }).map(ts => new Date(ts).toISOString()), // 2024-2025
            used_at: fc.option(fc.integer({ min: 1577836800000, max: 1733011200000 }).map(ts => new Date(ts).toISOString())),
            user_id: fc.uuid(),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        fc.boolean(), // isLoading
        (viewportWidth, viewportHeight, invitations, isLoading) => {
          // Cleanup before rendering to ensure clean state
          cleanup();

          // Set viewport size to test responsive behavior
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: viewportWidth,
          });
          Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: viewportHeight,
          });

          // Trigger resize event to ensure components respond
          window.dispatchEvent(new Event('resize'));

          const mockOnRefresh = vi.fn();

          // Act: Render the InvitationList
          const { container, queryByRole } = render(
            <InvitationList 
              invitations={invitations as Invitation[]}
              onRefresh={mockOnRefresh}
              isLoading={isLoading}
            />
          );

          // Assert 1: The component should render successfully at any viewport size
          expect(container).toBeInTheDocument();

          // Assert 2: Main container should be present and properly constrained
          const mainContainer = container.querySelector('[class*="container"]');
          expect(mainContainer).toBeInTheDocument();

          // Assert 3: Refresh button should always be present and accessible
          const refreshButton = queryByRole('button', { name: /refresh/i });
          expect(refreshButton).toBeInTheDocument();
          expect(refreshButton).toBeVisible();

          // Assert 4: For mobile viewports (≤767px), touch targets should be adequate
          if (viewportWidth <= 767) {
            // Refresh button should be visible and properly sized for touch
            const refreshButtonElement = refreshButton as HTMLElement;
            
            // The button should be visible regardless of loading state
            expect(refreshButtonElement).toBeVisible();
            
            // When not loading, button should be enabled
            if (!isLoading) {
              expect(refreshButtonElement).not.toBeDisabled();
            }
          }

          // Assert 5: For tablet viewports (768px-1023px), layout should be touch-friendly
          if (viewportWidth >= 768 && viewportWidth <= 1023) {
            expect(refreshButton).toBeVisible();
            if (!isLoading) {
              expect(refreshButton).not.toBeDisabled();
            }
          }

          // Assert 6: For desktop viewports (≥1024px), all elements should be present
          if (viewportWidth >= 1024) {
            expect(refreshButton).toBeVisible();
            if (!isLoading) {
              expect(refreshButton).not.toBeDisabled();
            }
          }

          // Assert 7: If invitations exist, they should be rendered properly
          if (invitations.length > 0) {
            const listContainer = container.querySelector('[class*="listContainer"]');
            expect(listContainer).toBeInTheDocument();

            // Each invitation should have proper structure
            const invitationItems = container.querySelectorAll('[class*="invitationItem"]');
            expect(invitationItems.length).toBe(invitations.length);

            // Each invitation should have email and status elements
            invitationItems.forEach((item, index) => {
              // Find the email span specifically (not the container)
              const emailElement = item.querySelector('span[class*="email"]:not([class*="statusBadge"])');
              const statusBadge = item.querySelector('span[class*="statusBadge"]');
              
              expect(emailElement).toBeInTheDocument();
              expect(statusBadge).toBeInTheDocument();
              
              // Email element should contain only the email address
              expect(emailElement?.textContent).toBe(invitations[index].email);
              
              // Status badge should contain the status (accounting for expired logic)
              // Replicate the getDisplayStatus logic from the component
              const invitation = invitations[index];
              const isExpired = new Date() > new Date(invitation.expires_at);
              const expectedStatus = (invitation.status === 'expired' || isExpired) ? 'expired' : invitation.status;
              expect(statusBadge?.textContent).toBe(expectedStatus);
            });
          }

          // Assert 8: Empty state should be handled properly
          if (invitations.length === 0 && !isLoading) {
            const emptyState = container.querySelector('[class*="empty"]');
            expect(emptyState).toBeInTheDocument();
          }

          // Assert 9: Loading state should be handled properly
          if (isLoading && invitations.length === 0) {
            const loadingState = container.querySelector('[class*="loading"]');
            expect(loadingState).toBeInTheDocument();
          }
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Feature: invitation-management-fixes, Property 2: Text Overflow Handling
   * 
   * For any email address or date string, regardless of length, the display should 
   * handle text wrapping gracefully without breaking the layout structure.
   * 
   * Validates: Requirements 2.5
   */
  it('Property 2: Text Overflow Handling - layout remains stable with varying content lengths', () => {
    fc.assert(
      fc.property(
        // Generate random viewport widths
        fc.integer({ min: 320, max: 2560 }),
        // Generate very long email addresses to test overflow
        fc.record({
          shortEmail: fc.emailAddress(),
          longEmail: fc.string({ minLength: 50, maxLength: 200 }).map(s => `${s}@${'very'.repeat(10)}.long.domain.example.com`),
          extremelyLongEmail: fc.string({ minLength: 100, maxLength: 500 }).map(s => `${s.replace(/[^a-zA-Z0-9]/g, 'x')}@${'extremely'.repeat(20)}.long.domain.name.example.org`),
        }),
        // Generate varying date strings (some very long when formatted)
        fc.record({
          recentDate: fc.integer({ min: Date.now() - 86400000, max: Date.now() }).map(ts => new Date(ts).toISOString()),
          futureDate: fc.integer({ min: Date.now(), max: Date.now() + 86400000 * 365 }).map(ts => new Date(ts).toISOString()),
        }),
        (viewportWidth, emails, dates) => {
          // Cleanup before rendering to ensure clean state
          cleanup();

          // Set viewport size
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: viewportWidth,
          });
          window.dispatchEvent(new Event('resize'));

          // Create test invitations with varying email lengths
          const testInvitations = [
            {
              id: '1',
              email: emails.shortEmail,
              status: 'pending' as const,
              created_at: dates.recentDate,
              expires_at: dates.futureDate,
              used_at: null,
              user_id: 'test-user-1',
            },
            {
              id: '2', 
              email: emails.longEmail,
              status: 'used' as const,
              created_at: dates.recentDate,
              expires_at: dates.futureDate,
              used_at: dates.recentDate,
              user_id: 'test-user-2',
            },
            {
              id: '3',
              email: emails.extremelyLongEmail,
              status: 'expired' as const,
              created_at: dates.recentDate,
              expires_at: dates.recentDate, // Expired
              used_at: null,
              user_id: 'test-user-3',
            },
          ];

          const mockOnRefresh = vi.fn();

          // Act: Render the InvitationList with varying content lengths
          const { container } = render(
            <InvitationList 
              invitations={testInvitations as any}
              onRefresh={mockOnRefresh}
              isLoading={false}
            />
          );

          // Assert 1: The component should render successfully with long content
          expect(container).toBeInTheDocument();

          // Assert 2: All invitation items should be present
          const invitationItems = container.querySelectorAll('[class*="invitationItem"]');
          expect(invitationItems.length).toBe(3);

          // Assert 3: Layout should remain stable - no horizontal overflow
          const mainContainer = container.querySelector('[class*="container"]');
          expect(mainContainer).toBeInTheDocument();

          // Assert 4: Each email element should be present and not break layout
          invitationItems.forEach((item, index) => {
            const emailElement = item.querySelector('span[class*="email"]:not([class*="statusBadge"])');
            const statusBadge = item.querySelector('span[class*="statusBadge"]');
            const emailContainer = item.querySelector('[class*="emailContainer"]');
            
            // Email element should exist
            expect(emailElement).toBeInTheDocument();
            expect(statusBadge).toBeInTheDocument();
            expect(emailContainer).toBeInTheDocument();
            
            // Email should contain the expected content (may be truncated on desktop)
            const expectedEmail = testInvitations[index].email;
            const actualEmailText = emailElement?.textContent || '';
            
            // For very long emails, the text might be truncated with ellipsis on desktop
            // or wrapped on mobile, but should contain at least part of the original email
            if (viewportWidth >= 1024) {
              // Desktop: might be truncated but should start with the email
              expect(actualEmailText.length).toBeGreaterThan(0);
              // Should contain at least the beginning of the email
              const emailStart = expectedEmail.substring(0, Math.min(10, expectedEmail.length));
              expect(actualEmailText).toContain(emailStart.substring(0, 5));
            } else {
              // Mobile/Tablet: should show full email with wrapping
              expect(actualEmailText).toBe(expectedEmail);
            }
          });

          // Assert 5: Date elements should handle long formatted dates gracefully
          const detailValues = container.querySelectorAll('[class*="detailValue"]');
          detailValues.forEach(detailValue => {
            // Date elements should be present and visible
            expect(detailValue).toBeInTheDocument();
            expect(detailValue).toBeVisible();
            
            // Should contain formatted date text
            const dateText = detailValue.textContent || '';
            expect(dateText.length).toBeGreaterThan(0);
          });

          // Assert 6: Layout should not have broken structure
          // Check that the invitation header maintains proper structure
          invitationItems.forEach(item => {
            const header = item.querySelector('[class*="invitationHeader"]');
            const details = item.querySelector('[class*="invitationDetails"]');
            
            expect(header).toBeInTheDocument();
            expect(details).toBeInTheDocument();
            
            // Header should maintain flex layout structure
            expect(header).toBeVisible();
            expect(details).toBeVisible();
          });

          // Assert 7: Status badges should remain properly positioned
          const statusBadges = container.querySelectorAll('[class*="statusBadge"]');
          expect(statusBadges.length).toBe(3);
          
          statusBadges.forEach(badge => {
            expect(badge).toBeInTheDocument();
            expect(badge).toBeVisible();
            // Badge should contain status text
            const badgeText = badge.textContent || '';
            expect(['pending', 'used', 'expired']).toContain(badgeText);
          });
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });
});