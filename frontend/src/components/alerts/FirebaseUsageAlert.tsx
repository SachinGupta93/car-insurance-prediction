// FirebaseUsageAlert.tsx
import React, { useState, useEffect } from 'react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';
import unifiedApiService from '@/services/unifiedApiService';

interface FirebaseUsageAlertProps {
  className?: string;
}

interface FirebaseUsageStatus {
  status: 'normal' | 'warning' | 'critical';
  warnings: Array<{
    type: string;
    level: string;
    message: string;
  }>;
}

/**
 * Component to display alerts when Firebase usage limits are approaching
 * or exceeded. Automatically fetches status from backend API.
 */
export function FirebaseUsageAlert({ className }: FirebaseUsageAlertProps) {
  const [usageStatus, setUsageStatus] = useState<FirebaseUsageStatus | null>(null);
  const { firebaseUser } = useFirebaseAuth();
  
  useEffect(() => {
    // Only check for admins
    if (!firebaseUser?.uid) return;
    
    // Check if user is admin
    const checkAdminAndFetchUsage = async () => {
      try {
        const userProfile = await unifiedApiService.getUserProfile();
        
        if (userProfile.role === 'admin') {
          // Fetch Firebase usage status
          const response = await unifiedApiService.getFirebaseUsageStatus();
          if (response && response.status) {
            setUsageStatus(response);
          }
        }
      } catch (error) {
        console.error('Failed to check admin status or fetch usage', error);
      }
    };
    
    checkAdminAndFetchUsage();
    
    // Check every 15 minutes
    const intervalId = setInterval(checkAdminAndFetchUsage, 15 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [firebaseUser?.uid]);
  
  // If no warnings or not admin, don't show anything
  if (!usageStatus || usageStatus.status === 'normal') {
    return null;
  }
  
  // Display appropriate alert based on status
  return (
    <Alert 
      variant={usageStatus.status === 'critical' ? 'destructive' : 'default'}
      className={className}
    >
      <AlertTitle>
        {usageStatus.status === 'critical' 
          ? 'Firebase Usage Limit Exceeded' 
          : 'Firebase Usage Limit Warning'}
      </AlertTitle>
      <div className="text-sm mt-2">
        {usageStatus.status === 'critical' ? (
          <p>
            Your project has exceeded Firebase free tier limits. 
            The system is now using sample data. Please upgrade your Firebase plan 
            to restore full functionality.
          </p>
        ) : (
          <p>
            Your project is approaching Firebase free tier limits. 
            Please consider upgrading your Firebase plan soon to avoid disruption.
          </p>
        )}
        
        {usageStatus.warnings.length > 0 && (
          <ul className="list-disc pl-5 mt-2">
            {usageStatus.warnings.map((warning, index) => (
              <li key={index}>{warning.message}</li>
            ))}
          </ul>
        )}
        
        <p className="mt-2">
          <a 
            href="/admin/firebase-usage" 
            className="font-medium underline hover:text-primary"
          >
            View detailed usage
          </a>
          {' | '}
          <a 
            href="https://console.firebase.google.com/" 
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline hover:text-primary"
          >
            Firebase Console
          </a>
        </p>
      </div>
    </Alert>
  );
}
