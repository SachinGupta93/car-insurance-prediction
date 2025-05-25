import {
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  User,
  UserCredential,
  Auth
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

export interface AuthError {
  code: string;
  message: string;
}

/**
 * Sign in with Google popup
 */
export const signInWithGoogle = async (): Promise<UserCredential> => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

/**
 * Send password reset email
 * @param email The email address to send the password reset link to
 */
export const resetPassword = async (email: string): Promise<void> => {
  return sendPasswordResetEmail(auth, email);
};

/**
 * Get Firebase ID token
 * @param forceRefresh Whether to force refresh the token
 * @returns The ID token or null if not authenticated
 */
export const getFirebaseIdToken = async (forceRefresh = false): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    const token = await user.getIdToken(forceRefresh);
    localStorage.setItem('firebaseIdToken', token);
    return token;
  } catch (error) {
    console.error('Error getting ID token:', error);
    return null;
  }
};

/**
 * Format Firebase auth error message into a user-friendly message
 * @param error Firebase auth error
 * @returns A user-friendly error message
 */
export const formatAuthError = (error: any): string => {
  const errorCode = error?.code || '';
  
  // Common Firebase error codes and user-friendly messages
  const errorMessages: Record<string, string> = {
    'auth/user-not-found': 'No account found with this email address.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password is too weak. Please use a stronger password.',
    'auth/popup-closed-by-user': 'Sign in canceled. The popup was closed.',
    'auth/cancelled-popup-request': 'Multiple popup requests - operation canceled.',
    'auth/popup-blocked': 'Sign in popup was blocked by your browser.',
    'auth/network-request-failed': 'Network error. Please check your connection and try again.',
    'auth/too-many-requests': 'Too many unsuccessful attempts. Please try again later.',
    'auth/requires-recent-login': 'This operation requires a more recent login. Please sign in again.',
    'auth/expired-action-code': 'The action code has expired. Please request a new one.',
    'auth/invalid-action-code': 'The action code is invalid.',
  };
  
  return errorMessages[errorCode] || error?.message || 'An unknown error occurred. Please try again.';
};

export default {
  signInWithGoogle,
  resetPassword,
  getFirebaseIdToken,
  formatAuthError
};