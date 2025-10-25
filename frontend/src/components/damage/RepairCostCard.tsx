import React, { useState } from 'react';
import { RepairCostEstimate, CurrencyAmount } from '@/types';

interface RepairCostCardProps {
  repairCost: RepairCostEstimate;
  damageType: string;
}

export const RepairCostCard: React.FC<RepairCostCardProps> = ({ repairCost, damageType }) => {
  const [selectedView, setSelectedView] = useState<'estimate' | 'breakdown' | 'regional'>('estimate');
  const formatCurrency = (amount?: CurrencyAmount) => {
    if (!amount) {
      return (
        <div className="flex flex-col">
          <span className="text-lg font-bold text-gray-900">N/A</span>
          <span className="text-sm text-gray-600">N/A</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col">
        <span className="text-lg font-bold text-gray-900">{amount.rupees}</span>
        <span className="text-sm text-gray-600">{amount.dollars}</span>
      </div>
    );
  };

  const ServiceTypeCard = ({ type, cost, description }: { type: string; cost: CurrencyAmount; description: string }) => (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <h4 className="font-semibold text-gray-900 mb-1">{type}</h4>
      <div className="mb-2">{formatCurrency(cost)}</div>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          Enhanced Repair Cost Analysis
        </h3>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setSelectedView('estimate')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              selectedView === 'estimate' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Estimates
          </button>
          <button
            onClick={() => setSelectedView('breakdown')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              selectedView === 'breakdown' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Breakdown
          </button>
          <button
            onClick={() => setSelectedView('regional')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              selectedView === 'regional' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Regional
          </button>
        </div>
      </div>

      {selectedView === 'estimate' && (
        <div className="space-y-6">
          {/* Main Estimates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Conservative Estimate</h4>
              {formatCurrency(repairCost?.conservative)}
              <p className="text-xs text-blue-600 mt-1">Basic repair quality</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="text-sm font-semibold text-green-800 mb-2">Comprehensive Repair</h4>
              {formatCurrency(repairCost?.comprehensive)}
              <p className="text-xs text-green-600 mt-1">OEM parts, recommended</p>
            </div>
            {repairCost?.premium && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h4 className="text-sm font-semibold text-purple-800 mb-2">Premium Quality</h4>
                {formatCurrency(repairCost?.premium)}
                <p className="text-xs text-purple-600 mt-1">Show quality finish</p>
              </div>
            )}
          </div>

          {/* Labor Hours */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Estimated Labor Time</span>
              <span className="text-lg font-semibold text-gray-900">{repairCost?.laborHours || 'N/A'}</span>
            </div>
          </div>

          {/* Service Type Comparison */}
          {repairCost?.serviceTypeComparison && typeof repairCost.serviceTypeComparison === 'object' && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">Service Center Comparison</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {repairCost?.serviceTypeComparison?.authorizedCenter && (
                  <ServiceTypeCard
                    type="Authorized Center"
                    cost={repairCost?.serviceTypeComparison?.authorizedCenter}
                    description="OEM parts, warranty coverage, premium pricing"
                  />
                )}
                {repairCost?.serviceTypeComparison?.multiBrandCenter && (
                  <ServiceTypeCard
                    type="Multi-Brand Center"
                    cost={repairCost?.serviceTypeComparison?.multiBrandCenter}
                    description="Good quality, competitive pricing, experienced"
                  />
                )}
                {repairCost?.serviceTypeComparison?.localGarage && (
                  <ServiceTypeCard
                    type="Local Garage"
                    cost={repairCost?.serviceTypeComparison?.localGarage}
                    description="Budget-friendly, aftermarket parts option"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedView === 'breakdown' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <h4 className="text-sm font-semibold text-amber-800 mb-2">Parts Cost</h4>
              {formatCurrency(repairCost?.breakdown?.parts)}
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Labor Cost</h4>
              {formatCurrency(repairCost?.breakdown?.labor)}
            </div>
            {repairCost?.breakdown?.materials && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Materials</h4>
                {formatCurrency(repairCost?.breakdown?.materials)}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedView === 'regional' && repairCost?.regionalVariations && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <h4 className="text-sm font-semibold text-red-800 mb-2">Metro Cities</h4>
              {formatCurrency(repairCost?.regionalVariations?.metro)}
              <p className="text-xs text-red-600 mt-1">Mumbai, Delhi, Bangalore</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">Tier-1 Cities</h4>
              {formatCurrency(repairCost?.regionalVariations?.tier1)}
              <p className="text-xs text-yellow-600 mt-1">Pune, Hyderabad, Ahmedabad</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="text-sm font-semibold text-green-800 mb-2">Tier-2/3 Cities</h4>
              {formatCurrency(repairCost?.regionalVariations?.tier2)}
              <p className="text-xs text-green-600 mt-1">Lower cost, competitive pricing</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
