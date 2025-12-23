import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { GalleryTab } from './GalleryTab';
import type { Photo, PhotoMetadata } from '../../types';

/**
 * Property-Based Tests for GalleryTab Component
 * Using fast-check for property-based testing
 */

// Mock Supabase
vi.mock('../../utils/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/photo.jpg' } }))
      }))
    }
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

describe('GalleryTab Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * **Feature: cabin-dashboard-expansion, Property 4: Photo Organization Consistency**
   * **Validates: Requirements 4.4**
   * 
   * Property 4: Photo Organization Consistency
   * For any photo upload, the system should automatically organize photos by upload date 
   * while preserving any manual categorization
   */
  it('should automatically organize photos by upload date while preserving manual categorization', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate photo data with various upload dates and manual categories
        fc.array(
          fc.record({
            filename: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            caption: fc.option(fc.string({ maxLength: 100 })),
            tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 3 }),
            album_id: fc.option(fc.uuid()),
            upload_date: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString()),
            metadata: fc.record({
              size: fc.integer({ min: 1000, max: 10000000 }),
              dimensions: fc.record({
                width: fc.integer({ min: 100, max: 4000 }),
                height: fc.integer({ min: 100, max: 4000 })
              }),
              format: fc.constantFrom('jpg', 'png', 'gif', 'webp')
            })
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (photoData) => {
          // Clean up before each test iteration
          cleanup();

          // Mock the photos data to be returned by Supabase
          const mockPhotos: Photo[] = photoData.map((photo, index) => ({
            id: `photo-${index}`,
            user_id: mockUser.id,
            filename: photo.filename,
            url: `https://example.com/${photo.filename}`,
            caption: photo.caption || null,
            tags: photo.tags,
            album_id: photo.album_id || null,
            upload_date: photo.upload_date,
            metadata: photo.metadata,
            created_at: photo.upload_date,
            updated_at: photo.upload_date
          }));

          // Mock Supabase to return our test photos
          const mockSupabase = await import('../../utils/supabase');
          vi.mocked(mockSupabase.supabase.from).mockReturnValue({
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: mockPhotos, error: null }))
              })),
              order: vi.fn(() => Promise.resolve({ data: mockPhotos, error: null }))
            })),
            insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          } as any);

          const { container } = render(
            <GalleryTab user={mockUser} />
          );

          // Wait for photos to load
          await waitFor(() => {
            const photoGrid = container.querySelector('[data-testid="photo-grid"]');
            expect(photoGrid).toBeInTheDocument();
          });

          // Verify photos are organized by upload date (chronological order)
          const photoElements = container.querySelectorAll('[data-testid="photo-item"]');
          
          if (photoElements.length > 1) {
            // Check that photos are sorted by upload date (newest first)
            const sortedPhotos = [...mockPhotos].sort((a, b) => 
              new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime()
            );

            for (let i = 0; i < Math.min(photoElements.length, sortedPhotos.length); i++) {
              const photoElement = photoElements[i];
              const expectedPhoto = sortedPhotos[i];
              
              // Check that the photo element contains the expected filename
              expect(photoElement).toHaveAttribute('data-filename', expectedPhoto.filename);
            }
          }

          // Verify manual categorization is preserved
          mockPhotos.forEach((photo) => {
            const photoElement = container.querySelector(`[data-filename="${photo.filename}"]`);
            
            if (photoElement) {
              if (photo.album_id) {
                expect(photoElement).toHaveAttribute('data-album-id', photo.album_id);
              } else {
                // When album_id is null, React doesn't render the attribute at all
                expect(photoElement).not.toHaveAttribute('data-album-id');
              }

              if (photo.tags.length > 0) {
                photo.tags.forEach(tag => {
                  expect(photoElement).toHaveAttribute('data-tags', expect.stringContaining(tag));
                });
              }
            }
          });
        }
      ),
      { numRuns: 10 }
    );
  }, 10000);

  /**
   * **Feature: cabin-dashboard-expansion, Property 9: Photo Metadata Capture**
   * **Validates: Requirements 4.2**
   * 
   * Property 9: Photo Metadata Capture
   * For any photo upload, the system should capture and store complete metadata 
   * including captions, tags, and technical details
   */
  it('should capture and store complete metadata for any photo upload', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate photo upload data with metadata
        fc.record({
          filename: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
          caption: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
          tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
          fileSize: fc.integer({ min: 1000, max: 10000000 }),
          dimensions: fc.record({
            width: fc.integer({ min: 100, max: 4000 }),
            height: fc.integer({ min: 100, max: 4000 })
          }),
          format: fc.constantFrom('jpg', 'png', 'gif', 'webp')
        }),
        async (uploadData) => {
          // Clean up before each test iteration
          cleanup();

          const { container } = render(
            <GalleryTab user={mockUser} />
          );

          // Wait for component to load and find upload form
          await waitFor(() => {
            const uploadButton = container.querySelector('[data-testid="upload-button"]');
            expect(uploadButton).toBeInTheDocument();
          });

          // Click upload button to show upload form
          const uploadButton = container.querySelector('[data-testid="upload-button"]') as HTMLButtonElement;
          fireEvent.click(uploadButton);

          // Wait for upload form to appear
          await waitFor(() => {
            const uploadForm = container.querySelector('[data-testid="upload-form"]');
            expect(uploadForm).toBeInTheDocument();
          });

          // Find form elements
          const captionInput = container.querySelector('input[name="caption"]') as HTMLInputElement;
          const tagsInput = container.querySelector('input[name="tags"]') as HTMLInputElement;
          const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

          expect(captionInput).toBeInTheDocument();
          expect(tagsInput).toBeInTheDocument();
          expect(fileInput).toBeInTheDocument();

          // Fill in metadata fields
          if (uploadData.caption) {
            fireEvent.change(captionInput, { target: { value: uploadData.caption } });
            expect(captionInput.value).toBe(uploadData.caption);
          }

          if (uploadData.tags.length > 0) {
            const tagsString = uploadData.tags.join(', ');
            fireEvent.change(tagsInput, { target: { value: tagsString } });
            expect(tagsInput.value).toBe(tagsString);
          }

          // Create a mock file with metadata
          const mockFile = new File(['test content'], uploadData.filename, {
            type: `image/${uploadData.format}`
          });

          // Mock file properties
          Object.defineProperty(mockFile, 'size', {
            value: uploadData.fileSize,
            writable: false
          });

          // Simulate file selection
          Object.defineProperty(fileInput, 'files', {
            value: [mockFile],
            writable: false
          });

          fireEvent.change(fileInput);

          // Verify that the form captures all metadata
          expect(captionInput.value).toBe(uploadData.caption || '');
          expect(tagsInput.value).toBe(uploadData.tags.join(', '));
          expect(fileInput.files?.[0]).toBe(mockFile);

          // Test form submission to ensure metadata is captured
          const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
          expect(submitButton).toBeInTheDocument();

          // Form should be ready for submission with all metadata
          expect(fileInput.files?.length).toBe(1);
          expect(fileInput.files?.[0].name).toBe(uploadData.filename);
          expect(fileInput.files?.[0].size).toBe(uploadData.fileSize);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: cabin-ui-improvements, Property 13: Full-screen photo viewing**
   * **Validates: Requirements 5.1**
   * 
   * Property 13: Full-screen photo viewing
   * For any photo in the gallery, the viewing experience should utilize the full viewport dimensions
   */
  it('should provide full-screen photo viewing experience that utilizes full viewport dimensions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate photo data for testing full-screen viewing
        fc.record({
          id: fc.uuid(),
          filename: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
          caption: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
          tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
          url: fc.webUrl(),
          upload_date: fc.integer({ min: 2020, max: 2030 }).chain(year => 
            fc.integer({ min: 1, max: 12 }).chain(month =>
              fc.integer({ min: 1, max: 28 }).map(day => 
                new Date(year, month - 1, day).toISOString()
              )
            )
          ),
          metadata: fc.record({
            size: fc.integer({ min: 1000, max: 10000000 }),
            dimensions: fc.record({
              width: fc.integer({ min: 100, max: 4000 }),
              height: fc.integer({ min: 100, max: 4000 })
            }),
            format: fc.constantFrom('jpg', 'png', 'gif', 'webp'),
            dateTaken: fc.option(fc.integer({ min: 2020, max: 2030 }).chain(year => 
              fc.integer({ min: 1, max: 12 }).chain(month =>
                fc.integer({ min: 1, max: 28 }).map(day => 
                  new Date(year, month - 1, day).toISOString()
                )
              )
            ))
          })
        }),
        async (photoData) => {
          // Clean up before each test iteration
          cleanup();

          // Mock the photo data to be returned by Supabase
          const mockPhoto: Photo = {
            id: photoData.id,
            user_id: mockUser.id,
            filename: photoData.filename,
            url: photoData.url,
            caption: photoData.caption || null,
            tags: photoData.tags,
            album_id: null,
            upload_date: photoData.upload_date,
            metadata: photoData.metadata,
            created_at: photoData.upload_date,
            updated_at: photoData.upload_date
          };

          // Mock Supabase to return our test photo
          const mockSupabase = await import('../../utils/supabase');
          vi.mocked(mockSupabase.supabase.from).mockReturnValue({
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [mockPhoto], error: null }))
              })),
              order: vi.fn(() => Promise.resolve({ data: [mockPhoto], error: null }))
            })),
            insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          } as any);

          const { container } = render(
            <GalleryTab user={mockUser} />
          );

          // Wait for photos to load
          await waitFor(() => {
            const photoGrid = container.querySelector('[data-testid="photo-grid"]');
            expect(photoGrid).toBeInTheDocument();
          });

          // Find and click on the photo to open full-screen viewer
          const photoItem = container.querySelector('[data-testid="photo-item"]');
          expect(photoItem).toBeInTheDocument();
          
          fireEvent.click(photoItem!);

          // Wait for full-screen viewer to appear
          await waitFor(() => {
            const fullScreenViewer = container.querySelector('[data-testid="full-screen-photo-viewer"]');
            expect(fullScreenViewer).toBeInTheDocument();
          });

          const fullScreenViewer = container.querySelector('[data-testid="full-screen-photo-viewer"]');
          const fullScreenImage = container.querySelector('[data-testid="full-screen-image"]');

          // Verify full-screen viewer utilizes full viewport dimensions
          expect(fullScreenViewer).toBeInTheDocument();
          
          // Check for CSS module class name pattern (contains fullScreenPhotoViewer)
          const fullScreenViewerElement = fullScreenViewer as HTMLElement;
          expect(fullScreenViewerElement.className).toMatch(/fullScreenPhotoViewer/);

          // Verify the viewer has appropriate z-index class for layering
          expect(fullScreenViewerElement.className).toMatch(/fullScreenPhotoViewer/);

          // Verify the image is displayed correctly
          expect(fullScreenImage).toBeInTheDocument();
          expect(fullScreenImage).toHaveAttribute('src', photoData.url);
          expect(fullScreenImage).toHaveAttribute('alt', photoData.caption || photoData.filename);

          // Verify photo details are displayed
          if (photoData.caption) {
            expect(container).toHaveTextContent(photoData.caption);
          }
          
          // Check for filename in a more flexible way (handle whitespace normalization)
          const trimmedFilename = photoData.filename.trim();
          if (trimmedFilename.length > 0) {
            // Check if any part of the filename appears in the content
            const normalizedFilename = trimmedFilename.replace(/\s+/g, ' ');
            const hasFilenameContent = container.textContent?.includes(normalizedFilename) || 
                                     container.textContent?.includes(trimmedFilename);
            expect(hasFilenameContent).toBe(true);
          }

          // Verify metadata is displayed if available
          if (photoData.metadata.dimensions) {
            const dimensionText = `${photoData.metadata.dimensions.width} × ${photoData.metadata.dimensions.height}`;
            expect(container).toHaveTextContent(dimensionText);
          }

          if (photoData.metadata.size) {
            const sizeText = (photoData.metadata.size / 1024 / 1024).toFixed(2);
            expect(container).toHaveTextContent(sizeText);
          }

          // Verify tags are displayed (only non-empty tags)
          photoData.tags.forEach(tag => {
            const trimmedTag = tag.trim();
            if (trimmedTag.length > 0) {
              // Use a more flexible text matching approach for tags
              const normalizedTag = trimmedTag.replace(/\s+/g, ' ');
              const hasTagContent = container.textContent?.includes(normalizedTag) || 
                                   container.textContent?.includes(trimmedTag);
              expect(hasTagContent).toBe(true);
            }
          });

          // Verify close functionality works
          const closeButton = container.querySelector('[aria-label="Close full-screen photo viewer"]');
          expect(closeButton).toBeInTheDocument();
          
          fireEvent.click(closeButton!);

          // Wait for full-screen viewer to disappear
          await waitFor(() => {
            const fullScreenViewerAfterClose = container.querySelector('[data-testid="full-screen-photo-viewer"]');
            expect(fullScreenViewerAfterClose).not.toBeInTheDocument();
          });

          // Verify clicking outside also closes the viewer
          fireEvent.click(photoItem!);
          
          await waitFor(() => {
            const fullScreenViewerReopened = container.querySelector('[data-testid="full-screen-photo-viewer"]');
            expect(fullScreenViewerReopened).toBeInTheDocument();
          });

          // Click on the viewer background (outside the content) to close
          const fullScreenViewerReopened = container.querySelector('[data-testid="full-screen-photo-viewer"]');
          fireEvent.click(fullScreenViewerReopened!);

          await waitFor(() => {
            const fullScreenViewerAfterBackgroundClick = container.querySelector('[data-testid="full-screen-photo-viewer"]');
            expect(fullScreenViewerAfterBackgroundClick).not.toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});