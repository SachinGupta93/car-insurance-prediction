import { useEffect } from 'react';
import { useDamageAnalysis } from '@/hooks/useDamageAnalysis';
import { useAuth } from '@/context/AuthContext';
import { VehicleIdentificationCard } from '@/components/damage/VehicleIdentificationCard';
import { RepairCostCard } from '@/components/damage/RepairCostCard';
import { InsuranceRecommendationsCard } from '@/components/damage/InsuranceRecommendationsCard';

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
      <div className="glass-card">
        <div className="px-6 py-8">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
            Analyzing Damage...
          </h3>
          <div className="flex justify-center mt-6">
            <div className="loading-automotive"></div>
          </div>
          <p className="text-gray-300 text-center mt-6 text-lg">
            Our AI is carefully analyzing your image for damage patterns
          </p>
          <div className="mt-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4">
            <div className="flex items-center text-blue-400">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">Processing with advanced computer vision</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div className="px-6 py-8">
        <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Damage Analysis Results
        </h3>
        
        {error && (
          <div className="mt-6 glass-card-nested border border-red-500/20">
            <div className="flex items-start p-4">
              <svg className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="text-red-300">{error}</div>
            </div>
          </div>
        )}

        {results.length > 0 ? (
          <div className="mt-8 space-y-6">
            {results.map((result, index) => (
              <div key={index} className="glass-card-nested border border-blue-500/20 hover:border-blue-400/30 transition-all duration-300" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className="text-xl font-semibold text-white mb-3">
                        {result.damageType}
                      </h4>
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-700 rounded-full h-3 mr-3 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-1000 ease-out" 
                            style={{ width: `${(result.confidence * 100).toFixed(1)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-blue-400 min-w-[60px]">
                          {(result.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="glass-card border border-green-500/20 p-4">
                      <h5 className="text-lg font-medium text-white mb-2 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Description
                      </h5>
                      <p className="text-gray-300 leading-relaxed">{result.description}</p>
                    </div>

                    <div className="glass-card border border-yellow-500/20 p-4">
                      <h5 className="text-lg font-medium text-white mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                        </svg>
                        Repair Estimate (Legacy)
                      </h5>
                      <div className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-400/30 text-green-300 font-semibold">
                        {result.repairEstimate}
                      </div>
                    </div>

                    {/* Enhanced Indian Market Features */}
                    <div className="space-y-6">
                      {/* Vehicle Identification Card */}
                      {result.vehicleIdentification && (
                        <div className="glass-card border border-blue-500/20">
                          <VehicleIdentificationCard vehicleInfo={result.vehicleIdentification} />
                        </div>
                      )}

                      {/* Enhanced Repair Cost with Indian Market Features */}
                      {result.enhancedRepairCost && (
                        <div className="glass-card border border-green-500/20">
                          <RepairCostCard 
                            repairCost={result.enhancedRepairCost} 
                            damageType={result.damageType}
                          />
                        </div>
                      )}

                      {/* Insurance Recommendations */}
                      {result.insuranceProviders && (
                        <div className="glass-card border border-purple-500/20">
                          <InsuranceRecommendationsCard 
                            providers={result.insuranceProviders}
                            regionalInsights={result.regionalInsights}
                            vehicleMake={result.vehicleIdentification?.make}
                          />
                        </div>
                      )}
                    </div>

                    <div className="glass-card border border-purple-500/20 p-4">
                      <h5 className="text-lg font-medium text-white mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                        Recommendations
                      </h5>
                      <ul className="space-y-2">
                        {result.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start text-gray-300">
                            <svg className="w-4 h-4 mr-2 mt-1 text-purple-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="leading-relaxed">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-8 glass-card-nested border border-gray-500/20">
            <div className="p-8">
              <div className="flex flex-col items-center justify-center text-gray-400">
                <div className="relative mb-6">
                  <svg className="h-20 w-20 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xl font-medium text-gray-300 mb-3">Ready for Analysis</p>
                <p className="text-gray-400 text-center max-w-md leading-relaxed">
                  Upload an image to see comprehensive damage analysis results powered by our advanced AI
                </p>
                {imageUrl && !loading && (
                  <div className="mt-4 px-4 py-2 bg-green-500/20 border border-green-400/30 rounded-lg">
                    <p className="text-sm text-green-300">✓ No damage detected in the uploaded image</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 