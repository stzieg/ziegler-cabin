import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { AuthContainer } from './AuthContainer';
import { UserProfile } from './UserProfile';
import { AdminPanel } from './AdminPanel';
import { EmailTest } from './EmailTest';
import { Dashboard } from './Dashboard';
import { ErrorDisplay, NetworkErrorDisplay, SessionExpiredDisplay, SetupRequiredDisplay } from './ErrorDisplay';
import { useAuth } from '../contexts/SupabaseProvider';
import { ErrorType } from '../utils/errorHandling';
import { isUsingPlaceholderCredentials } from '../utils/supabase';
import styles from './HomePage.module.css';

interface HomePageProps {
  onNavigateToDashboard?: () => void;
}

/**
 * HomePage component - Main landing page for the cabin management system
 * Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2, 5.4, 7.4, 5.5
 */
export const HomePage: React.FC<HomePageProps> = ({ onNavigateToDashboard }) => {
  const { 
    user, 
    profile, 
    loading, 
    session, 
    isConnected, 
    lastError, 
    clearError,
    refreshProfile 
  } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'admin' | 'email-test'>('dashboard');
  const [sessionRestored, setSessionRestored] = useState(false);

  /**
   * Handle session restoration on page load
   * Requirements: 5.2, 5.4 - Session persistence across browser sessions
   */
  useEffect(() => {
    // Mark session restoration as complete once loading is done
    if (!loading) {
      setSessionRestored(true);
      
      // Log session restoration status for debugging
      if (session) {
        console.log('Session restored successfully for user:', user?.email);
      } else {
        console.log('No existing session found');
      }
    }
  }, [loading, session, user]);

  /**
   * Handle successful authentication
   * Requirements: 3.4, 5.1
   */
  const handleAuthSuccess = () => {
    console.log('Authentication successful');
    clearError(); // Clear any previous errors
    // Session will be handled automatically by SupabaseProvider
  };

  /**
   * Handle error retry actions
   * Requirements: 7.4, 5.5 - Network error recovery
   */
  const handleErrorRetry = async () => {
    if (lastError?.type === ErrorType.NETWORK_ERROR || 
        lastError?.type === ErrorType.SUPABASE_CONNECTION_ERROR) {
      // Try to refresh profile data to test connection
      try {
        await refreshProfile();
      } catch (error) {
        // Error will be handled by the context
      }
    }
  };

  /**
   * Handle error dismissal
   */
  const handleErrorDismiss = () => {
    clearError();
  };

  // Show loading state while checking authentication and restoring session
  // Requirements: 5.1, 5.2 - Handle loading states during authentication
  if (loading || !sessionRestored) {
    return (
      <div className={styles.homePage}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <Logo size="large" />
            <p>
              {loading ? 'Loading...' : 'Restoring session...'}
            </p>
            {!isConnected && (
              isUsingPlaceholderCredentials ? (
                <SetupRequiredDisplay 
                  onDismiss={handleErrorDismiss}
                />
              ) : (
                <NetworkErrorDisplay 
                  onRetry={handleErrorRetry}
                  onDismiss={handleErrorDismiss}
                />
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show critical authentication error if present and no user
  // Requirements: 7.4, 5.5 - Error handling for authentication failures
  if (lastError && !user && lastError.type !== ErrorType.NETWORK_ERROR && 
      lastError.type !== ErrorType.SUPABASE_CONNECTION_ERROR) {
    return (
      <div className={styles.homePage}>
        <div className={styles.container}>
          <div className={styles.errorContainer}>
            <Logo size="large" />
            <ErrorDisplay
              error={lastError}
              onRetry={lastError.retryable ? handleErrorRetry : undefined}
              onDismiss={handleErrorDismiss}
              showDetails={true}
            />
          </div>
        </div>
      </div>
    );
  }

  // Show authenticated view if user is logged in
  // Requirements: 5.1, 5.2 - Route between authenticated and unauthenticated views
  if (user && session) {
    const isAdmin = profile?.is_admin || false;

    return (
      <div className={styles.homePage}>
        <div className={styles.container}>
          <header className={styles.logoContainer} role="banner">
            <Logo size="large" />
          </header>
          <main id="main-content" className={styles.formContainer} role="main">
            <div className={styles.authenticatedView}>
              <h2>Welcome to the Cabin!</h2>
              
              {/* Connection status indicator */}
              {!isConnected && (
                isUsingPlaceholderCredentials ? (
                  <SetupRequiredDisplay 
                    onDismiss={handleErrorDismiss}
                  />
                ) : (
                  <NetworkErrorDisplay 
                    onRetry={handleErrorRetry}
                    onDismiss={handleErrorDismiss}
                  />
                )
              )}
              
              {/* Show session expiration warning */}
              {lastError?.type === ErrorType.SESSION_EXPIRED && (
                <SessionExpiredDisplay 
                  onSignIn={() => window.location.reload()}
                  onDismiss={handleErrorDismiss}
                />
              )}
              
              {/* Show other errors if present */}
              {lastError && lastError.type !== ErrorType.NETWORK_ERROR && 
               lastError.type !== ErrorType.SUPABASE_CONNECTION_ERROR &&
               lastError.type !== ErrorType.SESSION_EXPIRED && (
                <ErrorDisplay
                  error={lastError}
                  onRetry={lastError.retryable ? handleErrorRetry : undefined}
                  onDismiss={handleErrorDismiss}
                />
              )}
              
              {/* Tab navigation */}
              <div className={styles.tabNavigation}>
                <button
                  type="button"
                  className={`${styles.tabButton} ${activeTab === 'dashboard' ? styles.activeTab : ''}`}
                  onClick={() => {
                    if (onNavigateToDashboard) {
                      onNavigateToDashboard();
                    } else {
                      setActiveTab('dashboard');
                    }
                  }}
                >
                  🏠 Dashboard
                </button>
                <button
                  type="button"
                  className={`${styles.tabButton} ${activeTab === 'profile' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab('profile')}
                >
                  ○ Profile
                </button>
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      className={`${styles.tabButton} ${activeTab === 'admin' ? styles.activeTab : ''}`}
                      onClick={() => setActiveTab('admin')}
                    >
                      ▼ Admin Panel
                    </button>
                    <button
                      type="button"
                      className={`${styles.tabButton} ${activeTab === 'email-test' ? styles.activeTab : ''}`}
                      onClick={() => setActiveTab('email-test' as any)}
                    >
                      📧 Email Test
                    </button>
                  </>
                )}
              </div>

              {/* Content based on active tab */}
              {activeTab === 'dashboard' && !onNavigateToDashboard ? (
                <Dashboard initialTab="calendar" />
              ) : activeTab === 'profile' ? (
                <UserProfile />
              ) : activeTab === 'admin' ? (
                <AdminPanel user={user} isAdmin={isAdmin} />
              ) : activeTab === 'email-test' ? (
                <EmailTest />
              ) : null}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Show authentication forms for unauthenticated users
  // Requirements: 5.1, 5.2 - Display appropriate components based on auth state
  return (
    <div className={styles.homePage}>
      {/* Skip link for keyboard navigation - Requirement 3.1 */}
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      
      <div className={styles.container}>
        {/* Logo positioned prominently - Requirement 1.1 */}
        <header className={styles.logoContainer} role="banner">
          <Logo size="large" />
        </header>

        {/* Connection status indicator */}
        {!isConnected && (
          isUsingPlaceholderCredentials ? (
            <SetupRequiredDisplay 
              onDismiss={handleErrorDismiss}
            />
          ) : (
            <NetworkErrorDisplay 
              onRetry={handleErrorRetry}
              onDismiss={handleErrorDismiss}
            />
          )
        )}

        {/* Show authentication errors */}
        {lastError && (
          <ErrorDisplay
            error={lastError}
            onRetry={lastError.retryable ? handleErrorRetry : undefined}
            onDismiss={handleErrorDismiss}
          />
        )}

        {/* Centered AuthContainer - Requirement 1.1, 2.1 */}
        <main id="main-content" className={styles.formContainer} role="main">
          <AuthContainer onAuthSuccess={handleAuthSuccess} />
        </main>
      </div>
    </div>
  );
};
