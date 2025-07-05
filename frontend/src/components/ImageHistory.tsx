import React, { useState, useCallback } from 'react';
import { FaClock, FaTrash, FaCamera, FaStar, FaFileAlt, FaDownload, FaEye, FaExclamationTriangle } from 'react-icons/fa';
import { AlertTriangle, Calendar, FileText, TrendingUp, Eye, Download, Trash2, Star } from 'lucide-react';
import { UploadedImage } from '@/types';
import TimeBasedAnalysisCharts from './charts/TimeBasedAnalysisCharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ImageHistoryProps {
  history?: UploadedImage[];
  onClearHistory?: () => Promise<void>;
  onRemoveItem?: (itemId: string) => Promise<void>;
}

const ImageHistory: React.FC<ImageHistoryProps> = ({ history: historyProp, onClearHistory, onRemoveItem }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  const history = historyProp || [];
  
  console.log('🖼️ ImageHistory: Rendering with history:', {
    historyLength: history.length,
    sampleHistory: history.slice(0, 2),
    hasOnClearHistory: !!onClearHistory,
    hasOnRemoveItem: !!onRemoveItem
  });

  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const handleImageClick = useCallback((imageUrl: string) => {
    setSelectedImage(imageUrl);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!history || history.length === 0) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Enhanced Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-white to-emerald-50">
          <div className="absolute inset-0 bg-white/70"></div>
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1/4 left-1/6 w-80 h-80 bg-rose-300 rounded-full filter blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/3 right-1/5 w-96 h-96 bg-emerald-300 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          </div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
          <Card className="max-w-lg w-full bg-white/80 backdrop-blur-lg border-rose-200/50 shadow-xl">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-rose-200 to-emerald-200 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
                <FaCamera className="text-4xl text-gray-700" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">No Analysis History</h2>
              <p className="text-gray-600 text-lg mb-2">Your analysis history is empty.</p>
              <p className="text-gray-500 mb-8">Upload and analyze car damage images to see them here.</p>
              <Button 
                onClick={() => window.location.href = '/'} 
                className="bg-gradient-to-r from-rose-500 to-emerald-500 hover:from-rose-600 hover:to-emerald-600 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 mx-auto"
              >
                <FaCamera className="mr-2" />
                Start Analysis
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-emerald-50">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-200 to-emerald-200 rounded-lg flex items-center justify-center shadow-md">
                <FaCamera className="text-xl text-gray-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Analysis History</h1>
                <p className="text-gray-600">{history.length} analysis{history.length !== 1 ? 'es' : ''} found</p>
              </div>
            </div>
            
            {onClearHistory && (
              <Button
                onClick={onClearHistory}
                variant="outline"
                className="hover:bg-red-50 hover:border-red-300 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid gap-6">
          {history.map((item) => (
            <Card key={item.id} className="bg-white/80 backdrop-blur-lg border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Image Preview */}
                    <div className="relative">
                      <div 
                        className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-rose-300 transition-all duration-300"
                        onClick={() => (item.image || item.imageUrl) && handleImageClick(item.image || item.imageUrl)}
                      >
                        {(item.image && item.image.length > 0) || (item.imageUrl && item.imageUrl.length > 0) ? (
                          <img 
                            src={item.image || item.imageUrl} 
                            alt={item.filename || 'Analysis'} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // If image fails to load, show placeholder
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.parentElement!.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center">
                                  <svg class="text-gray-400 text-xl w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              `;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FaCamera className="text-gray-400 text-xl" />
                          </div>
                        )}
                      </div>
                      {item.image && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full bg-white shadow-md hover:bg-rose-50"
                          onClick={() => handleImageClick(item.image!)}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      )}
                    </div>

                    {/* Analysis Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-800">{item.filename || (item.image ? item.image.split('/').pop() : null) || 'Analysis'}</h3>
                        <Badge variant="outline" className={getSeverityColor(item.result?.severity || item.severity || 'moderate')}>
                          {item.result?.severity || item.severity || 'moderate'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(item.uploadedAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className={`w-4 h-4 ${getConfidenceColor(item.result?.confidence || 0)}`} />
                          {Math.round((item.result?.confidence || item.confidence || 0.75) * 100)}% confidence
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">
                          {item.result?.damageType || item.damageType || 'Structural Damage'}
                        </span>
                        {item.result?.repairEstimate && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {item.result.repairEstimate}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleExpanded(item.id)}
                      className="hover:bg-blue-50 hover:border-blue-300"
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      {expandedItems.has(item.id) ? 'Less' : 'Details'}
                    </Button>
                    
                    {onRemoveItem && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRemoveItem(item.id)}
                        className="hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Expanded Content */}
              {expandedItems.has(item.id) && (
                <CardContent className="pt-0">
                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Analysis Results */}
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3">Analysis Results</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Damage Type:</span>
                            <span className="font-medium">{item.result?.damageType || 'Unknown'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Confidence:</span>
                            <span className={`font-medium ${getConfidenceColor(item.result?.confidence || 0)}`}>
                              {Math.round((item.result?.confidence || 0) * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Severity:</span>
                            <Badge variant="outline" className={getSeverityColor(item.result?.severity || 'unknown')}>
                              {item.result?.severity || 'unknown'}
                            </Badge>
                          </div>
                          {item.result?.repairEstimate && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Repair Estimate:</span>
                              <span className="font-medium text-green-600">{item.result.repairEstimate}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Vehicle Info */}
                      {item.result?.vehicleIdentification && (
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-3">Vehicle Information</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Make:</span>
                              <span className="font-medium">{item.result.vehicleIdentification.make || 'Unknown'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Model:</span>
                              <span className="font-medium">{item.result.vehicleIdentification.model || 'Unknown'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Year:</span>
                              <span className="font-medium">{item.result.vehicleIdentification.year || 'Unknown'}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Damage Description */}
                    {item.result?.damageDescription && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-gray-800 mb-2">Description</h4>
                        <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
                          {item.result.damageDescription}
                        </p>
                      </div>
                    )}

                    {/* Damage Regions */}
                    {item.result?.identifiedDamageRegions && item.result.identifiedDamageRegions.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-gray-800 mb-2">Identified Damage Regions</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {item.result.identifiedDamageRegions.map((region, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-sm">{region.damageType}</span>
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(region.confidence * 100)}%
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                Position: {region.x}, {region.y} ({region.width}x{region.height})
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <img 
              src={selectedImage} 
              alt="Analysis" 
              className="w-full h-full object-contain rounded-lg"
            />
            <Button
              onClick={handleCloseModal}
              variant="outline"
              className="absolute top-4 right-4 bg-white/90 hover:bg-white"
            >
              ✕
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageHistory;