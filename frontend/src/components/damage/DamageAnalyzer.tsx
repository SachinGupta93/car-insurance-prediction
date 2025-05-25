import React, { useState, useEffect } from 'react';
import apiHandler from '@/utils/apiHandler';
import { useHistory } from '@/context/HistoryContext';
import { DamageResult } from '@/types';
import { mockDamageAnalyses } from '@/utils/mockData/damageAnalysis';
import { getRandomDamageRegions } from '@/utils/mockData/damageRegions';
import AnalysisVisualization from '../AnalysisVisualization';
import GeminiAnalysisViewer from './GeminiAnalysisViewer';

interface DamageAnalyzerProps {
  imageFile: File | null;
  onAnalysisComplete?: (result: DamageResult) => void;
  onAnalysisError?: (error: string) => void;
  onAnalysisStart?: () => void;
}

const DamageAnalyzer: React.FC<DamageAnalyzerProps> = ({
  imageFile,
  onAnalysisComplete,
  onAnalysisError,
  onAnalysisStart
}) => {  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<DamageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [damageRegions, setDamageRegions] = useState<any[]>([]);
  const [showOverlay, setShowOverlay] = useState(true);
  const { addAnalysisToHistory } = useHistory();
  useEffect(() => {
    if (imageFile) {
      analyzeImage(imageFile);
    }
    
    // Clean up object URLs on unmount
    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [imageFile]);
  const analyzeImage = async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setDamageRegions([]);
    
    // Create and set image source for visualization
    const imageUrl = URL.createObjectURL(file);
    setImageSrc(imageUrl);
    
    if (onAnalysisStart) {
      onAnalysisStart();
    }

    // Create a mock progress indicator
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 10;
        return newProgress > 90 ? 90 : newProgress;
      });
    }, 300);

    try {
      const formData = new FormData();
      formData.append('image', file);
      
      let responseData: DamageResult | null = null;
      let responseError: string | undefined = undefined;
      
      try {
        const response = await apiHandler<DamageResult>('/analyze-damage', {
          method: 'POST',
          body: formData,
          isFormData: true,
        });
        
        responseData = response.data || null;
        responseError = response.error;
      } catch (apiError) {        // In development, use mock data if the API fails
        const isDev = process.env.NODE_ENV === 'development';
        if (isDev) {
          console.warn('API request failed, using mock data instead in development mode');
          
          // Wait for a simulated response time
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Pick a random mock analysis
          const randomIndex = Math.floor(Math.random() * mockDamageAnalyses.length);
          const mockData = mockDamageAnalyses[randomIndex];
          
          responseData = {
            damageType: mockData.damageType,
            confidence: mockData.confidence,
            description: mockData.description,
            repairEstimate: mockData.repairEstimate || '',
            recommendations: mockData.recommendations,
          };
        } else {
          throw apiError;
        }
      }

      clearInterval(progressInterval);

      if (responseError) {
        throw new Error(responseError);
      }      if (responseData) {
        setResult(responseData);
        setProgress(100);
        
        // Generate mock damage regions for visualization
        // In a real app, these would come from the backend analysis
        const mockRegions = getRandomDamageRegions();
        setDamageRegions(mockRegions);

        if (onAnalysisComplete) {
          onAnalysisComplete(responseData);
        }

        // Add to history - without id and analysisDate as they're added by the context
        const imageUrl = URL.createObjectURL(file);
        addAnalysisToHistory({
          imageUrl,
          damageDescription: responseData.description || responseData.damageType,
          damageType: responseData.damageType,
          confidence: responseData.confidence,
          recommendations: responseData.recommendations,
          repairEstimate: responseData.repairEstimate,
        });
      }
    } catch (err) {
      clearInterval(progressInterval);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during analysis.';
      setError(errorMessage);
      setProgress(0);
      
      if (onAnalysisError) {
        onAnalysisError(errorMessage);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // This component can be used without rendering anything itself
  // It's primarily a logic component that triggers callbacks
  return (
    <>
      {isAnalyzing && (
        <div className="bg-white shadow-md rounded p-4 mb-4">
          <div className="text-center mb-2">Analyzing damage...</div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Error analyzing image: {error}
              </p>
              <p className="mt-2 text-xs text-red-600">
                Please try again or use a different image. If the problem persists, our system might be having temporary issues.
              </p>
            </div>
          </div>
        </div>
      )}      {result && !error && !isAnalyzing && (
        <div className="bg-white shadow-md rounded p-4 mb-4">
          <h3 className="text-lg font-semibold mb-2">Analysis Result</h3>
          
          {/* Visualization of damage on the image */}
          {imageSrc && (
            <div className="mb-4 border rounded overflow-hidden" style={{ height: '350px' }}>
              <AnalysisVisualization 
                imageUrl={imageSrc} 
                damageRegions={damageRegions}
                showOverlay={showOverlay}
              />
            </div>
          )}
          
          {/* Toggle for visualization overlay */}
          {damageRegions.length > 0 && (
            <div className="mb-4 flex items-center">
              <label className="flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showOverlay} 
                  onChange={() => setShowOverlay(!showOverlay)} 
                  className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Show damage overlay</span>
              </label>
            </div>
          )}
          
          {/* Analysis details */}
          <div className="mb-2">
            <span className="font-medium">Damage Type:</span> {result.damageType}
          </div>
          {result.description && (
            <div className="mb-2">
              <span className="font-medium">Description:</span> {result.description}
            </div>
          )}
          <div className="mb-2">
            <span className="font-medium">Confidence:</span> {(result.confidence * 100).toFixed(1)}%
          </div>
          {result.repairEstimate && (
            <div className="mb-2">
              <span className="font-medium">Estimated Repair Cost:</span> {result.repairEstimate}
            </div>
          )}          {result.recommendations && result.recommendations.length > 0 && (
            <div>
              <span className="font-medium">Recommendations:</span>
              <ul className="list-disc list-inside">
                {result.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Advanced Gemini AI analysis option */}
          <div className="mt-6 border-t pt-4">
            <h4 className="text-md font-semibold mb-3">Get Advanced AI Analysis</h4>
            <p className="text-sm text-gray-600 mb-4">
              Our Gemini AI can provide deeper insights into your car damage, including repair complexity assessment and more detailed recommendations.
            </p>
            
            {imageSrc && result && (
              <GeminiAnalysisViewer 
                imageUrl={imageSrc} 
                damageType={result.damageType} 
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DamageAnalyzer;