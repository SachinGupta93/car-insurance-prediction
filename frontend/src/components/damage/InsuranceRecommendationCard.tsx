import React from 'react';
import { Shield, AlertTriangle, FileText, Clock, Wrench, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface InsuranceRecommendationCardProps {
  insuranceRecommendation?: {
    recommendationStatus?: string;
    decisionConfidence?: string;
    financialAnalysis?: string;
    riskAssessment?: string;
    rationale?: string;
    actionPlan?: {
      documentation?: string;
      serviceCenter?: string;
      repairTimeline?: string;
      partsStrategy?: string;
      qualityAssurance?: string;
    };
    safetyProtocol?: {
      drivingSafetyStatus?: string;
      criticalRepairs?: string;
      temporaryMeasures?: string;
      professionalInspection?: string;
    };
  };
  className?: string;
}

export const InsuranceRecommendationCard: React.FC<InsuranceRecommendationCardProps> = ({
  insuranceRecommendation,
  className = ''
}) => {
  if (!insuranceRecommendation) return null;

  const {
    recommendationStatus,
    decisionConfidence,
    financialAnalysis,
    riskAssessment,
    rationale,
    actionPlan,
    safetyProtocol
  } = insuranceRecommendation;

  const getRecommendationConfig = (status?: string) => {
    switch (status) {
      case 'CLAIM_RECOMMENDED':
        return {
          icon: CheckCircle2,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          badgeVariant: 'default' as const,
          title: 'Insurance Claim Recommended'
        };
      case 'CASH_PAYMENT_OPTIMAL':
        return {
          icon: Shield,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          badgeVariant: 'secondary' as const,
          title: 'Cash Payment Recommended'
        };
      case 'CONDITIONAL_CLAIM':
        return {
          icon: AlertTriangle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          badgeVariant: 'outline' as const,
          title: 'Conditional Claim Assessment'
        };
      default:
        return {
          icon: FileText,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          badgeVariant: 'outline' as const,
          title: 'Insurance Assessment'
        };
    }
  };

  const config = getRecommendationConfig(recommendationStatus);
  const Icon = config.icon;

  const getConfidenceBadge = (confidence?: string) => {
    switch (confidence?.toLowerCase()) {
      case 'high':
        return { variant: 'default' as const, color: 'text-green-700' };
      case 'medium':
        return { variant: 'secondary' as const, color: 'text-yellow-700' };
      case 'low':
        return { variant: 'outline' as const, color: 'text-red-700' };
      default:
        return { variant: 'outline' as const, color: 'text-gray-700' };
    }
  };

  const confidenceBadge = getConfidenceBadge(decisionConfidence);

  const getSafetyStatus = (status?: string) => {
    switch (status) {
      case 'UNSAFE_TO_DRIVE':
        return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
      case 'CAUTION_REQUIRED':
        return { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
      case 'SAFE':
        return { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
    }
  };

  const safetyConfig = getSafetyStatus(safetyProtocol?.drivingSafetyStatus);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon className={`h-5 w-5 ${config.color}`} />
            <span>{config.title}</span>
          </div>
          {decisionConfidence && (
            <Badge variant={confidenceBadge.variant} className={`text-xs ${confidenceBadge.color}`}>
              {decisionConfidence} Confidence
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Recommendation */}
        {recommendationStatus && (
          <Alert className={`${config.bgColor} ${config.borderColor}`}>
            <AlertDescription>
              <div className="flex items-center justify-between">
                <Badge variant={config.badgeVariant} className="mb-2">
                  {recommendationStatus.replace(/_/g, ' ')}
                </Badge>
              </div>
              {rationale && (
                <p className={`text-sm ${config.color} font-medium`}>
                  {rationale}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Financial Analysis */}
        {financialAnalysis && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Financial Analysis</span>
            </h4>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              {financialAnalysis}
            </p>
          </div>
        )}

        {/* Risk Assessment */}
        {riskAssessment && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Risk Assessment</span>
            </h4>
            <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              {riskAssessment}
            </p>
          </div>
        )}

        {/* Safety Protocol */}
        {safetyProtocol && safetyProtocol.drivingSafetyStatus && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Safety Assessment</span>
              </h4>
              
              <Alert className={`${safetyConfig.bg} ${safetyConfig.border}`}>
                <AlertDescription>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Driving Safety Status</span>
                    <Badge variant="outline" className={safetyConfig.color}>
                      {safetyProtocol.drivingSafetyStatus.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  
                  {safetyProtocol.criticalRepairs && (
                    <p className={`text-sm ${safetyConfig.color} mb-2`}>
                      <strong>Critical Repairs:</strong> {safetyProtocol.criticalRepairs}
                    </p>
                  )}
                  
                  {safetyProtocol.temporaryMeasures && (
                    <p className={`text-sm ${safetyConfig.color} mb-2`}>
                      <strong>Temporary Measures:</strong> {safetyProtocol.temporaryMeasures}
                    </p>
                  )}
                  
                  {safetyProtocol.professionalInspection && (
                    <p className={`text-sm ${safetyConfig.color}`}>
                      <strong>Professional Inspection:</strong> {safetyProtocol.professionalInspection}
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          </>
        )}

        {/* Action Plan */}
        {actionPlan && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Recommended Action Plan</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {actionPlan.documentation && (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-3 w-3 text-gray-500" />
                      <span className="text-xs font-medium text-gray-900">Documentation</span>
                    </div>
                    <p className="text-xs text-gray-600 pl-5">{actionPlan.documentation}</p>
                  </div>
                )}
                
                {actionPlan.serviceCenter && (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Wrench className="h-3 w-3 text-gray-500" />
                      <span className="text-xs font-medium text-gray-900">Service Center</span>
                    </div>
                    <p className="text-xs text-gray-600 pl-5">{actionPlan.serviceCenter}</p>
                  </div>
                )}
                
                {actionPlan.repairTimeline && (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-3 w-3 text-gray-500" />
                      <span className="text-xs font-medium text-gray-900">Timeline</span>
                    </div>
                    <p className="text-xs text-gray-600 pl-5">{actionPlan.repairTimeline}</p>
                  </div>
                )}
                
                {actionPlan.partsStrategy && (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-3 w-3 text-gray-500" />
                      <span className="text-xs font-medium text-gray-900">Parts Strategy</span>
                    </div>
                    <p className="text-xs text-gray-600 pl-5">{actionPlan.partsStrategy}</p>
                  </div>
                )}
              </div>
              
              {actionPlan.qualityAssurance && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-900 mb-1">Quality Assurance</p>
                  <p className="text-xs text-blue-700">{actionPlan.qualityAssurance}</p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};