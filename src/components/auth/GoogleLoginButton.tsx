import React, { useState } from 'react';
import { useGoogleAuth } from '../../context/GoogleAuthContext';
import { LogIn } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';

export const GoogleLoginButton: React.FC = () => {
  const { login, loading } = useGoogleAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      console.log("Google login button clicked");
      await login();
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error?.message) {
        toast.error(error.message);
      } else {
        toast.error("Login failed. Please try again later.");
      }
    } finally {
      // We keep this true if it's a redirect flow
      setTimeout(() => setIsLoggingIn(false), 3000);
    }
  };

  const isDisabled = loading || isLoggingIn;

  return (
    <div className="flex items-center">
      <Button
        variant="primary"
        size="sm"
        onClick={handleLogin}
        disabled={isDisabled}
        className={`login-btn ${isDisabled ? 'opacity-70 cursor-not-allowed' : 'hover:bg-gray-800'}`}
        aria-label="Sign in with Google"
        tabIndex={0}
      >
        <LogIn className="w-3 h-3 mr-1 text-green-400" />
        <span className="text-green-400">{isDisabled ? 'Signing in...' : 'Sign in'}</span>
      </Button>
    </div>
  );
}; 