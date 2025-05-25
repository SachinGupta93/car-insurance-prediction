// Description: Vite configuration file for a React project
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Ensure this path is correct

interface IFirebaseAuthContext {
  firebaseUser: FirebaseUser | null;
  loadingAuth: boolean;
  getIdToken: () => Promise<string | null>;
}

const FirebaseAuthContext = createContext<IFirebaseAuthContext | undefined>(undefined);

export const FirebaseAuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      
      // Store token in localStorage when user changes
      if (user) {
        user.getIdToken().then(token => {
          localStorage.setItem('firebaseIdToken', token);
        });
      } else {
        localStorage.removeItem('firebaseIdToken');
      }
      
      setLoadingAuth(false);
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

  return (
    <FirebaseAuthContext.Provider value={{ 
      firebaseUser, 
      loadingAuth,
      getIdToken: getIdTokenMethod
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
