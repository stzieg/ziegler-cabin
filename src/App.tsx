import { FullScreenDashboard, ErrorBoundary, AuthContainer, BackgroundProvider } from './components';
import { SupabaseProvider, useAuth } from './contexts';
import './App.css';

/**
 * Main App Content - Handles authentication state
 */
const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e2e8f0',
          borderTop: '3px solid #2D5016',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#2D5016', fontSize: '16px' }}>Loading...</p>
      </div>
    );
  }

  // Show dashboard if user is authenticated, otherwise show auth container
  return user ? (
    <FullScreenDashboard />
  ) : (
    <AuthContainer onAuthSuccess={() => {
      // Auth success is handled by the auth state change in SupabaseProvider
      // No need to do anything here as the user state will update automatically
    }} />
  );
};

function App() {
  return (
    <ErrorBoundary>
      <SupabaseProvider>
        <BackgroundProvider>
          <AppContent />
        </BackgroundProvider>
      </SupabaseProvider>
    </ErrorBoundary>
  );
}

export default App;
