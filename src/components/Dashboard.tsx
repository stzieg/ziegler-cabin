import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/SupabaseProvider';
import { ErrorDisplay } from './ErrorDisplay';
import { ErrorBoundary } from './ErrorBoundary';
import { Weather } from './Weather';
import styles from './Dashboard.module.css';

export type TabType = 'calendar' | 'maintenance' | 'gallery' | 'notifications';

interface DashboardProps {
  initialTab?: TabType;
}

interface TabConfig {
  id: TabType;
  label: string;
  icon: string;
  component: React.LazyExoticComponent<React.ComponentType<any>> | null;
}

// Lazy load tab components for performance
const CalendarTab = React.lazy(() => import('./tabs/CalendarTab').then(module => ({ default: module.CalendarTab })));
const MaintenanceTab = React.lazy(() => import('./tabs/MaintenanceTab').then(module => ({ default: module.MaintenanceTab })));
const GalleryTab = React.lazy(() => import('./tabs/GalleryTab').then(module => ({ default: module.GalleryTab })));
const NotificationsTab = React.lazy(() => import('./tabs/NotificationsTab').then(module => ({ default: module.NotificationsTab })));

const TAB_CONFIGS: TabConfig[] = [
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
];

/**
 * Dashboard component - Main tabbed interface for cabin management
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1
 */
export const Dashboard: React.FC<DashboardProps> = ({ initialTab = 'calendar' }) => {
  const { user, loading, error } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [formStates, setFormStates] = useState<Record<TabType, any>>({
    calendar: {},
    maintenance: {},
    gallery: {},
    notifications: {},
  });
  const tabRefs = useRef<Record<TabType, HTMLButtonElement | null>>({
    calendar: null,
    maintenance: null,
    gallery: null,
    notifications: null,
  });

  /**
   * Handle tab switching with form state preservation
   * Requirements: 1.2, 1.5 - Tab switching and form state preservation
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
  }, [activeTab]);

  /**
   * Extract form data from tab content for state preservation
   * Requirements: 1.5 - Form state preservation
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
   * Keyboard navigation support
   * Requirements: 1.4 - Keyboard navigation and accessibility
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent, tabId: TabType) => {
    const currentIndex = TAB_CONFIGS.findIndex(tab => tab.id === tabId);
    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : TAB_CONFIGS.length - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        nextIndex = currentIndex < TAB_CONFIGS.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        nextIndex = TAB_CONFIGS.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleTabChange(tabId);
        return;
      default:
        return;
    }

    const nextTab = TAB_CONFIGS[nextIndex];
    if (nextTab && tabRefs.current[nextTab.id]) {
      tabRefs.current[nextTab.id]?.focus();
    }
  }, [handleTabChange]);

  /**
   * Initialize tab from URL hash on mount
   * Requirements: 1.4 - Default tab selection based on preferences
   */
  useEffect(() => {
    const hash = window.location.hash.slice(1) as TabType;
    
    if (hash && TAB_CONFIGS.some(tab => tab.id === hash)) {
      setActiveTab(hash);
    } else {
      // Clear any invalid hash
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []); // Only run on mount

  /**
   * Update URL when tab changes
   */
  useEffect(() => {
    window.history.replaceState(null, '', `#${activeTab}`);
  }, [activeTab]);

  /**
   * Restore form state when returning to a tab
   * Requirements: 1.5 - Form state preservation
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

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.errorContainer}>
          <ErrorDisplay error={error} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.errorContainer}>
          <p>Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  const activeTabConfig = TAB_CONFIGS.find(tab => tab.id === activeTab);
  const ActiveComponent = activeTabConfig?.component;

  return (
    <div className={styles.dashboard}>
      {/* Weather Widget */}
      <aside className={styles.weatherSidebar}>
        <Weather compact={true} showForecast={false} />
      </aside>

      {/* Tab Navigation */}
      <nav className={styles.tabNavigation} role="tablist" aria-label="Dashboard navigation">
        <div className={styles.tabContainer}>
          {TAB_CONFIGS.map((tab) => (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[tab.id] = el; }}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.activeTab : ''}`}
              onClick={() => handleTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
            >
              <span className={styles.tabIcon} aria-hidden="true">
                {tab.icon}
              </span>
              <span className={styles.tabLabel}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Tab Content */}
      <main className={styles.tabContent}>
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
              {ActiveComponent && <ActiveComponent user={user} formState={formStates[activeTab]} />}
            </ErrorBoundary>
          </React.Suspense>
        </div>
      </main>
    </div>
  );
};