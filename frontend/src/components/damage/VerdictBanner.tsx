import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VerdictBannerProps {
  damageAssessment?: {
    isDamaged?: boolean;
    overallSeverity?: string;
    rationale?: string;
    safetyImpact?: string;
    drivabilityStatus?: string;
  };
  confidence?: number;
  className?: string;
}

export const VerdictBanner: React.FC<VerdictBannerProps> = ({
  damageAssessment,
  confidence = 0,
  className = ''
}) => {
  if (!damageAssessment) return null;

  const { isDamaged, overallSeverity, rationale, safetyImpact, drivabilityStatus } = damageAssessment;
  
  // Determine banner style based on damage status and severity
  const getSeverityConfig = () => {
    if (!isDamaged) {
      return {
        variant: 'default' as const,
        icon: CheckCircle,
        bgColor: 'bg-green-50 border-green-200',
        textColor: 'text-green-800',
        title: 'No Damage Detected',
        badgeVariant: 'secondary' as const
      };
    }

    const severity = (overallSeverity || 'minor').toLowerCase();
    
    switch (severity) {
      case 'critical':
      case 'severe':
        return {
          variant: 'destructive' as const,
          icon: XCircle,
          bgColor: 'bg-red-50 border-red-200',
          textColor: 'text-red-800',
          title: 'Severe Damage Detected',
          badgeVariant: 'destructive' as const
        };
      case 'moderate':
        return {
          variant: 'default' as const,
          icon: AlertTriangle,
          bgColor: 'bg-orange-50 border-orange-200',
          textColor: 'text-orange-800',
          title: 'Moderate Damage Detected',
          badgeVariant: 'secondary' as const
        };
      default: // minor
        return {
          variant: 'default' as const,
          icon: AlertCircle,
          bgColor: 'bg-yellow-50 border-yellow-200',
          textColor: 'text-yellow-800',
          title: 'Minor Damage Detected',
          badgeVariant: 'outline' as const
        };
    }
  };

  const config = getSeverityConfig();
  const Icon = config.icon;

  return (
    <Alert className={`${config.bgColor} ${className}`}>
      <Icon className={`h-5 w-5 ${config.textColor}`} />
      <AlertDescription className="flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className={`font-semibold text-lg ${config.textColor}`}>
              {config.title}
            </h3>
            <Badge variant={config.badgeVariant} className="text-xs">
              {confidence > 0 ? `${(confidence * 100).toFixed(1)}% confidence` : 'Analysis complete'}
            </Badge>
          </div>
          {overallSeverity && (
            <Badge variant={config.badgeVariant} className="capitalize">
              {overallSeverity}
            </Badge>
          )}
        </div>
        
        {rationale && (
          <p className={`text-sm ${config.textColor} opacity-90`}>
            {rationale}
          </p>
        )}
        
        {(safetyImpact || drivabilityStatus) && (
          <div className="flex flex-wrap gap-2 mt-2">
            {safetyImpact && safetyImpact !== 'None' && (
              <Badge variant="outline" className="text-xs">
                Safety Impact: {safetyImpact}
              </Badge>
            )}
            {drivabilityStatus && drivabilityStatus !== 'Normal' && (
              <Badge variant="outline" className="text-xs">
                Drivability: {drivabilityStatus}
              </Badge>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};