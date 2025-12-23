import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CalendarFormIntegration } from './CalendarFormIntegration';
import type { User } from '@supabase/supabase-js';

// Mock Supabase
const mockSupabaseChain = {
  select: vi.fn(() => mockSupabaseChain),
  gte: vi.fn(() => mockSupabaseChain),
  lte: vi.fn(() => mockSupabaseChain),
  order: vi.fn(() => Promise.resolve({ data: [], error: null })),
  insert: vi.fn(() => mockSupabaseChain),
  update: vi.fn(() => mockSupabaseChain),
  delete: vi.fn(() => mockSupabaseChain),
  eq: vi.fn(() => mockSupabaseChain),
  in: vi.fn(() => mockSupabaseChain),
  single: vi.fn(() => Promise.resolve({ data: null, error: null }))
};

vi.mock('../utils/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseChain)
  }
}));

const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {}
};

describe('CalendarFormIntegration', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseChain.order.mockResolvedValue({ data: [], error: null });
  });

  it('should render calendar and form sections', async () => {
    render(
      <CalendarFormIntegration
        user={mockUser}
        mode="create"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument();
    });

    // Check that both sections are rendered
    expect(screen.getByText('New Reservation')).toBeInTheDocument();
    
    // Check calendar navigation
    expect(screen.getByLabelText('Previous month')).toBeInTheDocument();
    expect(screen.getByLabelText('Next month')).toBeInTheDocument();
    
    // Check form fields
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Number of Guests')).toBeInTheDocument();
    expect(screen.getByLabelText('Notes (optional)')).toBeInTheDocument();
    
    // Check form buttons
    expect(screen.getByText('Create Reservation')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should pre-populate form when editing existing reservation', async () => {
    const existingReservation = {
      id: 'test-reservation-id',
      user_id: mockUser.id,
      start_date: '2024-06-15',
      end_date: '2024-06-17',
      guest_count: 4,
      notes: 'Test reservation',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    render(
      <CalendarFormIntegration
        user={mockUser}
        mode="edit"
        existingReservation={existingReservation}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument();
    });

    // Check that form is pre-populated
    expect(screen.getByText('Edit Reservation')).toBeInTheDocument();
    
    const startDateInput = screen.getByLabelText('Start Date') as HTMLInputElement;
    const endDateInput = screen.getByLabelText('End Date') as HTMLInputElement;
    const guestCountInput = screen.getByLabelText('Number of Guests') as HTMLInputElement;
    const notesInput = screen.getByLabelText('Notes (optional)') as HTMLTextAreaElement;
    
    expect(startDateInput.value).toBe('2024-06-15');
    expect(endDateInput.value).toBe('2024-06-17');
    expect(guestCountInput.value).toBe('4');
    expect(notesInput.value).toBe('Test reservation');
  });

  it('should handle form field changes and update calendar selection', async () => {
    render(
      <CalendarFormIntegration
        user={mockUser}
        mode="create"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument();
    });

    // Change start date
    const startDateInput = screen.getByLabelText('Start Date') as HTMLInputElement;
    fireEvent.change(startDateInput, { target: { value: '2024-06-15' } });
    
    expect(startDateInput.value).toBe('2024-06-15');

    // Change end date
    const endDateInput = screen.getByLabelText('End Date') as HTMLInputElement;
    fireEvent.change(endDateInput, { target: { value: '2024-06-17' } });
    
    expect(endDateInput.value).toBe('2024-06-17');

    // Change guest count
    const guestCountInput = screen.getByLabelText('Number of Guests') as HTMLInputElement;
    fireEvent.change(guestCountInput, { target: { value: '6' } });
    
    expect(guestCountInput.value).toBe('6');
  });

  it('should call onCancel when cancel button is clicked', async () => {
    render(
      <CalendarFormIntegration
        user={mockUser}
        mode="create"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should validate form before submission', async () => {
    render(
      <CalendarFormIntegration
        user={mockUser}
        mode="create"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument();
    });

    // Set invalid date range (end before start)
    const startDateInput = screen.getByLabelText('Start Date') as HTMLInputElement;
    const endDateInput = screen.getByLabelText('End Date') as HTMLInputElement;
    
    fireEvent.change(startDateInput, { target: { value: '2024-06-20' } });
    fireEvent.change(endDateInput, { target: { value: '2024-06-15' } });

    // Try to submit with invalid date range
    const submitButton = screen.getByText('Create Reservation');
    fireEvent.click(submitButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('End date must be after start date')).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });
});