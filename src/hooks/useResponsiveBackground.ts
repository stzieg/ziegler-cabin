import { useState, useEffect, useCallback } from 'react';

interface BackgroundImageSet {
  small: string;
  medium: string;
  large: string;
  xlarge: string;
  smallWebp?: string;
  mediumWebp?: string;
  largeWebp?: string;
  xlargeWebp?: string;
}

interface UseResponsiveBackgroundOptions {
  images: BackgroundImageSet;
  fallbackColor?: string;
  loadingColor?: string;
  enableWebP?: boolean;
}

interface UseResponsiveBackgroundReturn {
  currentImage: string;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  preloadImages: () => Promise<void>;
}

/**
 * Hook for managing responsive background images with optimization
 * Implements Requirements 6.1, 6.3, 6.5
 */
export const useResponsiveBackground = ({
  images,
  fallbackColor: _fallbackColor = '#2d3e1f',
  loadingColor: _loadingColor = '#1a2612',
  enableWebP = true,
}: UseResponsiveBackgroundOptions): UseResponsiveBackgroundReturn => {
  const [currentImage, setCurrentImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check if browser supports WebP
  const supportsWebP = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAARBxAR/Q9ERP8DAABWUDggGAAAABQBAJ0BKgEAAQAAAP4AAA3AAP7mtQAAAA==';
    });
  }, []);

  // Get appropriate image based on viewport size
  const getImageForViewport = useCallback(async (): Promise<string> => {
    const width = window.innerWidth;
    const pixelRatio = window.devicePixelRatio || 1;
    const webPSupported = enableWebP ? await supportsWebP() : false;

    // Determine image size based on viewport and pixel ratio
    let imageKey: keyof BackgroundImageSet;
    
    if (width <= 767) {
      // Mobile
      imageKey = pixelRatio > 1 ? 'medium' : 'small';
    } else if (width <= 1023) {
      // Tablet
      imageKey = pixelRatio > 1 ? 'large' : 'medium';
    } else if (width <= 1439) {
      // Desktop
      imageKey = pixelRatio > 1 ? 'xlarge' : 'large';
    } else {
      // Large desktop
      imageKey = 'xlarge';
    }

    // Use WebP version if supported and available
    if (webPSupported) {
      const webpKey = `${imageKey}Webp` as keyof BackgroundImageSet;
      if (images[webpKey]) {
        return images[webpKey] as string;
      }
    }

    return images[imageKey];
  }, [images, enableWebP, supportsWebP]);

  // Preload image
  const preloadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }, []);

  // Load appropriate image for current viewport
  const loadImage = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const imageSrc = await getImageForViewport();
      console.log('Loading background image:', imageSrc);
      await preloadImage(imageSrc);
      
      setCurrentImage(imageSrc);
      setIsLoaded(true);
      setIsLoading(false);
      console.log('Background image loaded successfully:', imageSrc);
    } catch (err) {
      console.error('Background image loading failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load background image');
      setIsLoading(false);
      setIsLoaded(false);
    }
  }, [getImageForViewport, preloadImage]);

  // Preload all images for faster switching
  const preloadImages = useCallback(async (): Promise<void> => {
    const imagesToPreload = [
      images.small,
      images.medium,
      images.large,
      images.xlarge,
    ];

    if (enableWebP) {
      const webPSupported = await supportsWebP();
      if (webPSupported) {
        if (images.smallWebp) imagesToPreload.push(images.smallWebp);
        if (images.mediumWebp) imagesToPreload.push(images.mediumWebp);
        if (images.largeWebp) imagesToPreload.push(images.largeWebp);
        if (images.xlargeWebp) imagesToPreload.push(images.xlargeWebp);
      }
    }

    // Preload images in parallel
    await Promise.allSettled(
      imagesToPreload.map(src => preloadImage(src))
    );
  }, [images, enableWebP, supportsWebP, preloadImage]);

  // Handle viewport changes
  useEffect(() => {
    loadImage();

    const handleResize = () => {
      // Debounce resize events
      const timeoutId = setTimeout(() => {
        loadImage();
      }, 250);

      return () => clearTimeout(timeoutId);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [loadImage]);

  // Handle orientation changes on mobile
  useEffect(() => {
    const handleOrientationChange = () => {
      // Small delay to ensure viewport dimensions are updated
      setTimeout(() => {
        loadImage();
      }, 100);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [loadImage]);

  return {
    currentImage,
    isLoading,
    isLoaded,
    error,
    preloadImages,
  };
};

// Default foggy woods image set
export const FOGGY_WOODS_IMAGES: BackgroundImageSet = {
  small: '/images/backgrounds/foggy-woods-small.jpg',
  medium: '/images/backgrounds/foggy-woods-medium.jpg',
  large: '/images/backgrounds/foggy-woods-large.jpg',
  xlarge: '/images/backgrounds/foggy-woods-xlarge.jpg',
  smallWebp: '/images/backgrounds/foggy-woods-small.webp',
  mediumWebp: '/images/backgrounds/foggy-woods-medium.webp',
  largeWebp: '/images/backgrounds/foggy-woods-large.webp',
  xlargeWebp: '/images/backgrounds/foggy-woods-xlarge.webp',
};

export type { BackgroundImageSet, UseResponsiveBackgroundOptions, UseResponsiveBackgroundReturn };