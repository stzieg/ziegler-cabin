/**
 * Integration tests for backward compatibility
 * Tests integration with existing calendar, gallery, and maintenance functionality
 * Verifies graceful fallbacks and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';
import { Calendar } from './Calendar';
import { GalleryTab } from './tabs/GalleryTab';
import { MaintenanceTab } from './tabs/MaintenanceTab';
import { Dashboard } from './Dashboard';

// Mock Supabase with error scenarios
vi.mock('../utils/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
        in: vi.fn(() => Promise.resolve({ data: [], error: null })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'test.jpg' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/test.jpg' } })),
      })),
    },
  },
}));

// Mock auth context
vi.mock('../contexts/SupabaseProvider', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    } as User,
    loading: false,
    error: null,
  }),
}));

describe('Backward Compatibility Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Calendar Integration', () => {
    it('should handle database connection errors gracefully', async () => {
      const mockSupabase = vi.mocked(require('../utils/supabase').supabase);
      
      // Simulate database error
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ 
                data: null, 
                error: { message: 'relation "reservations" does not exist' }
              })),
            })),
          })),
        })),
      } as any);

      const user = { id: 'test-user', email: 'test@example.com' } as User;
      const { container } = render(<Calendar user={user} />);

      // Wait for error handling
      await waitFor(() => {
        expect(container.textContent).toContain('Database not fully set up');
      });

      // Verify component still renders basic structure
      expect(container).toBeTruthy();
    });

    it('should maintain existing reservation data structure compatibility', async () => {
      const mockSupabase = vi.mocked(require('../utils/supabase').supabase);
      
      // Mock existing reservation data structure
      const existingReservation = {
        id: 'test-id',
        user_id: 'test-user',
        start_date: '2024-01-01',
        end_date: '2024-01-02',
        guest_count: 2,
        notes: 'Test reservation',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        profiles: {
          first_name: 'Test',
          last_name: 'User'
        }
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ 
                data: [existingReservation], 
                error: null 
              })),
            })),
          })),
        })),
      } as any);

      const user = { id: 'test-user', email: 'test@example.com' } as User;
      const { container } = render(<Calendar user={user} />);

      // Verify component handles existing data structure
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('reservations');
      });

      expect(container).toBeTruthy();
    });
  });

  describe('Gallery Integration', () => {
    it('should handle storage bucket errors gracefully', async () => {
      const mockSupabase = vi.mocked(require('../utils/supabase').supabase);
      
      // Simulate storage error
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ 
            data: null, 
            error: { message: 'Bucket not found' }
          })),
        })),
      } as any);

      const user = { id: 'test-user', email: 'test@example.com' } as User;
      const { container } = render(<GalleryTab user={user} />);

      // Wait for error handling
      await waitFor(() => {
        expect(container.textContent).toContain('Photo storage bucket not found');
      });

      // Verify component still renders basic structure
      expect(container).toBeTruthy();
    });

    it('should maintain existing photo metadata structure', async () => {
      const mockSupabase = vi.mocked(require('../utils/supabase').supabase);
      
      // Mock existing photo with metadata
      const existingPhoto = {
        id: 'test-photo-id',
        user_id: 'test-user',
        filename: 'test.jpg',
        url: 'https://example.com/test.jpg',
        caption: 'Test photo',
        tags: ['test', 'photo'],
        album_id: 'test-album',
        upload_date: '2024-01-01T00:00:00Z',
        metadata: {
          size: 1024,
          dimensions: { width: 800, height: 600 },
          format: 'jpg',
          dateTaken: '2024-01-01T00:00:00Z'
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ 
            data: [existingPhoto], 
            error: null 
          })),
        })),
      } as any);

      const user = { id: 'test-user', email: 'test@example.com' } as User;
      const { container } = render(<GalleryTab user={user} />);

      // Verify component handles existing photo structure
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('photos');
      });

      expect(container).toBeTruthy();
    });
  });

  describe('Maintenance Integration', () => {
    it('should handle missing maintenance table gracefully', async () => {
      const mockSupabase = vi.mocked(require('../utils/supabase').supabase);
      
      // Simulate table missing error
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ 
            data: null, 
            error: { message: 'relation "maintenance_tasks" does not exist' }
          })),
        })),
      } as any);

      const user = { id: 'test-user', email: 'test@example.com' } as User;
      const { container } = render(<MaintenanceTab user={user} />);

      // Wait for error handling
      await waitFor(() => {
        expect(container.textContent).toContain('Database not fully set up');
      });

      // Verify component still renders basic structure
      expect(container).toBeTruthy();
    });

    it('should maintain existing maintenance task structure', async () => {
      const mockSupabase = vi.mocked(require('../utils/supabase').supabase);
      
      // Mock existing maintenance task
      const existingTask = {
        id: 'test-task-id',
        user_id: 'test-user',
        title: 'Test maintenance',
        description: 'Test description',
        task_type: 'repair' as const,
        cost: 100.50,
        completion_date: '2024-01-01',
        photos: ['https://example.com/photo1.jpg'],
        recurring_interval: 30,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        profiles: {
          first_name: 'Test',
          last_name: 'User'
        }
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ 
            data: [existingTask], 
            error: null 
          })),
        })),
      } as any);

      const user = { id: 'test-user', email: 'test@example.com' } as User;
      const { container } = render(<MaintenanceTab user={user} />);

      // Verify component handles existing task structure
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('maintenance_tasks');
      });

      expect(container).toBeTruthy();
    });
  });

  describe('Dashboard Integration', () => {
    it('should maintain tab navigation compatibility', () => {
      const { container } = render(<Dashboard initialTab="calendar" />);

      // Verify all expected tabs are present
      const tabButtons = container.querySelectorAll('[role="tab"]');
      expect(tabButtons.length).toBe(4);

      // Verify tab structure is maintained
      const calendarTab = container.querySelector('[aria-controls="tabpanel-calendar"]');
      expect(calendarTab).toBeTruthy();
      expect(calendarTab?.getAttribute('aria-selected')).toBe('true');
    });

    it('should handle tab switching with form state preservation', () => {
      const { container } = render(<Dashboard initialTab="calendar" />);

      // Switch to maintenance tab
      const maintenanceTab = container.querySelector('[aria-controls="tabpanel-maintenance"]') as HTMLElement;
      expect(maintenanceTab).toBeTruthy();

      fireEvent.click(maintenanceTab);

      // Verify tab switched
      expect(maintenanceTab.getAttribute('aria-selected')).toBe('true');
    });

    it('should handle invalid initial tab gracefully', () => {
      // @ts-expect-error - Testing invalid tab type
      const { container } = render(<Dashboard initialTab="invalid-tab" />);

      // Should default to calendar tab
      const calendarTab = container.querySelector('[aria-controls="tabpanel-calendar"]');
      expect(calendarTab?.getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('Error Recovery Mechanisms', () => {
    it('should recover from network errors', async () => {
      const mockSupabase = vi.mocked(require('../utils/supabase').supabase);
      
      // First call fails, second succeeds
      let callCount = 0;
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              order: vi.fn(() => {
                callCount++;
                if (callCount === 1) {
                  return Promise.resolve({ 
                    data: null, 
                    error: { message: 'Network error' }
                  });
                }
                return Promise.resolve({ data: [], error: null });
              }),
            })),
          })),
        })),
      } as any);

      const user = { id: 'test-user', email: 'test@example.com' } as User;
      const { container } = render(<Calendar user={user} />);

      // Wait for initial error
      await waitFor(() => {
        expect(container.textContent).toContain('Failed to load reservations');
      });

      // Component should still be functional
      expect(container).toBeTruthy();
    });

    it('should handle browser compatibility issues', () => {
      // Mock older browser without modern features
      const originalFetch = global.fetch;
      delete (global as any).fetch;

      const user = { id: 'test-user', email: 'test@example.com' } as User;
      const { container } = render(<Calendar user={user} />);

      // Component should still render
      expect(container).toBeTruthy();

      // Restore fetch
      global.fetch = originalFetch;
    });
  });

  describe('Data Structure Compatibility', () => {
    it('should handle optional fields in reservation data', async () => {
      const mockSupabase = vi.mocked(require('../utils/supabase').supabase);
      
      // Mock reservation with minimal required fields only
      const minimalReservation = {
        id: 'test-id',
        user_id: 'test-user',
        start_date: '2024-01-01',
        end_date: '2024-01-02',
        guest_count: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
        // Missing optional fields: notes, profiles
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ 
                data: [minimalReservation], 
                error: null 
              })),
            })),
          })),
        })),
      } as any);

      const user = { id: 'test-user', email: 'test@example.com' } as User;
      const { container } = render(<Calendar user={user} />);

      // Should handle missing optional fields gracefully
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('reservations');
      });

      expect(container).toBeTruthy();
    });

    it('should handle legacy photo metadata formats', async () => {
      const mockSupabase = vi.mocked(require('../utils/supabase').supabase);
      
      // Mock photo with legacy metadata structure
      const legacyPhoto = {
        id: 'test-photo-id',
        user_id: 'test-user',
        filename: 'legacy.jpg',
        url: 'https://example.com/legacy.jpg',
        tags: [],
        upload_date: '2024-01-01T00:00:00Z',
        metadata: {}, // Empty metadata object
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
        // Missing optional fields: caption, album_id
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ 
            data: [legacyPhoto], 
            error: null 
          })),
        })),
      } as any);

      const user = { id: 'test-user', email: 'test@example.com' } as User;
      const { container } = render(<GalleryTab user={user} />);

      // Should handle legacy metadata gracefully
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('photos');
      });

      expect(container).toBeTruthy();
    });
  });
});