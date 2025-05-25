
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../lib/firebase'; // Adjust path to your firebase.ts
import { User, onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { signInWithGoogle, resetPassword, formatAuthError } from '@/lib/firebase-auth';

// Define the shape of your user object if you have more details
// For now, we'll use the Firebase User type

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  setError: (message: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setErrorState] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    setErrorState(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      setErrorState(err instanceof Error ? err.message : 'Failed to sign in');
      throw err; // Re-throw to handle in component if needed
    }
    setLoading(false);
  };

  const signUp = async (email: string, pass: string) => {
    setLoading(true);
    setErrorState(null);
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err) { 
      setErrorState(err instanceof Error ? err.message : 'Failed to sign up');
      throw err; // Re-throw to handle in component if needed
    }
    setLoading(false);
  };

  const signOut = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      setErrorState(err instanceof Error ? err.message : 'Failed to sign out');
      throw err; // Re-throw to handle in component if needed
    }
    setLoading(false);
  };

  const setError = (message: string | null) => {
    setErrorState(message);
  }
  // Google Sign-in implementation
  const googleSignIn = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      const errorMessage = formatAuthError(err);
      setErrorState(errorMessage);
      throw err; // Re-throw to handle in component if needed
    }
    setLoading(false);
  };

  // Forgot password implementation
  const forgotPassword = async (email: string) => {
    setLoading(true);
    setErrorState(null);
    try {
      await resetPassword(email);
    } catch (err) {
      const errorMessage = formatAuthError(err);
      setErrorState(errorMessage);
      throw err; // Re-throw to handle in component if needed
    }
    setLoading(false);
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signInWithGoogle: googleSignIn,
    forgotPassword,
    signOut,
    setError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
