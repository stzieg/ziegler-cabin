import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/SupabaseProvider';
import type { TabType } from './FullScreenDashboard';
import { 
  getUserNotifications, 
  getUnreadNotificationCount, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  subscribeToNotifications,
  formatNotificationTimestamp,
  type Notification
} from '../utils/notifications';
import styles from './HeaderNavigation.module.css';

interface HeaderNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onLogout: () => void;
}

interface HeaderNavigationItem {
  id: TabType;
  label: string;
  icon: string;
  requiresAdmin?: boolean;
}

const HEADER_NAVIGATION_ITEMS: HeaderNavigationItem[] = [
  {
    id: 'profile',
    label: 'Profile',
    icon: '○',
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: '▼',
    requiresAdmin: true,
  },
];

/**
 * HeaderNavigation component - Top-right navigation for user functions
 */
export const HeaderNavigation: React.FC<HeaderNavigationProps> = ({
  activeTab,
  onTabChange,
  onLogout,
}) => {
  const { profile, user } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  
  // Check if user has admin permissions
  const isAdmin = profile?.is_admin || false;

  // Filter navigation items based on user permissions
  const availableItems = HEADER_NAVIGATION_ITEMS.filter(item => 
    !item.requiresAdmin || isAdmin
  );

  /**
   * Load notifications from database
   */
  const loadNotifications = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const [notificationsData, unreadCountData] = await Promise.all([
        getUserNotifications(user.id, 10), // Load last 10 for dropdown
        getUnreadNotificationCount(user.id)
      ]);
      
      setNotifications(notificationsData);
      setUnreadCount(unreadCountData);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load notifications on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user?.id]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up real-time subscription for user:', user.id);

    const unsubscribe = subscribeToNotifications(
      user.id,
      (newNotification) => {
        console.log('Received new notification:', newNotification);
        // Add new notification to the list
        setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
        setUnreadCount(prev => prev + 1);
      },
      (updatedNotification) => {
        console.log('Received updated notification:', updatedNotification);
        // Update existing notification
        setNotifications(prev => 
          prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
        );
        // Recalculate unread count
        if (updatedNotification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    );

    return unsubscribe;
  }, [user?.id]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close menus on escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowUserMenu(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  /**
   * Handle tab selection
   */
  const handleTabSelect = (tabId: TabType) => {
    onTabChange(tabId);
    setShowUserMenu(false);
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    onLogout();
    setShowUserMenu(false);
  };

  /**
   * Mark notification as read
   */
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  /**
   * Mark all notifications as read
   */
  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;

    try {
      await markAllNotificationsAsRead(user.id);
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return (
    <div className={styles.headerNavigation}>
      {/* Notifications Dropdown */}
      <div className={styles.notificationsContainer} ref={notificationsRef}>
        <button
          type="button"
          className={`${styles.headerNavItem} ${showNotifications ? styles.active : ''}`}
          onClick={() => setShowNotifications(!showNotifications)}
          aria-label="Notifications"
          aria-expanded={showNotifications}
          data-testid="header-nav-notifications"
        >
          <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {unreadCount > 0 && (
            <span className={styles.notificationBadge}>{unreadCount}</span>
          )}
        </button>

        {/* Notifications Dropdown */}
        {showNotifications && (
          <div className={styles.notificationsDropdown} data-testid="notifications-dropdown">
            <div className={styles.notificationsHeader}>
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className={styles.markAllReadButton}
                  onClick={handleMarkAllAsRead}
                  disabled={loading}
                >
                  Mark all as read
                </button>
              )}
            </div>
            
            <div className={styles.notificationsList}>
              {loading ? (
                <div className={styles.emptyNotifications}>
                  <p>Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className={styles.emptyNotifications}>
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`${styles.notificationItem} ${!notification.read ? styles.unread : ''}`}
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    <div className={styles.notificationContent}>
                      <div className={styles.notificationTitle}>
                        {notification.title}
                      </div>
                      <div className={styles.notificationMessage}>
                        {notification.message}
                      </div>
                      <div className={styles.notificationTime}>
                        {formatNotificationTimestamp(notification.created_at)}
                      </div>
                    </div>
                    {!notification.read && (
                      <div className={styles.unreadDot}></div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            <div className={styles.notificationsFooter}>
              <button
                type="button"
                className={styles.viewAllButton}
                onClick={() => {
                  handleTabSelect('notifications');
                  setShowNotifications(false);
                }}
              >
                View all notifications
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Menu Toggle */}
      <div ref={menuRef}>
        <button
          type="button"
          className={`${styles.userMenuToggle} ${showUserMenu ? styles.menuOpen : ''}`}
          onClick={() => setShowUserMenu(!showUserMenu)}
          aria-label="User menu"
          aria-expanded={showUserMenu}
          data-testid="user-menu-toggle"
        >
          <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span className={styles.dropdownArrow}>▼</span>
        </button>

        {/* User Dropdown Menu */}
        {showUserMenu && (
          <div className={styles.userDropdown} data-testid="user-dropdown">
            <div className={styles.userInfo}>
              <div className={styles.userName}>
                {profile?.first_name} {profile?.last_name}
              </div>
              <div className={styles.userEmail}>
                {user?.email}
              </div>
            </div>
            
            <div className={styles.dropdownDivider} />
            
            <button
              type="button"
              className={`${styles.dropdownItem} ${activeTab === 'profile' ? styles.active : ''}`}
              onClick={() => handleTabSelect('profile')}
              data-testid="dropdown-profile"
            >
              <svg className={styles.dropdownIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Profile
            </button>

            {isAdmin && (
              <button
                type="button"
                className={`${styles.dropdownItem} ${activeTab === 'admin' ? styles.active : ''}`}
                onClick={() => handleTabSelect('admin')}
                data-testid="dropdown-admin"
              >
                <svg className={styles.dropdownIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m15.5-6.5L19 4.5M5 19.5l1.5-1.5M19 19.5l-1.5-1.5M5 4.5L6.5 6"/>
                </svg>
                Admin
              </button>
            )}
            
            <div className={styles.dropdownDivider} />
            
            <button
              type="button"
              className={styles.dropdownItem}
              onClick={handleLogout}
              data-testid="dropdown-logout"
            >
              <svg className={styles.dropdownIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};