import React, { useState, useEffect } from 'react';
import { 
  checkFirebaseConfig, 
  checkAuthState, 
  checkAnalysisHistory, 
  checkSpecificRecord,
  checkMultipleRecords, 
  FirebaseCheckResult 
} from '../utils/firebaseDataChecker';

const FirebaseDataChecker: React.FC = () => {
  const [configStatus, setConfigStatus] = useState<FirebaseCheckResult | null>(null);
  const [authStatus, setAuthStatus] = useState<FirebaseCheckResult | null>(null);
  const [historyStatus, setHistoryStatus] = useState<FirebaseCheckResult | null>(null);
  const [recordStatus, setRecordStatus] = useState<Record<string, FirebaseCheckResult>>({});
  const [recordId, setRecordId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // IDs you've shared that you're concerned about
  const concernedIds = [
    "-OUBDCbETC9JaPQtR7Ze",
    "-OUBDCcAawgbmktJPeYM",
    "-OUBElXXoez36a28UoBl",
    "-OUBElikNEhQtnU2Ckwm",
    "-OUEQpcOM3CyPTBd9gdO",
    "-OUEQqJEFHEEldM2iJ36",
    "-OUEZAumUg_kvi-OE0Q8",
    "-OUEZAvd-zaRkvrPYaR4",
    "-OUEcycC2EcEtkJc1368",
    "-OUEcydfMzOio_zqs7uL",
    "-OUEhGfKPBBBEJeF43PC",
    "-OUEhGggArX4sglw8Wrm",
    "-OUEjRh-9B58OpL7_KqK",
    "-OUEjSTZlJVpKD6yOhc_",
    "-OUFCfb6m8nRyjsHAUGl",
    "-OUFCfmi3cmVWdE-ZgFX",
    "-OUFK-ZWm30y6m1j2pYs",
    "-OUFK-_GItBW16dB_tdZ"
  ];
  
  // Check Firebase config and auth status on mount
  useEffect(() => {
    const runInitialChecks = async () => {
      setIsLoading(true);
      
      const configResult = await checkFirebaseConfig();
      setConfigStatus(configResult);
      
      const authResult = await checkAuthState();
      setAuthStatus(authResult);
      
      setIsLoading(false);
    };
    
    runInitialChecks();
  }, []);
  
  // Check analysis history
  const handleCheckHistory = async () => {
    setIsLoading(true);
    const result = await checkAnalysisHistory();
    setHistoryStatus(result);
    setIsLoading(false);
  };
  
  // Check specific record
  const handleCheckRecord = async (id: string) => {
    if (!id) return;
    
    setIsLoading(true);
    const result = await checkSpecificRecord(id);
    setRecordStatus(prev => ({ ...prev, [id]: result }));
    setIsLoading(false);
  };
  
  // Check all concerned IDs
  const handleCheckAllConcernedIds = async () => {
    setIsLoading(true);
    const results = await checkMultipleRecords(concernedIds);
    setRecordStatus(results);
    setIsLoading(false);
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
      <h1 className="text-2xl font-bold mb-4">Firebase Data Checker</h1>
      
      {isLoading && (
        <div className="flex justify-center my-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}
      
      {/* Firebase Configuration Status */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Firebase Configuration</h2>
        {configStatus && (
          <div className={`p-4 rounded-lg ${configStatus.success ? 'bg-green-100' : 'bg-red-100'}`}>
            <p className="font-semibold">{configStatus.message}</p>
            {configStatus.data && (
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(configStatus.data, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
      
      {/* Authentication Status */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Authentication Status</h2>
        {authStatus && (
          <div className={`p-4 rounded-lg ${authStatus.success ? 'bg-green-100' : 'bg-red-100'}`}>
            <p className="font-semibold">{authStatus.message}</p>
            {authStatus.data && (
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(authStatus.data, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
      
      {/* Analysis History */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Analysis History</h2>
        <button 
          onClick={handleCheckHistory}
          disabled={isLoading || !authStatus?.success}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Check Analysis History
        </button>
        
        {historyStatus && (
          <div className={`mt-4 p-4 rounded-lg ${historyStatus.success ? 'bg-green-100' : 'bg-red-100'}`}>
            <p className="font-semibold">{historyStatus.message}</p>
            {historyStatus.data && (
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(historyStatus.data, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
      
      {/* Specific Record Check */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Check Specific Record</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={recordId}
            onChange={(e) => setRecordId(e.target.value)}
            placeholder="Enter record ID"
            className="px-4 py-2 border rounded flex-grow"
          />
          <button
            onClick={() => handleCheckRecord(recordId)}
            disabled={isLoading || !recordId || !authStatus?.success}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Check Record
          </button>
        </div>
        
        {recordId && recordStatus[recordId] && (
          <div className={`mt-4 p-4 rounded-lg ${recordStatus[recordId].success ? 'bg-green-100' : 'bg-red-100'}`}>
            <p className="font-semibold">{recordStatus[recordId].message}</p>
            {recordStatus[recordId].data && (
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(recordStatus[recordId].data, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
      
      {/* Check All Concerned IDs */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Check All Concerned IDs</h2>
        <button
          onClick={handleCheckAllConcernedIds}
          disabled={isLoading || !authStatus?.success}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Check All Concerned IDs ({concernedIds.length})
        </button>
        
        {Object.keys(recordStatus).length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold">Results:</h3>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {Object.entries(recordStatus).map(([id, result]) => (
                <div 
                  key={id}
                  className={`p-3 rounded-lg text-sm ${result.success ? 'bg-green-100' : 'bg-red-100'}`}
                >
                  <p>
                    <span className="font-semibold">{id}: </span> 
                    {result.message}
                  </p>
                  {result.success && (
                    <button
                      onClick={() => {
                        const details = document.getElementById(`details-${id}`);
                        if (details) {
                          details.style.display = details.style.display === 'none' ? 'block' : 'none';
                        }
                      }}
                      className="text-xs text-blue-500 hover:text-blue-700"
                    >
                      Toggle Details
                    </button>
                  )}
                  {result.success && (
                    <pre 
                      id={`details-${id}`}
                      className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-20"
                      style={{ display: 'none' }}
                    >
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Help Info */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-lg mb-2">How to Use This Tool</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Make sure you're logged in (check Authentication Status)</li>
          <li>Use "Check Analysis History" to see if your account has any analysis records</li>
          <li>Use "Check Specific Record" to look up individual record IDs</li>
          <li>Use "Check All Concerned IDs" to check all the IDs you're concerned about</li>
        </ol>
        
        <div className="mt-4">
          <h4 className="font-semibold">Troubleshooting:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>If Firebase Configuration shows missing values, check your .env file</li>
            <li>If Authentication Status shows "Not authenticated", you need to log in first</li>
            <li>If records aren't found, they might belong to a different user account</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FirebaseDataChecker;