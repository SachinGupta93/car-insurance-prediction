import React from 'react';
import { Car, Calendar, Award, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface VehicleInfoCardProps {
  vehicleIdentification?: {
    make?: string;
    model?: string;
    year?: string;
    trimLevel?: string;
    bodyStyle?: string;
    confidence?: number;
  };
  vehicleInformation?: {
    make?: string;
    model?: string;
    estimatedYear?: string;
    marketSegment?: string;
    estimatedValue?: string;
  };
  className?: string;
}

export const VehicleInfoCard: React.FC<VehicleInfoCardProps> = ({
  vehicleIdentification,
  vehicleInformation,
  className = ''
}) => {
  const sanitize = (v?: string) => {
    const s = (v || '').toString().trim();
    if (!s) return 'Unknown';
    const generic = ['Unknown', 'Detected Vehicle', 'Standard Sedan', 'Standard'];
    return generic.includes(s) ? 'Unknown' : s;
  };
  // Merge data from both sources, preferring vehicleInformation if available
  const vehicle = {
    make: sanitize(vehicleInformation?.make || vehicleIdentification?.make),
    model: sanitize(vehicleInformation?.model || vehicleIdentification?.model),
    year: sanitize(vehicleInformation?.estimatedYear || vehicleIdentification?.year),
    trimLevel: sanitize(vehicleIdentification?.trimLevel),
    bodyStyle: sanitize(vehicleIdentification?.bodyStyle),
    marketSegment: sanitize(vehicleInformation?.marketSegment),
    estimatedValue: sanitize(vehicleInformation?.estimatedValue),
    confidence: vehicleIdentification?.confidence || 0
  };

  // Don't render if no meaningful data
  if (vehicle.make === 'Unknown' && vehicle.model === 'Unknown') {
    return null;
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) return { variant: 'default' as const, label: 'High Confidence' };
    if (confidence >= 0.7) return { variant: 'secondary' as const, label: 'Good Confidence' };
    if (confidence >= 0.5) return { variant: 'outline' as const, label: 'Moderate Confidence' };
    return { variant: 'destructive' as const, label: 'Low Confidence' };
  };

  const confidenceBadge = getConfidenceBadge(vehicle.confidence);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <Car className="h-5 w-5 text-blue-600" />
          <span>Vehicle Identification</span>
          {vehicle.confidence > 0 && (
            <Badge variant={confidenceBadge.variant} className="text-xs">
              {confidenceBadge.label}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Make & Model</p>
                <p className="text-sm text-gray-600">
                  {vehicle.make} {vehicle.model}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Year</p>
                <p className="text-sm text-gray-600">{vehicle.year}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            {vehicle.trimLevel !== 'Unknown' && (
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Trim Level</p>
                  <p className="text-sm text-gray-600">{vehicle.trimLevel}</p>
                </div>
              </div>
            )}
            
            {vehicle.bodyStyle !== 'Unknown' && (
              <div className="flex items-center space-x-2">
                <Car className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Body Style</p>
                  <p className="text-sm text-gray-600">{vehicle.bodyStyle}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {(vehicle.marketSegment !== 'Unknown' || vehicle.estimatedValue !== 'Unknown') && (
          <>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehicle.marketSegment !== 'Unknown' && (
                <div>
                  <p className="text-sm font-medium text-gray-900">Market Segment</p>
                  <Badge variant="outline" className="mt-1">
                    {vehicle.marketSegment}
                  </Badge>
                </div>
              )}
              
              {vehicle.estimatedValue !== 'Unknown' && (
                <div>
                  <p className="text-sm font-medium text-gray-900">Estimated Value</p>
                  <p className="text-sm text-gray-600 font-semibold mt-1">
                    {vehicle.estimatedValue}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
        
        {vehicle.confidence > 0 && (
          <>
            <Separator />
            <div className="text-xs text-gray-500">
              Identification confidence: {(vehicle.confidence * 100).toFixed(1)}%
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};