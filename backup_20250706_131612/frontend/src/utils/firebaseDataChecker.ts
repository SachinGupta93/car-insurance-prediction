/**
 * Firebase Data Checker Utility
 * 
 * This utility helps diagnose issues with Firebase data access from the frontend.
 * It doesn't require a service account - just the standard Firebase Web SDK.
 */

import { rtdb, auth } from '@/lib/firebase';
import { ref, get, child, DataSnapshot } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';

export interface FirebaseCheckResult {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
}

/**
 * Check Firebase configuration and connection
 * Makes sure your Firebase Web SDK is properly initialized
 */
export const checkFirebaseConfig = async (): Promise<FirebaseCheckResult> => {
  try {
    // Get Firebase app configuration
    const config = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? '✓ Present' : '✗ Missing',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? '✓ Present' : '✗ Missing',
      databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL ? '✓ Present' : '✗ Missing',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ? '✓ Present' : '✗ Missing',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ? '✓ Present' : '✗ Missing',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? '✓ Present' : '✗ Missing',
      appId: import.meta.env.VITE_FIREBASE_APP_ID ? '✓ Present' : '✗ Missing',
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ? '✓ Present' : '✗ Missing',
    };
    
    // Check if we have the minimum required config
    const missingFields = Object.entries(config)
      .filter(([_, value]) => value === '✗ Missing')
      .map(([key]) => key);
    
    if (missingFields.length > 0) {
      return {
        success: false,
        message: `Missing Firebase config: ${missingFields.join(', ')}`,
        data: config
      };
    }
    
    // Try to connect to Firebase
    const rootRef = ref(rtdb, '.info/connected');
    const snapshot = await get(rootRef);
    
    return {
      success: snapshot.exists() && snapshot.val() === true,
      message: snapshot.val() === true 
        ? 'Successfully connected to Firebase' 
        : 'Failed to connect to Firebase',
      data: config
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error checking Firebase configuration',
      error
    };
  }
};

/**
 * Check current authentication state
 */
export const checkAuthState = (): Promise<FirebaseCheckResult> => {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        resolve({
          success: true,
          message: `Authenticated as ${user.email}`,
          data: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
            isAnonymous: user.isAnonymous,
            providerData: user.providerData
          }
        });
      } else {
        resolve({
          success: false,
          message: 'Not authenticated',
          data: null
        });
      }
    });
  });
};

/**
 * Check if a specific record ID exists
 * 
 * @param recordId The Firebase record ID to check
 */
export const checkSpecificRecord = async (
  recordId: string
): Promise<FirebaseCheckResult> => {
  try {
    const authState = await checkAuthState();
    if (!authState.success) {
      return {
        success: false,
        message: 'Must be authenticated to check records',
        data: null
      };
    }
    
    const uid = authState.data.uid;
    
    // First try in user's analysis history
    const historyPath = `users/${uid}/analysis_history/${recordId}`;
    let snapshot: DataSnapshot | null = null;
    
    try {
      snapshot = await get(ref(rtdb, historyPath));
      if (snapshot.exists()) {
        return {
          success: true,
          message: `Record found in your analysis history with ID: ${recordId}`,
          data: snapshot.val()
        };
      }
    } catch (e) {
      console.warn(`Error checking path ${historyPath}`, e);
    }
    
    // Try other common locations
    const locations = [
      `users/${uid}/vehicles/${recordId}`,
      `users/${uid}/insurance/${recordId}`,
      `analysis_history/${recordId}`,
      `vehicles/${recordId}`,
      `insurance/${recordId}`
    ];
    
    for (const path of locations) {
      try {
        snapshot = await get(ref(rtdb, path));
        if (snapshot.exists()) {
          return {
            success: true,
            message: `Record found at path: ${path}`,
            data: snapshot.val()
          };
        }
      } catch (e) {
        console.warn(`Error checking path ${path}`, e);
      }
    }
    
    return {
      success: false,
      message: `Record with ID ${recordId} not found in common locations`,
      data: null
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error checking record',
      error
    };
  }
};

/**
 * Check user's analysis history
 */
export const checkAnalysisHistory = async (): Promise<FirebaseCheckResult> => {
  try {
    const authState = await checkAuthState();
    if (!authState.success) {
      return {
        success: false,
        message: 'Must be authenticated to check analysis history',
        data: null
      };
    }
    
    const uid = authState.data.uid;
    const historyPath = `users/${uid}/analysis_history`;
    
    const snapshot = await get(ref(rtdb, historyPath));
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      const recordCount = Object.keys(data).length;
      
      return {
        success: true,
        message: `Found ${recordCount} analysis history records`,
        data: Object.entries(data).map(([id, value]) => ({ id, ...value as object }))
      };
    } else {
      return {
        success: false,
        message: 'No analysis history found',
        data: []
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Error checking analysis history',
      error
    };
  }
};

/**
 * Check all records from a list of IDs
 */
export const checkMultipleRecords = async (
  recordIds: string[]
): Promise<Record<string, FirebaseCheckResult>> => {
  const results: Record<string, FirebaseCheckResult> = {};
  
  for (const id of recordIds) {
    results[id] = await checkSpecificRecord(id);
  }
  
  return results;
};