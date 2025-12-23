import React, { useState } from 'react';
import { useAuth } from '../contexts/SupabaseProvider';
import { InputField } from './InputField';
import type { UserProfile as UserProfileType } from '../types';
import styles from './UserProfile.module.css';

/**
 * UserProfile component - Display and manage authenticated user information
 * Requirements: 5.3, 7.3
 */
export const UserProfile: React.FC = () => {
  const { user, profile, signOut, updateProfile, loading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<UserProfileType>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  // Don't render if no user or profile
  if (!user || !profile) {
    return (
      <div className={styles.userProfile}>
        <div className={styles.noProfile}>
          <p>No user profile available</p>
        </div>
      </div>
    );
  }

  /**
   * Handle logout functionality
   * Requirements: 5.3
   */
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  /**
   * Start editing profile
   */
  const handleEditStart = () => {
    setIsEditing(true);
    setEditData({
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone_number: profile.phone_number || '',
    });
    setErrors({});
  };

  /**
   * Cancel editing
   */
  const handleEditCancel = () => {
    setIsEditing(false);
    setEditData({});
    setErrors({});
  };

  /**
   * Validate profile data
   */
  const validateProfileData = (data: Partial<UserProfileType>): Record<string, string> => {
    const validationErrors: Record<string, string> = {};

    if (!data.first_name || data.first_name.trim().length === 0) {
      validationErrors.first_name = 'First name is required';
    } else if (data.first_name.length > 50) {
      validationErrors.first_name = 'First name must be 50 characters or less';
    }

    if (!data.last_name || data.last_name.trim().length === 0) {
      validationErrors.last_name = 'Last name is required';
    } else if (data.last_name.length > 50) {
      validationErrors.last_name = 'Last name must be 50 characters or less';
    }

    if (data.phone_number && data.phone_number.trim().length > 0) {
      const phoneRegex = /^[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(data.phone_number) || data.phone_number.length < 10) {
        validationErrors.phone_number = 'Please enter a valid phone number';
      }
    }

    return validationErrors;
  };

  /**
   * Handle profile update
   * Requirements: 7.3
   */
  const handleProfileUpdate = async () => {
    const validationErrors = validateProfileData(editData);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsUpdating(true);
      setErrors({});

      await updateProfile({
        first_name: editData.first_name!,
        last_name: editData.last_name!,
        phone_number: editData.phone_number || undefined,
      });

      setIsEditing(false);
      setEditData({});
    } catch (error: any) {
      console.error('Profile update failed:', error);
      setErrors({ general: error.message || 'Failed to update profile' });
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle input field changes
   */
  const handleInputChange = (field: keyof UserProfileType, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (loading) {
    return (
      <div className={styles.userProfile}>
        <div className={styles.loading}>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.userProfile}>
      <div className={styles.profileHeader}>
        <h2>Profile</h2>
      </div>

      <div className={styles.profileContent}>
        {/* Display general error */}
        {errors.general && (
          <div className={styles.error} role="alert">
            {errors.general}
          </div>
        )}

        {/* Email (read-only) */}
        <div className={styles.field}>
          <label className={styles.label}>Email</label>
          <div className={styles.value}>{user.email}</div>
        </div>

        {/* Editable fields */}
        {isEditing ? (
          <div className={styles.editForm}>
            <InputField
              label="First Name"
              name="first_name"
              type="text"
              value={editData.first_name || ''}
              error={errors.first_name}
              onChange={(value) => handleInputChange('first_name', value)}
              onBlur={() => {}}
              required
            />

            <InputField
              label="Last Name"
              name="last_name"
              type="text"
              value={editData.last_name || ''}
              error={errors.last_name}
              onChange={(value) => handleInputChange('last_name', value)}
              onBlur={() => {}}
              required
            />

            <InputField
              label="Phone Number"
              name="phone_number"
              type="tel"
              value={editData.phone_number || ''}
              error={errors.phone_number}
              onChange={(value) => handleInputChange('phone_number', value)}
              onBlur={() => {}}
              placeholder="(555) 123-4567"
            />

            <div className={styles.editActions}>
              <button
                type="button"
                onClick={handleProfileUpdate}
                disabled={isUpdating}
                className={styles.saveButton}
              >
                {isUpdating ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleEditCancel}
                disabled={isUpdating}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.displayMode}>
            <div className={styles.field}>
              <label className={styles.label}>First Name</label>
              <div className={styles.value}>{profile.first_name}</div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Last Name</label>
              <div className={styles.value}>{profile.last_name}</div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Phone Number</label>
              <div className={styles.value}>
                {profile.phone_number || 'Not provided'}
              </div>
            </div>

            {profile.is_admin && (
              <div className={styles.field}>
                <label className={styles.label}>Role</label>
                <div className={styles.value}>Administrator</div>
              </div>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                onClick={handleEditStart}
                className={styles.editButton}
              >
                Edit Profile
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className={styles.logoutButton}
                aria-label="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};