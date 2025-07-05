import React, { useState } from 'react';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';
import { useNotificationHelpers } from '@/context/NotificationContext';
import unifiedApiService from '@/services/unifiedApiService';

const ProfileFixPage: React.FC = () => {
  const { firebaseUser } = useFirebaseAuth();
  const { success, error } = useNotificationHelpers();
  const [loading, setLoading] = useState(false);
  const [profileStatus, setProfileStatus] = useState<string>('');

  const handleEnsureProfile = async () => {
    if (!firebaseUser) {
      error('Authentication Required', 'Please log in first');
      return;
    }

    setLoading(true);
    setProfileStatus('Creating profile...');

    try {
      const userData = {
        email: firebaseUser.email,
        display_name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User'
      };

      const result = await unifiedApiService.ensureUserProfile(userData);
      
      if (result.success) {
        setProfileStatus('✅ Profile created successfully!');
        success('Profile Created', 'Your profile has been created in the database');
      } else {
        setProfileStatus('❌ Profile creation failed');
        error('Profile Creation Failed', result.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Profile creation error:', err);
      setProfileStatus('❌ Profile creation failed');
      error('Profile Creation Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Profile Fix Tool</h1>
          <p className="text-gray-600">This tool helps create missing user profiles in the database</p>
        </div>

        {firebaseUser ? (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Current User:</h3>
              <p className="text-sm text-blue-700">{firebaseUser.email}</p>
              <p className="text-sm text-blue-700">UID: {firebaseUser.uid}</p>
            </div>

            <button
              onClick={handleEnsureProfile}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-blue-300"
            >
              {loading ? 'Creating Profile...' : 'Create My Profile'}
            </button>

            {profileStatus && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-mono">{profileStatus}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-600 mb-4">Please log in to create your profile</p>
            <button
              onClick={() => window.location.href = '/login'}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Go to Login
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            This tool creates your user profile in the database if it doesn't exist
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileFixPage;