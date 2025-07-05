import { getApps } from 'firebase/app';
import { auth } from './firebase';

// This file helps debug Firebase configuration issues

console.log('========== FIREBASE CONFIGURATION CHECK ==========');
console.log('Current Firebase apps:', getApps().map(app => ({
  name: app.name,
  options: {
    apiKey: app.options.apiKey?.substring(0, 5) + '...',
    authDomain: app.options.authDomain,
    projectId: app.options.projectId,
    messagingSenderId: app.options.messagingSenderId,
    appId: app.options.appId?.substring(0, 10) + '...'
  }
})));

// Check environment variables
console.log('\nENVIRONMENT VARIABLES:');
console.log('VITE_FIREBASE_API_KEY:', import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 5) + '...');
console.log('VITE_FIREBASE_AUTH_DOMAIN:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
console.log('VITE_FIREBASE_PROJECT_ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
console.log('VITE_FIREBASE_MESSAGING_SENDER_ID:', import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID);
console.log('VITE_GEMINI_API_KEY (first 5):', import.meta.env.VITE_GEMINI_API_KEY?.substring(0, 5) + '...');

// Project ID and numerical project number check
console.log('\nPROJECT ID CHECK:');
console.log('Project ID in config:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
console.log('Project number in error message: 927340828679');
console.log('Project number in config (messaging sender ID):', import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID);

// Check if Gemini API is being incorrectly used for Firebase auth
if (import.meta.env.VITE_FIREBASE_API_KEY === import.meta.env.VITE_GEMINI_API_KEY) {
  console.error('ERROR: Gemini API key is being used for Firebase authentication!');
  console.error('These should be different API keys for different services');
}

// Auth status check
console.log('\nAUTH STATUS:');
console.log('Auth instance available:', !!auth);
console.log('Current user:', auth.currentUser ? {
  uid: auth.currentUser.uid,
  email: auth.currentUser.email,
  isAnonymous: auth.currentUser.isAnonymous,
  emailVerified: auth.currentUser.emailVerified
} : 'No user logged in');

// Provider check
console.log('\nPROVIDER CHECK:');
try {
  const authProviders = auth.currentUser?.providerData?.map(provider => ({
    providerId: provider.providerId,
    email: provider.email
  })) || [];
  console.log('Auth providers:', authProviders.length ? authProviders : 'None');
} catch (err) {
  console.error('Error checking providers:', err);
}

console.log('\nTROUBLESHOOTING STEPS:');
console.log('1. Enable Google Identity Toolkit API at: https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com');
console.log(`2. Verify Google Auth is enabled in Firebase console: https://console.firebase.google.com/project/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/authentication/providers`);
console.log('3. Check that localhost is in authorized domains in Firebase Console Authentication settings');
console.log('4. Make sure your API key is not restricted to prevent OAuth operations');
console.log('================================================');
