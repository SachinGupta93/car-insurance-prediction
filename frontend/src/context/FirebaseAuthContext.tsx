// Description: Vite configuration file for a React project
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Ensure this path is correct
import unifiedApiService from '@/services/unifiedApiService';

interface IFirebaseAuthContext {
  firebaseUser: FirebaseUser | null;
  loading: boolean; // Renamed from loadingAuth for consistency with Dashboard
  getIdToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

const FirebaseAuthContext = createContext<IFirebaseAuthContext | undefined>(undefined);

export const FirebaseAuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true); // Renamed from loadingAuth

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      
      // Store token in localStorage when user changes
      if (user) {
        try {
          const token = await user.getIdToken();
          localStorage.setItem('firebaseIdToken', token);
          
          // Automatically ensure user profile exists
          console.log('🔄 Auto-creating user profile for:', user.email);
          const userProfileData = {
            uid: user.uid,
            email: user.email,
            name: user.displayName || (user.email ? user.email.split('@')[0] : 'New User'),
          };
          await unifiedApiService.ensureUserProfile(userProfileData);
          console.log('✅ User profile ensured for:', user.email, 'with data:', userProfileData);
        } catch (error) {
          console.error('❌ Error ensuring user profile:', error);
          // Don't block user login if profile creation fails
        }
      } else {
        localStorage.removeItem('firebaseIdToken');
      }
      
      setLoading(false);
    });
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);
  
  const getIdTokenMethod = async (): Promise<string | null> => {
    if (!firebaseUser) return null;
    try {
      const token = await firebaseUser.getIdToken(true);
      localStorage.setItem('firebaseIdToken', token);
      return token;
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
      localStorage.removeItem('firebaseIdToken');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return (
    <FirebaseAuthContext.Provider value={{ 
      firebaseUser, 
      loading, // Renamed from loadingAuth
      getIdToken: getIdTokenMethod,
      signOut
    }}>
      {children}
    </FirebaseAuthContext.Provider>
  );
};

export const useFirebaseAuth = () => {
  const context = useContext(FirebaseAuthContext);
  if (context === undefined) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider');
  }
  return context;
};

export default FirebaseAuthContext;
