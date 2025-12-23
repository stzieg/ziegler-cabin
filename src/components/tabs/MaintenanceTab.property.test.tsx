import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { MaintenanceTab } from './MaintenanceTab';
import type { MaintenanceTask, MaintenanceType } from '../../types';

/**
 * Property-Based Tests for MaintenanceTab Component
 * Using fast-check for property-based testing
 */

// Mock Supabase
vi.mock('../../utils/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          })),
          lte: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }
}));

// Mock user for testing
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: '2023-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  role: 'authenticated'
};

describe('MaintenanceTab Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * **Feature: cabin-dashboard-expansion, Property 3: Maintenance Data Completeness**
   * **Validates: Requirements 3.2**
   * 
   * Property 3: Maintenance Data Completeness
   * For any maintenance task creation, all required fields (title, description, task_type, completion_date) 
   * should be captured and validated
   */
  it('should validate that all required maintenance task fields are captured and validated', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate maintenance task data with all required fields
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
          description: fc.option(fc.string({ minLength: 0, maxLength: 1000 })),
          task_type: fc.constantFrom('repair', 'cleaning', 'improvement', 'inspection', 'seasonal') as fc.Arbitrary<MaintenanceType>,
          completion_date: fc.integer({ min: 2020, max: 2030 }).chain(year => 
            fc.integer({ min: 1, max: 12 }).chain(month =>
              fc.integer({ min: 1, max: 28 }).map(day => 
                `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
              )
            )
          ),
          cost: fc.option(fc.float({ min: 0, max: 100000, noNaN: true })),
          photos: fc.option(fc.array(fc.webUrl(), { maxLength: 10 })),
          recurring_interval: fc.option(fc.integer({ min: 1, max: 365 }))
        }),
        async (taskData) => {
          // Clean up before each test iteration
          cleanup();

          const { container } = render(
            <MaintenanceTab user={mockUser} />
          );

          // Wait for component to load and click "Add Task" to show the form
          await waitFor(() => {
            const addButton = container.querySelector('button') as HTMLButtonElement;
            expect(addButton).toBeInTheDocument();
          });

          const addButton = container.querySelector('button') as HTMLButtonElement;
          fireEvent.click(addButton);

          // Wait for form to appear
          await waitFor(() => {
            const form = container.querySelector('form[data-testid="maintenance-form"]');
            expect(form).toBeInTheDocument();
          });

          // Find the maintenance task form
          const form = container.querySelector('form[data-testid="maintenance-form"]');
          expect(form).toBeInTheDocument();

          // Fill in required fields
          const titleInput = container.querySelector('input[name="title"]') as HTMLInputElement;
          const taskTypeSelect = container.querySelector('select[name="task_type"]') as HTMLSelectElement;
          const completionDateInput = container.querySelector('input[name="completion_date"]') as HTMLInputElement;

          expect(titleInput).toBeInTheDocument();
          expect(taskTypeSelect).toBeInTheDocument();
          expect(completionDateInput).toBeInTheDocument();

          // Test that all required fields are present and can be filled
          fireEvent.change(titleInput, { target: { value: taskData.title } });
          fireEvent.change(taskTypeSelect, { target: { value: taskData.task_type } });
          fireEvent.change(completionDateInput, { target: { value: taskData.completion_date } });

          // Fill optional fields if provided
          if (taskData.description !== null) {
            const descriptionTextarea = container.querySelector('textarea[name="description"]') as HTMLTextAreaElement;
            expect(descriptionTextarea).toBeInTheDocument();
            fireEvent.change(descriptionTextarea, { target: { value: taskData.description || '' } });
          }

          if (taskData.cost !== null) {
            const costInput = container.querySelector('input[name="cost"]') as HTMLInputElement;
            expect(costInput).toBeInTheDocument();
            fireEvent.change(costInput, { target: { value: taskData.cost?.toString() || '' } });
          }

          // Verify that form validation works for required fields
          expect(titleInput.value).toBe(taskData.title);
          expect(taskTypeSelect.value).toBe(taskData.task_type);
          expect(completionDateInput.value).toBe(taskData.completion_date);

          // Test form submission validation
          const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
          expect(submitButton).toBeInTheDocument();

          // Form should be submittable when all required fields are filled
          expect(titleInput.checkValidity()).toBe(true);
          expect(taskTypeSelect.checkValidity()).toBe(true);
          expect(completionDateInput.checkValidity()).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that empty or invalid required fields are properly rejected
   */
  it('should reject maintenance tasks with missing or invalid required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate invalid task data
        fc.record({
          title: fc.option(fc.string({ maxLength: 255 })), // Can be null or empty
          task_type: fc.option(fc.constantFrom('repair', 'cleaning', 'improvement', 'inspection', 'seasonal')), // Can be null
          completion_date: fc.option(fc.string()) // Can be null or invalid date
        }),
        async (invalidTaskData) => {
          // Skip if all fields are valid (we want to test invalid cases)
          if (invalidTaskData.title && invalidTaskData.title.trim().length > 0 && 
              invalidTaskData.task_type && 
              invalidTaskData.completion_date && 
              /^\d{4}-\d{2}-\d{2}$/.test(invalidTaskData.completion_date)) {
            return; // Skip valid cases
          }

          cleanup();

          const { container } = render(
            <MaintenanceTab user={mockUser} />
          );

          // Wait for component to load and click "Add Task" to show the form
          await waitFor(() => {
            const addButton = container.querySelector('button') as HTMLButtonElement;
            expect(addButton).toBeInTheDocument();
          });

          const addButton = container.querySelector('button') as HTMLButtonElement;
          fireEvent.click(addButton);

          // Wait for form to appear
          await waitFor(() => {
            const form = container.querySelector('form[data-testid="maintenance-form"]');
            expect(form).toBeInTheDocument();
          });

          const form = container.querySelector('form[data-testid="maintenance-form"]');
          expect(form).toBeInTheDocument();

          // Fill form with invalid data
          const titleInput = container.querySelector('input[name="title"]') as HTMLInputElement;
          const taskTypeSelect = container.querySelector('select[name="task_type"]') as HTMLSelectElement;
          const completionDateInput = container.querySelector('input[name="completion_date"]') as HTMLInputElement;

          // Always set values, using empty string for null values to trigger validation
          fireEvent.change(titleInput, { target: { value: invalidTaskData.title || '' } });
          fireEvent.change(taskTypeSelect, { target: { value: invalidTaskData.task_type || '' } });
          fireEvent.change(completionDateInput, { target: { value: invalidTaskData.completion_date || '' } });

          // At least one required field should be invalid
          const isFormValid = titleInput.checkValidity() && 
                             taskTypeSelect.checkValidity() && 
                             completionDateInput.checkValidity();
          
          expect(isFormValid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});