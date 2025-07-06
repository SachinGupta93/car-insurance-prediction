import React from 'react';
import { Database, Wifi, WifiOff, Clock } from 'lucide-react';
import { useDataCache } from '@/context/DataCacheContext';

const CacheStatus: React.FC = () => {
  const { cacheState, isLoading } = useDataCache();

  // Don't show in production
  if (import.meta.env.PROD) {
    return null;
  }

  const getCacheInfo = () => {
    const entries = Object.entries(cacheState);
    const cached = entries.filter(([_, entry]) => entry !== null).length;
    const total = entries.length;
    
    return { cached, total };
  };

  const { cached, total } = getCacheInfo();
  const isAnyLoading = Object.values(isLoading).some(loading => loading);

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-lg">
      <div className="flex items-center gap-2 text-xs">
        <Database className="w-4 h-4 text-gray-600" />
        <span className="font-medium text-gray-700">Cache:</span>
        <span className="text-gray-600">{cached}/{total}</span>
        
        {isAnyLoading ? (
          <div className="flex items-center gap-1 text-orange-600">
            <Clock className="w-3 h-3 animate-spin" />
            <span>Loading...</span>
          </div>
        ) : cached > 0 ? (
          <div className="flex items-center gap-1 text-green-600">
            <Wifi className="w-3 h-3" />
            <span>Ready</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-gray-500">
            <WifiOff className="w-3 h-3" />
            <span>Empty</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CacheStatus;