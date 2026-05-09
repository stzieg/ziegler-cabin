import React, { useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
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
    content: `Emergency Services: 911
Aspirus Langlade Hospital: (715) 623-2331
Langlade County Sheriff's Office: (715) 627-6411
Pickerel Fire & Rescue: (715) 484-7700
Power Company: ?
Water Utility: ?`,
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
export const ImportantInfoTab: React.FC<ImportantInfoTabProps> = () => {
  const infoItems = useMemo(() => [...MOCK_INFO].sort((a, b) => {
    // Sort by priority: high -> medium -> low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  }), []);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Important Information</h1>
        </div>
      </div>

      {/* Information List */}
      <div className={styles.infoList}>
        {infoItems.map((item) => (
          <div key={item.id} className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleSection}>
                <h3 className={styles.cardTitle}>{item.title}</h3>
              </div>
            </div>
            
            <div className={styles.cardContent}>
              <pre className={styles.contentText}>{item.content}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
