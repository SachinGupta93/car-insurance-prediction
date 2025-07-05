import React from 'react';
import { AlertTriangle, Zap, Clock } from 'lucide-react';

const DevModeIndicator: React.FC = () => {
  const DEV_MODE = import.meta.env.DEV || import.meta.env.NODE_ENV === 'development';
  const BYPASS_QUOTA = import.meta.env.VITE_BYPASS_QUOTA_IN_DEV === 'true';
  const BYPASS_AUTH = import.meta.env.VITE_BYPASS_AUTH_IN_DEV === 'true';
  const INSTANT_RESPONSES = import.meta.env.VITE_INSTANT_DEV_RESPONSES === 'true';

  if (!DEV_MODE) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-yellow-100 border border-yellow-400 rounded-lg p-3 shadow-lg max-w-sm">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-5 w-5 text-yellow-600" />
        <span className="font-semibold text-yellow-800">Development Mode</span>
      </div>
      
      <div className="space-y-1 text-sm text-yellow-700">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          <span>Quota Bypass: {BYPASS_QUOTA ? '✅ ON' : '❌ OFF'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Instant Responses: {INSTANT_RESPONSES ? '✅ ON' : '❌ OFF'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs">🔓</span>
          <span>Auth Bypass: {BYPASS_AUTH ? '✅ ON' : '❌ OFF'}</span>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-yellow-600">
        Configure in .env file
      </div>
    </div>
  );
};

export default DevModeIndicator;
