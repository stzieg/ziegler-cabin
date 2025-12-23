import React, { useState, useEffect } from 'react';
import styles from './ViewTransition.module.css';

export type ViewType = 'calendar' | 'reservation' | 'gallery' | 'maintenance';
export type AnimationType = 'slide' | 'fade' | 'scale';

export interface ViewTransitionProps {
  currentView: ViewType;
  children: React.ReactNode;
  animationType?: AnimationType;
  duration?: number;
  className?: string;
}

/**
 * ViewTransition component for smooth animations between different views
 * Requirements: 4.2 - Smooth transition animations
 */
export const ViewTransition: React.FC<ViewTransitionProps> = ({
  currentView,
  children,
  animationType = 'fade',
  duration = 300,
  className = '',
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayView, setDisplayView] = useState(currentView);

  /**
   * Handle view transitions with animation
   * Requirements: 4.2 - Smooth transitions between views
   */
  useEffect(() => {
    if (currentView !== displayView) {
      setIsTransitioning(true);
      
      // Start exit animation
      const exitTimer = setTimeout(() => {
        setDisplayView(currentView);
        
        // Start enter animation
        const enterTimer = setTimeout(() => {
          setIsTransitioning(false);
        }, 50); // Small delay to ensure DOM update
        
        return () => clearTimeout(enterTimer);
      }, duration / 2);
      
      return () => clearTimeout(exitTimer);
    }
  }, [currentView, displayView, duration]);

  const transitionClass = `${styles.viewTransition} ${styles[animationType]} ${
    isTransitioning ? styles.transitioning : ''
  } ${className}`;

  return (
    <div 
      className={transitionClass}
      style={{ 
        '--transition-duration': `${duration}ms`,
      } as React.CSSProperties}
      data-view={displayView}
    >
      {children}
    </div>
  );
};