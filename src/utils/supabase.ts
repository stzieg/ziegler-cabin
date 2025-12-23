import { createClient } from '@supabase/supabase-js';
import { processError, logError, withRetry, ErrorType, createAppError } from './errorHandling';

// Environment variables validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we're in development mode with placeholder values
const isPlaceholder = 
  !supabaseUrl || 
  !supabaseAnonKey || 
  supabaseUrl.includes('your-supabase') || 
  supabaseAnonKey.includes('your-supabase');

// Export the placeholder status so components can check it
export const isUsingPlaceholderCredentials = isPlaceholder;

if (isPlaceholder) {
  console.warn('⚠️  Using placeholder Supabase credentials. The app will not function properly.');
  console.warn('📝 Please update your .env file with real Supabase credentials.');
  console.warn('📚 See SUPABASE_SETUP.md for instructions.');
}

if (!supabaseUrl || isPlaceholder) {
  console.error('Missing or invalid VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey || isPlaceholder) {
  console.error('Missing or invalid VITE_SUPABASE_ANON_KEY environment variable');
}

// Create and export the Supabase client with enhanced error handling
// Use placeholder values if real credentials are not provided (for development)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// Connection health check
let lastHealthCheck = 0;
let isHealthy = true;
const HEALTH_CHECK_INTERVAL = 60000; // 1 minute

/**
 * Check Supabase connection health
 */
export const checkSupabaseHealth = async (): Promise<boolean> => {
  // If using placeholder credentials, skip health check and return false
  // This prevents error messages when running in development without real Supabase
  if (isPlaceholder) {
    console.warn('⚠️  Skipping Supabase health check - using placeholder credentials');
    console.warn('📝 Set up real Supabase credentials to enable authentication');
    isHealthy = false;
    return false;
  }

  const now = Date.now();
  
  // Use cached result if recent
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL && isHealthy) {
    return isHealthy;
  }
  
  try {
    // Simple query to test connection
    const { error } = await supabase.from('profiles').select('id').limit(1);
    isHealthy = !error;
    lastHealthCheck = now;
    
    if (error) {
      logError(processError(error, 'Supabase health check'));
    }
    
    return isHealthy;
  } catch (error) {
    isHealthy = false;
    lastHealthCheck = now;
    logError(processError(error, 'Supabase health check'));
    return false;
  }
};

/**
 * Enhanced wrapper for Supabase operations with error handling and retry
 */
const withSupabaseErrorHandling = async <T>(
  operation: () => Promise<T>,
  context: string,
  retryable: boolean = true
): Promise<T> => {
  try {
    if (retryable) {
      return await withRetry(operation, 3, 1000, context);
    } else {
      return await operation();
    }
  } catch (error) {
    const appError = processError(error, context);
    logError(appError, context);
    throw appError;
  }
};

// Utility functions for common Supabase operations

/**
 * Get the current authenticated user with enhanced error handling
 */
export const getCurrentUser = async () => {
  return withSupabaseErrorHandling(async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      throw error;
    }
    return user;
  }, 'getCurrentUser', true);
};

/**
 * Get the current session with enhanced error handling
 */
export const getCurrentSession = async () => {
  return withSupabaseErrorHandling(async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }
    return session;
  }, 'getCurrentSession', true);
};

/**
 * Sign up a new user with email and password with enhanced error handling
 */
export const signUp = async (email: string, password: string) => {
  return withSupabaseErrorHandling(async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      throw error;
    }
    
    return data;
  }, 'signUp', false); // Don't retry auth operations
};

/**
 * Sign in an existing user with email and password with enhanced error handling
 */
export const signIn = async (email: string, password: string) => {
  return withSupabaseErrorHandling(async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      throw error;
    }
    
    return data;
  }, 'signIn', false); // Don't retry auth operations
};

/**
 * Sign out the current user with enhanced error handling
 */
export const signOut = async () => {
  return withSupabaseErrorHandling(async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw error;
    }
  }, 'signOut', true); // Retry sign out operations
};

/**
 * Get user profile from the profiles table with enhanced error handling
 */
export const getUserProfile = async (userId: string) => {
  return withSupabaseErrorHandling(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  }, 'getUserProfile', true);
};

/**
 * Create or update user profile in the profiles table with enhanced error handling
 */
export const upsertUserProfile = async (profile: {
  id: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  is_admin?: boolean;
}) => {
  return withSupabaseErrorHandling(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profile)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  }, 'upsertUserProfile', true);
};

/**
 * Get invitation by token with enhanced error handling
 */
export const getInvitationByToken = async (token: string) => {
  return withSupabaseErrorHandling(async () => {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  }, 'getInvitationByToken', true);
};

/**
 * Mark invitation as used with enhanced error handling
 */
export const markInvitationAsUsed = async (token: string, userId: string) => {
  return withSupabaseErrorHandling(async () => {
    const { data, error } = await supabase
      .from('invitations')
      .update({
        used_at: new Date().toISOString(),
        used_by: userId,
        status: 'used',
      })
      .eq('token', token)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  }, 'markInvitationAsUsed', true);
};

/**
 * Create a new invitation (admin only) with enhanced error handling
 */
export const createInvitation = async (email: string, createdBy: string) => {
  return withSupabaseErrorHandling(async () => {
    // Generate a unique token
    const token = crypto.randomUUID();
    
    const { data, error } = await supabase
      .from('invitations')
      .insert({
        email,
        token,
        created_by: createdBy,
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  }, 'createInvitation', true);
};

/**
 * Get all invitations (admin only) with enhanced error handling
 */
export const getAllInvitations = async () => {
  return withSupabaseErrorHandling(async () => {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data || [];
  }, 'getAllInvitations', true);
};

/**
 * Check if user is admin with enhanced error handling
 */
export const isUserAdmin = async (userId: string) => {
  return withSupabaseErrorHandling(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
    
    if (error) {
      throw error;
    }
    
    return data?.is_admin || false;
  }, 'isUserAdmin', true);
};

/**
 * Session expiration handling utilities
 */

// Session expiration event listeners
const sessionExpirationListeners: Array<() => void> = [];

/**
 * Add a listener for session expiration events
 */
export const addSessionExpirationListener = (listener: () => void): void => {
  sessionExpirationListeners.push(listener);
};

/**
 * Remove a session expiration listener
 */
export const removeSessionExpirationListener = (listener: () => void): void => {
  const index = sessionExpirationListeners.indexOf(listener);
  if (index > -1) {
    sessionExpirationListeners.splice(index, 1);
  }
};

/**
 * Notify all listeners of session expiration
 */
const notifySessionExpiration = (): void => {
  sessionExpirationListeners.forEach(listener => {
    try {
      listener();
    } catch (error) {
      console.error('Error in session expiration listener:', error);
    }
  });
};

/**
 * Check if session is expired or about to expire
 */
export const isSessionExpired = async (): Promise<boolean> => {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at;
    
    // Consider session expired if it expires within the next 5 minutes
    return expiresAt ? (expiresAt - now) < 300 : false;
  } catch (error) {
    logError(processError(error, 'isSessionExpired'));
    return true;
  }
};

/**
 * Attempt to refresh the current session
 */
export const refreshSession = async (): Promise<boolean> => {
  return withSupabaseErrorHandling(async () => {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      // If refresh fails, notify listeners of session expiration
      notifySessionExpiration();
      throw error;
    }
    
    return !!data.session;
  }, 'refreshSession', false); // Don't retry refresh operations
};

/**
 * Handle session expiration gracefully
 */
export const handleSessionExpiration = async (): Promise<void> => {
  try {
    logError(createAppError(
      ErrorType.SESSION_EXPIRED,
      'User session has expired',
      undefined,
      'Your session has expired. Please sign in again.'
    ), 'handleSessionExpiration');

    // Clear the session
    await supabase.auth.signOut();
    
    // Notify all listeners
    notifySessionExpiration();
  } catch (error) {
    logError(processError(error, 'handleSessionExpiration'));
  }
};

/**
 * Set up automatic session monitoring
 */
export const setupSessionMonitoring = (): (() => void) => {
  let intervalId: NodeJS.Timeout;
  
  const checkSession = async () => {
    try {
      if (await isSessionExpired()) {
        await handleSessionExpiration();
      }
    } catch (error) {
      logError(processError(error, 'sessionMonitoring'));
    }
  };
  
  // Check session every 5 minutes
  intervalId = setInterval(checkSession, 5 * 60 * 1000);
  
  // Return cleanup function
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
};

/**
 * Enhanced auth state change handler with error recovery
 */
export const setupAuthStateHandler = (
  onAuthStateChange: (event: string, session: any) => void
) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      try {
        // Handle session expiration events
        if (event === 'TOKEN_REFRESHED' && !session) {
          await handleSessionExpiration();
          return;
        }
        
        if (event === 'SIGNED_OUT') {
          // Clear any cached data
          isHealthy = true; // Reset health status
          lastHealthCheck = 0;
        }
        
        // Call the provided handler
        onAuthStateChange(event, session);
      } catch (error) {
        logError(processError(error, 'authStateHandler'));
      }
    }
  );
  
  return subscription;
};

/**
 * Network recovery for Supabase operations
 */
export const withNetworkRecovery = async <T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    const appError = processError(error, context);
    
    // If it's a network error, try to recover
    if (appError.type === ErrorType.NETWORK_ERROR || 
        appError.type === ErrorType.SUPABASE_CONNECTION_ERROR) {
      
      logError(appError, `${context} - attempting network recovery`);
      
      // Wait for network recovery
      const { waitForNetworkRecovery } = await import('./errorHandling');
      const recovered = await waitForNetworkRecovery(10000, 2000); // 10 seconds max wait
      
      if (recovered) {
        logError(createAppError(
          ErrorType.NETWORK_ERROR,
          'Network recovered, retrying operation',
          undefined,
          'Connection restored, retrying...'
        ), context);
        
        // Retry the operation once after recovery
        return await operation();
      }
    }
    
    throw appError;
  }
};