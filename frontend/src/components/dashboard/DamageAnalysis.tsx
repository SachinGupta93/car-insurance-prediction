import { useEffect } from 'react';
import { useDamageAnalysis } from '@/hooks/useDamageAnalysis';
import { useAuth } from '@/context/AuthContext';

interface DamageAnalysisProps {
  imageUrl?: string;
}

export default function DamageAnalysis({ imageUrl }: DamageAnalysisProps) {
  const { results, loading, error, analyzeImage } = useDamageAnalysis();
  const { user } = useAuth();

  // Trigger analysis when imageUrl changes
  useEffect(() => {
    if (imageUrl && user) {
      analyzeImage(imageUrl);
    }
  }, [imageUrl, analyzeImage, user]);

  if (loading) {
    return (
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Analyzing Damage...
          </h3>
          <div className="flex justify-center mt-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
          <p className="text-sm text-gray-500 text-center mt-4">
            This may take a few moments as we analyze your image
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Damage Analysis Results
        </h3>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {results.length > 0 ? (
          <div className="mt-5 space-y-6">
            {results.map((result, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {result.damageType}
                    </h4>
                    <div className="mt-1 flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full" 
                          style={{ width: `${(result.confidence * 100).toFixed(1)}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-xs font-medium text-gray-500">
                        {(result.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-900">Description</h5>
                  <p className="mt-1 text-sm text-gray-600">{result.description}</p>
                </div>

                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-900">Repair Estimate</h5>
                  <div className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-green-100 text-green-800">
                    {result.repairEstimate}
                  </div>
                </div>

                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-900">Recommendations</h5>
                  <ul className="mt-2 list-disc pl-5 space-y-1">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-gray-600">{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex flex-col items-center justify-center text-gray-400">
              <svg className="h-12 w-12 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm">Upload an image to see damage analysis results</p>
              {imageUrl && !loading && (
                <p className="text-xs mt-2">No damage detected in the uploaded image</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 