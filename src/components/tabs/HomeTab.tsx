import React, { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useAuth } from '../../contexts/SupabaseProvider';
import { InvitationForm } from '../InvitationForm';
import type { TabType } from '../FullScreenDashboard';
import type { Invitation } from '../../types/supabase';
import styles from './HomeTab.module.css';

interface HomeTabProps {
  user: User;
  formState?: Record<string, any>;
  onTabChange?: (tab: TabType) => void;
}

// SVG icons matching the header navigation style
const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const MaintenanceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);

const GalleryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21,15 16,10 5,21"/>
  </svg>
);

const WeatherIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/>
  </svg>
);

const NotificationsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const ImportantInfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);

const MessageBoardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const InviteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <line x1="20" y1="8" x2="20" y2="14"/>
    <line x1="23" y1="11" x2="17" y2="11"/>
  </svg>
);

/**
 * Get time-based greeting
 */
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

/**
 * HomeTab component - Welcome page for the cabin dashboard
 */
export const HomeTab: React.FC<HomeTabProps> = ({ user, onTabChange }) => {
  const { profile } = useAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  const firstName = profile?.first_name || 'Guest';
  const greeting = getGreeting();

  const handleInvitationSent = (_invitation: Invitation) => {
    // Close modal after a short delay to show success message
    setTimeout(() => {
      setShowInviteModal(false);
    }, 2000);
  };

  const navButtons = [
    { id: 'calendar' as TabType, label: 'Calendar', description: 'View and manage reservations', icon: CalendarIcon },
    { id: 'maintenance' as TabType, label: 'Maintenance', description: 'Track upkeep tasks', icon: MaintenanceIcon },
    { id: 'gallery' as TabType, label: 'Photo Gallery', description: 'Browse photos', icon: GalleryIcon },
    { id: 'weather' as TabType, label: 'Weather', description: 'Check local conditions', icon: WeatherIcon },
    { id: 'messages' as TabType, label: 'Message Board', description: 'Family updates', icon: MessageBoardIcon },
    { id: 'notifications' as TabType, label: 'Notifications', description: 'View recent updates', icon: NotificationsIcon },
    { id: 'important-info' as TabType, label: 'Important Info', description: 'Essential cabin information', icon: ImportantInfoIcon },
  ];

  return (
    <div className={styles.homeTab}>
      <div className={styles.welcomeCard}>
        <h1 className={styles.greeting}>{greeting}, {firstName}!</h1>
        <p className={styles.subtitle}>Welcome to the Ziegler Cabin</p>
      </div>

      <div className={styles.navGrid}>
        {navButtons.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.navButton}
            onClick={() => onTabChange?.(item.id)}
          >
            <span className={styles.navButtonIcon}>
              <item.icon />
            </span>
            <span className={styles.navButtonLabel}>{item.label}</span>
            <span className={styles.navButtonDescription}>{item.description}</span>
          </button>
        ))}
        
        {/* Invite Family Button */}
        <button
          type="button"
          className={styles.navButton}
          onClick={() => setShowInviteModal(true)}
        >
          <span className={styles.navButtonIcon}>
            <InviteIcon />
          </span>
          <span className={styles.navButtonLabel}>Invite Family</span>
          <span className={styles.navButtonDescription}>Send an invitation</span>
        </button>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className={styles.modalOverlay} onClick={() => setShowInviteModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Invite Family Member</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setShowInviteModal(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <InvitationForm
              userId={user.id}
              onInvitationSent={handleInvitationSent}
            />
          </div>
        </div>
      )}
    </div>
  );
};
