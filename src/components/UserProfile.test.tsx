import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserProfile } from './UserProfile';
import { SupabaseProvider } from '../contexts/SupabaseProvider';
import { supabase } from '../utils/supabase';

// Mock Supabase client
vi.mock('../utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
  getCurrentUser: vi.fn(),
  getCurrentSession: vi.fn(),
  getUserProfile: vi.fn(),
}));

describe('UserProfile Component', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Default mock implementations
    const mockSubscription = { unsubscribe: vi.fn() };
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: mockSubscription }
    });
    
    (supabase.auth.signOut as any).mockResolvedValue({ error: null });
    
    // Mock the utility functions
    const { getCurrentSession, getUserProfile } = await import('../utils/supabase');
    (getCurrentSession as any).mockResolvedValue({
      user: { id: 'test-user', email: 'test@example.com' },
      access_token: 'token'
    });
    (getUserProfile as any).mockResolvedValue({
      id: 'test-user',
      first_name: 'John',
      last_name: 'Doe',
      phone_number: '123-456-7890',
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  it('should render user profile information', async () => {
    render(
      <SupabaseProvider>
        <UserProfile />
      </SupabaseProvider>
    );

    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('User Profile')).toBeInTheDocument();
    });

    // Check if user information is displayed
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Doe')).toBeInTheDocument();
    expect(screen.getByText('123-456-7890')).toBeInTheDocument();
  });

  it('should have logout button', async () => {
    render(
      <SupabaseProvider>
        <UserProfile />
      </SupabaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });
  });

  it('should have edit profile button', async () => {
    render(
      <SupabaseProvider>
        <UserProfile />
      </SupabaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    });
  });

  it('should enter edit mode when edit button is clicked', async () => {
    render(
      <SupabaseProvider>
        <UserProfile />
      </SupabaseProvider>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('User Profile')).toBeInTheDocument();
    });

    // Click edit button
    const editButton = screen.getByRole('button', { name: /edit profile/i });
    fireEvent.click(editButton);

    // Check if edit form appears
    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });
});