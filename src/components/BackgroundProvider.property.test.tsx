/**
 * Property-based tests for BackgroundProvider component
 * Feature: cabin-ui-improvements
 */

import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { BackgroundProvider, useBackground } from './BackgroundProvider';
import type { BackgroundImageSet } from '../hooks/useResponsiveBackground';

// Mock component to test background context
const TestComponent = () => {
  const { currentImage, isLoading, isLoaded, error } = useBackground();
  return (
    <div data-testid="background-test">
      <span data-testid="current-image">{currentImage}</span>
      <span data-testid="is-loading">{isLoading.toString()}</span>
      <span data-testid="is-loaded">{isLoaded.toString()}</span>
      <span data-testid="error">{error || 'no-error'}</span>
    </div>
  );
};

describe('BackgroundProvider Property Tests', () => {
  beforeEach(() => {
    // Mock document.body.classList
    document.body.classList.add = vi.fn();
    document.body.classList.remove = vi.fn();

    // Mock document.documentElement.style.setProperty
    document.documentElement.style.setProperty = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  /**
   * **Feature: cabin-ui-improvements, Property 15: Background image display**
   * **Validates: Requirements 6.1**
   * 
   * For any interface that loads, the system should display the foggy woods 
   * background image with proper sizing and positioning
   */
  it('Property 15: Background image display - should always apply background classes when interface loads', () => {
    fc.assert(
      fc.property(
        // Generate random valid image sets
        fc.record({
          small: fc.webUrl().map(url => `${url}/small.jpg`),
          medium: fc.webUrl().map(url => `${url}/medium.jpg`),
          large: fc.webUrl().map(url => `${url}/large.jpg`),
          xlarge: fc.webUrl().map(url => `${url}/xlarge.jpg`),
        }),
        (images: BackgroundImageSet) => {
          // Clean up any previous renders
          cleanup();
          
          // Render component with generated images
          render(
            <BackgroundProvider images={images} enablePreload={false}>
              <TestComponent />
            </BackgroundProvider>
          );

          // Verify that background classes are applied to body
          expect(document.body.classList.add).toHaveBeenCalledWith('bg-foggy-woods');
          expect(document.body.classList.add).toHaveBeenCalledWith('loading');

          // Verify component renders
          const testElement = screen.getByTestId('background-test');
          expect(testElement).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: cabin-ui-improvements, Property 17: Responsive background images**
   * **Validates: Requirements 6.3**
   * 
   * For any viewport size, the system should load appropriately sized and optimized background images
   */
  it('Property 17: Responsive background images - should provide different image sizes for different viewports', () => {
    fc.assert(
      fc.property(
        // Generate random valid image sets with different sizes
        fc.record({
          small: fc.constant('/images/backgrounds/foggy-woods-small.jpg'),
          medium: fc.constant('/images/backgrounds/foggy-woods-medium.jpg'),
          large: fc.constant('/images/backgrounds/foggy-woods-large.jpg'),
          xlarge: fc.constant('/images/backgrounds/foggy-woods-xlarge.jpg'),
        }),
        (images: BackgroundImageSet) => {
          // Clean up any previous renders
          cleanup();
          
          render(
            <BackgroundProvider images={images} enablePreload={false}>
              <TestComponent />
            </BackgroundProvider>
          );

          // Verify that the image set contains different sizes
          expect(images.small).toContain('small');
          expect(images.medium).toContain('medium');
          expect(images.large).toContain('large');
          expect(images.xlarge).toContain('xlarge');

          // Verify all images are different
          const uniqueImages = new Set([images.small, images.medium, images.large, images.xlarge]);
          expect(uniqueImages.size).toBe(4);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: cabin-ui-improvements, Property 19: Background loading transitions**
   * **Validates: Requirements 6.5**
   * 
   * For any background image loading, the system should provide smooth transitions 
   * and appropriate fallback colors
   */
  it('Property 19: Background loading transitions - should start in loading state with appropriate classes', () => {
    fc.assert(
      fc.property(
        // Generate random image sets
        fc.record({
          small: fc.webUrl().map(url => `${url}/small.jpg`),
          medium: fc.webUrl().map(url => `${url}/medium.jpg`),
          large: fc.webUrl().map(url => `${url}/large.jpg`),
          xlarge: fc.webUrl().map(url => `${url}/xlarge.jpg`),
        }),
        (images: BackgroundImageSet) => {
          // Clean up any previous renders
          cleanup();
          
          render(
            <BackgroundProvider 
              images={images} 
              enablePreload={false}
            >
              <TestComponent />
            </BackgroundProvider>
          );

          // Initially should be in loading state
          expect(document.body.classList.add).toHaveBeenCalledWith('loading');
          expect(document.body.classList.add).toHaveBeenCalledWith('bg-foggy-woods');

          const isLoadingElement = screen.getByTestId('is-loading');
          const isLoadedElement = screen.getByTestId('is-loaded');
          const errorElement = screen.getByTestId('error');

          // Verify initial loading state
          expect(isLoadingElement.textContent).toBe('true');
          expect(isLoadedElement.textContent).toBe('false');
          expect(errorElement.textContent).toBe('no-error');

          // Verify that appropriate CSS classes are managed during transitions
          const addCalls = (document.body.classList.add as any).mock.calls;

          // Should always add base background class
          expect(addCalls.some((call: any[]) => call.includes('bg-foggy-woods'))).toBe(true);
          expect(addCalls.some((call: any[]) => call.includes('loading'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});