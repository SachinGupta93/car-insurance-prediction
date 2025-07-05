import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
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
  const { firebaseUser, loading, getIdToken } = useFirebaseAuth();
  const location = useLocation();
  
  const isAuthenticated = Boolean(firebaseUser);
  const isLoading = loading;

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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex justify-center items-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="bg-pattern-grid opacity-5"></div>
          <div className="floating-shape floating-shape-1 bg-gradient-to-r from-blue-400/20 to-purple-400/20"></div>
          <div className="floating-shape floating-shape-2 bg-gradient-to-r from-green-400/20 to-blue-400/20"></div>
          <div className="floating-shape floating-shape-3 bg-gradient-to-r from-purple-400/20 to-pink-400/20"></div>
        </div>
        
        {/* Loading content */}
        <div className="relative z-10 text-center">
          <div className="loading-automotive mb-4"></div>
          <h3 className="text-white text-lg font-medium mb-2">CarGuard AI</h3>
          <p className="text-slate-300">Authenticating...</p>
        </div>
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