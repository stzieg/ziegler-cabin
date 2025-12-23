/**
 * Optimized lazy loading image component
 * Requirements: 7.1 - Lazy loading for non-critical visual elements
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  priority?: boolean;
  sizes?: string;
  srcSet?: string;
}

/**
 * Lazy loading image component with intersection observer
 * Optimizes performance by only loading images when they enter the viewport
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholder,
  onLoad,
  onError,
  priority = false,
  sizes,
  srcSet,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Priority images load immediately
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback(() => {
    setHasError(true);
    onError?.(new Error(`Failed to load image: ${src}`));
  }, [onError, src]);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.1,
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority]);

  // Preload image when in view
  useEffect(() => {
    if (!isInView || isLoaded || hasError) return;

    const img = new Image();
    img.onload = handleLoad;
    img.onerror = handleError;
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isInView, isLoaded, hasError, src, handleLoad, handleError]);

  return (
    <div className={`lazy-image-container ${className}`} ref={imgRef}>
      {!isLoaded && !hasError && (
        <div className="lazy-image-placeholder">
          {placeholder ? (
            <img src={placeholder} alt="" aria-hidden="true" />
          ) : (
            <div className="lazy-image-skeleton" />
          )}
        </div>
      )}
      
      {isInView && !hasError && (
        <img
          src={src}
          alt={alt}
          className={`lazy-image ${isLoaded ? 'loaded' : 'loading'}`}
          sizes={sizes}
          srcSet={srcSet}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
      
      {hasError && (
        <div className="lazy-image-error">
          <span>Failed to load image</span>
        </div>
      )}
    </div>
  );
};

export default LazyImage;