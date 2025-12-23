import React from 'react';
import { Logo } from './Logo';
import { HeaderNavigation } from './HeaderNavigation';
import type { TabType } from './FullScreenDashboard';
import styles from './DashboardHeader.module.css';

interface DashboardHeaderProps {
  onMenuToggle: () => void;
  sidebarExpanded: boolean;
  onBack?: () => void;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onLogout: () => void;
}

/**
 * DashboardHeader component - Header with hamburger menu and user navigation
 * Requirements: 2.1, 2.2 - Hamburger menu functionality and fixed positioning
 */
export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onMenuToggle,
  sidebarExpanded,
  onBack,
  activeTab,
  onTabChange,
  onLogout
}) => {
  return (
    <header className={styles.dashboardHeader} data-testid="dashboard-header">
      <button
        type="button"
        className={styles.hamburgerButton}
        onClick={onMenuToggle}
        aria-label="Toggle navigation menu"
        aria-expanded={sidebarExpanded}
        data-testid="hamburger-button"
      >
        {sidebarExpanded ? (
          // X icon when sidebar is open
          <svg className={styles.hamburgerIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          // Hamburger icon when sidebar is closed
          <svg className={styles.hamburgerIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        )}
      </button>
      
      <button
        type="button"
        className={styles.logoContainer}
        onClick={() => onTabChange('home')}
        aria-label="Go to home"
        data-testid="logo-home-button"
      >
        <Logo size="small" />
      </button>
      
      <div className={styles.rightSection}>
        <HeaderNavigation
          activeTab={activeTab}
          onTabChange={onTabChange}
          onLogout={onLogout}
        />
        
        {onBack && (
          <button
            type="button"
            className={styles.backButton}
            onClick={onBack}
            aria-label="Back to home"
            data-testid="back-button"
          >
            ← Back
          </button>
        )}
      </div>
    </header>
  );
};