import React, { useState } from 'react';
import { DamageRegion, DamageResult } from '@/types';
import { 
  MapPin, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Target,
  Car,
  Wrench,
  BarChart3,
  PieChart,
  List,
  Grid
} from 'lucide-react';
import DamageRegionsOverlay from './DamageRegionsOverlay';

interface MultiRegionAnalysisResultsProps {
  result: DamageResult;
  imageUrl: string;
}

const MultiRegionAnalysisResults: React.FC<MultiRegionAnalysisResultsProps> = ({
  result,
  imageUrl
}) => {
  const [viewMode, setViewMode] = useState<'overlay' | 'list'>('overlay');
  const [selectedRegion, setSelectedRegion] = useState<DamageRegion | null>(null);

  // Defensive programming: ensure we have valid data
  if (!result) {
    return <div className="text-gray-500 p-4">No analysis result available</div>;
  }

  const regions = result.identifiedDamageRegions || [];
  const regionAnalysis = result.regionAnalysis;

  // If no regions detected, show appropriate message
  if (regions.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Single Region Analysis</h3>
        <p className="text-blue-700">
          This analysis focused on overall damage assessment. For detailed multi-region analysis, 
          the AI would need to detect multiple distinct damage areas.
        </p>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      minor: '#4CAF50',
      moderate: '#FF9800',
      severe: '#FF5722',
      critical: '#F44336'
    };
    return colors[severity] || '#2196F3';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'minor':
        return <TrendingUp className="w-4 h-4" />;
      case 'moderate':
        return <AlertTriangle className="w-4 h-4" />;
      case 'severe':
        return <Wrench className="w-4 h-4" />;
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const totalCost = regions.reduce((sum, region) => sum + (region.estimatedCost || 0), 0);
  const averageDamage = regions.length > 0 ? regions.reduce((sum, region) => sum + (region.damagePercentage || 0), 0) / regions.length : 0;
  const computedAvgConfidence = regions.length > 0
    ? regions.reduce((sum, region) => sum + (region.confidence || 0), 0) / regions.length
    : (result.confidence || 0);
  const mostSevereDamage = regions.length > 0 ? regions.reduce((prev, curr) => ((prev.damagePercentage || 0) > (curr.damagePercentage || 0) ? prev : curr)) : null;

  return (
    <div className="space-y-8">
      {/* Header with Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Multi-Region Damage Analysis</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('overlay')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'overlay' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Grid className="w-4 h-4 inline mr-1" />
              Overlay View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <List className="w-4 h-4 inline mr-1" />
              List View
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-blue-50 rounded-lg p-6 text-center">
            <MapPin className="w-7 h-7 text-blue-700 mx-auto mb-2" />
            <div className="text-3xl font-extrabold text-blue-700">{regions.length}</div>
            <div className="text-base text-gray-700">Damage Regions</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-6 text-center">
            <BarChart3 className="w-7 h-7 text-orange-700 mx-auto mb-2" />
            <div className="text-3xl font-extrabold text-orange-700">{averageDamage.toFixed(1)}%</div>
            <div className="text-base text-gray-700">Avg. Damage</div>
          </div>
          <div className="bg-green-50 rounded-lg p-6 text-center">
            <DollarSign className="w-7 h-7 text-green-700 mx-auto mb-2" />
            <div className="text-3xl font-extrabold text-green-700">₹{totalCost.toLocaleString()}</div>
            <div className="text-base text-gray-700">Total Cost</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-6 text-center">
            <Target className="w-7 h-7 text-purple-700 mx-auto mb-2" />
            <div className="text-3xl font-extrabold text-purple-700">
              {regionAnalysis ? Math.round(regionAnalysis.averageConfidence * 100) : Math.round(computedAvgConfidence * 100)}%
            </div>
            <div className="text-base text-gray-700">Avg. Confidence</div>
          </div>
        </div>
      </div>

      {/* Full-width Visualization */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Damage Regions Visualization</h3>
        <DamageRegionsOverlay
          imageUrl={imageUrl}
          regions={regions}
          showLabels={viewMode === 'overlay'}
          interactive={true}
          onRegionClick={setSelectedRegion}
        />
      </div>

      {/* Detailed Region List */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            <List className="w-5 h-5 inline mr-2" />
            Detailed Region Analysis
          </h3>
          <div className="space-y-4">
            {regions.map((region, index) => (
              <div
                key={region.id}
                className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: region.color || getSeverityColor(region.severity) }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 capitalize text-lg">
                        {(region.damageType || 'Unknown').replace('_', ' ')}
                      </h4>
                      <p className="text-base text-gray-700">
                        {(region.partName || 'Unknown Part').replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      {getSeverityIcon(region.severity)}
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: getSeverityColor(region.severity) }}
                      >
                        {region.severity.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-base text-gray-700">
                      {region.damagePercentage}% damage
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-base text-gray-800 leading-relaxed">{region.description}</p>
                  
                  <div className="flex items-center justify-between text-base">
                    <span className="text-gray-700">
                      Confidence: {Math.round(region.confidence * 100)}%
                    </span>
                    {region.estimatedCost && (
                      <span className="font-semibold text-green-700">
                        ₹{region.estimatedCost.toLocaleString()}
                      </span>
                    )}
                  </div>
                  
                  {/* Damage Percentage Bar */}
                  <div className="mt-2">
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="text-gray-700">Damage Level</span>
                      <span className="font-medium text-gray-900">{region.damagePercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full transition-all duration-300"
                        style={{
                          width: `${region.damagePercentage}%`,
                          backgroundColor: region.color || getSeverityColor(region.severity)
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overall Analysis Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          <AlertTriangle className="w-5 h-5 inline mr-2" />
          Overall Analysis Summary
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Key Findings:</h4>
            <ul className="text-base text-gray-700 space-y-1.5">
              <li>• {regions.length} distinct damage regions identified</li>
              {mostSevereDamage && <li>• Most severe damage: {(mostSevereDamage.damageType || 'Unknown').replace('_', ' ')}</li>}
              <li>• Average damage level: {averageDamage.toFixed(1)}%</li>
              <li>• Total estimated repair cost: ₹{totalCost.toLocaleString()}</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Recommendations:</h4>
            <ul className="text-base text-gray-700 space-y-1.5">
              <li>• Prioritize critical and severe damage regions</li>
              <li>• Consider professional inspection for accurate assessment</li>
              <li>• Get quotes from multiple repair centers</li>
              <li>• Document all damage for insurance claims</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiRegionAnalysisResults;