import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { 
  supabase, 
  getCurrentSession, 
  getUserProfile,
  setupAuthStateHandler,
  setupSessionMonitoring,
  addSessionExpirationListener,
  removeSessionExpirationListener,
  withNetworkRecovery,
  checkSupabaseHealth
} from '../utils/supabase';
import { processError, logError, ErrorType, type AppError } from '../utils/errorHandling';
import type { UserProfile, AuthState } from '../types';

// Authentication context interface
interface AuthContextType extends AuthState {
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, profileData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (profileData: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
  isConnected: boolean;
  lastError: AppError | null;
}

// Create the authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use the authentication context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a SupabaseProvider');
  }
  return context;
};

// SupabaseProvider props interface
interface SupabaseProviderProps {
  children: ReactNode;
}

/**
 * SupabaseProvider component - Provides Supabase client and authentication state
 * Requirements: 7.1, 7.2, 5.1, 5.2, 7.4, 5.5
 */
export const SupabaseProvider: React.FC<SupabaseProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [lastError, setLastError] = useState<AppError | null>(null);

  // Initialize authentication state and set up session listener
  useEffect(() => {
    let mounted = true;
    let sessionMonitorCleanup: (() => void) | null = null;

    // Handle application errors
    const handleError = (appError: AppError, context: string) => {
      if (!mounted) return;
      
      logError(appError, context);
      setLastError(appError);
      setError(appError.userMessage);
      
      // Update connection status based on error type
      if (appError.type === ErrorType.NETWORK_ERROR || 
          appError.type === ErrorType.SUPABASE_CONNECTION_ERROR) {
        setIsConnected(false);
      }
      
      // Handle session expiration
      if (appError.type === ErrorType.SESSION_EXPIRED) {
        setUser(null);
        setProfile(null);
        setSession(null);
      }
    };

    // Function to handle session restoration and updates
    const handleSession = async (session: Session | null) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        try {
          // Load user profile when session is established with network recovery
          const userProfile = await withNetworkRecovery(
            () => getUserProfile(session.user.id),
            'loadUserProfile'
          );
          
          if (mounted) {
            setProfile(userProfile);
            setIsConnected(true); // Connection successful
            setError(null); // Clear any previous errors
            setLastError(null);
          }
        } catch (error) {
          if (mounted) {
            const appError = processError(error, 'loadUserProfile');
            handleError(appError, 'handleSession');
          }
        }
      } else {
        if (mounted) {
          setProfile(null);
        }
      }
      
      if (mounted) {
        setLoading(false);
      }
    };

    // Session expiration handler
    const handleSessionExpiration = () => {
      if (mounted) {
        const appError = processError(
          new Error('Session expired'),
          'sessionExpiration'
        );
        handleError(appError, 'sessionExpiration');
      }
    };

    // Initialize session on component mount
    const initializeAuth = async () => {
      try {
        // Check Supabase connection health first
        const healthy = await checkSupabaseHealth();
        if (mounted) {
          setIsConnected(healthy);
        }

        // Get current session with network recovery
        const currentSession = await withNetworkRecovery(
          getCurrentSession,
          'initializeAuth'
        );
        
        await handleSession(currentSession);
      } catch (error) {
        if (mounted) {
          const appError = processError(error, 'initializeAuth');
          handleError(appError, 'initializeAuth');
          setLoading(false);
        }
      }
    };

    // Set up enhanced auth state change listener
    const subscription = setupAuthStateHandler(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      await handleSession(session);
      
      // Clear error on successful auth state change
      if (mounted && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        setError(null);
        setLastError(null);
        setIsConnected(true);
      }
    });

    // Set up session monitoring
    sessionMonitorCleanup = setupSessionMonitoring();
    
    // Add session expiration listener
    addSessionExpirationListener(handleSessionExpiration);

    // Initialize authentication
    initializeAuth();

    // Cleanup function
    return () => {
      mounted = false;
      subscription.unsubscribe();
      removeSessionExpirationListener(handleSessionExpiration);
      if (sessionMonitorCleanup) {
        sessionMonitorCleanup();
      }
    };
  }, []);

  // Sign in method with enhanced error handling
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      setLastError(null);
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) {
        throw signInError;
      }
      
      // Session will be handled by the auth state change listener
      setIsConnected(true);
    } catch (error: any) {
      const appError = processError(error, 'signIn');
      logError(appError, 'signIn');
      setLastError(appError);
      setError(appError.userMessage);
      
      if (appError.type === ErrorType.NETWORK_ERROR || 
          appError.type === ErrorType.SUPABASE_CONNECTION_ERROR) {
        setIsConnected(false);
      }
      
      throw appError;
    } finally {
      setLoading(false);
    }
  };

  // Sign up method with enhanced error handling
  const signUp = async (
    email: string, 
    password: string, 
    profileData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      setLastError(null);
      
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (signUpError) {
        throw signUpError;
      }
      
      // If user is created, create profile with network recovery
      if (data.user) {
        try {
          await withNetworkRecovery(async () => {
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: data.user!.id,
                first_name: profileData.first_name,
                last_name: profileData.last_name,
                phone_number: profileData.phone_number,
                is_admin: profileData.is_admin || false,
              });
            
            if (profileError) {
              throw profileError;
            }
          }, 'createProfile');
        } catch (profileError) {
          // Log profile creation error but don't fail the signup
          const appError = processError(profileError, 'createProfile');
          logError(appError, 'signUp - profile creation failed');
        }
      }
      
      // Session will be handled by the auth state change listener
      setIsConnected(true);
    } catch (error: any) {
      const appError = processError(error, 'signUp');
      logError(appError, 'signUp');
      setLastError(appError);
      setError(appError.userMessage);
      
      if (appError.type === ErrorType.NETWORK_ERROR || 
          appError.type === ErrorType.SUPABASE_CONNECTION_ERROR) {
        setIsConnected(false);
      }
      
      throw appError;
    } finally {
      setLoading(false);
    }
  };

  // Sign out method - simple and reliable
  const signOut = async (): Promise<void> => {
    try {
      // Clear any cached preferences
      localStorage.removeItem('dashboardPreferences');
      
      // Sign out from Supabase
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      // Always reload the page to ensure clean state
      // This is the most reliable way to handle logout on all devices
      window.location.href = window.location.origin;
    }
  };

  // Update profile method with enhanced error handling
  const updateProfile = async (profileData: Partial<UserProfile>): Promise<void> => {
    if (!user) {
      const appError = processError(new Error('No authenticated user'), 'updateProfile');
      throw appError;
    }
    
    try {
      setLoading(true);
      setError(null);
      setLastError(null);
      
      const { data } = await withNetworkRecovery(async () => {
        const { data, error } = await supabase
          .from('profiles')
          .update({
            ...profileData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        
        return { data, error };
      }, 'updateProfile');
      
      setProfile(data);
      setIsConnected(true);
    } catch (error: any) {
      const appError = processError(error, 'updateProfile');
      logError(appError, 'updateProfile');
      setLastError(appError);
      setError(appError.userMessage);
      
      if (appError.type === ErrorType.NETWORK_ERROR || 
          appError.type === ErrorType.SUPABASE_CONNECTION_ERROR) {
        setIsConnected(false);
      }
      
      throw appError;
    } finally {
      setLoading(false);
    }
  };

  // Refresh profile method with enhanced error handling
  const refreshProfile = async (): Promise<void> => {
    if (!user) {
      return;
    }
    
    try {
      const userProfile = await withNetworkRecovery(
        () => getUserProfile(user.id),
        'refreshProfile'
      );
      setProfile(userProfile);
      setIsConnected(true);
      
      // Clear errors on successful refresh
      if (error) {
        setError(null);
        setLastError(null);
      }
    } catch (error: any) {
      const appError = processError(error, 'refreshProfile');
      logError(appError, 'refreshProfile');
      setLastError(appError);
      setError(appError.userMessage);
      
      if (appError.type === ErrorType.NETWORK_ERROR || 
          appError.type === ErrorType.SUPABASE_CONNECTION_ERROR) {
        setIsConnected(false);
      }
    }
  };

  // Clear error method
  const clearError = (): void => {
    setError(null);
    setLastError(null);
  };

  // Context value
  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
    clearError,
    isConnected,
    lastError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};