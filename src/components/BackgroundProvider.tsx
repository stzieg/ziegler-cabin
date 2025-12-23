import React, { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useResponsiveBackground, FOGGY_WOODS_IMAGES } from '../hooks/useResponsiveBackground';
import type { BackgroundImageSet } from '../hooks/useResponsiveBackground';
import { preloadBackgroundImages } from '../utils/backgroundCache';
import '../styles/backgrounds.css';

interface BackgroundContextType {
  currentImage: string;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  preloadImages: () => Promise<void>;
}

const BackgroundContext = createContext<BackgroundContextType | null>(null);

interface BackgroundProviderProps {
  children: ReactNode;
  images?: BackgroundImageSet;
  className?: string;
  enablePreload?: boolean;
}

/**
 * BackgroundProvider component that manages the foggy woods background system
 * Implements Requirements 6.1, 6.3, 6.5
 */
export const BackgroundProvider: React.FC<BackgroundProviderProps> = ({
  children,
  images = FOGGY_WOODS_IMAGES,
  className = '',
  enablePreload = true,
}) => {
  const backgroundState = useResponsiveBackground({
    images,
    fallbackColor: '#2d3e1f',
    loadingColor: '#1a2612',
    enableWebP: true,
  });

  const { isLoading, isLoaded, error } = backgroundState;

  // Preload images on mount for better performance using optimized cache
  useEffect(() => {
    if (enablePreload) {
      const imageUrls = [
        images.small,
        images.medium,
        images.large,
        images.xlarge,
        images.smallWebp,
        images.mediumWebp,
        images.largeWebp,
        images.xlargeWebp,
      ].filter(Boolean) as string[];

      preloadBackgroundImages(imageUrls, 'normal').catch(console.warn);
    }
  }, [enablePreload, images]);

  // Apply background classes to body element
  useEffect(() => {
    const body = document.body;
    const classes = ['bg-foggy-woods'];
    
    if (isLoading) {
      classes.push('loading');
    } else if (isLoaded) {
      classes.push('loaded');
    }
    
    // Add classes
    classes.forEach(cls => body.classList.add(cls));
    
    // Debug logging
    console.log('Background classes applied:', classes);
    console.log('Current image:', backgroundState.currentImage);
    console.log('Body classes:', Array.from(body.classList));
    
    // Cleanup function
    return () => {
      classes.forEach(cls => body.classList.remove(cls));
    };
  }, [isLoading, isLoaded]);

  // Set CSS custom property for current background image
  useEffect(() => {
    if (backgroundState.currentImage) {
      document.documentElement.style.setProperty(
        '--current-background-image',
        `url(${backgroundState.currentImage})`
      );
      
      // Also try setting it directly on body as a test
      document.body.style.backgroundImage = `url(${backgroundState.currentImage})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center center';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundAttachment = 'fixed';
      
      console.log('Background image set directly on body:', backgroundState.currentImage);
    }
  }, [backgroundState.currentImage]);

  // Log errors for debugging
  useEffect(() => {
    if (error) {
      console.warn('Background loading error:', error);
    }
  }, [error]);

  return (
    <BackgroundContext.Provider value={backgroundState}>
      <div className={`background-container ${className}`}>
        {children}
      </div>
    </BackgroundContext.Provider>
  );
};

/**
 * Hook to access background context
 */
export const useBackground = (): BackgroundContextType => {
  const context = useContext(BackgroundContext);
  if (!context) {
    throw new Error('useBackground must be used within a BackgroundProvider');
  }
  return context;
};

/**
 * Higher-order component for adding background functionality
 */
export const withBackground = <P extends object>(
  Component: React.ComponentType<P>,
  backgroundProps?: Partial<BackgroundProviderProps>
) => {
  const WrappedComponent: React.FC<P> = (props) => (
    <BackgroundProvider {...backgroundProps}>
      <Component {...props} />
    </BackgroundProvider>
  );
  
  WrappedComponent.displayName = `withBackground(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default BackgroundProvider;