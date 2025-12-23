/**
 * ResponsiveLayout Component
 * Requirements: 3.1, 3.2, 3.3 - Responsive design with mobile-first approach
 */

import React from 'react';
import styles from './ResponsiveLayout.module.css';

export interface ResponsiveLayoutProps {
  children: React.ReactNode;
  variant?: 'container' | 'grid' | 'flex' | 'form';
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  columns?: {
    mobile?: 1 | 2;
    tablet?: 1 | 2 | 3;
    desktop?: 1 | 2 | 3 | 4;
  };
}

/**
 * Responsive layout component that adapts to different screen sizes
 * Implements mobile-first responsive design patterns
 */
export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  variant = 'container',
  className = '',
  maxWidth = 'lg',
  gap = 'md',
  columns = { mobile: 1, tablet: 2, desktop: 2 },
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'grid':
        return styles.gridLayout;
      case 'flex':
        return styles.flexLayout;
      case 'form':
        return styles.formLayout;
      default:
        return styles.containerLayout;
    }
  };

  const getMaxWidthClass = () => {
    switch (maxWidth) {
      case 'sm':
        return styles.maxWidthSm;
      case 'md':
        return styles.maxWidthMd;
      case 'lg':
        return styles.maxWidthLg;
      case 'xl':
        return styles.maxWidthXl;
      case 'full':
        return styles.maxWidthFull;
      default:
        return styles.maxWidthLg;
    }
  };

  const getGapClass = () => {
    switch (gap) {
      case 'sm':
        return styles.gapSm;
      case 'md':
        return styles.gapMd;
      case 'lg':
        return styles.gapLg;
      case 'xl':
        return styles.gapXl;
      default:
        return styles.gapMd;
    }
  };

  const getColumnsClass = () => {
    const classes = [];
    
    if (columns.mobile) {
      classes.push(styles[`mobileCols${columns.mobile}`]);
    }
    
    if (columns.tablet) {
      classes.push(styles[`tabletCols${columns.tablet}`]);
    }
    
    if (columns.desktop) {
      classes.push(styles[`desktopCols${columns.desktop}`]);
    }
    
    return classes.join(' ');
  };

  const combinedClassName = [
    styles.responsiveLayout,
    getVariantClass(),
    getMaxWidthClass(),
    getGapClass(),
    getColumnsClass(),
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={combinedClassName}>
      {children}
    </div>
  );
};

/**
 * Responsive Card Component
 * Requirements: 6.2, 6.4 - Content readability over background
 */
export interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  background?: 'default' | 'glass' | 'solid';
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  className = '',
  padding = 'md',
  background = 'glass',
}) => {
  const getPaddingClass = () => {
    switch (padding) {
      case 'sm':
        return styles.paddingSm;
      case 'md':
        return styles.paddingMd;
      case 'lg':
        return styles.paddingLg;
      default:
        return styles.paddingMd;
    }
  };

  const getBackgroundClass = () => {
    switch (background) {
      case 'default':
        return styles.backgroundDefault;
      case 'glass':
        return styles.backgroundGlass;
      case 'solid':
        return styles.backgroundSolid;
      default:
        return styles.backgroundGlass;
    }
  };

  const combinedClassName = [
    styles.responsiveCard,
    getPaddingClass(),
    getBackgroundClass(),
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={combinedClassName}>
      {children}
    </div>
  );
};

/**
 * Touch-Friendly Button Component
 * Requirements: 3.3 - Touch-friendly controls with adequate spacing
 */
export interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary':
        return styles.buttonPrimary;
      case 'secondary':
        return styles.buttonSecondary;
      case 'outline':
        return styles.buttonOutline;
      default:
        return styles.buttonPrimary;
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return styles.buttonSm;
      case 'md':
        return styles.buttonMd;
      case 'lg':
        return styles.buttonLg;
      default:
        return styles.buttonMd;
    }
  };

  const combinedClassName = [
    styles.touchButton,
    getVariantClass(),
    getSizeClass(),
    fullWidth ? styles.buttonFullWidth : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  );
};

/**
 * Responsive Form Input Component
 * Requirements: 3.3, 3.5 - Touch-friendly inputs with keyboard accessibility
 */
export interface ResponsiveInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  keyboardSafe?: boolean;
}

export const ResponsiveInput: React.FC<ResponsiveInputProps> = ({
  label,
  error,
  fullWidth = false,
  keyboardSafe = true,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const inputClassName = [
    styles.responsiveInput,
    fullWidth ? styles.inputFullWidth : '',
    keyboardSafe ? styles.keyboardSafe : '',
    error ? styles.inputError : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.inputGroup}>
      {label && (
        <label htmlFor={inputId} className={styles.inputLabel}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={inputClassName}
        {...props}
      />
      {error && (
        <div className={styles.inputErrorMessage} role="alert">
          {error}
        </div>
      )}
    </div>
  );
};