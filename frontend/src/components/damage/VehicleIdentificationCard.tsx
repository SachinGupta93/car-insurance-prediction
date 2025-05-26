import React from 'react';
import { VehicleIdentification } from '@/types';

interface VehicleIdentificationCardProps {
  vehicleInfo: VehicleIdentification;
}

export const VehicleIdentificationCard: React.FC<VehicleIdentificationCardProps> = ({ vehicleInfo }) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'High Confidence';
    if (confidence >= 50) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Vehicle Identification
        </h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getConfidenceColor(vehicleInfo.confidence)}`}>
          {getConfidenceLabel(vehicleInfo.confidence)} ({vehicleInfo.confidence}%)
        </div>
      </div>

      {vehicleInfo.confidence >= 50 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vehicleInfo.make && (
            <div className="flex items-center">
              <span className="text-gray-600 text-sm font-medium w-20">Make:</span>
              <span className="text-gray-900 font-semibold">{vehicleInfo.make}</span>
            </div>
          )}
          {vehicleInfo.model && (
            <div className="flex items-center">
              <span className="text-gray-600 text-sm font-medium w-20">Model:</span>
              <span className="text-gray-900 font-semibold">{vehicleInfo.model}</span>
            </div>
          )}
          {vehicleInfo.year && (
            <div className="flex items-center">
              <span className="text-gray-600 text-sm font-medium w-20">Year:</span>
              <span className="text-gray-900 font-semibold">{vehicleInfo.year}</span>
            </div>
          )}
          {vehicleInfo.trimLevel && (
            <div className="flex items-center">
              <span className="text-gray-600 text-sm font-medium w-20">Trim:</span>
              <span className="text-gray-900 font-semibold">{vehicleInfo.trimLevel}</span>
            </div>
          )}
          {vehicleInfo.bodyStyle && (
            <div className="flex items-center">
              <span className="text-gray-600 text-sm font-medium w-20">Type:</span>
              <span className="text-gray-900 font-semibold">{vehicleInfo.bodyStyle}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="text-gray-600 mb-2">Vehicle identification confidence is low</div>
          <div className="text-sm text-gray-500">
            For more accurate analysis, please provide additional images showing:
          </div>
          <ul className="text-sm text-gray-500 mt-2 space-y-1">
            <li>• Front view with grille and badges</li>
            <li>• Rear view with brand emblems</li>
            <li>• Side profile view</li>
            <li>• Interior dashboard</li>
          </ul>
        </div>
      )}

      {vehicleInfo.identificationDetails && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">{vehicleInfo.identificationDetails}</p>
        </div>
      )}

      {vehicleInfo.fallbackRequired && (
        <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-amber-800 mb-1">Enhanced Analysis Needed</h4>
              <p className="text-sm text-amber-700">
                Additional images required for precise vehicle identification and enhanced insurance recommendations
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
