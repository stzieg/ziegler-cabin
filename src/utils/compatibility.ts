/**
 * Backward compatibility utilities and graceful fallbacks
 * Provides fallbacks for older browsers and devices
 */

/**
 * Check if browser supports modern features
 */
export const browserSupport = {
  /**
   * Check if CSS Grid is supported
   */
  cssGrid: (): boolean => {
    if (typeof window === 'undefined') return true; // SSR fallback
    return CSS.supports('display', 'grid');
  },

  /**
   * Check if CSS Flexbox is supported
   */
  flexbox: (): boolean => {
    if (typeof window === 'undefined') return true; // SSR fallback
    return CSS.supports('display', 'flex');
  },

  /**
   * Check if Intersection Observer is supported
   */
  intersectionObserver: (): boolean => {
    if (typeof window === 'undefined') return false;
    return 'IntersectionObserver' in window;
  },

  /**
   * Check if ResizeObserver is supported
   */
  resizeObserver: (): boolean => {
    if (typeof window === 'undefined') return false;
    return 'ResizeObserver' in window;
  },

  /**
   * Check if modern date input is supported
   */
  dateInput: (): boolean => {
    if (typeof window === 'undefined') return true;
    const input = document.createElement('input');
    input.type = 'date';
    return input.type === 'date';
  },

  /**
   * Check if WebP images are supported
   */
  webp: (): boolean => {
    if (typeof window === 'undefined') return false;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  },

  /**
   * Check if touch events are supported
   */
  touch: (): boolean => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
};

/**
 * Graceful fallback for CSS Grid layouts
 */
export const layoutFallback = {
  /**
   * Apply fallback styles for browsers without CSS Grid
   */
  applyGridFallback: (element: HTMLElement): void => {
    if (!browserSupport.cssGrid()) {
      element.style.display = 'block';
      element.classList.add('fallback-layout');
    }
  },

  /**
   * Apply fallback styles for browsers without Flexbox
   */
  applyFlexFallback: (element: HTMLElement): void => {
    if (!browserSupport.flexbox()) {
      element.style.display = 'block';
      element.classList.add('fallback-flex');
    }
  }
};

/**
 * Polyfill for missing browser features
 */
export const polyfills = {
  /**
   * Intersection Observer polyfill fallback
   */
  intersectionObserver: (): void => {
    if (!browserSupport.intersectionObserver()) {
      // Simple fallback - assume all elements are visible
      (window as any).IntersectionObserver = class MockIntersectionObserver {
        private callback: Function;
        
        constructor(callback: Function) {
          this.callback = callback;
        }
        observe() {
          // Immediately call callback with visible entry
          this.callback([{ isIntersecting: true }]);
        }
        unobserve() {}
        disconnect() {}
      };
    }
  },

  /**
   * ResizeObserver polyfill fallback
   */
  resizeObserver: (): void => {
    if (!browserSupport.resizeObserver()) {
      // Simple fallback using window resize
      (window as any).ResizeObserver = class MockResizeObserver {
        private handleResize: () => void;
        
        constructor(callback: Function) {
          this.handleResize = () => callback([]);
          window.addEventListener('resize', this.handleResize);
        }
        observe() {}
        unobserve() {}
        disconnect() {
          window.removeEventListener('resize', this.handleResize);
        }
      };
    }
  }
};

/**
 * Image format fallbacks
 */
export const imageFallback = {
  /**
   * Get appropriate image format based on browser support
   */
  getImageFormat: (baseUrl: string): string => {
    if (browserSupport.webp()) {
      return baseUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }
    return baseUrl;
  },

  /**
   * Create picture element with fallbacks
   */
  createPictureElement: (webpSrc: string, fallbackSrc: string, alt: string): HTMLPictureElement => {
    const picture = document.createElement('picture');
    
    if (browserSupport.webp()) {
      const webpSource = document.createElement('source');
      webpSource.srcset = webpSrc;
      webpSource.type = 'image/webp';
      picture.appendChild(webpSource);
    }
    
    const img = document.createElement('img');
    img.src = fallbackSrc;
    img.alt = alt;
    picture.appendChild(img);
    
    return picture;
  }
};

/**
 * Input fallbacks for older browsers
 */
export const inputFallback = {
  /**
   * Enhance date input for browsers without native support
   */
  enhanceDateInput: (input: HTMLInputElement): void => {
    if (!browserSupport.dateInput()) {
      // Add placeholder text for manual entry
      input.placeholder = 'YYYY-MM-DD';
      input.pattern = '\\d{4}-\\d{2}-\\d{2}';
      
      // Add basic validation
      input.addEventListener('blur', () => {
        const value = input.value;
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        
        if (value && !dateRegex.test(value)) {
          input.setCustomValidity('Please enter date in YYYY-MM-DD format');
        } else {
          input.setCustomValidity('');
        }
      });
    }
  }
};

/**
 * Animation fallbacks for reduced motion preferences
 */
export const animationFallback = {
  /**
   * Check if user prefers reduced motion
   */
  prefersReducedMotion: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  /**
   * Apply animation with reduced motion fallback
   */
  safeAnimate: (element: HTMLElement, animation: Keyframe[], options: KeyframeAnimationOptions): Animation | null => {
    if (animationFallback.prefersReducedMotion()) {
      // Skip animation, apply final state immediately
      const finalFrame = animation[animation.length - 1];
      Object.assign(element.style, finalFrame);
      return null;
    }
    
    if ('animate' in element) {
      return element.animate(animation, options);
    }
    
    // Fallback for browsers without Web Animations API
    return null;
  }
};

/**
 * Storage fallbacks for browsers with limited support
 */
export const storageFallback = {
  /**
   * Safe localStorage with fallback
   */
  setItem: (key: string, value: string): boolean => {
    try {
      if (typeof Storage !== 'undefined' && localStorage) {
        localStorage.setItem(key, value);
        return true;
      }
    } catch (error) {
      console.warn('localStorage not available, using memory storage');
    }
    
    // Fallback to memory storage
    (window as any).__memoryStorage = (window as any).__memoryStorage || {};
    (window as any).__memoryStorage[key] = value;
    return false;
  },

  /**
   * Safe localStorage retrieval with fallback
   */
  getItem: (key: string): string | null => {
    try {
      if (typeof Storage !== 'undefined' && localStorage) {
        return localStorage.getItem(key);
      }
    } catch (error) {
      console.warn('localStorage not available, using memory storage');
    }
    
    // Fallback to memory storage
    const memoryStorage = (window as any).__memoryStorage;
    return memoryStorage ? memoryStorage[key] || null : null;
  },

  /**
   * Safe localStorage removal with fallback
   */
  removeItem: (key: string): void => {
    try {
      if (typeof Storage !== 'undefined' && localStorage) {
        localStorage.removeItem(key);
        return;
      }
    } catch (error) {
      console.warn('localStorage not available, using memory storage');
    }
    
    // Fallback to memory storage
    const memoryStorage = (window as any).__memoryStorage;
    if (memoryStorage) {
      delete memoryStorage[key];
    }
  }
};

/**
 * Initialize all polyfills and fallbacks
 */
export const initializeCompatibility = (): void => {
  // Apply polyfills
  polyfills.intersectionObserver();
  polyfills.resizeObserver();
  
  // Add CSS classes for feature detection
  if (typeof document !== 'undefined') {
    const html = document.documentElement;
    
    if (!browserSupport.cssGrid()) {
      html.classList.add('no-css-grid');
    }
    
    if (!browserSupport.flexbox()) {
      html.classList.add('no-flexbox');
    }
    
    if (browserSupport.touch()) {
      html.classList.add('touch-device');
    }
    
    if (animationFallback.prefersReducedMotion()) {
      html.classList.add('reduced-motion');
    }
  }
};

/**
 * Error recovery utilities
 */
export const errorRecovery = {
  /**
   * Retry function with exponential backoff
   */
  retry: async <T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          throw lastError;
        }
        
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  },

  /**
   * Safe component render with error boundary fallback
   */
  safeRender: (component: () => React.ReactElement, fallback: React.ReactElement): React.ReactElement => {
    try {
      return component();
    } catch (error) {
      console.error('Component render error:', error);
      return fallback;
    }
  }
};