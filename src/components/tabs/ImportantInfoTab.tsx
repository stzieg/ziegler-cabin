import React, { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { useAuth } from '../../contexts/SupabaseProvider';
import styles from './ImportantInfoTab.module.css';

interface ImportantInfoTabProps {
  user: User;
  formState?: Record<string, any>;
  isAdmin?: boolean;
}

interface ImportantInfo {
  id: string;
  title: string;
  content: string;
  type: 'emergency' | 'contact' | 'instruction' | 'policy';
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  updated_at: string;
}

// Mock data - replace with database later
const MOCK_INFO: ImportantInfo[] = [
  {
    id: '1',
    title: 'Emergency Contacts',
    content: `🚨 Emergency Services: 911
🏥 Aspirus Langlade Hospital: (715) 623-2331
🚓 Langlade County Sheriff's Office: (715) 627-6411
🔥 Pickerel Fire & Rescue: (715) 484-7700
⚡ Power Company: ?
💧 Water Utility: ?`,
    type: 'emergency',
    priority: 'high',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Check-in & Check-out',
    content: `Coming Soon...`,
    type: 'policy',
    priority: 'medium',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '4',
    title: 'Appliance Instructions',
    content: `Coming Soon...`,
    type: 'instruction',
    priority: 'medium',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

/**
 * Important Information Tab Component
 */
export const ImportantInfoTab: React.FC<ImportantInfoTabProps> = ({ user, formState, isAdmin }) => {
  const [infoItems, setInfoItems] = useState<ImportantInfo[]>(MOCK_INFO);
  const [filter, setFilter] = useState<'all' | 'emergency' | 'contact' | 'instruction' | 'policy'>('all');
  const [loading, setLoading] = useState(false);

  /**
   * Get filtered information
   */
  const filteredInfo = infoItems.filter(item => 
    filter === 'all' || item.type === filter
  ).sort((a, b) => {
    // Sort by priority: high -> medium -> low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  /**
   * Get priority color
   */
  const getPriorityColor = (priority: ImportantInfo['priority']) => {
    switch (priority) {
      case 'high': return '#dc2626';
      case 'medium': return '#f59e0b';
      case 'low': return 'var(--color-forest-green)';
    }
  };

  /**
   * Get type icon
   */
  const getTypeIcon = (type: ImportantInfo['type']) => {
    switch (type) {
      case 'emergency': return '🚨';
      case 'instruction': return '📋';
      case 'policy': return '📜';
    }
  };

  /**
   * Get type label
   */
  const getTypeLabel = (type: ImportantInfo['type']) => {
    switch (type) {
      case 'emergency': return 'Emergency';
      case 'instruction': return 'Instructions';
      case 'policy': return 'Policy';
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Important Information</h1>
          <p className={styles.subtitle}>Essential details for your stay</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className={styles.filterTabs}>
        <button
          className={`${styles.filterTab} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'emergency' ? styles.active : ''}`}
          onClick={() => setFilter('emergency')}
        >
          🚨 Emergency
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'instruction' ? styles.active : ''}`}
          onClick={() => setFilter('instruction')}
        >
          📋 Instructions
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'policy' ? styles.active : ''}`}
          onClick={() => setFilter('policy')}
        >
          📜 Policies
        </button>
      </div>

      {/* Information List */}
      <div className={styles.infoList}>
        {filteredInfo.map((item) => (
          <div key={item.id} className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>
                <span className={styles.typeIcon}>{getTypeIcon(item.type)}</span>
              </div>
              <div className={styles.cardTitleSection}>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                <div className={styles.cardMeta}>
                  <span 
                    className={styles.priorityBadge}
                    style={{ backgroundColor: getPriorityColor(item.priority) }}
                  >
                    {item.priority.toUpperCase()}
                  </span>
                  <span className={styles.typeBadge}>
                    {getTypeLabel(item.type)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className={styles.cardContent}>
              <pre className={styles.contentText}>{item.content}</pre>
            </div>
          </div>
        ))}
      </div>

      {filteredInfo.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <h3>No information found</h3>
          <p>No items match the selected filter.</p>
        </div>
      )}
    </div>
  );
};