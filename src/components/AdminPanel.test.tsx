import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { AdminPanel } from './AdminPanel';
import * as supabaseUtils from '../utils/supabase';
import * as invitationUtils from '../utils/invitations';
import type { Invitation } from '../types/supabase';

// Mock the utilities
vi.mock('../utils/supabase');
vi.mock('../utils/invitations');

// Mock the SupabaseProvider context
vi.mock('../contexts/SupabaseProvider', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'admin@example.com',
      created_at: '2023-01-01T00:00:00Z',
    },
    profile: null,
    loading: false,
    error: null,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
  }),
}));

const mockSupabaseUtils = vi.mocked(supabaseUtils);
const mockInvitationUtils = vi.mocked(invitationUtils);

// Mock user data
const mockUser = {
  id: 'test-user-id',
  email: 'admin@example.com',
  created_at: '2023-01-01T00:00:00Z',
};

const mockInvitations: Invitation[] = [
  {
    id: 'inv-1',
    email: 'user1@example.com',
    token: 'token-1',
    created_by: 'test-user-id',
    created_at: '2025-12-15T00:00:00Z',
    expires_at: '2025-12-22T00:00:00Z',
    status: 'pending',
  },
  {
    id: 'inv-2',
    email: 'user2@example.com',
    token: 'token-2',
    created_by: 'test-user-id',
    created_at: '2025-12-16T00:00:00Z',
    expires_at: '2025-12-23T00:00:00Z',
    used_at: '2025-12-17T00:00:00Z',
    used_by: 'user-2-id',
    status: 'used',
  },
];

describe('AdminPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test admin permission checking
   * Requirements: 8.1
   */
  describe('Admin Permission Checking', () => {
    it('should verify admin status on mount', async () => {
      mockSupabaseUtils.isUserAdmin.mockResolvedValue(true);
      mockInvitationUtils.getAllInvitations.mockResolvedValue(mockInvitations);

      render(<AdminPanel user={mockUser} isAdmin={true} />);

      expect(mockSupabaseUtils.isUserAdmin).toHaveBeenCalledWith('test-user-id');
      
      await waitFor(() => {
        expect(screen.getByText('Admin Panel')).toBeInTheDocument();
      });
    });

    it('should show access denied for non-admin users', async () => {
      mockSupabaseUtils.isUserAdmin.mockResolvedValue(false);

      render(<AdminPanel user={mockUser} isAdmin={false} />);

      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(screen.getByText("You don't have permission to access the admin panel.")).toBeInTheDocument();
      });
    });

    it('should show loading state during admin verification', () => {
      mockSupabaseUtils.isUserAdmin.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<AdminPanel user={mockUser} isAdmin={true} />);

      expect(screen.getByText('Verifying admin permissions...')).toBeInTheDocument();
    });

    it('should handle admin verification errors', async () => {
      mockSupabaseUtils.isUserAdmin.mockRejectedValue(new Error('Database error'));

      render(<AdminPanel user={mockUser} isAdmin={true} />);

      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(screen.getByText('Failed to verify admin permissions')).toBeInTheDocument();
      });
    });
  });

  /**
   * Test invitation form functionality
   * Requirements: 8.2
   */
  describe('Invitation Form Functionality', () => {
    beforeEach(() => {
      mockSupabaseUtils.isUserAdmin.mockResolvedValue(true);
      mockInvitationUtils.getAllInvitations.mockResolvedValue(mockInvitations);
    });

    it('should render invitation form for admin users', async () => {
      render(<AdminPanel user={mockUser} isAdmin={true} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Send Invitation' })).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: /email address/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /send invitation/i })).toBeInTheDocument();
      });
    });

    it('should handle successful invitation creation', async () => {
      const newInvitation: Invitation = {
        id: 'inv-3',
        email: 'newuser@example.com',
        token: 'token-3',
        created_by: 'test-user-id',
        created_at: '2025-12-03T00:00:00Z',
        expires_at: '2025-12-10T00:00:00Z',
        status: 'pending',
      };

      mockInvitationUtils.createAndSendInvitation.mockResolvedValue(newInvitation);

      render(<AdminPanel user={mockUser} isAdmin={true} />);

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /email address/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByRole('textbox', { name: /email address/i });
      const submitButton = screen.getByRole('button', { name: /send invitation/i });

      fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockInvitationUtils.createAndSendInvitation).toHaveBeenCalledWith(
          'newuser@example.com',
          'test-user-id'
        );
      });
    });

    it('should validate email format before submission', async () => {
      render(<AdminPanel user={mockUser} isAdmin={true} />);

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /email address/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByRole('textbox', { name: /email address/i });
      const submitButton = screen.getByRole('button', { name: /send invitation/i });

      // Test invalid email
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getAllByText('Please enter a valid email address')).toHaveLength(2);
      });

      fireEvent.click(submitButton);

      // Should not call createAndSendInvitation with invalid email
      expect(mockInvitationUtils.createAndSendInvitation).not.toHaveBeenCalled();
    });

    it('should handle invitation creation errors', async () => {
      mockInvitationUtils.createAndSendInvitation.mockRejectedValue(
        new Error('This email already has a pending invitation')
      );

      render(<AdminPanel user={mockUser} isAdmin={true} />);

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /email address/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByRole('textbox', { name: /email address/i });
      const submitButton = screen.getByRole('button', { name: /send invitation/i });

      fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getAllByText(/this email already has a pending invitation/i)).toHaveLength(2);
      });
    });
  });

  /**
   * Test invitation list display
   * Requirements: 8.4
   */
  describe('Invitation List Display', () => {
    beforeEach(() => {
      mockSupabaseUtils.isUserAdmin.mockResolvedValue(true);
      mockInvitationUtils.getAllInvitations.mockResolvedValue(mockInvitations);
    });

    it('should display invitation list for admin users', async () => {
      render(<AdminPanel user={mockUser} isAdmin={true} />);

      await waitFor(() => {
        expect(screen.getByText('Invitation Management')).toBeInTheDocument();
        expect(screen.getByText('Sent Invitations')).toBeInTheDocument();
        expect(screen.getByText('2 invitations total')).toBeInTheDocument();
      });
    });

    it('should display individual invitation details', async () => {
      render(<AdminPanel user={mockUser} isAdmin={true} />);

      await waitFor(() => {
        // Check first invitation
        expect(screen.getByText('user1@example.com')).toBeInTheDocument();
        expect(screen.getByText('pending')).toBeInTheDocument();
        
        // Check second invitation
        expect(screen.getByText('user2@example.com')).toBeInTheDocument();
        expect(screen.getByText('used')).toBeInTheDocument();
      });
    });

    it('should handle refresh functionality', async () => {
      render(<AdminPanel user={mockUser} isAdmin={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      
      // Clear the initial call
      mockInvitationUtils.getAllInvitations.mockClear();
      
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockInvitationUtils.getAllInvitations).toHaveBeenCalledTimes(1);
      });
    });

    it('should show empty state when no invitations exist', async () => {
      mockInvitationUtils.getAllInvitations.mockResolvedValue([]);

      render(<AdminPanel user={mockUser} isAdmin={true} />);

      await waitFor(() => {
        expect(screen.getByText('No invitations have been sent yet.')).toBeInTheDocument();
        expect(screen.getByText('Use the form above to send your first invitation.')).toBeInTheDocument();
      });
    });

    it('should handle invitation loading errors', async () => {
      mockInvitationUtils.getAllInvitations.mockRejectedValue(new Error('Database error'));

      render(<AdminPanel user={mockUser} isAdmin={true} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load invitations')).toBeInTheDocument();
      });
    });
  });

  /**
   * Test accessibility features
   */
  describe('Accessibility', () => {
    beforeEach(() => {
      mockSupabaseUtils.isUserAdmin.mockResolvedValue(true);
      mockInvitationUtils.getAllInvitations.mockResolvedValue(mockInvitations);
    });

    it('should have proper ARIA labels and roles', async () => {
      render(<AdminPanel user={mockUser} isAdmin={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh invitations list/i })).toBeInTheDocument();
        expect(screen.getByLabelText('Send invitation form')).toBeInTheDocument();
      });
    });

    it('should handle keyboard navigation', async () => {
      render(<AdminPanel user={mockUser} isAdmin={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh invitations list/i })).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh invitations list/i });
      
      // Test Enter key
      fireEvent.keyDown(refreshButton, { key: 'Enter' });
      
      await waitFor(() => {
        expect(mockInvitationUtils.getAllInvitations).toHaveBeenCalled();
      });
    });
  });
});