import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { AuthContextType, User, UserRole } from "../types/auth";
import Toast from "../components/layout/Toast";
// import { getCurrentUser } from "../api/profileApi";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for testing different roles (for switchRole)
const mockUsers = {
  student: {
    user_id: 1,
    email: "student@ubc.ca",
    name: "Amir Khan",
    role: "student" as UserRole,
  },
  instructor: {
    user_id: 2,
    email: "dr.chen@ubc.ca",
    name: "Dr. Chen",
    role: "instructor" as UserRole,
  },
  admin: {
    user_id: 3,
    email: "admin@ubc.ca",
    name: "Linda Coordinator",
    role: "admin" as UserRole,
  },
  ta_coordinator: {
    user_id: 4,
    email: "ta.coordinator@ubc.ca",
    name: "Sarah Johnson",
    role: "ta_coordinator" as UserRole,
  },
};

interface AuthProviderProps {
  children: ReactNode;
  navigate?: (path: string) => void;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, navigate }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Auto-check for session expiration periodically
  useEffect(() => {
    // Only set up the interval if the user is authenticated
    if (!isAuthenticated || !user) return;

    // Store the token expiration time in localStorage when logging in
    const tokenExpirationCheck = () => {
      // Check session status every 10 seconds to ensure quick response
      // This is more frequent than the periodic API call to ensure we catch timeouts promptly
      const now = new Date().getTime();
      const tokenExpiration = localStorage.getItem('tokenExpiration');
      
      if (tokenExpiration && parseInt(tokenExpiration) < now) {
        console.log('Token expired based on local expiration time');
        handleSessionTimeout();
        return true;
      }
      return false;
    };

    // Do an immediate check
    if (!tokenExpirationCheck()) {
      // Set up an interval to check frequently without API calls
      const localCheckInterval = setInterval(tokenExpirationCheck, 10000); // every 10 seconds
      
      // Also periodically validate with the server (less frequently)
      const serverCheckInterval = setInterval(() => {
        checkSessionValidity();
      }, 60000); // every minute
      
      return () => {
        clearInterval(localCheckInterval);
        clearInterval(serverCheckInterval);
      };
    }
  }, [isAuthenticated, user]);

  // Function to check if the session is still valid
  const checkSessionValidity = async () => {
    try {
      const response = await fetch("http://localhost:8000/auth/me", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        // Token is invalid, session expired
        console.log("Session expired - server returned 401");
        handleSessionTimeout();
      } else if (response.ok) {
        // Session is still valid - check if we received an updated timeout
        const data = await response.json();
        if (data.sessionTimeoutMinutes) {
          // Update the token expiration time with the latest from server
          const sessionTimeoutMinutes = data.sessionTimeoutMinutes;
          const expirationTime = new Date().getTime() + (sessionTimeoutMinutes * 60 * 1000);
          localStorage.setItem('tokenExpiration', expirationTime.toString());
        }
      }
    } catch (error) {
      console.error("Session validity check failed:", error);
      // Don't log out on network errors to prevent issues with poor connections
    }
  };

  // Function to handle session timeout
  const handleSessionTimeout = () => {
    // Only show the timeout message if the user was previously authenticated
    if (isAuthenticated) {
      setToast({
        message: "Your session has expired. Please log in again.",
        type: "error"
      });
    }
    
    // Clear user data and redirect
    clearUserData();
    setUser(null);
    setIsAuthenticated(false);
    
    // Use navigate if provided, otherwise fallback to window.location
    if (navigate) {
      navigate("/login");
    } else {
      window.location.href = "/login";
    }
    
    console.log("Session timeout detected - logged out and redirected to login");
  };

  // Function to check if response indicates session timeout
  const checkForSessionTimeout = (response: Response) => {
    if (response.status === 401) {
      handleSessionTimeout();
      return true;
    }
    return false;
  };

  const checkAuthStatus = async () => {
    try {
      // First check if token is expired in localStorage
      const tokenExpiration = localStorage.getItem('tokenExpiration');
      if (tokenExpiration) {
        const now = new Date().getTime();
        if (parseInt(tokenExpiration) < now) {
          // Token is already expired according to localStorage
          clearUserData();
          setUser(null);
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }
      }

      // If token hasn't expired locally or no expiration stored, check with server
      const response = await fetch("http://localhost:8000/auth/me", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update user data
        setUser({
          ...data.user,
          user_id: data.user.user_id ?? data.user.id,
        });
        setIsAuthenticated(true);
        
        // Update token expiration if provided by server
        if (data.sessionTimeoutMinutes) {
          const sessionTimeoutMinutes = data.sessionTimeoutMinutes;
          const expirationTime = new Date().getTime() + (sessionTimeoutMinutes * 60 * 1000);
          localStorage.setItem('tokenExpiration', expirationTime.toString());
        }
      } else if (response.status === 401) {
        // For initial auth check, don't show the timeout message
        clearUserData();
        setUser(null);
        setIsAuthenticated(false);
      } else {
        clearUserData();
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      // Store token expiration time in localStorage
      // Default session timeout is 30 minutes (1800000 ms) if not specified in response
      const sessionTimeoutMinutes = data.sessionTimeoutMinutes || 30;
      const expirationTime = new Date().getTime() + (sessionTimeoutMinutes * 60 * 1000);
      localStorage.setItem('tokenExpiration', expirationTime.toString());
      
      // Set user data from successful login
      setUser({
        ...data.user,
        user_id: data.user.user_id ?? data.user.id,
      });
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const logout = async () => {
    try {
      await fetch("http://localhost:8000/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear all user-specific localStorage data
      clearUserData();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Helper function to clear all user-specific data from localStorage
  const clearUserData = () => {
    // Define user-specific localStorage keys that should be cleared on logout
    const userSpecificKeys = [
      'tokenExpiration',
      'ta_application_draft',
      'ta-application-draft',
      // Add more user-specific keys here as needed
      // Note: Do NOT include 'allocaid-theme' as it should persist across users
    ];

    // Clear all user-specific data
    userSpecificKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`Cleared localStorage key: ${key}`);
      }
    });

    // Alternative approach: Clear all localStorage items that match patterns
    // This is more aggressive but ensures we don't miss anything
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('draft') || 
        key.includes('application') || 
        key.includes('token') ||
        key.includes('session')
      )) {
        // Skip theme-related keys as they should persist
        if (!key.includes('theme')) {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Pattern-cleared localStorage key: ${key}`);
    });
    
    console.log('Cleared all user-specific localStorage data on logout');
  };

  // For testing/demo only: switch user role (does not affect backend session)
  const switchRole = (role: UserRole) => {
    const mockUser = mockUsers[role];
    setUser(mockUser);
    setIsAuthenticated(true);
  };

  const value: AuthContextType = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    switchRole, // For testing/demo only
    checkForSessionTimeout, // Expose session timeout checker
    checkSessionValidity, // Expose manual session validity checker
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

declare module "../types/auth" {
  interface AuthContextType {
    switchRole?: (role: UserRole) => void;
  }
}
