import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';

interface AuthProps {
  children: React.ReactNode;
  requireAuth?: boolean; // If true, redirects to login when not authenticated
  redirectAuthenticated?: boolean; // If true, redirects to dashboard when authenticated
  redirectPath?: string; // Custom redirect path
}

/**
 * Auth component that handles authentication flow and redirects.
 * Can be used in two ways:
 * 1. To protect routes that require authentication
 * 2. To redirect authenticated users away from auth pages (login, signup)
 */
const Auth: React.FC<AuthProps> = ({
  children,
  requireAuth = false,
  redirectAuthenticated = false,
  redirectPath
}) => {
  const { user, loading } = useAuth();
  const { firebaseUser, loadingAuth, getIdToken } = useFirebaseAuth();
  const location = useLocation();
  
  const isAuthenticated = Boolean(user || firebaseUser);
  const isLoading = loading || loadingAuth;

  // Handle redirection logic when authentication state changes
  useEffect(() => {
    // Get a fresh token when auth state changes
    if (isAuthenticated && firebaseUser) {
      getIdToken().then(token => {
        if (token) {
          // Token is already stored in localStorage via the getIdToken implementation
          console.log('Firebase token refreshed');
        }
      }).catch(err => {
        console.error('Error refreshing token:', err);
      });
    }
  }, [isAuthenticated, firebaseUser, getIdToken]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Redirect if not authenticated and auth is required
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectPath || "/login"} state={{ from: location }} replace />;
  }

  // Redirect if authenticated and redirectAuthenticated is true
  if (redirectAuthenticated && isAuthenticated) {
    return <Navigate to={redirectPath || "/dashboard"} replace />;
  }

  // Otherwise, render children
  return <>{children}</>;
};

export default Auth;