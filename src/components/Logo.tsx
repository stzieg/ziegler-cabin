import React from 'react';
import styles from './Logo.module.css';

export interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'medium', className }) => {
  return (
    <div className={`${styles.logo} ${styles[size]} ${className || ''}`}>
      <img
        src="/images/cursive-z-logo.png"
        alt="Ziegler Cabin Logo - Cursive Z"
        className={styles.logoImage}
        onError={(e) => {
          // Fallback to SVG if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const fallback = target.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = 'block';
        }}
      />
      
      {/* Fallback SVG (hidden by default) */}
      <svg
        viewBox="0 0 100 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={styles.logoSvg}
        style={{ display: 'none' }}
        aria-label="Ziegler Cabin Logo - Cursive Z"
      >
        <text
          x="50"
          y="70"
          textAnchor="middle"
          fontSize="60"
          fontFamily="cursive"
          fill="currentColor"
          fontWeight="bold"
        >
          Z
        </text>
      </svg>
    </div>
  );
};
