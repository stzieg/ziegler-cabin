import React from 'react';
import { useAuth } from '../contexts/SupabaseProvider';
import styles from './SidebarNavigation.module.css';

export type TabType = 'home' | 'calendar' | 'maintenance' | 'gallery' | 'notifications' | 'important-info' | 'weather' | 'profile' | 'admin';

interface NavigationItem {
  id: TabType;
  label: string;
  icon: string;
  section: 'main' | 'user';
  requiresAdmin?: boolean;
}

interface SidebarNavigationProps {
  activeTab: TabType;
  expanded: boolean;
  visible: boolean;
  onTabChange: (tab: TabType) => void;
  onToggleExpanded: () => void;
  onClose: () => void; // for mobile
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  // Main navigation
  {
    id: 'calendar',
    label: 'Calendar',
    icon: '',
    section: 'main',
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: '',
    section: 'main',
  },
  {
    id: 'gallery',
    label: 'Photo Gallery',
    icon: '',
    section: 'main',
  },
  {
    id: 'weather',
    label: 'Weather',
    icon: '',
    section: 'main',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: '',
    section: 'main',
  },
  {
    id: 'important-info',
    label: 'Important Info',
    icon: '',
    section: 'main',
  },
];

/**
 * SidebarNavigation component - Collapsible sidebar navigation with main and user menu sections
 * Requirements: 2.3, 2.4, 2.5, 9.1, 9.3, 9.4
 */
export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  activeTab,
  expanded,
  visible,
  onTabChange,
  onClose,
}) => {
  const { profile } = useAuth();
  
  // Check if user has admin permissions
  const isAdmin = profile?.is_admin || false;

  // Filter navigation items based on user permissions
  const availableItems = NAVIGATION_ITEMS.filter(item => 
    !item.requiresAdmin || isAdmin
  );

  /**
   * Handle tab selection
   * Requirements: 2.4 - Tab selection and navigation
   */
  const handleTabSelect = (tabId: TabType) => {
    onTabChange(tabId);
    
    // Close sidebar on mobile after tab selection
    if (window.innerWidth <= 768) {
      onClose();
    }
  };

  return (
    <nav 
      className={`${styles.sidebarNavigation} ${
        expanded ? styles.expanded : styles.collapsed
      } ${visible ? styles.visible : ''}`}
      aria-label="Dashboard navigation"
      data-testid="sidebar-navigation"
    >
      {/* Home Navigation - Top of sidebar */}
      <div className={styles.homeNavigation}>
        <button
          type="button"
          className={`${styles.navItem} ${styles.homeItem} ${activeTab === 'home' ? styles.active : ''}`}
          onClick={() => handleTabSelect('home')}
          aria-current={activeTab === 'home' ? 'page' : undefined}
          data-testid="nav-item-home"
        >
          <span className={styles.navLabel}>Home</span>
        </button>
      </div>

      <div className={styles.navDivider} />

      {/* Main Navigation Section */}
      <div className={styles.mainNavigation} role="group" aria-label="Main navigation">
        {availableItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.navItem} ${activeTab === item.id ? styles.active : ''}`}
            onClick={() => handleTabSelect(item.id)}
            aria-current={activeTab === item.id ? 'page' : undefined}
            data-testid={`nav-item-${item.id}`}
          >
            <span className={styles.navLabel}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};