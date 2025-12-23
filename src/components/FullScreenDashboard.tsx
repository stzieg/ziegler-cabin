import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/SupabaseProvider';
import { ErrorDisplay } from './ErrorDisplay';
import { ErrorBoundary } from './ErrorBoundary';
import { DashboardHeader } from './DashboardHeader';
import { SidebarNavigation } from './SidebarNavigation';
import styles from './FullScreenDashboard.module.css';

export type TabType = 'home' | 'calendar' | 'maintenance' | 'gallery' | 'notifications' | 'important-info' | 'weather' | 'profile' | 'admin';

interface FullScreenDashboardProps {
  initialTab?: TabType;
}

interface TabConfig {
  id: TabType;
  label: string;
  icon: string;
  component: React.LazyExoticComponent<React.ComponentType<any>> | null;
}

interface DashboardPreferences {
  sidebarExpanded: boolean;
  lastActiveTab: TabType;
  timestamp: number;
}

// Lazy load tab components for performance
const HomeTab = React.lazy(() => import('./tabs/HomeTab').then(module => ({ default: module.HomeTab })));
const CalendarTab = React.lazy(() => import('./tabs/CalendarTab').then(module => ({ default: module.CalendarTab })));
const MaintenanceTab = React.lazy(() => import('./tabs/MaintenanceTab').then(module => ({ default: module.MaintenanceTab })));
const GalleryTab = React.lazy(() => import('./tabs/GalleryTab').then(module => ({ default: module.GalleryTab })));
const NotificationsTab = React.lazy(() => import('./tabs/NotificationsTab').then(module => ({ default: module.NotificationsTab })));
const ImportantInfoTab = React.lazy(() => import('./tabs/ImportantInfoTab').then(module => ({ default: module.ImportantInfoTab })));
const WeatherTab = React.lazy(() => import('./tabs/WeatherTab').then(module => ({ default: module.WeatherTab })));
const UserProfile = React.lazy(() => import('./UserProfile').then(module => ({ default: module.UserProfile })));
const AdminPanel = React.lazy(() => import('./AdminPanel').then(module => ({ default: module.AdminPanel })));

const TAB_CONFIGS: TabConfig[] = [
  {
    id: 'home',
    label: 'Home',
    icon: '⌂',
    component: HomeTab,
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: '■',
    component: CalendarTab,
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: '▲',
    component: MaintenanceTab,
  },
  {
    id: 'gallery',
    label: 'Photo Gallery',
    icon: '●',
    component: GalleryTab,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: '◇',
    component: NotificationsTab,
  },
  {
    id: 'important-info',
    label: 'Important Info',
    icon: '◈',
    component: ImportantInfoTab,
  },
  {
    id: 'weather',
    label: 'Weather',
    icon: '◆',
    component: WeatherTab,
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: '○',
    component: UserProfile,
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: '▼',
    component: AdminPanel,
  },
];

const PREFERENCES_KEY = 'dashboardPreferences';

/**
 * Load dashboard preferences from localStorage
 * Requirements: 3.1, 3.2 - Preference restoration on dashboard load
 */
const loadPreferences = (): Partial<DashboardPreferences> => {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load dashboard preferences:', error);
  }
  return {};
};

/**
 * Save dashboard preferences to localStorage
 * Requirements: 3.5 - Handle preference saving without server communication
 */
const savePreferences = (preferences: DashboardPreferences): void => {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn('Failed to save dashboard preferences:', error);
  }
};

/**
 * FullScreenDashboard component - Full-screen interface for cabin management
 * Requirements: 1.1, 1.2, 1.4
 */
export const FullScreenDashboard: React.FC<FullScreenDashboardProps> = ({ 
  initialTab = 'home'
}) => {
  const { user, profile, loading, error, signOut } = useAuth();
  
  // Load preferences from localStorage on initialization
  // Requirements: 3.1, 3.2 - Sidebar state persistence and preference restoration
  const savedPreferences = loadPreferences();
  
  const [activeTab, setActiveTab] = useState<TabType>(
    savedPreferences.lastActiveTab || initialTab
  );
  const [sidebarExpanded, setSidebarExpanded] = useState(
    savedPreferences.sidebarExpanded !== undefined ? savedPreferences.sidebarExpanded : true
  );
  const [sidebarVisible, setSidebarVisible] = useState(false); // for mobile overlay
  const [formStates, setFormStates] = useState<Record<TabType, any>>({
    home: {},
    calendar: {},
    maintenance: {},
    gallery: {},
    notifications: {},
    'important-info': {},
    weather: {},
    profile: {},
    admin: {},
  });

  const isAdmin = profile?.is_admin || false;

  /**
   * Save current preferences to localStorage
   * Requirements: 3.5 - Handle preference saving without server communication
   */
  const updatePreferences = useCallback((updates: Partial<DashboardPreferences>) => {
    const currentPreferences: DashboardPreferences = {
      sidebarExpanded,
      lastActiveTab: activeTab,
      timestamp: Date.now(),
      ...updates,
    };
    savePreferences(currentPreferences);
  }, [sidebarExpanded, activeTab]);

  /**
   * Handle tab switching with form state preservation
   * Requirements: 1.2 - Tab switching functionality
   * Requirements: 3.1, 3.2 - Sidebar state persistence
   */
  const handleTabChange = useCallback((newTab: TabType) => {
    if (newTab === activeTab) return;
    
    // Preserve current form state before switching
    const currentTabElement = document.querySelector(`[data-tab="${activeTab}"]`);
    if (currentTabElement) {
      const formData = extractFormData(currentTabElement);
      if (Object.keys(formData).length > 0) {
        setFormStates(prev => ({
          ...prev,
          [activeTab]: formData,
        }));
      }
    }
    
    setActiveTab(newTab);
    
    // Save tab preference to localStorage
    updatePreferences({ lastActiveTab: newTab });
    
    // Close sidebar on mobile after tab selection
    if (window.innerWidth <= 768) {
      setSidebarVisible(false);
    }
  }, [activeTab, updatePreferences]);

  /**
   * Extract form data from tab content for state preservation
   */
  const extractFormData = (tabElement: Element): Record<string, any> => {
    const formData: Record<string, any> = {};
    const inputs = tabElement.querySelectorAll('input, textarea, select');
    
    inputs.forEach((input) => {
      const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (element.name || element.id) {
        const key = element.name || element.id;
        if (element.type === 'checkbox' || element.type === 'radio') {
          formData[key] = (element as HTMLInputElement).checked;
        } else {
          formData[key] = element.value;
        }
      }
    });
    
    return formData;
  };

  /**
   * Handle hamburger menu toggle
   * Requirements: 2.1, 2.2 - Hamburger menu functionality
   * Requirements: 3.1, 3.2 - Sidebar state persistence
   */
  const handleMenuToggle = useCallback(() => {
    if (window.innerWidth <= 768) {
      // Mobile: toggle overlay visibility
      setSidebarVisible(prev => !prev);
    } else {
      // Desktop: toggle expanded state and save preference
      setSidebarExpanded(prev => {
        const newExpanded = !prev;
        updatePreferences({ sidebarExpanded: newExpanded });
        return newExpanded;
      });
    }
  }, [updatePreferences]);

  /**
   * Handle logout
   */
  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      // After successful logout, the auth state change will handle redirecting to login
    } catch (error) {
      console.error('Logout failed:', error);
      // If logout fails, still try to reload the page as fallback
      window.location.reload();
    }
  }, [signOut]);

  /**
   * Initialize tab from URL hash on mount
   * Requirements: 1.4 - URL routing functionality
   */
  useEffect(() => {
    const hash = window.location.hash.slice(1) as TabType;
    
    if (hash && TAB_CONFIGS.some(config => config.id === hash)) {
      setActiveTab(hash);
    } else {
      // Clear any invalid hash
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  /**
   * Update URL when tab changes
   * Requirements: 1.4 - Browser history functionality
   */
  useEffect(() => {
    window.history.replaceState(null, '', `#${activeTab}`);
  }, [activeTab]);

  /**
   * Restore form state when returning to a tab
   */
  useEffect(() => {
    const savedState = formStates[activeTab];
    if (savedState && Object.keys(savedState).length > 0) {
      // Delay restoration to allow component to mount
      setTimeout(() => {
        Object.entries(savedState).forEach(([key, value]) => {
          const element = document.querySelector(`[name="${key}"], [id="${key}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          if (element) {
            if (element.type === 'checkbox' || element.type === 'radio') {
              (element as HTMLInputElement).checked = Boolean(value);
            } else {
              element.value = String(value);
            }
          }
        });
      }, 100);
    }
  }, [activeTab, formStates]);

  /**
   * Handle responsive behavior
   */
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        // Mobile: ensure sidebar is hidden by default
        setSidebarVisible(false);
        // On mobile, we collapse the sidebar but don't override saved preferences
        // The sidebar will be shown as an overlay when needed
      } else {
        // Desktop: restore expanded state from preferences, don't override
        setSidebarVisible(false); // No overlay on desktop
        // Don't override sidebarExpanded here - let it use the saved preference
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Remove sidebarExpanded dependency to avoid overriding preferences

  if (loading) {
    return (
      <div className={styles.fullScreenDashboard}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.fullScreenDashboard}>
        <div className={styles.errorContainer}>
          <ErrorDisplay error={error} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.fullScreenDashboard}>
        <div className={styles.errorContainer}>
          <p>Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  const activeTabConfig = TAB_CONFIGS.find(config => config.id === activeTab);
  const ActiveComponent = activeTabConfig?.component;

  return (
    <div className={styles.fullScreenDashboard} data-testid="full-screen-dashboard">
      {/* Header with hamburger menu */}
      <DashboardHeader
        onMenuToggle={handleMenuToggle}
        sidebarExpanded={sidebarVisible || sidebarExpanded}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={handleLogout}
      />

      {/* Sidebar Navigation */}
      <SidebarNavigation
        activeTab={activeTab}
        expanded={sidebarExpanded}
        visible={sidebarVisible}
        onTabChange={handleTabChange}
        onToggleExpanded={() => {
          setSidebarExpanded(prev => {
            const newExpanded = !prev;
            updatePreferences({ sidebarExpanded: newExpanded });
            return newExpanded;
          });
        }}
        onClose={() => setSidebarVisible(false)}
      />

      {/* Mobile Overlay */}
      {sidebarVisible && (
        <div 
          className={styles.mobileOverlay}
          onClick={() => setSidebarVisible(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Content Area */}
      <main className={`${styles.mainContent} ${
        sidebarExpanded ? styles.sidebarExpanded : styles.sidebarCollapsed
      }`}>
        <div
          id={`tabpanel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          data-tab={activeTab}
          className={styles.tabPanel}
        >
          <React.Suspense fallback={
            <div className={styles.tabLoading}>
              <div className={styles.spinner} />
              <p>Loading {activeTabConfig?.label}...</p>
            </div>
          }>
            <ErrorBoundary>
              {ActiveComponent && (
                <ActiveComponent 
                  user={user} 
                  formState={formStates[activeTab]}
                  isAdmin={isAdmin}
                  onTabChange={handleTabChange}
                />
              )}
            </ErrorBoundary>
          </React.Suspense>
        </div>
      </main>
    </div>
  );
};