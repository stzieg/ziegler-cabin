import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { registerWithInvitation } from './auth';

// Mock Supabase
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        error: null,
      })),
    })),
  },
}));

// Mock invitations utility
vi.mock('./invitations', () => ({
  markInvitationAsUsed: vi.fn(),
}));

describe('Auth Utilities - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * **Feature: cabin-home-page, Property 12: Supabase Auth usage**
   * **Validates: Requirements 7.2**
   * 
   * For any authentication operation (login, logout, registration), the system 
   * should use Supabase Auth for user management.
   */
  it('Property 12: Supabase Auth usage - registration should use Supabase Auth', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid registration data
        fc.emailAddress(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => 
          /[A-Z]/.test(s) && /[a-z]/.test(s) && /\d/.test(s)
        ), // Strong password
        fc.record({
          first_name: fc.string({ minLength: 1, maxLength: 20 }),
          last_name: fc.string({ minLength: 1, maxLength: 20 }),
          phone_number: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
          is_admin: fc.boolean(),
        }),
        fc.uuid(), // invitation token
        async (email, password, profileData, invitationToken) => {
          const { supabase } = await import('./supabase');
          const { markInvitationAsUsed } = await import('./invitations');
          
          // Mock successful Supabase Auth signup
          const mockUser = {
            id: fc.sample(fc.uuid(), 1)[0],
            email,
            created_at: new Date().toISOString(),
          };
          
          (supabase.auth.signUp as any).mockResolvedValue({
            data: { user: mockUser },
            error: null,
          });
          
          // Mock successful profile creation
          (supabase.from as any).mockReturnValue({
            insert: vi.fn().mockReturnValue({
              error: null,
            }),
          });
          
          // Mock successful invitation marking
          (markInvitationAsUsed as any).mockResolvedValue(undefined);
          
          // Act: Call the registration function
          await registerWithInvitation(email, password, profileData, invitationToken);
          
          // Assert: Verify Supabase Auth was used for user creation
          expect(supabase.auth.signUp).toHaveBeenCalledWith({
            email,
            password,
          });
          
          // Assert: Verify Supabase database was used for profile creation
          expect(supabase.from).toHaveBeenCalledWith('profiles');
          
          // Assert: Verify invitation was marked as used
          expect(markInvitationAsUsed).toHaveBeenCalledWith(invitationToken, mockUser.id);
        }
      ),
      { numRuns: 10 } // Reduced runs for faster testing
    );
  });

  /**
   * Property: Registration should handle Supabase Auth errors properly
   * This complements the main property to ensure error handling works
   */
  it('Property 12 (error handling): Registration should handle Supabase Auth errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8, maxLength: 20 }),
        fc.record({
          first_name: fc.string({ minLength: 1, maxLength: 20 }),
          last_name: fc.string({ minLength: 1, maxLength: 20 }),
          phone_number: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
          is_admin: fc.boolean(),
        }),
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }), // error message
        async (email, password, profileData, invitationToken, errorMessage) => {
          const { supabase } = await import('./supabase');
          
          // Mock Supabase Auth signup error
          (supabase.auth.signUp as any).mockResolvedValue({
            data: { user: null },
            error: { message: errorMessage },
          });
          
          // Act & Assert: Registration should throw the error
          await expect(
            registerWithInvitation(email, password, profileData, invitationToken)
          ).rejects.toEqual({ message: errorMessage });
          
          // Assert: Verify Supabase Auth was called
          expect(supabase.auth.signUp).toHaveBeenCalledWith({
            email,
            password,
          });
        }
      ),
      { numRuns: 10 }
    );
  });
});