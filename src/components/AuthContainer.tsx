import React, { useState, useEffect } from 'react';
import { LoginForm } from './LoginForm';
import { RegistrationForm } from './RegistrationForm';
import { useAuth } from '../contexts/SupabaseProvider';
import type { LoginData, RegistrationData } from '../types/supabase';
import styles from './AuthContainer.module.css';

export interface AuthContainerProps {
  onAuthSuccess: () => void;
}

type AuthMode = 'login' | 'register';

/**
 * AuthContainer component - Manages authentication form state and switching
 * Handles URL parameters for invitation tokens
 * Requirements: 5.1, 5.2 - Authentication state management
 */
export const AuthContainer: React.FC<AuthContainerProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [invitationToken, setInvitationToken] = useState<string>('');
  const { loading } = useAuth();

  /**
   * Extract invitation token from URL parameters on component mount
   * Requirements: Handle invitation token in URL parameters
   */
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      setInvitationToken(token);
      setMode('register'); // Switch to registration mode if token is present
    }
  }, []);

  /**
   * Handle successful login
   * Requirements: 3.4, 5.1
   */
  const handleLoginSuccess = async (data: LoginData) => {
    console.log('Login successful:', data);
    onAuthSuccess();
  };

  /**
   * Handle successful registration
   * Requirements: 2.2, 5.1
   */
  const handleRegistrationSuccess = (data: RegistrationData) => {
    console.log('Registration successful:', data);
    onAuthSuccess();
  };

  /**
   * Switch to registration mode
   */
  const switchToRegister = () => {
    setMode('register');
  };

  /**
   * Switch to login mode
   */
  const switchToLogin = () => {
    setMode('login');
  };

  return (
    <div className={styles.authContainer}>
      {mode === 'login' ? (
        <LoginForm
          onSubmit={handleLoginSuccess}
          onSwitchToRegister={switchToRegister}
          isLoading={loading}
        />
      ) : (
        <RegistrationForm
          onSubmit={handleRegistrationSuccess}
          onSwitchToLogin={switchToLogin}
          isLoading={loading}
          invitationToken={invitationToken}
        />
      )}
    </div>
  );
};