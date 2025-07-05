import React, { useState, useEffect } from 'react';
import { QuotaManager } from '../utils/quota-manager';

interface QuotaStatusProps {
  className?: string;
}

export const QuotaStatus: React.FC<QuotaStatusProps> = ({ className = '' }) => {
  const [quotaStatus, setQuotaStatus] = useState(QuotaManager.getQuotaStatus());

  useEffect(() => {
    const updateQuotaStatus = () => {
      setQuotaStatus(QuotaManager.getQuotaStatus());
    };

    // Update every 5 seconds
    const interval = setInterval(updateQuotaStatus, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const formatWaitTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  return (
    <div className={`p-3 rounded-lg border ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">API Quota Status</span>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${quotaStatus.canRequest ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-xs text-gray-600">
            {quotaStatus.canRequest ? 'Available' : 'Limited'}
          </span>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        <div>Requests used: {quotaStatus.requestsUsed}/15 per minute</div>
        {!quotaStatus.canRequest && quotaStatus.waitTime > 0 && (
          <div className="text-orange-600">
            Wait time: {formatWaitTime(quotaStatus.waitTime)}
          </div>
        )}
      </div>
      
      {!quotaStatus.canRequest && (
        <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
          <div className="font-medium">Quota exceeded</div>
          <div>Please wait before making another request or consider upgrading your API plan.</div>
        </div>
      )}
    </div>
  );
};

export default QuotaStatus;