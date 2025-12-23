import { supabase } from './supabase';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'reservation' | 'maintenance' | 'admin' | 'general' | 'weather';
  read: boolean;
  created_at: string;
  updated_at: string;
  related_reservation_id?: string;
  related_maintenance_id?: string;
}

/**
 * Get notifications for the current user
 */
export async function getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('getUserNotifications error:', error);
    throw error;
  }
}

/**
 * Get unread notification count for the current user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      throw new Error(`Failed to fetch unread count: ${error.message}`);
    }

    return count || 0;
  } catch (error) {
    console.error('getUnreadNotificationCount error:', error);
    throw error;
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    throw new Error(`Failed to mark all notifications as read: ${error.message}`);
  }
}

/**
 * Create a notification for a specific user (admin only)
 */
export async function createNotificationForUser(
  userId: string,
  title: string,
  message: string,
  type: Notification['type'],
  relatedReservationId?: string,
  relatedMaintenanceId?: string
): Promise<void> {
  const { error } = await supabase.rpc('create_notification_for_user', {
    p_user_id: userId,
    p_title: title,
    p_message: message,
    p_type: type,
    p_related_reservation_id: relatedReservationId || null,
    p_related_maintenance_id: relatedMaintenanceId || null
  });

  if (error) {
    console.error('Error creating notification:', error);
    throw new Error(`Failed to create notification: ${error.message}`);
  }
}

/**
 * Create a notification for all users (admin only)
 */
export async function createNotificationForAllUsers(
  title: string,
  message: string,
  type: Notification['type'],
  relatedReservationId?: string,
  relatedMaintenanceId?: string
): Promise<void> {
  try {
    console.log('Creating notification for all users:', { title, message, type });
    
    const { data, error } = await supabase.rpc('create_notification_for_all_users', {
      p_title: title,
      p_message: message,
      p_type: type,
      p_related_reservation_id: relatedReservationId || null,
      p_related_maintenance_id: relatedMaintenanceId || null
    });

    if (error) {
      console.error('RPC error:', error);
      throw new Error(`Failed to create notification for all users: ${error.message}`);
    }

    console.log('Notification created successfully:', data);
  } catch (error) {
    console.error('createNotificationForAllUsers error:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time notification updates
 */
export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: Notification) => void,
  onUpdate: (notification: Notification) => void
) {
  console.log('Creating real-time subscription for user:', userId);
  
  const subscription = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('Real-time INSERT received:', payload);
        onNotification(payload.new as Notification);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('Real-time UPDATE received:', payload);
        onUpdate(payload.new as Notification);
      }
    )
    .subscribe((status) => {
      console.log('Subscription status:', status);
    });

  return () => {
    console.log('Unsubscribing from notifications');
    supabase.removeChannel(subscription);
  };
}

/**
 * Format timestamp for display (same as in HeaderNavigation)
 */
export function formatNotificationTimestamp(timestamp: string): string {
  const now = new Date();
  const notificationTime = new Date(timestamp);
  const diff = now.getTime() - notificationTime.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else {
    return `${days}d ago`;
  }
}