import React, { useState } from 'react';
import { InsuranceProvider, RegionalInsuranceInsights } from '@/types';

interface InsuranceRecommendationsCardProps {
  providers: InsuranceProvider[];
  regionalInsights?: RegionalInsuranceInsights;
  vehicleMake?: string;
}

export const InsuranceRecommendationsCard: React.FC<InsuranceRecommendationsCardProps> = ({ 
  providers, 
  regionalInsights,
  vehicleMake 
}) => {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const getRecommendationColor = (recommendation: InsuranceProvider['recommendation']) => {
    switch (recommendation) {
      case 'PRIMARY':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'SECONDARY':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'AVOID':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRecommendationIcon = (recommendation: InsuranceProvider['recommendation']) => {
    switch (recommendation) {
      case 'PRIMARY':
        return (
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'SECONDARY':
        return (
          <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      case 'AVOID':
        return (
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const primaryProviders = providers.filter(p => p.recommendation === 'PRIMARY');
  const secondaryProviders = providers.filter(p => p.recommendation === 'SECONDARY');
  const avoidProviders = providers.filter(p => p.recommendation === 'AVOID');

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center mb-6">
        <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900">
          Insurance Provider Recommendations
          {vehicleMake && <span className="text-sm font-normal text-gray-600 ml-2">for {vehicleMake}</span>}
        </h3>
      </div>

      {/* Primary Recommendations */}
      {primaryProviders.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-green-700 mb-3 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Recommended Providers
          </h4>
          <div className="grid grid-cols-1 gap-3">
            {primaryProviders.map((provider, index) => (
              <div key={index} className="border border-green-200 rounded-lg p-4 bg-green-50">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-semibold text-gray-900">{provider.name}</h5>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getRecommendationColor(provider.recommendation)}`}>
                    {getRecommendationIcon(provider.recommendation)}
                    <span className="ml-1">Primary Choice</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <h6 className="text-sm font-medium text-green-800 mb-1">Advantages</h6>
                    <ul className="text-sm text-green-700 space-y-1">
                      {provider.pros.map((pro, i) => (
                        <li key={i} className="flex items-start">
                          <span className="text-green-500 mr-1">•</span>
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {provider.vehicleSpecificAdvantages && provider.vehicleSpecificAdvantages.length > 0 && (
                    <div>
                      <h6 className="text-sm font-medium text-green-800 mb-1">Vehicle-Specific Benefits</h6>
                      <ul className="text-sm text-green-700 space-y-1">
                        {provider.vehicleSpecificAdvantages.map((advantage, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-green-500 mr-1">•</span>
                            {advantage}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 pt-3 border-t border-green-200">
                  <div>
                    <span className="text-xs font-medium text-green-800">Claim Experience</span>
                    <p className="text-sm text-green-700">{provider.claimExperience}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-green-800">Network Coverage</span>
                    <p className="text-sm text-green-700">{provider.networkCoverage}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-green-800">Digital Capabilities</span>
                    <p className="text-sm text-green-700">{provider.digitalCapabilities}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Secondary Recommendations */}
      {secondaryProviders.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-yellow-700 mb-3 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Alternative Options
          </h4>
          <div className="space-y-3">
            {secondaryProviders.map((provider, index) => (
              <div key={index} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-semibold text-gray-900">{provider.name}</h5>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getRecommendationColor(provider.recommendation)}`}>
                    {getRecommendationIcon(provider.recommendation)}
                    <span className="ml-1">Alternative</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h6 className="text-sm font-medium text-yellow-800 mb-1">Pros</h6>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {provider.pros.map((pro, i) => (
                        <li key={i} className="flex items-start">
                          <span className="text-yellow-500 mr-1">•</span>
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h6 className="text-sm font-medium text-yellow-800 mb-1">Considerations</h6>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {provider.cons.map((con, i) => (
                        <li key={i} className="flex items-start">
                          <span className="text-yellow-500 mr-1">•</span>
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regional Insights */}
      {regionalInsights && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-md font-semibold text-blue-800 mb-3 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            Regional Insurance Insights
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h6 className="text-sm font-medium text-blue-800 mb-2">Metro City Advantages</h6>
              <ul className="text-sm text-blue-700 space-y-1">
                {regionalInsights.metroAdvantages.map((advantage, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-blue-500 mr-1">•</span>
                    {advantage}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h6 className="text-sm font-medium text-blue-800 mb-2">Tier-2 City Considerations</h6>
              <ul className="text-sm text-blue-700 space-y-1">
                {regionalInsights.tier2Considerations.map((consideration, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-blue-500 mr-1">•</span>
                    {consideration}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {regionalInsights.regionalCostVariations && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <h6 className="text-sm font-medium text-blue-800 mb-1">Regional Cost Variation</h6>
              <div className="flex items-center space-x-4">
                <span className="text-lg font-semibold text-blue-900">₹{regionalInsights.regionalCostVariations.rupees}</span>
                <span className="text-sm text-blue-700">${regionalInsights.regionalCostVariations.dollars} USD</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
