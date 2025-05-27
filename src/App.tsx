import { useEffect, useState } from 'react';
import { useGoogleAuth } from './context/GoogleAuthContext';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import Index from './components/Index';
import { toast } from 'sonner';

function App() {
  const { user, loading } = useGoogleAuth();
  const [appReady, setAppReady] = useState(false);

  // On app load, check authentication state
  useEffect(() => {
    // Set app as ready after a short delay to ensure auth state is stable
    const timer = setTimeout(() => {
      setAppReady(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Show loading state while auth is being checked
  if (loading || !appReady) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Protected route logic - only show the main content if user is authenticated
  return (
    <DashboardLayout>
      {user ? (
        <Index />
      ) : (
        <div className="flex flex-col items-center justify-center h-full">
          <h2 className="text-2xl font-bold mb-4 text-white">Welcome to Agile Metrics</h2>
          <p className="text-gray-400 mb-8 text-center max-w-md">
            Please sign in with your Google account to access the dashboard.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}

export default App;
