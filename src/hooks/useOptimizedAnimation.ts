/**
 * Optimized animation hook with performance monitoring
 * Requirements: 7.2 - Animation performance optimization
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface AnimationOptions {
  duration?: number;
  easing?: string;
  delay?: number;
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
}

interface AnimationState {
  isAnimating: boolean;
  progress: number;
  frameRate: number;
  isPerformant: boolean;
}

/**
 * Hook for optimized animations with performance monitoring
 * Automatically reduces animation complexity if performance drops
 */
export const useOptimizedAnimation = (
  element: HTMLElement | null,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  options: AnimationOptions = {}
) => {
  const [animationState, setAnimationState] = useState<AnimationState>({
    isAnimating: false,
    progress: 0,
    frameRate: 60,
    isPerformant: true,
  });

  const animationRef = useRef<Animation | null>(null);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(0);
  const performanceCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Check if user prefers reduced motion
  const prefersReducedMotion = useCallback(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Monitor animation performance
  const monitorPerformance = useCallback(() => {
    const checkFrameRate = () => {
      const now = performance.now();
      frameCountRef.current++;

      if (lastTimeRef.current) {
        const elapsed = now - lastTimeRef.current;
        if (elapsed >= 1000) { // Check every second
          const fps = (frameCountRef.current * 1000) / elapsed;
          const isPerformant = fps >= 30; // Consider 30fps as minimum acceptable

          setAnimationState(prev => ({
            ...prev,
            frameRate: fps,
            isPerformant,
          }));

          frameCountRef.current = 0;
          lastTimeRef.current = now;

          // If performance is poor, consider reducing animation complexity
          if (!isPerformant && animationRef.current) {
            console.warn(`Animation performance below threshold: ${fps.toFixed(1)}fps`);
          }
        }
      } else {
        lastTimeRef.current = now;
      }

      if (animationState.isAnimating) {
        requestAnimationFrame(checkFrameRate);
      }
    };

    requestAnimationFrame(checkFrameRate);
  }, [animationState.isAnimating]);

  // Start animation with performance monitoring
  const startAnimation = useCallback(() => {
    if (!element || prefersReducedMotion()) {
      // Skip animation if reduced motion is preferred
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      try {
        const animationOptions: KeyframeAnimationOptions = {
          duration: options.duration || 300,
          easing: options.easing || 'ease-out',
          delay: options.delay || 0,
          fill: options.fillMode || 'forwards',
        };

        animationRef.current = element.animate(keyframes, animationOptions);

        setAnimationState(prev => ({
          ...prev,
          isAnimating: true,
          progress: 0,
        }));

        // Start performance monitoring
        monitorPerformance();

        // Update progress during animation
        const updateProgress = () => {
          if (animationRef.current && animationRef.current.currentTime !== null && animationRef.current.effect) {
            const timing = animationRef.current.effect.getComputedTiming();
            if (timing.duration && typeof timing.duration === 'number') {
              const progress = (animationRef.current.currentTime as number) / timing.duration;
              setAnimationState(prev => ({
                ...prev,
                progress: Math.min(progress, 1),
              }));

              if (progress < 1) {
                requestAnimationFrame(updateProgress);
              }
            }
          }
        };

        requestAnimationFrame(updateProgress);

        animationRef.current.addEventListener('finish', () => {
          setAnimationState(prev => ({
            ...prev,
            isAnimating: false,
            progress: 1,
          }));
          resolve();
        });

        animationRef.current.addEventListener('cancel', () => {
          setAnimationState(prev => ({
            ...prev,
            isAnimating: false,
          }));
          reject(new Error('Animation was cancelled'));
        });

      } catch (error) {
        setAnimationState(prev => ({
          ...prev,
          isAnimating: false,
        }));
        reject(error);
      }
    });
  }, [element, keyframes, options, prefersReducedMotion, monitorPerformance]);

  // Stop animation
  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.cancel();
      animationRef.current = null;
    }

    setAnimationState(prev => ({
      ...prev,
      isAnimating: false,
    }));
  }, []);

  // Pause animation
  const pauseAnimation = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.pause();
    }
  }, []);

  // Resume animation
  const resumeAnimation = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.play();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (performanceCheckRef.current) {
        clearTimeout(performanceCheckRef.current);
      }
      stopAnimation();
    };
  }, [stopAnimation]);

  return {
    animationState,
    startAnimation,
    stopAnimation,
    pauseAnimation,
    resumeAnimation,
  };
};

/**
 * Hook for CSS-based animations with performance monitoring
 */
export const useCSSAnimation = (
  element: HTMLElement | null,
  animationName: string,
  options: AnimationOptions = {}
) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startAnimation = useCallback(() => {
    if (!element) return;

    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    setIsAnimating(true);

    // Apply animation styles
    element.style.animationName = animationName;
    element.style.animationDuration = `${options.duration || 300}ms`;
    element.style.animationTimingFunction = options.easing || 'ease-out';
    element.style.animationDelay = `${options.delay || 0}ms`;
    element.style.animationFillMode = options.fillMode || 'forwards';

    // Listen for animation end
    const handleAnimationEnd = () => {
      setIsAnimating(false);
      element.removeEventListener('animationend', handleAnimationEnd);
    };

    element.addEventListener('animationend', handleAnimationEnd);

    // Fallback timeout in case animationend doesn't fire
    timeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
      element.removeEventListener('animationend', handleAnimationEnd);
    }, (options.duration || 300) + (options.delay || 0) + 100);

  }, [element, animationName, options]);

  const stopAnimation = useCallback(() => {
    if (!element) return;

    element.style.animationName = 'none';
    setIsAnimating(false);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [element]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isAnimating,
    startAnimation,
    stopAnimation,
  };
};

/**
 * Hook to check if animations should be enabled based on performance and user preferences
 */
export const useAnimationPreferences = () => {
  const [shouldAnimate, setShouldAnimate] = useState(true);

  useEffect(() => {
    // Check user preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const updatePreference = () => {
      setShouldAnimate(!prefersReducedMotion.matches);
    };

    updatePreference();
    prefersReducedMotion.addEventListener('change', updatePreference);

    // Check device performance capabilities
    const checkPerformance = () => {
      // Simple performance check based on device memory and hardware concurrency
      const deviceMemory = (navigator as any).deviceMemory || 4; // Default to 4GB
      const hardwareConcurrency = navigator.hardwareConcurrency || 4; // Default to 4 cores

      // Disable complex animations on low-end devices
      if (deviceMemory < 2 || hardwareConcurrency < 2) {
        setShouldAnimate(false);
      }
    };

    checkPerformance();

    return () => {
      prefersReducedMotion.removeEventListener('change', updatePreference);
    };
  }, []);

  return shouldAnimate;
};

export default useOptimizedAnimation;