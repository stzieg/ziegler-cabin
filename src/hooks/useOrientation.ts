/**
 * Custom hook for orientation detection and handling
 * Requirements: 3.4 - Orientation change detection and layout adaptation
 */

import { useState, useEffect } from 'react';

export type OrientationType = 'portrait' | 'landscape';

export interface OrientationState {
  type: OrientationType;
  angle: number;
  isChanging: boolean;
}

/**
 * Hook to detect and track device orientation changes
 * Returns current orientation state and provides smooth transition handling
 */
export const useOrientation = (): OrientationState => {
  const [orientation, setOrientation] = useState<OrientationState>(() => {
    // Initialize based on current window dimensions
    const isLandscape = window.innerWidth > window.innerHeight;
    return {
      type: isLandscape ? 'landscape' : 'portrait',
      angle: 0,
      isChanging: false,
    };
  });

  useEffect(() => {
    let transitionTimeout: NodeJS.Timeout;

    const handleOrientationChange = () => {
      // Set isChanging flag for smooth transitions
      setOrientation(prev => ({ ...prev, isChanging: true }));

      // Determine orientation from screen API if available
      if (screen.orientation) {
        const type = screen.orientation.type;
        const angle = screen.orientation.angle;
        
        const orientationType: OrientationType = 
          type.includes('landscape') ? 'landscape' : 'portrait';

        setOrientation({
          type: orientationType,
          angle,
          isChanging: true,
        });
      } else {
        // Fallback to window dimensions
        const isLandscape = window.innerWidth > window.innerHeight;
        setOrientation({
          type: isLandscape ? 'landscape' : 'portrait',
          angle: isLandscape ? 90 : 0,
          isChanging: true,
        });
      }

      // Clear isChanging flag after transition completes
      clearTimeout(transitionTimeout);
      transitionTimeout = setTimeout(() => {
        setOrientation(prev => ({ ...prev, isChanging: false }));
      }, 300); // Match CSS transition duration
    };

    const handleResize = () => {
      // Handle orientation changes via resize events (fallback)
      const isLandscape = window.innerWidth > window.innerHeight;
      const newType: OrientationType = isLandscape ? 'landscape' : 'portrait';
      
      if (newType !== orientation.type) {
        handleOrientationChange();
      }
    };

    // Listen for orientation change events
    if (screen.orientation && screen.orientation.addEventListener) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    }

    // Fallback to resize events
    window.addEventListener('resize', handleResize);

    // Also listen for orientationchange event (older API)
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      clearTimeout(transitionTimeout);
      
      if (screen.orientation && screen.orientation.removeEventListener) {
        screen.orientation.removeEventListener('change', handleOrientationChange);
      }
      
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [orientation.type]);

  return orientation;
};
