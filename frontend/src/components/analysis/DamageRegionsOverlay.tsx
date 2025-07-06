import React, { useState, useRef, useEffect } from 'react';
import { DamageRegion } from '@/types';
import { X, Info, AlertTriangle, Wrench, DollarSign } from 'lucide-react';

interface DamageRegionsOverlayProps {
  imageUrl: string;
  regions: DamageRegion[];
  showLabels?: boolean;
  interactive?: boolean;
  onRegionClick?: (region: DamageRegion) => void;
}

const DamageRegionsOverlay: React.FC<DamageRegionsOverlayProps> = ({
  imageUrl,
  regions,
  showLabels = true,
  interactive = true,
  onRegionClick
}) => {
  const [selectedRegion, setSelectedRegion] = useState<DamageRegion | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const img = imageRef.current;
    if (img && img.complete) {
      setImageDimensions({ width: img.offsetWidth, height: img.offsetHeight });
      setImageLoaded(true);
    }
  }, [imageUrl]);

  const handleImageLoad = () => {
    const img = imageRef.current;
    if (img) {
      setImageDimensions({ width: img.offsetWidth, height: img.offsetHeight });
      setImageLoaded(true);
    }
  };

  const handleRegionClick = (region: DamageRegion) => {
    if (interactive) {
      setSelectedRegion(region);
      onRegionClick?.(region);
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      minor: '#4CAF50',      // Green
      moderate: '#FF9800',   // Orange
      severe: '#FF5722',     // Deep Orange
      critical: '#F44336'    // Red
    };
    return colors[severity] || '#2196F3';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'minor':
        return <Info className="w-3 h-3" />;
      case 'moderate':
        return <AlertTriangle className="w-3 h-3" />;
      case 'severe':
        return <Wrench className="w-3 h-3" />;
      case 'critical':
        return <X className="w-3 h-3" />;
      default:
        return <Info className="w-3 h-3" />;
    }
  };

  return (
    <div className="relative bg-gray-100 rounded-lg overflow-hidden" ref={containerRef}>
      {/* Main Image */}
      <img
        ref={imageRef}
        src={imageUrl}
        alt="Damage Analysis"
        className="w-full h-auto max-h-96 object-contain"
        onLoad={handleImageLoad}
        style={{ display: 'block' }}
      />

      {/* Damage Region Overlays */}
      {imageLoaded && regions.map((region) => (
        <div
          key={region.id}
          className={`absolute border-2 cursor-pointer transition-all duration-200 ${
            selectedRegion?.id === region.id ? 'border-4 shadow-lg' : 'hover:border-4'
          }`}
          style={{
            left: `${(region.x / 100) * imageDimensions.width}px`,
            top: `${(region.y / 100) * imageDimensions.height}px`,
            width: `${(region.width / 100) * imageDimensions.width}px`,
            height: `${(region.height / 100) * imageDimensions.height}px`,
            borderColor: region.color || getSeverityColor(region.severity),
            borderStyle: region.damageType === 'crack' ? 'dashed' : 'solid',
            backgroundColor: `${region.color || getSeverityColor(region.severity)}20` // 20% opacity
          }}
          onClick={() => handleRegionClick(region)}
          title={`${region.damageType} - ${region.severity} (${region.damagePercentage}%)`}
        >
          {/* Region Label */}
          {showLabels && (
            <div
              className="absolute -top-8 left-0 bg-white rounded px-2 py-1 shadow-md text-xs font-medium z-10"
              style={{
                backgroundColor: region.color || getSeverityColor(region.severity),
                color: 'white',
                minWidth: '80px'
              }}
            >
              <div className="flex items-center gap-1">
                {getSeverityIcon(region.severity)}
                <span>{region.damageType}</span>
              </div>
              <div className="text-xs opacity-90">{region.damagePercentage}%</div>
            </div>
          )}

          {/* Region Number */}
          <div
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
            style={{
              backgroundColor: region.color || getSeverityColor(region.severity)
            }}
          >
            {region.id.split('_')[1] || regions.indexOf(region) + 1}
          </div>
        </div>
      ))}

      {/* Region Details Modal */}
      {selectedRegion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                Damage Region Details
              </h3>
              <button
                onClick={() => setSelectedRegion(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Region Header */}
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                  style={{
                    backgroundColor: selectedRegion.color || getSeverityColor(selectedRegion.severity)
                  }}
                >
                  {selectedRegion.id.split('_')[1] || '1'}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 capitalize">
                    {selectedRegion.damageType.replace('_', ' ')}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {selectedRegion.partName?.replace('_', ' ') || 'Unknown Part'}
                  </p>
                </div>
              </div>

              {/* Severity Badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Severity:</span>
                <span
                  className="px-2 py-1 rounded-full text-xs font-bold text-white"
                  style={{
                    backgroundColor: getSeverityColor(selectedRegion.severity)
                  }}
                >
                  {selectedRegion.severity.toUpperCase()}
                </span>
              </div>

              {/* Damage Percentage */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Damage:</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${selectedRegion.damagePercentage}%`,
                      backgroundColor: getSeverityColor(selectedRegion.severity)
                    }}
                  />
                </div>
                <span className="text-sm font-bold text-gray-800">
                  {selectedRegion.damagePercentage}%
                </span>
              </div>

              {/* Confidence */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Confidence:</span>
                <span className="text-sm font-bold text-gray-800">
                  {Math.round(selectedRegion.confidence * 100)}%
                </span>
              </div>

              {/* Description */}
              <div>
                <span className="text-sm font-medium text-gray-600 block mb-1">Description:</span>
                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                  {selectedRegion.description}
                </p>
              </div>

              {/* Estimated Cost */}
              {selectedRegion.estimatedCost && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Estimated Cost:</span>
                  <span className="text-sm font-bold text-green-600">
                    ₹{selectedRegion.estimatedCost.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DamageRegionsOverlay;