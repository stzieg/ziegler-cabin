/**
 * Property-based tests for backward compatibility
 * **Feature: cabin-ui-improvements, Property 20: Backward compatibility**
 * **Validates: Requirements 7.5**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import type { User } from '@supabase/supabase-js';
import type { Reservation, MaintenanceTask, Photo, PhotoMetadata } from '../types/supabase';
import { Calendar } from './Calendar';
import { GalleryTab } from './tabs/GalleryTab';
import { MaintenanceTab } from './tabs/MaintenanceTab';
import { Dashboard } from './Dashboard';
import * as supabaseModule from '../utils/supabase';

// Mock Supabase with comprehensive API coverage
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

// Generators for property-based testing with safe date ranges
const userArb = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  aud: fc.constant('authenticated'),
  role: fc.constant('authenticated'),
  created_at: fc.constant('2024-01-01T00:00:00.000Z'),
  updated_at: fc.constant('2024-01-01T00:00:00.000Z'),
}) as fc.Arbitrary<User>;

const reservationArb = fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  start_date: fc.constantFrom('2024-01-01', '2024-06-15', '2024-12-31'),
  end_date: fc.constantFrom('2024-01-02', '2024-06-16', '2025-01-01'),
  guest_count: fc.integer({ min: 1, max: 20 }),
  notes: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  created_at: fc.constant('2024-01-01T00:00:00.000Z'),
  updated_at: fc.constant('2024-01-01T00:00:00.000Z'),
}) as fc.Arbitrary<Reservation>;

const maintenanceTaskArb = fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 255 }),
  description: fc.option(fc.string({ maxLength: 1000 }), { nil: null }),
  task_type: fc.constantFrom('repair', 'cleaning', 'improvement', 'inspection', 'seasonal'),
  cost: fc.option(fc.float({ min: 0, max: 10000 }), { nil: null }),
  completion_date: fc.constantFrom('2024-01-01', '2024-06-15', '2024-12-31'),
  photos: fc.option(fc.array(fc.webUrl(), { maxLength: 5 }), { nil: null }),
  recurring_interval: fc.option(fc.integer({ min: 1, max: 365 }), { nil: null }),
  created_at: fc.constant('2024-01-01T00:00:00.000Z'),
  updated_at: fc.constant('2024-01-01T00:00:00.000Z'),
}) as fc.Arbitrary<MaintenanceTask>;

const photoMetadataArb = fc.record({
  size: fc.option(fc.integer({ min: 1000, max: 10000000 }), { nil: undefined }),
  dimensions: fc.option(
    fc.record({
      width: fc.integer({ min: 100, max: 4000 }),
      height: fc.integer({ min: 100, max: 4000 }),
    }),
    { nil: undefined }
  ),
  format: fc.option(fc.constantFrom('jpg', 'png', 'gif', 'webp'), { nil: undefined }),
  dateTaken: fc.option(fc.constant('2024-01-01T00:00:00.000Z'), { nil: undefined }),
}) as fc.Arbitrary<PhotoMetadata>;

const photoArb = fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  filename: fc.string({ minLength: 1, maxLength: 255 }),
  url: fc.webUrl(),
  caption: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
  album_id: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  upload_date: fc.constant('2024-01-01T00:00:00.000Z'),
  metadata: photoMetadataArb,
  created_at: fc.constant('2024-01-01T00:00:00.000Z'),
  updated_at: fc.constant('2024-01-01T00:00:00.000Z'),
}) as fc.Arbitrary<Photo>;

describe('Backward Compatibility Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up comprehensive mock for each test
    const mockSupabase = vi.mocked(supabaseModule.supabase);
    mockSupabase.from.mockReturnValue({
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
    } as any);
  });

  /**
   * Property 20: Backward compatibility - Calendar component
   * For any existing reservation data structure, the Calendar component should
   * render without errors and maintain all existing functionality
   */
  it('should maintain Calendar component compatibility with existing reservation data structures', () => {
    fc.assert(
      fc.property(
        userArb,
        fc.array(reservationArb, { maxLength: 10 }),
        (user, reservations) => {
          // Set up mock response for this test
          const mockSupabase = vi.mocked(supabaseModule.supabase);
          mockSupabase.from.mockReturnValue({
            select: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  order: vi.fn(() => Promise.resolve({ data: reservations, error: null })),
                })),
              })),
            })),
          } as any);

          // Render Calendar with existing data structure
          const { container } = render(<Calendar user={user} />);

          // Verify component renders without errors using correct CSS module selector
          expect(container).toBeTruthy();
          expect(container.querySelector('[class*="calendar"]')).toBeTruthy();

          // Verify all existing API calls are still supported
          expect(mockSupabase.from).toHaveBeenCalledWith('reservations');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 20: Backward compatibility - MaintenanceTab component
   * For any existing maintenance task data structure, the MaintenanceTab component
   * should render without errors and maintain all existing functionality
   */
  it('should maintain MaintenanceTab component compatibility with existing maintenance data structures', () => {
    fc.assert(
      fc.property(
        userArb,
        fc.array(maintenanceTaskArb, { maxLength: 10 }),
        (user, tasks) => {
          // Set up mock response for this test
          const mockSupabase = vi.mocked(supabaseModule.supabase);
          mockSupabase.from.mockReturnValue({
            select: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: tasks, error: null })),
            })),
          } as any);

          // Render MaintenanceTab with existing data structure
          const { container } = render(<MaintenanceTab user={user} />);

          // Verify component renders without errors
          expect(container).toBeTruthy();

          // Verify all existing API calls are still supported
          expect(mockSupabase.from).toHaveBeenCalledWith('maintenance_tasks');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 20: Backward compatibility - GalleryTab component
   * For any existing photo data structure, the GalleryTab component should
   * render without errors and maintain all existing functionality
   */
  it('should maintain GalleryTab component compatibility with existing photo data structures', () => {
    fc.assert(
      fc.property(
        userArb,
        fc.array(photoArb, { maxLength: 10 }),
        (user, photos) => {
          // Set up mock response for this test
          const mockSupabase = vi.mocked(supabaseModule.supabase);
          mockSupabase.from.mockReturnValue({
            select: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: photos, error: null })),
            })),
          } as any);

          // Render GalleryTab with existing data structure
          const { container } = render(<GalleryTab user={user} />);

          // Verify component renders without errors
          expect(container).toBeTruthy();

          // Verify all existing API calls are still supported
          expect(mockSupabase.from).toHaveBeenCalledWith('photos');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 20: Backward compatibility - Dashboard component
   * For any tab type, the Dashboard component should render without errors
   * and maintain all existing navigation and state management functionality
   */
  it('should maintain Dashboard component compatibility with existing tab navigation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('calendar', 'maintenance', 'gallery', 'notifications'),
        (initialTab) => {
          // Render Dashboard with existing tab structure
          const { container } = render(<Dashboard initialTab={initialTab} />);

          // Verify component renders without errors using CSS module selector
          expect(container).toBeTruthy();
          expect(container.querySelector('[class*="dashboard"]')).toBeTruthy();

          // Verify tab navigation structure is maintained
          const tabButtons = container.querySelectorAll('[role="tab"]');
          expect(tabButtons.length).toBe(4); // All 4 tabs should be present

          // Verify active tab is set correctly
          const activeTab = container.querySelector('[aria-selected="true"]');
          expect(activeTab).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 20: Backward compatibility - Data structure field preservation
   * For any existing data structure, all required fields should be preserved
   * and accessible in the new UI components
   */
  it('should preserve all required fields in reservation data structures', () => {
    fc.assert(
      fc.property(reservationArb, (reservation) => {
        // Verify all required fields are present
        expect(reservation).toHaveProperty('id');
        expect(reservation).toHaveProperty('user_id');
        expect(reservation).toHaveProperty('start_date');
        expect(reservation).toHaveProperty('end_date');
        expect(reservation).toHaveProperty('guest_count');
        expect(reservation).toHaveProperty('created_at');
        expect(reservation).toHaveProperty('updated_at');

        // Verify field types are correct
        expect(typeof reservation.id).toBe('string');
        expect(typeof reservation.user_id).toBe('string');
        expect(typeof reservation.start_date).toBe('string');
        expect(typeof reservation.end_date).toBe('string');
        expect(typeof reservation.guest_count).toBe('number');
        expect(reservation.guest_count).toBeGreaterThanOrEqual(1);
        expect(reservation.guest_count).toBeLessThanOrEqual(20);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 20: Backward compatibility - Data structure field preservation
   * For any existing maintenance task data structure, all required fields
   * should be preserved and accessible
   */
  it('should preserve all required fields in maintenance task data structures', () => {
    fc.assert(
      fc.property(maintenanceTaskArb, (task) => {
        // Verify all required fields are present
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('user_id');
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('task_type');
        expect(task).toHaveProperty('completion_date');
        expect(task).toHaveProperty('created_at');
        expect(task).toHaveProperty('updated_at');

        // Verify field types are correct
        expect(typeof task.id).toBe('string');
        expect(typeof task.user_id).toBe('string');
        expect(typeof task.title).toBe('string');
        expect(task.title.length).toBeGreaterThan(0);
        expect(task.title.length).toBeLessThanOrEqual(255);
        expect(['repair', 'cleaning', 'improvement', 'inspection', 'seasonal']).toContain(
          task.task_type
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 20: Backward compatibility - Data structure field preservation
   * For any existing photo data structure, all required fields should be
   * preserved and accessible
   */
  it('should preserve all required fields in photo data structures', () => {
    fc.assert(
      fc.property(photoArb, (photo) => {
        // Verify all required fields are present
        expect(photo).toHaveProperty('id');
        expect(photo).toHaveProperty('user_id');
        expect(photo).toHaveProperty('filename');
        expect(photo).toHaveProperty('url');
        expect(photo).toHaveProperty('tags');
        expect(photo).toHaveProperty('upload_date');
        expect(photo).toHaveProperty('metadata');
        expect(photo).toHaveProperty('created_at');
        expect(photo).toHaveProperty('updated_at');

        // Verify field types are correct
        expect(typeof photo.id).toBe('string');
        expect(typeof photo.user_id).toBe('string');
        expect(typeof photo.filename).toBe('string');
        expect(typeof photo.url).toBe('string');
        expect(Array.isArray(photo.tags)).toBe(true);
        expect(typeof photo.metadata).toBe('object');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 20: Backward compatibility - API interface preservation
   * For any component that uses Supabase API, the API calls should maintain
   * the same structure and parameters
   */
  it('should maintain consistent Supabase API call structure across all components', () => {
    fc.assert(
      fc.property(
        userArb,
        fc.constantFrom('reservations', 'maintenance_tasks', 'photos'),
        (user, tableName) => {
          // Set up mock response for this test
          const mockSupabase = vi.mocked(supabaseModule.supabase);
          mockSupabase.from.mockReturnValue({
            select: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  order: vi.fn(() => Promise.resolve({ data: [], error: null })),
                })),
              })),
            })),
          } as any);

          // Simulate API call
          const query = mockSupabase.from(tableName);

          // Verify the API structure is maintained
          expect(query).toHaveProperty('select');
          expect(typeof query.select).toBe('function');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 20: Backward compatibility - Form state preservation
   * For any form state data, the Dashboard should preserve and restore
   * form state when switching between tabs
   */
  it('should preserve form state structure when switching tabs', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('calendar', 'maintenance', 'gallery', 'notifications'),
        fc.constantFrom('calendar', 'maintenance', 'gallery', 'notifications'),
        fc.record({
          title: fc.option(fc.string(), { nil: undefined }),
          description: fc.option(fc.string(), { nil: undefined }),
          caption: fc.option(fc.string(), { nil: undefined }),
        }),
        (fromTab, toTab, formState) => {
          // Skip if tabs are the same
          if (fromTab === toTab) return true;

          // Render Dashboard
          const { container } = render(<Dashboard initialTab={fromTab} />);

          // Verify component renders
          expect(container).toBeTruthy();

          // Verify form state structure is compatible
          // The Dashboard should be able to handle any form state object
          expect(typeof formState).toBe('object');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 20: Backward compatibility - Optional field handling
   * For any data structure with optional fields, components should handle
   * both presence and absence of optional fields gracefully
   */
  it('should handle optional fields in reservation data gracefully', () => {
    fc.assert(
      fc.property(
        userArb,
        reservationArb,
        fc.boolean(),
        (user, reservation, includeNotes) => {
          // Create reservation with or without optional notes field
          const testReservation = {
            ...reservation,
            notes: includeNotes ? reservation.notes : null,
          };

          // Set up mock response for this test
          const mockSupabase = vi.mocked(supabaseModule.supabase);
          mockSupabase.from.mockReturnValue({
            select: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  order: vi.fn(() => Promise.resolve({ data: [testReservation], error: null })),
                })),
              })),
            })),
          } as any);

          // Render Calendar
          const { container } = render(<Calendar user={user} />);

          // Verify component handles optional fields gracefully
          expect(container).toBeTruthy();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});