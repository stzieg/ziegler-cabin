/**
 * Custom hook for keyboard accessibility and virtual keyboard handling
 * Requirements: 3.5 - Keyboard-aware form field positioning for mobile
 */

import { useState, useEffect, useCallback, RefObject } from 'react';

export interface KeyboardState {
  isVisible: boolean;
  height: number;
  activeElement: HTMLElement | null;
}

export interface KeyboardAccessibilityOptions {
  /** Container element to scroll when keyboard appears */
  containerRef?: RefObject<HTMLElement>;
  /** Offset from top when scrolling focused element into view */
  scrollOffset?: number;
  /** Whether to automatically handle virtual keyboard */
  autoHandle?: boolean;
}

/**
 * Hook to manage virtual keyboard interactions and maintain field visibility
 * Provides keyboard state and automatic scrolling for focused form fields
 */
export const useKeyboardAccessibility = (
  options: KeyboardAccessibilityOptions = {}
) => {
  const {
    containerRef,
    scrollOffset = 100,
    autoHandle = true,
  } = options;

  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    height: 0,
    activeElement: null,
  });

  /**
   * Scroll focused element into view when virtual keyboard appears
   */
  const scrollToElement = useCallback((element: HTMLElement) => {
    if (!autoHandle) return;

    const container = containerRef?.current || document.documentElement;
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Calculate if element is hidden by virtual keyboard
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const keyboardHeight = window.innerHeight - viewportHeight;
    
    if (keyboardHeight > 0) {
      const elementBottom = elementRect.bottom;
      const visibleAreaBottom = viewportHeight;
      
      if (elementBottom > visibleAreaBottom - scrollOffset) {
        // Element is hidden by keyboard, scroll it into view
        const scrollTop = elementRect.top - scrollOffset;
        
        if (container === document.documentElement) {
          window.scrollTo({
            top: window.scrollY + scrollTop,
            behavior: 'smooth',
          });
        } else {
          container.scrollTo({
            top: container.scrollTop + scrollTop,
            behavior: 'smooth',
          });
        }
      }
    }
  }, [containerRef, scrollOffset, autoHandle]);

  /**
   * Handle focus events on form elements
   */
  const handleFocus = useCallback((event: FocusEvent) => {
    const target = event.target as HTMLElement;
    
    // Only handle form elements
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.contentEditable === 'true'
    ) {
      setKeyboardState(prev => ({
        ...prev,
        activeElement: target,
      }));

      // Delay scrolling to allow keyboard to appear
      setTimeout(() => {
        scrollToElement(target);
      }, 300);
    }
  }, [scrollToElement]);

  /**
   * Handle blur events
   */
  const handleBlur = useCallback(() => {
    setKeyboardState(prev => ({
      ...prev,
      activeElement: null,
    }));
  }, []);

  /**
   * Handle viewport changes (virtual keyboard show/hide)
   */
  const handleViewportChange = useCallback(() => {
    if (window.visualViewport) {
      const keyboardHeight = window.innerHeight - window.visualViewport.height;
      const isVisible = keyboardHeight > 150; // Threshold for keyboard detection
      
      setKeyboardState(prev => ({
        ...prev,
        isVisible,
        height: keyboardHeight,
      }));

      // If keyboard just appeared and there's an active element, scroll to it
      if (isVisible && keyboardState.activeElement) {
        setTimeout(() => {
          scrollToElement(keyboardState.activeElement!);
        }, 100);
      }
    }
  }, [keyboardState.activeElement, scrollToElement]);

  /**
   * Handle window resize as fallback for keyboard detection
   */
  const handleResize = useCallback(() => {
    // Fallback method for older browsers without visualViewport
    if (!window.visualViewport) {
      const currentHeight = window.innerHeight;
      const keyboardHeight = Math.max(0, window.screen.height - currentHeight - 100);
      const isVisible = keyboardHeight > 150;
      
      setKeyboardState(prev => ({
        ...prev,
        isVisible,
        height: keyboardHeight,
      }));
    }
  }, []);

  useEffect(() => {
    // Add event listeners
    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);
    
    if (window.visualViewport && window.visualViewport.addEventListener) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', handleResize);
    }

    return () => {
      // Cleanup event listeners
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
      
      if (window.visualViewport && window.visualViewport.removeEventListener) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [handleFocus, handleBlur, handleViewportChange, handleResize]);

  /**
   * Manually scroll to a specific element
   */
  const scrollToField = useCallback((element: HTMLElement) => {
    scrollToElement(element);
  }, [scrollToElement]);

  /**
   * Check if an element is currently hidden by the virtual keyboard
   */
  const isElementHidden = useCallback((element: HTMLElement): boolean => {
    if (!keyboardState.isVisible) return false;
    
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    
    return rect.bottom > viewportHeight - scrollOffset;
  }, [keyboardState.isVisible, scrollOffset]);

  return {
    keyboardState,
    scrollToField,
    isElementHidden,
  };
};