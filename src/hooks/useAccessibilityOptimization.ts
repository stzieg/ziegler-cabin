/**
 * Enhanced accessibility optimization hook
 * Requirements: 7.4 - Accessibility features including keyboard navigation and screen reader support
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useKeyboardAccessibility } from './useKeyboardAccessibility';

interface AccessibilityState {
  isHighContrast: boolean;
  isReducedMotion: boolean;
  isScreenReaderActive: boolean;
  fontSize: 'normal' | 'large' | 'extra-large';
  focusVisible: boolean;
}

interface AccessibilityOptions {
  enableFocusManagement?: boolean;
  enableScreenReaderOptimizations?: boolean;
  enableKeyboardNavigation?: boolean;
  announceChanges?: boolean;
}

/**
 * Comprehensive accessibility optimization hook
 * Provides enhanced keyboard navigation, screen reader support, and user preference handling
 */
export const useAccessibilityOptimization = (
  containerRef?: React.RefObject<HTMLElement>,
  options: AccessibilityOptions = {}
) => {
  const {
    enableFocusManagement = true,
    enableScreenReaderOptimizations = true,
    enableKeyboardNavigation = true,
    announceChanges = true,
  } = options;

  const [accessibilityState, setAccessibilityState] = useState<AccessibilityState>({
    isHighContrast: false,
    isReducedMotion: false,
    isScreenReaderActive: false,
    fontSize: 'normal',
    focusVisible: false,
  });

  const keyboardAccessibility = useKeyboardAccessibility({
    containerRef,
    autoHandle: enableKeyboardNavigation,
  });

  const announcementRef = useRef<HTMLDivElement | null>(null);
  const focusHistoryRef = useRef<HTMLElement[]>([]);

  // Detect user preferences
  useEffect(() => {
    const updatePreferences = () => {
      const isHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      
      // Detect screen reader by checking for common screen reader indicators
      const isScreenReaderActive = 
        window.speechSynthesis?.speaking ||
        document.body.classList.contains('screen-reader-active') ||
        !!document.querySelector('[aria-live]') ||
        navigator.userAgent.includes('NVDA') ||
        navigator.userAgent.includes('JAWS');

      setAccessibilityState(prev => ({
        ...prev,
        isHighContrast,
        isReducedMotion,
        isScreenReaderActive,
      }));
    };

    updatePreferences();

    // Listen for preference changes
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    highContrastQuery.addEventListener('change', updatePreferences);
    reducedMotionQuery.addEventListener('change', updatePreferences);

    return () => {
      highContrastQuery.removeEventListener('change', updatePreferences);
      reducedMotionQuery.removeEventListener('change', updatePreferences);
    };
  }, []);

  // Create announcement region for screen readers
  useEffect(() => {
    if (!enableScreenReaderOptimizations || !announceChanges) return;

    const announcementRegion = document.createElement('div');
    announcementRegion.setAttribute('aria-live', 'polite');
    announcementRegion.setAttribute('aria-atomic', 'true');
    announcementRegion.className = 'sr-only';
    announcementRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;

    document.body.appendChild(announcementRegion);
    announcementRef.current = announcementRegion;

    return () => {
      if (announcementRef.current) {
        document.body.removeChild(announcementRef.current);
        announcementRef.current = null;
      }
    };
  }, [enableScreenReaderOptimizations, announceChanges]);

  // Announce messages to screen readers
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announcementRef.current || !enableScreenReaderOptimizations) return;

    announcementRef.current.setAttribute('aria-live', priority);
    announcementRef.current.textContent = message;

    // Clear after announcement to allow repeated messages
    setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.textContent = '';
      }
    }, 1000);
  }, [enableScreenReaderOptimizations]);

  // Enhanced focus management
  const manageFocus = useCallback((element: HTMLElement, options?: { 
    preventScroll?: boolean;
    restoreFocus?: boolean;
  }) => {
    if (!enableFocusManagement) return;

    const { preventScroll = false, restoreFocus = false } = options || {};

    if (restoreFocus && document.activeElement instanceof HTMLElement) {
      focusHistoryRef.current.push(document.activeElement);
    }

    element.focus({ preventScroll });

    // Ensure focus is visible
    setAccessibilityState(prev => ({ ...prev, focusVisible: true }));

    // Add focus indicator for better visibility
    element.classList.add('focus-visible');
    
    const removeFocusIndicator = () => {
      element.classList.remove('focus-visible');
      element.removeEventListener('blur', removeFocusIndicator);
    };
    
    element.addEventListener('blur', removeFocusIndicator);
  }, [enableFocusManagement]);

  // Restore previous focus
  const restoreFocus = useCallback(() => {
    if (!enableFocusManagement || focusHistoryRef.current.length === 0) return;

    const previousElement = focusHistoryRef.current.pop();
    if (previousElement && document.contains(previousElement)) {
      manageFocus(previousElement);
    }
  }, [enableFocusManagement, manageFocus]);

  // Keyboard navigation helpers
  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
    if (!enableKeyboardNavigation || !containerRef?.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const focusableArray = Array.from(focusableElements) as HTMLElement[];
    const currentIndex = focusableArray.indexOf(document.activeElement as HTMLElement);

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % focusableArray.length;
        manageFocus(focusableArray[nextIndex]);
        break;

      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        const prevIndex = currentIndex === 0 ? focusableArray.length - 1 : currentIndex - 1;
        manageFocus(focusableArray[prevIndex]);
        break;

      case 'Home':
        event.preventDefault();
        if (focusableArray.length > 0) {
          manageFocus(focusableArray[0]);
        }
        break;

      case 'End':
        event.preventDefault();
        if (focusableArray.length > 0) {
          manageFocus(focusableArray[focusableArray.length - 1]);
        }
        break;

      case 'Escape':
        event.preventDefault();
        restoreFocus();
        break;
    }
  }, [enableKeyboardNavigation, containerRef, manageFocus, restoreFocus]);

  // Set up keyboard event listeners
  useEffect(() => {
    if (!enableKeyboardNavigation || !containerRef?.current) return;

    const container = containerRef.current;
    container.addEventListener('keydown', handleKeyboardNavigation);

    return () => {
      container.removeEventListener('keydown', handleKeyboardNavigation);
    };
  }, [enableKeyboardNavigation, containerRef, handleKeyboardNavigation]);

  // Apply accessibility enhancements to container
  useEffect(() => {
    if (!containerRef?.current) return;

    const container = containerRef.current;

    // Add ARIA attributes for better screen reader support
    if (enableScreenReaderOptimizations) {
      if (!container.getAttribute('role')) {
        container.setAttribute('role', 'region');
      }
      
      if (!container.getAttribute('aria-label') && !container.getAttribute('aria-labelledby')) {
        container.setAttribute('aria-label', 'Interactive content area');
      }
    }

    // Add keyboard navigation attributes
    if (enableKeyboardNavigation) {
      container.setAttribute('tabindex', '-1');
    }

    // Apply high contrast styles if needed
    if (accessibilityState.isHighContrast) {
      container.classList.add('high-contrast');
    } else {
      container.classList.remove('high-contrast');
    }

    // Apply reduced motion styles if needed
    if (accessibilityState.isReducedMotion) {
      container.classList.add('reduced-motion');
    } else {
      container.classList.remove('reduced-motion');
    }

  }, [
    containerRef,
    enableScreenReaderOptimizations,
    enableKeyboardNavigation,
    accessibilityState.isHighContrast,
    accessibilityState.isReducedMotion,
  ]);

  // Skip links functionality
  const createSkipLink = useCallback((targetId: string, label: string) => {
    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.textContent = label;
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      z-index: 1000;
      border-radius: 4px;
    `;

    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px';
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });

    skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(targetId);
      if (target) {
        manageFocus(target, { preventScroll: false });
        announce(`Skipped to ${label}`);
      }
    });

    return skipLink;
  }, [manageFocus, announce]);

  return {
    accessibilityState,
    keyboardState: keyboardAccessibility.keyboardState,
    announce,
    manageFocus,
    restoreFocus,
    createSkipLink,
    scrollToField: keyboardAccessibility.scrollToField,
    isElementHidden: keyboardAccessibility.isElementHidden,
  };
};

export default useAccessibilityOptimization;