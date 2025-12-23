/**
 * Performance monitoring utilities
 * Requirements: 7.2 - Animation performance monitoring and optimization
 */

import React from 'react';

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage?: number;
  loadTime: number;
  renderTime: number;
}

interface PerformanceThresholds {
  minFPS: number;
  maxFrameTime: number;
  maxMemoryUsage?: number;
  maxLoadTime: number;
  maxRenderTime: number;
}

/**
 * Performance monitoring class for tracking UI performance
 */
class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = 0;
  private fps = 0;
  private frameTime = 0;
  private isMonitoring = false;
  private callbacks: ((metrics: PerformanceMetrics) => void)[] = [];
  private thresholds: PerformanceThresholds = {
    minFPS: 30,
    maxFrameTime: 33.33, // ~30fps
    maxLoadTime: 3000,
    maxRenderTime: 16.67, // ~60fps
  };

  /**
   * Start monitoring performance
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.monitorFrame();
  }

  /**
   * Stop monitoring performance
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
  }

  /**
   * Add callback for performance updates
   */
  onUpdate(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Set performance thresholds
   */
  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return {
      fps: this.fps,
      frameTime: this.frameTime,
      memoryUsage: this.getMemoryUsage(),
      loadTime: this.getLoadTime(),
      renderTime: this.frameTime,
    };
  }

  /**
   * Check if performance is acceptable
   */
  isPerformanceAcceptable(): boolean {
    const metrics = this.getMetrics();
    
    return (
      metrics.fps >= this.thresholds.minFPS &&
      metrics.frameTime <= this.thresholds.maxFrameTime &&
      metrics.loadTime <= this.thresholds.maxLoadTime &&
      metrics.renderTime <= this.thresholds.maxRenderTime &&
      (!metrics.memoryUsage || !this.thresholds.maxMemoryUsage || 
       metrics.memoryUsage <= this.thresholds.maxMemoryUsage)
    );
  }

  /**
   * Monitor frame performance
   */
  private monitorFrame(): void {
    if (!this.isMonitoring) return;

    const now = performance.now();
    this.frameCount++;

    // Calculate FPS every second
    if (now - this.lastTime >= 1000) {
      this.fps = (this.frameCount * 1000) / (now - this.lastTime);
      this.frameTime = (now - this.lastTime) / this.frameCount;
      
      // Notify callbacks
      const metrics = this.getMetrics();
      this.callbacks.forEach(callback => callback(metrics));

      // Reset counters
      this.frameCount = 0;
      this.lastTime = now;
    }

    requestAnimationFrame(() => this.monitorFrame());
  }

  /**
   * Get memory usage if available
   */
  private getMemoryUsage(): number | undefined {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
    }
    return undefined;
  }

  /**
   * Get page load time
   */
  private getLoadTime(): number {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation && navigation.loadEventEnd && navigation.fetchStart) {
      return navigation.loadEventEnd - navigation.fetchStart;
    }
    return 0;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Hook for monitoring component performance
 */
export const usePerformanceMonitoring = (
  componentName: string,
  thresholds?: Partial<PerformanceThresholds>
) => {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics | null>(null);
  const [isAcceptable, setIsAcceptable] = React.useState(true);

  React.useEffect(() => {
    if (thresholds) {
      performanceMonitor.setThresholds(thresholds);
    }

    performanceMonitor.startMonitoring();

    const unsubscribe = performanceMonitor.onUpdate((newMetrics) => {
      setMetrics(newMetrics);
      setIsAcceptable(performanceMonitor.isPerformanceAcceptable());

      // Log performance warnings
      if (!performanceMonitor.isPerformanceAcceptable()) {
        console.warn(`Performance issue in ${componentName}:`, newMetrics);
      }
    });

    return () => {
      unsubscribe();
      performanceMonitor.stopMonitoring();
    };
  }, [componentName, thresholds]);

  return { metrics, isAcceptable };
};

/**
 * Measure render time of a component
 */
export const measureRenderTime = (componentName: string) => {
  return (_target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const start = performance.now();
      const result = method.apply(this, args);
      const end = performance.now();
      
      const renderTime = end - start;
      
      if (renderTime > 16.67) { // Slower than 60fps
        console.warn(`Slow render in ${componentName}.${propertyName}: ${renderTime.toFixed(2)}ms`);
      }

      return result;
    };

    return descriptor;
  };
};

/**
 * Debounce function for performance optimization
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
};

/**
 * Throttle function for performance optimization
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Check if device has good performance capabilities
 */
export const getDevicePerformanceLevel = (): 'high' | 'medium' | 'low' => {
  const deviceMemory = (navigator as any).deviceMemory || 4;
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const connection = (navigator as any).connection;

  // High performance: 8GB+ RAM, 8+ cores, fast connection
  if (deviceMemory >= 8 && hardwareConcurrency >= 8) {
    return 'high';
  }

  // Low performance: <2GB RAM, <2 cores, or slow connection
  if (deviceMemory < 2 || hardwareConcurrency < 2 || 
      (connection && connection.effectiveType === 'slow-2g')) {
    return 'low';
  }

  // Medium performance: everything else
  return 'medium';
};

/**
 * Optimize animations based on device performance
 */
export const getOptimizedAnimationSettings = () => {
  const performanceLevel = getDevicePerformanceLevel();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    return {
      enableAnimations: false,
      duration: 0,
      easing: 'linear',
    };
  }

  switch (performanceLevel) {
    case 'high':
      return {
        enableAnimations: true,
        duration: 300,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      };
    case 'medium':
      return {
        enableAnimations: true,
        duration: 200,
        easing: 'ease-out',
      };
    case 'low':
      return {
        enableAnimations: true,
        duration: 100,
        easing: 'linear',
      };
  }
};

export default PerformanceMonitor;