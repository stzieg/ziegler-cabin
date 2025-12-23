import React, { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  subscribeToNotifications,
  formatNotificationTimestamp,
  type Notification
} from '../../utils/notifications';
import styles from './NotificationsTab.module.css';

interface NotificationsTabProps {
  user: User;
  formState?: Record<string, any>;
}

/**
 * Notifications Tab Component - Full notifications page
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export const NotificationsTab: React.FC<NotificationsTabProps> = ({ user }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  /**
   * Load all notifications
   */
  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserNotifications(user.id, 100); // Load more for full page
      setNotifications(data);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
  }, [user.id]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToNotifications(
      user.id,
      (newNotification) => {
        setNotifications(prev => [newNotification, ...prev]);
      },
      (updatedNotification) => {
        setNotifications(prev => 
          prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
        );
      }
    );

    return unsubscribe;
  }, [user.id]);

  /**
   * Mark notification as read
   */
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  /**
   * Mark all notifications as read
   */
  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  /**
   * Get filtered notifications
   */
  const filteredNotifications = notifications.filter(n => 
    filter === 'all' || (filter === 'unread' && !n.read)
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  /**
   * Get notification type icon
   */
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'reservation': return '📅';
      case 'maintenance': return '🔧';
      case 'admin': return '⚙️';
      case 'weather': return '🌤️';
      default: return '📢';
    }
  };

  /**
   * Get notification type color
   */
  const getNotificationTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'reservation': return '#3b82f6';
      case 'maintenance': return '#f59e0b';
      case 'admin': return '#ef4444';
      case 'weather': return '#06b6d4';
      default: return 'var(--color-forest-green)';
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Notifications</h1>
          <p className={styles.subtitle}>
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'All caught up!'}
          </p>
        </div>
        
        <div className={styles.headerActions}>
          {unreadCount > 0 && (
            <button
              className={styles.markAllReadButton}
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className={styles.filterTabs}>
        <button
          className={`${styles.filterTab} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({notifications.length})
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'unread' ? styles.active : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={loadNotifications}>Retry</button>
        </div>
      )}

      {/* Notifications List */}
      <div className={styles.notificationsList}>
        {filteredNotifications.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔔</div>
            <h3>No notifications</h3>
            <p>
              {filter === 'unread' 
                ? "You're all caught up! No unread notifications."
                : "You don't have any notifications yet."
              }
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`${styles.notificationCard} ${!notification.read ? styles.unread : ''}`}
              onClick={() => !notification.read && handleMarkAsRead(notification.id)}
            >
              <div className={styles.notificationIcon}>
                <span 
                  className={styles.typeIcon}
                  style={{ backgroundColor: getNotificationTypeColor(notification.type) }}
                >
                  {getNotificationIcon(notification.type)}
                </span>
                {!notification.read && <div className={styles.unreadDot} />}
              </div>
              
              <div className={styles.notificationContent}>
                <div className={styles.notificationHeader}>
                  <h3 className={styles.notificationTitle}>{notification.title}</h3>
                  <span className={styles.notificationTime}>
                    {formatNotificationTimestamp(notification.created_at)}
                  </span>
                </div>
                
                <p className={styles.notificationMessage}>{notification.message}</p>
                
                <div className={styles.notificationMeta}>
                  <span 
                    className={styles.notificationType}
                    style={{ color: getNotificationTypeColor(notification.type) }}
                  >
                    {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};