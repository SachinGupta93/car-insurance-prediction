import React, { useState } from 'react';
import apiHandler from '@/utils/apiHandler';

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
    setError(null);

    try {
      // Convert image URL to blob if it's a local URL
      let imageBlob;
      if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
        const response = await fetch(imageUrl);
        imageBlob = await response.blob();
      }

      // Create FormData and append image blob or URL
      const formData = new FormData();
      if (imageBlob) {
        formData.append('image', imageBlob);
      } else {
        formData.append('imageUrl', imageUrl);
      }
      
      // Add damage type if available for more focused analysis
      if (damageType) {
        formData.append('damageType', damageType);
      }

      const response = await apiHandler<GeminiAnalysisResult>('/gemini-analysis', {
        method: 'POST',
        body: formData,
        isFormData: true,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        setAnalysis(response.data);
        
        if (onRequestAnalysis) {
          onRequestAnalysis(response.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get Gemini analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Gemini AI Damage Analysis</h3>
        
        {!analysis && !isLoading && (
          <button
            onClick={requestGeminiAnalysis}
            disabled={isLoading}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            Get AI Analysis
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          <span className="ml-3">Getting advanced analysis...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {analysis && (
        <div>
          <div className="mb-4">
            <h4 className="font-medium text-gray-800 mb-2">AI Analysis</h4>
            <div className={`prose max-w-none text-gray-600 ${!expanded ? 'line-clamp-5' : ''}`}>
              <p>{analysis.analysis}</p>
            </div>
            {analysis.analysis && analysis.analysis.length > 300 && (
              <button 
                className="text-sm text-blue-600 hover:text-blue-800 mt-1"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>

          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-800 mb-2">Recommendations</h4>
              <ul className="list-disc list-inside text-gray-600">
                {analysis.recommendations.map((rec, index) => (
                  <li key={index} className="mb-1">{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.additionalInfo && Object.keys(analysis.additionalInfo).length > 0 && (
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Additional Information</h4>
              <div className="grid grid-cols-1 gap-2 text-sm">
                {Object.entries(analysis.additionalInfo).map(([key, value]) => (
                  <div key={key} className="flex">
                    <span className="font-medium text-gray-700 mr-2">{key.charAt(0).toUpperCase() + key.slice(1)}:</span>
                    <span className="text-gray-600">{String(value)}</span>
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