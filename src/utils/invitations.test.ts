import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from './supabase';
import {
  generateInvitationToken,
  createInvitation,
  validateInvitationToken,
  markInvitationAsUsed,
  markInvitationAsExpired,
  getAllInvitations,
  getInvitationsByStatus,
  hasPendingInvitation,
  expireOldInvitations,
  sendInvitationEmail,
  createAndSendInvitation,
  getInvitationStats,
} from './invitations';
import type { Invitation } from '../types/supabase';

// Mock Supabase client
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock crypto.randomUUID
const mockUUID = 'test-uuid-123';
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => mockUUID),
  },
});

// Mock window.location for email sending
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
  },
});

describe('Invitation System - Unit Tests', () => {
  const mockSupabaseFrom = vi.mocked(supabase.from);
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateInvitationToken', () => {
    it('should generate a unique token using crypto.randomUUID', () => {
      const token = generateInvitationToken();
      expect(token).toBe(mockUUID);
      expect(crypto.randomUUID).toHaveBeenCalledOnce();
    });

    it('should generate different tokens on multiple calls', () => {
      const mockCrypto = vi.mocked(crypto.randomUUID);
      mockCrypto
        .mockReturnValueOnce('token-1')
        .mockReturnValueOnce('token-2')
        .mockReturnValueOnce('token-3');

      const token1 = generateInvitationToken();
      const token2 = generateInvitationToken();
      const token3 = generateInvitationToken();

      expect(token1).toBe('token-1');
      expect(token2).toBe('token-2');
      expect(token3).toBe('token-3');
      expect(mockCrypto).toHaveBeenCalledTimes(3);
    });
  });

  describe('createInvitation', () => {
    const mockInvitation: Invitation = {
      id: 'invitation-id',
      email: 'test@example.com',
      token: mockUUID,
      created_by: 'user-id',
      created_at: '2023-01-01T00:00:00Z',
      expires_at: '2023-01-08T00:00:00Z',
      status: 'pending',
    };

    it('should create invitation with generated token', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockInvitation, error: null }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any);

      const result = await createInvitation('test@example.com', 'user-id');

      expect(mockSupabaseFrom).toHaveBeenCalledWith('invitations');
      expect(mockInsert).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: mockUUID,
        created_by: 'user-id',
      });
      expect(result).toEqual(mockInvitation);
    });

    it('should throw error when database operation fails', async () => {
      const mockError = { message: 'Database error' };
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert } as any);

      await expect(createInvitation('test@example.com', 'user-id'))
        .rejects.toThrow('Failed to create invitation: Database error');
    });
  });

  describe('validateInvitationToken', () => {
    const validInvitation: Invitation = {
      id: 'invitation-id',
      email: 'test@example.com',
      token: 'valid-token',
      created_by: 'user-id',
      created_at: '2023-01-01T00:00:00Z',
      expires_at: '2023-12-31T23:59:59Z', // Future date
      status: 'pending',
    };

    it('should return null for empty token', async () => {
      const result = await validateInvitationToken('');
      expect(result).toBeNull();
    });

    it('should return null for whitespace-only token', async () => {
      const result = await validateInvitationToken('   ');
      expect(result).toBeNull();
    });

    it('should return valid invitation for valid token', async () => {
      // Use a future date to ensure it's not expired
      const futureInvitation = {
        ...validInvitation,
        expires_at: '2025-12-31T23:59:59Z', // Future date
      };
      
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: futureInvitation, error: null }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ select: mockSelect } as any);

      const result = await validateInvitationToken('valid-token');

      expect(mockSupabaseFrom).toHaveBeenCalledWith('invitations');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(result).toEqual(futureInvitation);
    });

    it('should return null for used invitation', async () => {
      const usedInvitation = { ...validInvitation, status: 'used' as const };
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: usedInvitation, error: null }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ select: mockSelect } as any);

      const result = await validateInvitationToken('used-token');
      expect(result).toBeNull();
    });

    it('should return null for already expired invitation', async () => {
      const expiredInvitation = {
        ...validInvitation,
        expires_at: '2020-01-01T00:00:00Z', // Past date
        status: 'expired' as const,
      };

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: expiredInvitation, error: null }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ select: mockSelect } as any);

      const result = await validateInvitationToken('expired-token');

      expect(result).toBeNull();
    });

    it('should return null when invitation not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ select: mockSelect } as any);

      const result = await validateInvitationToken('nonexistent-token');
      expect(result).toBeNull();
    });

    it('should return null when database error occurs', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ select: mockSelect } as any);

      const result = await validateInvitationToken('error-token');
      expect(result).toBeNull();
    });
  });

  describe('markInvitationAsUsed', () => {
    const usedInvitation: Invitation = {
      id: 'invitation-id',
      email: 'test@example.com',
      token: 'used-token',
      created_by: 'user-id',
      created_at: '2023-01-01T00:00:00Z',
      expires_at: '2023-12-31T23:59:59Z',
      used_at: '2023-06-01T12:00:00Z',
      used_by: 'new-user-id',
      status: 'used',
    };

    it('should mark invitation as used with timestamp and user ID', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: usedInvitation, error: null }),
          }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ update: mockUpdate } as any);

      const result = await markInvitationAsUsed('used-token', 'new-user-id');

      expect(mockSupabaseFrom).toHaveBeenCalledWith('invitations');
      expect(mockUpdate).toHaveBeenCalledWith({
        used_at: expect.any(String),
        used_by: 'new-user-id',
        status: 'used',
      });
      expect(result).toEqual(usedInvitation);
    });

    it('should throw error when database operation fails', async () => {
      const mockError = { message: 'Update failed' };
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
          }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ update: mockUpdate } as any);

      await expect(markInvitationAsUsed('token', 'user-id'))
        .rejects.toThrow('Failed to mark invitation as used: Update failed');
    });
  });

  describe('markInvitationAsExpired', () => {
    const expiredInvitation: Invitation = {
      id: 'invitation-id',
      email: 'test@example.com',
      token: 'expired-token',
      created_by: 'user-id',
      created_at: '2023-01-01T00:00:00Z',
      expires_at: '2023-01-08T00:00:00Z',
      status: 'expired',
    };

    it('should mark invitation as expired', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: expiredInvitation, error: null }),
          }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ update: mockUpdate } as any);

      const result = await markInvitationAsExpired('expired-token');

      expect(mockSupabaseFrom).toHaveBeenCalledWith('invitations');
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'expired' });
      expect(result).toEqual(expiredInvitation);
    });

    it('should throw error when database operation fails', async () => {
      const mockError = { message: 'Update failed' };
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
          }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ update: mockUpdate } as any);

      await expect(markInvitationAsExpired('token'))
        .rejects.toThrow('Failed to mark invitation as expired: Update failed');
    });
  });

  describe('getAllInvitations', () => {
    const mockInvitations: Invitation[] = [
      {
        id: 'invitation-1',
        email: 'user1@example.com',
        token: 'token-1',
        created_by: 'admin-id',
        created_at: '2023-01-02T00:00:00Z',
        expires_at: '2023-01-09T00:00:00Z',
        status: 'pending',
      },
      {
        id: 'invitation-2',
        email: 'user2@example.com',
        token: 'token-2',
        created_by: 'admin-id',
        created_at: '2023-01-01T00:00:00Z',
        expires_at: '2023-01-08T00:00:00Z',
        status: 'used',
        used_at: '2023-01-05T12:00:00Z',
        used_by: 'user-2-id',
      },
    ];

    it('should return all invitations ordered by creation date', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockInvitations, error: null }),
      });
      mockSupabaseFrom.mockReturnValue({ select: mockSelect } as any);

      const result = await getAllInvitations();

      expect(mockSupabaseFrom).toHaveBeenCalledWith('invitations');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(result).toEqual(mockInvitations);
    });

    it('should return empty array when no invitations exist', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });
      mockSupabaseFrom.mockReturnValue({ select: mockSelect } as any);

      const result = await getAllInvitations();
      expect(result).toEqual([]);
    });

    it('should throw error when database operation fails', async () => {
      const mockError = { message: 'Query failed' };
      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      });
      mockSupabaseFrom.mockReturnValue({ select: mockSelect } as any);

      await expect(getAllInvitations())
        .rejects.toThrow('Failed to get invitations: Query failed');
    });
  });

  describe('getInvitationsByStatus', () => {
    const pendingInvitations: Invitation[] = [
      {
        id: 'invitation-1',
        email: 'user1@example.com',
        token: 'token-1',
        created_by: 'admin-id',
        created_at: '2023-01-01T00:00:00Z',
        expires_at: '2023-01-08T00:00:00Z',
        status: 'pending',
      },
    ];

    it('should return invitations filtered by status', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: pendingInvitations, error: null }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ select: mockSelect } as any);

      const result = await getInvitationsByStatus('pending');

      expect(mockSupabaseFrom).toHaveBeenCalledWith('invitations');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(result).toEqual(pendingInvitations);
    });

    it('should handle all status types', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ select: mockSelect } as any);

      await getInvitationsByStatus('used');
      await getInvitationsByStatus('expired');
      await getInvitationsByStatus('pending');

      expect(mockSelect).toHaveBeenCalledTimes(3);
    });
  });

  describe('hasPendingInvitation', () => {
    it('should return true when pending invitation exists', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockResolvedValue({ data: [{ id: 'invitation-id' }], error: null }),
          }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ select: mockSelect } as any);

      const result = await hasPendingInvitation('test@example.com');

      expect(result).toBe(true);
      expect(mockSelect).toHaveBeenCalledWith('id');
    });

    it('should return false when no pending invitation exists', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ select: mockSelect } as any);

      const result = await hasPendingInvitation('test@example.com');
      expect(result).toBe(false);
    });

    it('should return false when database error occurs', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
          }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ select: mockSelect } as any);

      const result = await hasPendingInvitation('test@example.com');
      expect(result).toBe(false);
    });
  });

  describe('expireOldInvitations', () => {
    it('should expire old pending invitations and return count', async () => {
      const expiredInvitations = [{ id: 'inv-1' }, { id: 'inv-2' }];
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: expiredInvitations, error: null }),
          }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ update: mockUpdate } as any);

      const result = await expireOldInvitations();

      expect(result).toBe(2);
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'expired' });
    });

    it('should return 0 when no invitations to expire', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ update: mockUpdate } as any);

      const result = await expireOldInvitations();
      expect(result).toBe(0);
    });

    it('should throw error when database operation fails', async () => {
      const mockError = { message: 'Update failed' };
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: null, error: mockError }),
          }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ update: mockUpdate } as any);

      await expect(expireOldInvitations())
        .rejects.toThrow('Failed to expire old invitations: Update failed');
    });
  });

  describe('sendInvitationEmail', () => {
    const mockInvitation: Invitation = {
      id: 'invitation-id',
      email: 'test@example.com',
      token: 'test-token',
      created_by: 'admin-id',
      created_at: '2023-01-01T00:00:00Z',
      expires_at: '2023-01-08T00:00:00Z',
      status: 'pending',
    };

    beforeEach(() => {
      // Mock the email service module
      vi.doMock('./emailService', () => ({
        emailService: {
          sendInvitationEmail: vi.fn().mockResolvedValue({
            success: true,
            messageId: 'test-message-id'
          })
        }
      }));
    });

    it('should send invitation email using email service', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await sendInvitationEmail(mockInvitation, 'Test Sender');

      expect(consoleSpy).toHaveBeenCalledWith('Invitation email sent successfully:', {
        to: 'test@example.com',
        messageId: 'test-message-id',
        invitationUrl: 'http://localhost:3000/register?token=test-token',
        expiresAt: '2023-01-08T00:00:00Z',
      });

      consoleSpy.mockRestore();
    });

    it('should handle email service failures', async () => {
      // Mock email service to fail
      vi.doMock('./emailService', () => ({
        emailService: {
          sendInvitationEmail: vi.fn().mockResolvedValue({
            success: false,
            error: 'Email service error'
          })
        }
      }));

      await expect(sendInvitationEmail(mockInvitation))
        .rejects.toThrow('Failed to send invitation email: Email service error');
    });

    it('should use window.location.origin when available', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await sendInvitationEmail(mockInvitation);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Invitation email sent successfully:',
        expect.objectContaining({
          invitationUrl: 'http://localhost:3000/register?token=test-token'
        })
      );

      consoleSpy.mockRestore();
    });

    it('should complete without throwing errors when successful', async () => {
      await expect(sendInvitationEmail(mockInvitation)).resolves.toBeUndefined();
    });
  });

  describe('createAndSendInvitation', () => {
    const mockInvitation: Invitation = {
      id: 'invitation-id',
      email: 'test@example.com',
      token: mockUUID,
      created_by: 'admin-id',
      created_at: '2023-01-01T00:00:00Z',
      expires_at: '2023-01-08T00:00:00Z',
      status: 'pending',
    };

    beforeEach(() => {
      // Mock the email service module
      vi.doMock('./emailService', () => ({
        emailService: {
          sendInvitationEmail: vi.fn().mockResolvedValue({
            success: true,
            messageId: 'test-message-id'
          })
        }
      }));
    });

    it('should create and send invitation when no pending invitation exists', async () => {
      // Mock hasPendingInvitation to return false
      const mockSelectPending = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      // Mock createInvitation
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockInvitation, error: null }),
        }),
      });

      // Mock getSenderName (profiles query)
      const mockSelectProfile = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: { first_name: 'John', last_name: 'Doe' }, 
            error: null 
          }),
        }),
      });

      mockSupabaseFrom
        .mockReturnValueOnce({ select: mockSelectPending } as any)
        .mockReturnValueOnce({ insert: mockInsert } as any)
        .mockReturnValueOnce({ select: mockSelectProfile } as any);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await createAndSendInvitation('test@example.com', 'admin-id');

      expect(result).toEqual(mockInvitation);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should use provided sender name when given', async () => {
      // Mock hasPendingInvitation to return false
      const mockSelectPending = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      // Mock createInvitation
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockInvitation, error: null }),
        }),
      });

      mockSupabaseFrom
        .mockReturnValueOnce({ select: mockSelectPending } as any)
        .mockReturnValueOnce({ insert: mockInsert } as any);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await createAndSendInvitation('test@example.com', 'admin-id', 'Custom Sender');

      expect(result).toEqual(mockInvitation);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should throw error when pending invitation already exists', async () => {
      const mockSelectPending = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockResolvedValue({ data: [{ id: 'existing-id' }], error: null }),
          }),
        }),
      });
      mockSupabaseFrom.mockReturnValue({ select: mockSelectPending } as any);

      await expect(createAndSendInvitation('test@example.com', 'admin-id'))
        .rejects.toThrow('This email already has a pending invitation');
    });

    it('should handle email sending failures', async () => {
      // Mock hasPendingInvitation to return false
      const mockSelectPending = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      // Mock createInvitation
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockInvitation, error: null }),
        }),
      });

      // Mock getSenderName
      const mockSelectProfile = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: { first_name: 'John', last_name: 'Doe' }, 
            error: null 
          }),
        }),
      });

      mockSupabaseFrom
        .mockReturnValueOnce({ select: mockSelectPending } as any)
        .mockReturnValueOnce({ insert: mockInsert } as any)
        .mockReturnValueOnce({ select: mockSelectProfile } as any);

      // Mock email service to fail
      vi.doMock('./emailService', () => ({
        emailService: {
          sendInvitationEmail: vi.fn().mockResolvedValue({
            success: false,
            error: 'Email service error'
          })
        }
      }));

      await expect(createAndSendInvitation('test@example.com', 'admin-id'))
        .rejects.toThrow('Failed to send invitation email: Email service error');
    });
  });

  describe('getInvitationStats', () => {
    const mockInvitationsData = [
      { status: 'pending' },
      { status: 'pending' },
      { status: 'used' },
      { status: 'expired' },
    ];

    it('should return correct invitation statistics', async () => {
      const mockSelect = vi.fn().mockResolvedValue({ data: mockInvitationsData, error: null });
      mockSupabaseFrom.mockReturnValue({ select: mockSelect } as any);

      const result = await getInvitationStats();

      expect(result).toEqual({
        total: 4,
        pending: 2,
        used: 1,
        expired: 1,
      });
      expect(mockSelect).toHaveBeenCalledWith('status');
    });

    it('should return zero stats when no invitations exist', async () => {
      const mockSelect = vi.fn().mockResolvedValue({ data: [], error: null });
      mockSupabaseFrom.mockReturnValue({ select: mockSelect } as any);

      const result = await getInvitationStats();

      expect(result).toEqual({
        total: 0,
        pending: 0,
        used: 0,
        expired: 0,
      });
    });

    it('should return zero stats when database error occurs', async () => {
      const mockSelect = vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } });
      mockSupabaseFrom.mockReturnValue({ select: mockSelect } as any);

      const result = await getInvitationStats();

      expect(result).toEqual({
        total: 0,
        pending: 0,
        used: 0,
        expired: 0,
      });
    });
  });
});