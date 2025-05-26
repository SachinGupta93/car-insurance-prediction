import React, { useState } from 'react';
import apiHandler from '@/utils/apiHandler';
import AnalysisChart from '../charts/AnalysisChart';

interface GeminiAnalysisResult {
  analysis: string;
  recommendations: string[];
  additionalInfo?: Record<string, any>;
  rawResponse?: string;
}

interface GeminiAnalysisViewerProps {
  imageUrl: string;
  damageType?: string;
  initialAnalysis?: GeminiAnalysisResult;
  onRequestAnalysis?: (result: GeminiAnalysisResult) => void;
}

const GeminiAnalysisViewer: React.FC<GeminiAnalysisViewerProps> = ({
  imageUrl,
  damageType,
  initialAnalysis,
  onRequestAnalysis
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<GeminiAnalysisResult | undefined>(initialAnalysis);
  const [expanded, setExpanded] = useState<boolean>(false);
  const requestGeminiAnalysis = async () => {
    if (!imageUrl) {
      setError('No image provided for analysis.');
      return;
    }

    setIsLoading(true);
    setError(null);    try {
      // Handle both blob URLs and regular URLs with enhanced error handling
      let imageBlob: Blob | null = null;
      let fallbackToPath = false;
      
      if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
        // For blob URLs, fetch the blob data with better error handling
        try {
          console.log('Attempting to fetch blob URL:', imageUrl.substring(0, 50) + '...');
          const fetchResponse = await fetch(imageUrl);
          
          if (!fetchResponse.ok) {
            throw new Error(`Blob fetch failed with status: ${fetchResponse.status}`);
          }
          
          imageBlob = await fetchResponse.blob();
          console.log('Successfully fetched blob, size:', imageBlob.size, 'type:', imageBlob.type);
          
          // Validate blob content
          if (imageBlob.size === 0) {
            throw new Error('Fetched blob is empty');
          }
          
          if (!imageBlob.type.startsWith('image/')) {
            console.warn('Blob does not appear to be an image, type:', imageBlob.type);
          }
          
        } catch (fetchError) {
          console.warn('Failed to fetch blob URL, will try path fallback:', fetchError);
          fallbackToPath = true;
          imageBlob = null;
        }
      } else {
        // For regular file paths, let backend handle it
        fallbackToPath = true;
      }

      // Create FormData and append image with better error handling
      const formData = new FormData();
      
      if (imageBlob && !fallbackToPath) {
        // Ensure we have a proper filename with extension
        const filename = `analysis-image-${Date.now()}.jpg`;
        formData.append('image', imageBlob, filename);
        console.log('Appended blob to FormData with filename:', filename);
      } else {
        // Fallback: send imageUrl as parameter for backend to handle
        formData.append('imageUrl', imageUrl);
        console.log('Using path fallback, sent imageUrl parameter');
      }
      
      // Add damage type if available for more focused analysis
      if (damageType) {
        formData.append('damageType', damageType);
        console.log('Added damage type parameter:', damageType);
      }      const response = await apiHandler<GeminiAnalysisResult>('/analyze/gemini-only', {
        method: 'POST',
        body: formData,
        isFormData: true,
      });

      console.log('API response received:', response);

      if (response.error) {
        console.error('API returned error:', response.error);
        throw new Error(response.error);
      }

      if (response.data) {
        console.log('Analysis successful, setting data');
        setAnalysis(response.data);
        
        if (onRequestAnalysis) {
          onRequestAnalysis(response.data);
        }
      } else {
        console.warn('API response missing data field:', response);
        throw new Error('Invalid response format: missing data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get Gemini analysis.';
      console.error('Full error in Gemini analysis:', err);
      setError(`Analysis failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-black">Gemini AI Damage Analysis</h3>

        {!analysis && !isLoading && (
          <button
            onClick={requestGeminiAnalysis}
            disabled={isLoading}
            className="px-4 py-2 bg-emerald-200 text-black rounded-lg hover:bg-emerald-300 transition-colors duration-200 disabled:opacity-50"
          >
            Get AI Analysis
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-8 text-gray-600">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-400 border-t-transparent mr-3"></div>
          <span>Getting advanced analysis...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-100 rounded-lg p-4 mb-4 border-l-4 border-red-500 text-red-800">
          <p className="text-sm font-medium">Error: {error}</p>
        </div>
      )}

      {analysis && (
        <div className="space-y-6">
          <div className="mb-4">
            <h4 className="font-bold text-black mb-2">AI Analysis</h4>
            <div className={`text-gray-700 ${!expanded ? 'line-clamp-5' : ''}`}>
              <p>{analysis.analysis}</p>
            </div>
            {analysis.analysis && analysis.analysis.length > 300 && (
              <button
                className="text-sm text-emerald-600 hover:text-emerald-700 mt-1 font-medium"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>          {/* Damage Analysis Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                {/* Icon */}
                <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg>
                Damage Severity Analysis
              </h4>              <div className="h-80">
                <AnalysisChart 
                  type="severity-breakdown"
                  damageData={[
                    { type: damageType || 'Unknown', severity: 3, cost: 800, confidence: 85, area: 'Analyzed Area' }
                  ]}
                  className="!bg-white !shadow-none !border-0 !p-0"
                />
              </div>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                {/* Icon */}
                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2zM21 12c0 4.418-4.03 8-9 8a9.004 9.004 0 01-7.08-3.544M4.311 6.517A9.026 9.026 0 0112 4c4.97 0 9 3.582 9 8s-4.03 8-9 8-9-3.582-9-8a9.026 9.026 0 017.689-5.483z"></path></svg>
                Repair Cost Estimate
              </h4>              <div className="h-80">
                <AnalysisChart 
                  type="cost-estimate"
                  damageData={[
                    { type: damageType || 'Unknown', severity: 3, cost: 800, confidence: 85, area: 'Analyzed Area' }
                  ]}
                  className="!bg-white !shadow-none !border-0 !p-0"
                />
              </div>
            </div>
          </div>

          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div className="mb-6">
              <h4 className="font-bold text-black mb-3">Recommendations</h4>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                {analysis.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.additionalInfo && Object.keys(analysis.additionalInfo).length > 0 && (
            <div>
              <h4 className="font-bold text-black mb-3">Additional Information</h4>
              <div className="grid grid-cols-1 gap-3 text-sm">
                {Object.entries(analysis.additionalInfo).map(([key, value]) => (
                  <div key={key} className="flex items-start">
                    <span className="font-semibold text-gray-800 mr-2">{key.charAt(0).toUpperCase() + key.slice(1)}:</span>
                    <span className="text-gray-700">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GeminiAnalysisViewer;