import React from 'react';
import { VehicleInsuranceAdvice, VehicleIdentification } from '@/types';

interface VehicleInsuranceAdviceCardProps {
  insuranceAdvice: VehicleInsuranceAdvice;
  vehicleInfo?: VehicleIdentification;
}

export const VehicleInsuranceAdviceCard: React.FC<VehicleInsuranceAdviceCardProps> = ({ 
  insuranceAdvice, 
  vehicleInfo 
}) => {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center mb-4">
        <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900">
          Vehicle-Specific Insurance Strategy
        </h3>
      </div>

      {vehicleInfo?.make && vehicleInfo?.model && (
        <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
          <p className="text-sm font-medium text-indigo-800">
            Customized advice for {vehicleInfo.make} {vehicleInfo.model}
            {vehicleInfo.year && ` (${vehicleInfo.year})`}
            {vehicleInfo.marketSegment && ` - ${vehicleInfo.marketSegment} segment`}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* Vehicle-Specific Advice */}
        {insuranceAdvice.vehicleSpecificAdvice && (
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-1">Vehicle Profile Analysis</h4>
            <p className="text-sm text-gray-600">{insuranceAdvice.vehicleSpecificAdvice}</p>
          </div>
        )}

        {/* Age Considerations */}
        {insuranceAdvice.ageConsiderations && (
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-1">Vehicle Age Impact</h4>
            <p className="text-sm text-gray-600">{insuranceAdvice.ageConsiderations}</p>
          </div>
        )}

        {/* Deductible Strategy */}
        {insuranceAdvice.deductibleStrategy && (
          <div className="border-l-4 border-orange-500 pl-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-1">Deductible Recommendation</h4>
            <p className="text-sm text-gray-600">{insuranceAdvice.deductibleStrategy}</p>
          </div>
        )}

        {/* Repair Strategy */}
        {insuranceAdvice.repairStrategy && (
          <div className="border-l-4 border-purple-500 pl-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-1">Repair Approach</h4>
            <p className="text-sm text-gray-600">{insuranceAdvice.repairStrategy}</p>
          </div>
        )}

        {/* NCB Considerations */}
        {insuranceAdvice.ncbConsiderations && (
          <div className="border-l-4 border-red-500 pl-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-1">No Claim Bonus Strategy</h4>
            <p className="text-sm text-gray-600">{insuranceAdvice.ncbConsiderations}</p>
          </div>
        )}

        {/* Parts Availability */}
        {insuranceAdvice.partsAvailability && (
          <div className="border-l-4 border-teal-500 pl-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-1">Parts & Service Network</h4>
            <p className="text-sm text-gray-600">{insuranceAdvice.partsAvailability}</p>
          </div>
        )}

        {/* Recommended Coverage */}
        {insuranceAdvice.recommendedCoverage && insuranceAdvice.recommendedCoverage.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Recommended Coverage</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {insuranceAdvice.recommendedCoverage.map((coverage, index) => (
                <div key={index} className="flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {coverage}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Premium Estimation */}
        {insuranceAdvice.estimatedPremium && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Premium Estimation</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Annual Premium:</span>
                <span className="font-semibold text-green-700">{insuranceAdvice.estimatedPremium.annual}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Range:</span>
                <span className="font-semibold text-green-700">{insuranceAdvice.estimatedPremium.range}</span>
              </div>
              {insuranceAdvice.estimatedPremium.factors && (
                <div className="pt-2 text-xs text-gray-500 border-t border-green-300">
                  {insuranceAdvice.estimatedPremium.factors}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-start">
          <svg className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-amber-700">
            <strong>Disclaimer:</strong> These are AI-generated recommendations based on vehicle identification and general market data. 
            Actual insurance terms may vary. Always consult with licensed insurance agents for personalized advice.
          </p>
        </div>
      </div>
    </div>
  );
};
