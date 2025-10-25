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
  regions = [], // Default to empty array
  showLabels = true,
  interactive = true,
  onRegionClick
}) => {
  const [selectedRegion, setSelectedRegion] = useState<DamageRegion | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Defensive programming: filter out invalid regions with more lenient checks
  const validRegions = regions.filter(region => {
    if (!region) return false;
    
    // Check if essential properties exist (can be numbers, strings, or undefined)
    const hasCoordinates = (
      region.x !== null && region.x !== undefined &&
      region.y !== null && region.y !== undefined &&
      region.width !== null && region.width !== undefined &&
      region.height !== null && region.height !== undefined
    );
    
    const hasBasicInfo = region.damageType || region.severity;
    
    console.log('🔍 Region validation:', {
      region,
      hasCoordinates,
      hasBasicInfo,
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height
    });
    
    return hasCoordinates && hasBasicInfo;
  });

  console.log('🔍 DamageRegionsOverlay received:', { 
    totalRegions: regions.length, 
    validRegions: validRegions.length,
    sampleRegion: regions[0]
  });

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
      
      // Debug: Log regions data
      console.log('🔍 DamageRegionsOverlay - Regions received:', regions);
      console.log('🔍 DamageRegionsOverlay - Image dimensions:', { width: img.offsetWidth, height: img.offsetHeight });
      console.log('🔍 DamageRegionsOverlay - Image loaded:', imageLoaded);
    }
  };

  const handleRegionClick = (region: DamageRegion) => {
    if (interactive) {
      setSelectedRegion(region);
      onRegionClick?.(region);
    }
  };

  const getSeverityColor = (severity: string | undefined) => {
    if (!severity) return '#2196F3'; // Default blue color
    
    const colors: Record<string, string> = {
      minor: '#4CAF50',      // Green
      moderate: '#FF9800',   // Orange
      severe: '#FF5722',     // Deep Orange
      critical: '#F44336'    // Red
    };
    return colors[severity.toLowerCase()] || '#2196F3';
  };

  const getSeverityIcon = (severity: string | undefined) => {
    if (!severity) return <Info className="w-3 h-3" />;
    
    switch (severity.toLowerCase()) {
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
    <div className="relative bg-gray-100 rounded-lg overflow-hidden w-full" ref={containerRef}>
      {/* Main Image */}
      <img
        ref={imageRef}
        src={imageUrl}
        alt="Damage Analysis"
        className="w-full h-auto max-h-[70vh] object-contain"
        onLoad={handleImageLoad}
        style={{ display: 'block' }}
      />
      
      {/* Debug Info */}
      {imageLoaded && validRegions.length > 0 && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
          {validRegions.length} region{validRegions.length > 1 ? 's' : ''} detected
        </div>
      )}

      {/* Damage Region Overlays */}
      {imageLoaded && validRegions.map((region, index) => {
        // Convert coordinates to numbers
        const regionX = Number(region.x) || 0;
        const regionY = Number(region.y) || 0;
        const regionWidth = Number(region.width) || 10;
        const regionHeight = Number(region.height) || 10;
        
        // Determine if coordinates are in pixels or percentage
        const isPixelCoords = regionX > 100 || regionY > 100 || regionWidth > 100 || regionHeight > 100;
        
        // Calculate coordinates based on format
        let left, top, width, height;
        
        if (isPixelCoords) {
          // Direct pixel coordinates
          left = regionX;
          top = regionY;
          width = regionWidth;
          height = regionHeight;
        } else {
          // Percentage coordinates
          left = (regionX / 100) * imageDimensions.width;
          top = (regionY / 100) * imageDimensions.height;
          width = (regionWidth / 100) * imageDimensions.width;
          height = (regionHeight / 100) * imageDimensions.height;
        }
        
        console.log(`🔍 Region ${index + 1} coordinates:`, {
          original: { x: regionX, y: regionY, width: regionWidth, height: regionHeight },
          isPixelCoords,
          calculated: { left, top, width, height },
          imageDimensions
        });
        
        return (
          <div
            key={region.id || `region-${index}`}
            className={`absolute border-2 cursor-pointer transition-all duration-200 ${
              selectedRegion?.id === region.id ? 'border-4 shadow-lg' : 'hover:border-4'
            }`}
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${height}px`,
              borderColor: region.color || getSeverityColor(region.severity),
              borderStyle: region.damageType === 'crack' ? 'dashed' : 'solid',
              backgroundColor: `${region.color || getSeverityColor(region.severity)}20` // 20% opacity
            }}
            onClick={() => handleRegionClick(region)}
            title={`${region.damageType || 'Unknown'} - ${region.severity || 'unknown'} (${region.damagePercentage || 0}%)`}
          >
            {/* Region Label */}
            {showLabels && (
              <div
                className="absolute -top-9 left-0 bg-white rounded px-2.5 py-1.5 shadow-md text-xs font-semibold z-10"
                style={{
                  backgroundColor: region.color || getSeverityColor(region.severity),
                  color: 'white',
                  minWidth: '80px'
                }}
              >
                <div className="flex items-center gap-1">
                  {getSeverityIcon(region.severity)}
                  <span>{region.damageType || 'Unknown'}</span>
                </div>
                <div className="text-xs opacity-95">{region.damagePercentage || 0}%</div>
              </div>
            )}

            {/* Region Number */}
            <div
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
              style={{
                backgroundColor: region.color || getSeverityColor(region.severity)
              }}
             >
              {(region.id && typeof region.id === 'string' && region.id.split('_')[1]) || validRegions.indexOf(region) + 1}
            </div>
          </div>
        );
      })}
      
      {/* Fallback: Show region indicators when coordinates might not be working */}
      {imageLoaded && validRegions.length > 0 && (
        <div className="absolute bottom-2 left-2 flex gap-2">
          {validRegions.map((region, index) => (
            <div
              key={`indicator-${region.id || index}`}
              className="flex items-center gap-1 bg-white/90 px-2 py-1 rounded text-xs shadow-sm cursor-pointer"
              style={{
                borderLeft: `3px solid ${region.color || getSeverityColor(region.severity)}`
              }}
              onClick={() => handleRegionClick(region)}
            >
              <span className="font-medium">{index + 1}</span>
              <span className="text-gray-600">{region.damageType}</span>
            </div>
          ))}
        </div>
      )}

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
                  {(selectedRegion.id && typeof selectedRegion.id === 'string' && selectedRegion.id.split('_')[1]) || '1'}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 capitalize">
                    {(selectedRegion.damageType || 'Unknown').replace('_', ' ')}
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