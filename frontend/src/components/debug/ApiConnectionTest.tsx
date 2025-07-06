import React, { useState, useEffect } from 'react';

const ApiConnectionTest: React.FC = () => {
  const [status, setStatus] = useState<string>('Testing...');
  const [apiUrl, setApiUrl] = useState<string>('');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const testConnection = async () => {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      setApiUrl(baseUrl);
      
      try {
        console.log('🔍 Testing API connection to:', baseUrl);
        
        const response = await fetch(`${baseUrl.replace('/api', '')}/api/health`);
        const data = await response.json();
        
        setStatus(`✅ Connected! Status: ${data.status}`);
        console.log('✅ API Response:', data);
        
      } catch (error) {
        console.error('❌ API Connection Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setStatus(`❌ Connection failed: ${errorMessage}`);
      }
    };

    testConnection();

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3000); // Hide after 3 seconds

    return () => clearTimeout(timer); // Cleanup the timer
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg border z-50 animate-fade-out">
      <div className="text-sm">
        <div className="font-semibold text-gray-700">API Status</div>
        <div className="text-xs text-gray-500">URL: {apiUrl}</div>
        <div className="mt-2">{status}</div>
      </div>
    </div>
  );
};

export default ApiConnectionTest;