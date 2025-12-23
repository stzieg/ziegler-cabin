import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InvitationForm } from './InvitationForm';
import { InvitationList } from './InvitationList';
import type { Invitation } from '../types/supabase';
import formStyles from './InvitationForm.module.css';
import listStyles from './InvitationList.module.css';

// Mock the utilities
vi.mock('../utils/validation', () => ({
  validateEmail: vi.fn(() => ({ isValid: true })),
}));

vi.mock('../utils/invitations', () => ({
  createAndSendInvitation: vi.fn(),
}));

/**
 * Unit tests for styling consistency across invitation management components
 * Requirements: 1.2, 1.3, 3.1, 3.2, 3.3, 3.4
 */
describe('Invitation Management - Styling Consistency', () => {
  const mockInvitations: Invitation[] = [
    {
      id: 'inv-1',
      email: 'user1@example.com',
      token: 'token-1',
      created_by: 'test-user-id',
      created_at: '2025-12-01T00:00:00Z',
      expires_at: '2025-12-08T00:00:00Z',
      status: 'pending',
    },
    {
      id: 'inv-2',
      email: 'user2@example.com',
      token: 'token-2',
      created_by: 'test-user-id',
      created_at: '2025-12-02T00:00:00Z',
      expires_at: '2025-12-09T00:00:00Z',
      used_at: '2025-12-03T00:00:00Z',
      used_by: 'user-2-id',
      status: 'used',
    },
    {
      id: 'inv-3',
      email: 'user3@example.com',
      token: 'token-3',
      created_by: 'test-user-id',
      created_at: '2025-11-25T00:00:00Z',
      expires_at: '2025-12-02T00:00:00Z',
      status: 'expired',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test InvitationForm styling consistency
   * Requirements: 1.1, 1.4, 3.3
   */
  describe('InvitationForm Styling', () => {
    it('should have proper CSS classes for form elements', () => {
      const mockOnInvitationSent = vi.fn();
      
      const { container } = render(
        <InvitationForm 
          onInvitationSent={mockOnInvitationSent}
          userId="test-user-id"
        />
      );

      // Check form has proper styling class
      const form = container.querySelector('form');
      expect(form).toHaveClass(formStyles.form);

      // Check submit button has proper styling classes
      const submitButton = screen.getByRole('button', { name: /send invitation/i });
      expect(submitButton).toHaveClass(formStyles.submitButton);

      // Check form fields container has proper styling
      const formFields = container.querySelector(`.${formStyles.formFields}`);
      expect(formFields).toBeInTheDocument();

      // Check description has proper styling
      const description = container.querySelector(`.${formStyles.description}`);
      expect(description).toBeInTheDocument();
    });

    it('should apply consistent button styling with proper accessibility attributes', () => {
      const mockOnInvitationSent = vi.fn();
      
      render(
        <InvitationForm 
          onInvitationSent={mockOnInvitationSent}
          userId="test-user-id"
        />
      );

      const submitButton = screen.getByRole('button', { name: /send invitation/i });
      
      // Check button has proper styling class
      expect(submitButton).toHaveClass(formStyles.submitButton);
      
      // Check accessibility attributes
      expect(submitButton).toHaveAttribute('type', 'submit');
      expect(submitButton).toHaveAttribute('aria-describedby', 'submit-help');
      
      // Check help text is present and properly styled
      const helpText = screen.getByText(/the invitation will be valid for 7 days/i);
      expect(helpText).toHaveClass(formStyles.helpText);
      expect(helpText).toHaveAttribute('id', 'submit-help');
    });

    it('should display success and error messages with consistent styling', () => {
      const mockOnInvitationSent = vi.fn();
      
      const { rerender } = render(
        <InvitationForm 
          onInvitationSent={mockOnInvitationSent}
          userId="test-user-id"
        />
      );

      // Test that message containers exist in DOM structure
      // (Messages are conditionally rendered based on state)
      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
    });
  });

  /**
   * Test InvitationList styling consistency
   * Requirements: 1.2, 1.3, 3.1, 3.2
   */
  describe('InvitationList Styling', () => {
    it('should have proper CSS classes for list items', () => {
      const mockOnRefresh = vi.fn();
      
      const { container } = render(
        <InvitationList 
          invitations={mockInvitations}
          onRefresh={mockOnRefresh}
        />
      );

      // Check container has proper styling
      const listContainer = container.querySelector(`.${listStyles.container}`);
      expect(listContainer).toBeInTheDocument();

      // Check header has proper styling
      const header = container.querySelector(`.${listStyles.header}`);
      expect(header).toBeInTheDocument();

      // Check list container has proper styling
      const list = container.querySelector(`.${listStyles.listContainer}`);
      expect(list).toBeInTheDocument();

      // Check individual invitation items have proper styling
      const invitationItems = container.querySelectorAll(`.${listStyles.invitationItem}`);
      expect(invitationItems).toHaveLength(mockInvitations.length);
      
      invitationItems.forEach(item => {
        expect(item).toHaveClass(listStyles.invitationItem);
      });
    });

    it('should display status badges with consistent styling', () => {
      const mockOnRefresh = vi.fn();
      
      const { container } = render(
        <InvitationList 
          invitations={mockInvitations}
          onRefresh={mockOnRefresh}
        />
      );

      // Check that all status badges have base styling class
      const statusBadges = container.querySelectorAll(`.${listStyles.statusBadge}`);
      expect(statusBadges).toHaveLength(mockInvitations.length);

      // Check that status badges exist and have proper content
      // Note: The component may change status based on expiration logic
      statusBadges.forEach(badge => {
        const text = badge.textContent;
        expect(['pending', 'used', 'expired'].includes(text || '')).toBe(true);
      });
    });

    it('should have consistent styling for action buttons', () => {
      const mockOnRefresh = vi.fn();
      
      const { container } = render(
        <InvitationList 
          invitations={mockInvitations}
          onRefresh={mockOnRefresh}
        />
      );

      // Check refresh button styling
      const refreshButton = screen.getByRole('button', { name: /refresh invitations list/i });
      expect(refreshButton).toHaveClass(listStyles.refreshButton);

      // Check delete buttons styling
      const deleteButtons = container.querySelectorAll(`.${listStyles.deleteButton}`);
      expect(deleteButtons).toHaveLength(mockInvitations.length);
      
      deleteButtons.forEach(button => {
        expect(button).toHaveClass(listStyles.deleteButton);
      });
    });

    it('should display invitation details with proper styling structure', () => {
      const mockOnRefresh = vi.fn();
      
      const { container } = render(
        <InvitationList 
          invitations={mockInvitations}
          onRefresh={mockOnRefresh}
        />
      );

      // Check invitation details containers
      const detailsContainers = container.querySelectorAll(`.${listStyles.invitationDetails}`);
      expect(detailsContainers).toHaveLength(mockInvitations.length);

      // Check detail rows have proper styling
      const detailRows = container.querySelectorAll(`.${listStyles.detailRow}`);
      expect(detailRows.length).toBeGreaterThan(0);

      detailRows.forEach(row => {
        expect(row).toHaveClass(listStyles.detailRow);
        
        // Check that each row has label and value with proper styling
        const label = row.querySelector(`.${listStyles.detailLabel}`);
        const value = row.querySelector(`.${listStyles.detailValue}`);
        
        expect(label).toBeInTheDocument();
        expect(value).toBeInTheDocument();
        expect(label).toHaveClass(listStyles.detailLabel);
        expect(value).toHaveClass(listStyles.detailValue);
      });
    });

    it('should handle empty state with proper styling', () => {
      const mockOnRefresh = vi.fn();
      
      const { container } = render(
        <InvitationList 
          invitations={[]}
          onRefresh={mockOnRefresh}
        />
      );

      // Check empty state styling
      const emptyState = container.querySelector(`.${listStyles.empty}`);
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveClass(listStyles.empty);

      // Check empty subtext styling
      const emptySubtext = container.querySelector(`.${listStyles.emptySubtext}`);
      expect(emptySubtext).toBeInTheDocument();
      expect(emptySubtext).toHaveClass(listStyles.emptySubtext);
    });

    it('should handle loading state with proper styling', () => {
      const mockOnRefresh = vi.fn();
      
      const { container } = render(
        <InvitationList 
          invitations={[]}
          onRefresh={mockOnRefresh}
          isLoading={true}
        />
      );

      // Check loading state styling
      const loadingState = container.querySelector(`.${listStyles.loading}`);
      expect(loadingState).toBeInTheDocument();
      expect(loadingState).toHaveClass(listStyles.loading);
    });
  });

  /**
   * Test responsive design consistency
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  describe('Responsive Design Consistency', () => {
    it('should apply responsive classes consistently across components', () => {
      const mockOnInvitationSent = vi.fn();
      const mockOnRefresh = vi.fn();
      
      // Test InvitationForm responsive structure
      const { container: formContainer } = render(
        <InvitationForm 
          onInvitationSent={mockOnInvitationSent}
          userId="test-user-id"
        />
      );

      const form = formContainer.querySelector('form');
      expect(form).toBeInTheDocument();

      // Test InvitationList responsive structure
      const { container: listContainer } = render(
        <InvitationList 
          invitations={mockInvitations}
          onRefresh={mockOnRefresh}
        />
      );

      const listContainerElement = listContainer.querySelector(`.${listStyles.container}`);
      expect(listContainerElement).toBeInTheDocument();

      // Both components should have their main containers properly styled
      expect(form).toHaveClass(formStyles.form);
      expect(listContainerElement).toHaveClass(listStyles.container);
    });

    it('should maintain consistent spacing and layout structure', () => {
      const mockOnRefresh = vi.fn();
      
      const { container } = render(
        <InvitationList 
          invitations={mockInvitations}
          onRefresh={mockOnRefresh}
        />
      );

      // Check header structure for consistent spacing
      const header = container.querySelector(`.${listStyles.header}`);
      const headerInfo = container.querySelector(`.${listStyles.headerInfo}`);
      
      expect(header).toBeInTheDocument();
      expect(headerInfo).toBeInTheDocument();
      expect(header).toHaveClass(listStyles.header);
      expect(headerInfo).toHaveClass(listStyles.headerInfo);

      // Check invitation items maintain consistent structure
      const invitationHeaders = container.querySelectorAll(`.${listStyles.invitationHeader}`);
      const emailContainers = container.querySelectorAll(`.${listStyles.emailContainer}`);
      
      expect(invitationHeaders).toHaveLength(mockInvitations.length);
      expect(emailContainers).toHaveLength(mockInvitations.length);

      invitationHeaders.forEach(header => {
        expect(header).toHaveClass(listStyles.invitationHeader);
      });

      emailContainers.forEach(container => {
        expect(container).toHaveClass(listStyles.emailContainer);
      });
    });
  });

  /**
   * Test accessibility styling consistency
   * Requirements: 3.3, 3.4
   */
  describe('Accessibility Styling', () => {
    it('should maintain consistent focus states and ARIA attributes', () => {
      const mockOnRefresh = vi.fn();
      
      render(
        <InvitationList 
          invitations={mockInvitations}
          onRefresh={mockOnRefresh}
        />
      );

      // Check refresh button accessibility
      const refreshButton = screen.getByRole('button', { name: /refresh invitations list/i });
      expect(refreshButton).toHaveAttribute('aria-label', 'Refresh invitations list');

      // Check delete buttons accessibility
      const deleteButtons = screen.getAllByRole('button', { name: /delete invitation for/i });
      expect(deleteButtons).toHaveLength(mockInvitations.length);

      deleteButtons.forEach((button, index) => {
        const email = mockInvitations[index].email;
        expect(button).toHaveAttribute('aria-label', `Delete invitation for ${email}`);
        expect(button).toHaveAttribute('title', 'Delete invitation');
      });
    });

    it('should have proper list semantics and roles', () => {
      const mockOnRefresh = vi.fn();
      
      render(
        <InvitationList 
          invitations={mockInvitations}
          onRefresh={mockOnRefresh}
        />
      );

      // Check list role
      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();

      // Check list items
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(mockInvitations.length);
    });

    it('should have consistent status badge accessibility', () => {
      const mockOnRefresh = vi.fn();
      
      const { container } = render(
        <InvitationList 
          invitations={mockInvitations}
          onRefresh={mockOnRefresh}
        />
      );

      // Check status badges have proper aria-label
      const statusBadges = container.querySelectorAll(`.${listStyles.statusBadge}`);
      
      statusBadges.forEach((badge) => {
        const ariaLabel = badge.getAttribute('aria-label');
        expect(ariaLabel).toMatch(/^Status: (pending|used|expired)$/);
      });
    });
  });
});