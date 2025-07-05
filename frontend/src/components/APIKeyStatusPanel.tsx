import React, { useState, useEffect } from 'react';
import { Key, RotateCcw, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface APIKeyStatus {
  index: number;
  key_suffix: string;
  is_current: boolean;
  quota_exceeded: boolean;
  requests_made: number;
  errors: number;
  available: boolean;
  last_quota_exceeded?: string;
}

interface APIStatusData {
  total_keys: number;
  current_key_index: number;
  all_keys_exhausted: boolean;
  system_type?: string;
  keys: APIKeyStatus[];
}

const APIKeyStatusPanel: React.FC = () => {
  const [status, setStatus] = useState<APIStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const DEV_MODE = import.meta.env.DEV || import.meta.env.NODE_ENV === 'development';
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api-status`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setStatus(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch API status');
      console.error('Error fetching API status:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetQuotas = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/reset-quotas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Refresh status after reset
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset quotas');
      console.error('Error resetting quotas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && DEV_MODE) {
      fetchStatus();
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen, DEV_MODE]);

  if (!DEV_MODE) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
        title="API Key Status"
      >
        <Key className="h-5 w-5" />
      </button>

      {/* Status Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              API Key Status
            </h3>
            <div className="flex gap-2">
              <button
                onClick={fetchStatus}
                disabled={loading}
                className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                title="Refresh"
              >
                <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={resetQuotas}
                disabled={loading}
                className="text-orange-600 hover:text-orange-800 disabled:opacity-50 text-xs px-2 py-1 bg-orange-100 rounded"
                title="Reset All Quotas"
              >
                Reset
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded mb-3 text-sm">
              {error}
            </div>
          )}

          {status && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="bg-gray-50 p-3 rounded">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Total Keys:</span>
                    <span className="ml-1 font-medium">{status.total_keys}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Current:</span>
                    <span className="ml-1 font-medium">#{status.current_key_index + 1}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Status:</span>
                    <span className={`ml-1 font-medium ${status.all_keys_exhausted ? 'text-red-600' : 'text-green-600'}`}>
                      {status.all_keys_exhausted ? 'All Exhausted' : 'Available'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Individual Keys */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Individual Keys:</h4>
                {status.keys.map((key) => (
                  <div
                    key={key.index}
                    className={`p-2 rounded border ${
                      key.is_current
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          Key #{key.index + 1}
                        </span>
                        {key.is_current && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            CURRENT
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {key.available ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-600 mt-1">
                      <div>Key: {key.key_suffix}</div>
                      <div className="flex gap-4 mt-1">
                        <span>Requests: {key.requests_made}</span>
                        <span>Errors: {key.errors}</span>
                      </div>
                      {key.quota_exceeded && (
                        <div className="text-red-600 mt-1">
                          Quota exceeded
                          {key.last_quota_exceeded && (
                            <span className="block">
                              at {new Date(key.last_quota_exceeded).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && !status && (
            <div className="text-center py-4 text-gray-500">
              <RotateCcw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading API status...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default APIKeyStatusPanel;
