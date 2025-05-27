import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useGoogleLogin, googleLogout, TokenResponse } from '@react-oauth/google';
import { toast } from 'sonner';

// Define the Google user interface
export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  accessToken: string;
}

// Define the auth context interface
interface GoogleAuthContextType {
  user: GoogleUser | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

// Create the context with undefined as initial value
const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

// Custom hook to use the auth context
export const useGoogleAuth = (): GoogleAuthContextType => {
  const context = useContext(GoogleAuthContext);
  if (context === undefined) {
    throw new Error('useGoogleAuth must be used within a GoogleAuthProvider');
  }
  return context;
};

interface GoogleAuthProviderProps {
  children: ReactNode;
}

export const GoogleAuthProvider: React.FC<GoogleAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing user in localStorage on mount
  useEffect(() => {
    console.log("GoogleAuthProvider initializing...");
    try {
      // Check for stored user
      const storedUser = localStorage.getItem('googleUser');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser) as GoogleUser;
          console.log("Found stored user:", parsedUser.name);
          setUser(parsedUser);
        } catch (error) {
          console.error('Failed to parse stored user:', error);
          localStorage.removeItem('googleUser');
        }
      } else {
        console.log("No stored user found");
      }
    } catch (error) {
      console.error("Error checking localStorage:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Configure Google login
  const googleLogin = useGoogleLogin({
    onSuccess: async (response: TokenResponse) => {
      try {
        console.log("Google login successful, fetching user info...");
        
        // Get user profile information using the access token
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${response.access_token}`,
          },
        });

        if (!userInfoResponse.ok) {
          throw new Error(`Failed to fetch user info: ${userInfoResponse.status}`);
        }

        const userInfo = await userInfoResponse.json();
        console.log("User info retrieved:", userInfo.name);
        
        // Create user object
        const googleUser: GoogleUser = {
          id: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          accessToken: response.access_token,
        };

        // Save to state and localStorage
        setUser(googleUser);
        localStorage.setItem('googleUser', JSON.stringify(googleUser));
        toast.success(`Welcome, ${googleUser.name}!`);
      } catch (error) {
        console.error("Error fetching user info:", error);
        toast.error('Failed to get user information');
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      console.error("Google login failed:", error);
      toast.error('Google sign-in failed. Please try again.');
      setLoading(false);
    },
    flow: 'implicit',
    scope: 'email profile',
  });

  const login = async (): Promise<void> => {
    try {
      setLoading(true);
      console.log("Starting Google login process...");
      googleLogin();
      // Note: The actual login completion is handled by the onSuccess callback in googleLogin
    } catch (error) {
      console.error("Login process error:", error);
      setLoading(false);
      toast.error('Failed to start Google login');
      throw error; // Re-throw to let component handle it
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      console.log("Logging out user...");
      
      googleLogout();
      
      // Clear local user state
      setUser(null);
      localStorage.removeItem('googleUser');
      toast.info('You have been signed out');
    } catch (error) {
      console.error("Logout error:", error);
      toast.error('Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout
  };

  return <GoogleAuthContext.Provider value={value}>{children}</GoogleAuthContext.Provider>;
}; 