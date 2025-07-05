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
  try {
    const provider = new GoogleAuthProvider();
    // Add scopes if needed
    provider.addScope('profile');
    provider.addScope('email');
    
    // Add custom parameters for Google authentication
    provider.setCustomParameters({
      // Force account selection even when one account is available
      prompt: 'select_account'
    });
    
    console.log('Attempting Google sign in with:');
    console.log('- Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
    console.log('- Auth Domain:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
    
    return signInWithPopup(auth, provider);
  } catch (error: any) {
    console.error('Google sign in error details:', error);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);
    
    // Check if this is the Identity Toolkit API error
    if (error?.message?.includes('auth/identity-toolkit-api-has-not-been-used')) {
      console.error('IMPORTANT: The Google Identity Toolkit API has not been enabled for this project.');
      console.error('Please enable it in the Google Cloud Console: https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com');
    }
    
    throw error;
  }
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

/**
 * Debug Firebase authentication issues
 */
export const debugFirebaseAuth = () => {
  console.log('======= Checking Firebase Auth Configuration =======');
  console.log('Firebase Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
  console.log('Firebase Auth Domain:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
  console.log('Firebase API Key:', import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 5) + '...');
  console.log('Firebase Messaging Sender ID:', import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID);
  console.log('Firebase App ID:', import.meta.env.VITE_FIREBASE_APP_ID);
  
  // Check for project number in error vs. config
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  if (messagingSenderId === '927340828679') {
    console.warn('NOTICE: Your messaging sender ID (927340828679) appears to match the project number in the error message.');
    console.warn('This suggests there is a mismatch between your project configuration and API enablement.');
  } else if (messagingSenderId !== '252426431160') {
    console.warn('NOTICE: Your messaging sender ID in config does not match the one in your .env file.');
  }
  
  try {
    const provider = new GoogleAuthProvider();
    console.log('Google Auth Provider created successfully');
    console.log('Auth instance status:', auth ? 'Available' : 'Not Available');
    console.log('Auth current user:', auth.currentUser ? 'User is signed in' : 'No user signed in');
    
    // List available provider methods
    console.log('Available auth providers:', auth.currentUser?.providerId || 'None');
    
    // Check if running in localhost
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    console.log('Running on localhost:', isLocalhost);
    if (isLocalhost) {
      console.log('Make sure localhost is added to authorized domains in Firebase Console');
    }
  } catch (error) {
    console.error('Error creating GoogleAuthProvider:', error);
  }
  
  console.log('=================================================');
  console.log('To fix the Identity Toolkit API error:');
  console.log('1. Go to https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com');
  console.log('2. Make sure you are in project:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
  console.log('3. Click "Enable" to enable the Identity Toolkit API');
  console.log('4. Go to https://console.firebase.google.com/project/' + import.meta.env.VITE_FIREBASE_PROJECT_ID + '/authentication/providers');
  console.log('5. Enable the Google sign-in method');
  console.log('=================================================');
};

export default {
  signInWithGoogle,
  resetPassword,
  getFirebaseIdToken,
  formatAuthError,
  debugFirebaseAuth
};