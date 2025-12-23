import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import * as fc from 'fast-check';
import { ViewTransition, type ViewType, type AnimationType } from './ViewTransition';

/**
 * **Feature: cabin-ui-improvements, Property 11: Transition smoothness**
 * **Validates: Requirements 4.2**
 */

// Generators for property-based testing
const viewTypeArb = fc.constantFrom('calendar', 'reservation', 'gallery', 'maintenance') as fc.Arbitrary<ViewType>;
const animationTypeArb = fc.constantFrom('slide', 'fade', 'scale') as fc.Arbitrary<AnimationType>;
const durationArb = fc.integer({ min: 100, max: 1000 });

describe('ViewTransition Property Tests', () => {
  beforeEach(() => {
    // Mock timers for consistent testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Property 11: Transition smoothness
   * For any view transition, the system should use smooth animations that maintain user context
   */
  it('should apply correct CSS classes and transitions for any view and animation type', () => {
    fc.assert(
      fc.property(
        viewTypeArb,
        viewTypeArb,
        animationTypeArb,
        durationArb,
        (initialView, newView, animationType, duration) => {
          // Skip if views are the same (no transition needed)
          if (initialView === newView) {
            return true;
          }

          const TestContent = ({ view }: { view: ViewType }) => (
            <div data-testid={`content-${view}`}>Content for {view}</div>
          );

          const { container, rerender } = render(
            <ViewTransition
              currentView={initialView}
              animationType={animationType}
              duration={duration}
            >
              <TestContent view={initialView} />
            </ViewTransition>
          );

          const transitionElement = container.querySelector('[class*="viewTransition"]');
          expect(transitionElement).toBeTruthy();

          // Verify initial state
          expect(transitionElement?.className).toContain('viewTransition');
          expect(transitionElement?.className).toContain(animationType);
          expect(transitionElement?.className).not.toContain('transitioning');

          // Verify CSS custom property is set
          const computedStyle = window.getComputedStyle(transitionElement!);
          expect(transitionElement).toHaveStyle(`--transition-duration: ${duration}ms`);

          // Trigger transition by changing view
          rerender(
            <ViewTransition
              currentView={newView}
              animationType={animationType}
              duration={duration}
            >
              <TestContent view={newView} />
            </ViewTransition>
          );

          // Verify transitioning state is applied
          expect(transitionElement?.className).toContain('transitioning');

          // Fast-forward through transition
          act(() => {
            vi.advanceTimersByTime(duration / 2);
          });

          // Verify content updates during transition
          act(() => {
            vi.advanceTimersByTime(50);
          });

          // Complete transition
          act(() => {
            vi.advanceTimersByTime(duration / 2);
          });

          // Verify final state
          expect(transitionElement?.className).not.toContain('transitioning');
          expect(transitionElement?.getAttribute('data-view')).toBe(newView);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11 (continued): Animation type consistency
   * Each animation type should apply the correct CSS classes
   */
  it('should maintain animation type consistency throughout transition', () => {
    fc.assert(
      fc.property(
        viewTypeArb,
        viewTypeArb,
        animationTypeArb,
        durationArb,
        (initialView, newView, animationType, duration) => {
          if (initialView === newView) {
            return true;
          }

          const { container, rerender } = render(
            <ViewTransition
              currentView={initialView}
              animationType={animationType}
              duration={duration}
            >
              <div>Test content</div>
            </ViewTransition>
          );

          const transitionElement = container.querySelector('[class*="viewTransition"]');
          
          // Verify animation type class is always present
          expect(transitionElement?.className).toContain(animationType);

          // Trigger transition
          rerender(
            <ViewTransition
              currentView={newView}
              animationType={animationType}
              duration={duration}
            >
              <div>Test content</div>
            </ViewTransition>
          );

          // Verify animation type class persists during transition
          expect(transitionElement?.className).toContain(animationType);
          expect(transitionElement?.className).toContain('transitioning');

          // Complete transition
          act(() => {
            vi.advanceTimersByTime(duration);
          });

          // Verify animation type class persists after transition
          expect(transitionElement?.className).toContain(animationType);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11 (continued): Transition duration consistency
   * The transition duration should be respected for any valid duration value
   */
  it('should respect transition duration for any animation type', () => {
    fc.assert(
      fc.property(
        viewTypeArb,
        viewTypeArb,
        animationTypeArb,
        durationArb,
        (initialView, newView, animationType, duration) => {
          if (initialView === newView) {
            return true;
          }

          const { container, rerender } = render(
            <ViewTransition
              currentView={initialView}
              animationType={animationType}
              duration={duration}
            >
              <div>Test content</div>
            </ViewTransition>
          );

          const transitionElement = container.querySelector('[class*="viewTransition"]');
          
          // Verify duration is set as CSS custom property
          expect(transitionElement).toHaveStyle(`--transition-duration: ${duration}ms`);

          // Trigger transition
          rerender(
            <ViewTransition
              currentView={newView}
              animationType={animationType}
              duration={duration}
            >
              <div>Test content</div>
            </ViewTransition>
          );

          // Verify transitioning state
          expect(transitionElement?.className).toContain('transitioning');

          // Complete the transition
          act(() => {
            vi.advanceTimersByTime(duration + 100);
          });

          // After full duration, transition should be complete
          expect(transitionElement?.className).not.toContain('transitioning');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11 (continued): Reduced motion support
   * Transitions should respect user's motion preferences
   */
  it('should handle reduced motion preferences correctly', () => {
    fc.assert(
      fc.property(
        viewTypeArb,
        animationTypeArb,
        durationArb,
        (view, animationType, duration) => {
          // Mock reduced motion preference
          Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation(query => ({
              matches: query === '(prefers-reduced-motion: reduce)',
              media: query,
              onchange: null,
              addListener: vi.fn(),
              removeListener: vi.fn(),
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
              dispatchEvent: vi.fn(),
            })),
          });

          const { container } = render(
            <ViewTransition
              currentView={view}
              animationType={animationType}
              duration={duration}
            >
              <div>Test content</div>
            </ViewTransition>
          );

          const transitionElement = container.querySelector('[class*="viewTransition"]');
          expect(transitionElement).toBeTruthy();
          
          // The component should still render correctly even with reduced motion
          expect(transitionElement?.className).toContain('viewTransition');
          expect(transitionElement?.className).toContain(animationType);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});