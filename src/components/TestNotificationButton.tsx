import React from 'react';
import { createNotificationForAllUsers } from '../utils/notifications';

/**
 * Test component to create sample notifications (admin only)
 * Remove this in production
 */
export const TestNotificationButton: React.FC = () => {
  const createTestNotification = async () => {
    try {
      await createNotificationForAllUsers(
        'Test Notification',
        'This is a test notification created at ' + new Date().toLocaleTimeString(),
        'general'
      );
      alert('Test notification created!');
    } catch (error) {
      console.error('Error creating test notification:', error);
      alert('Error creating notification: ' + (error as Error).message);
    }
  };

  return (
    <button
      onClick={createTestNotification}
      style={{
        padding: '0.5rem 1rem',
        background: '#dc2626',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        margin: '1rem'
      }}
    >
      Create Test Notification (Admin Only)
    </button>
  );
};