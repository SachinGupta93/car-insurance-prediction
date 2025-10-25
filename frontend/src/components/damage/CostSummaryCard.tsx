import React from 'react';
import { DollarSign, Wrench, Clock, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

interface CostSummaryCardProps {
  enhancedRepairCost?: {
    conservative?: number;
    comprehensive?: number;
    premium?: number;
    laborHours?: number;
    breakdown?: {
      parts?: number;
      labor?: number;
      materials?: number;
    };
    regionalVariations?: {
      metro?: number;
      tier1?: number;
      tier2?: number;
    };
  };
  comprehensiveCostSummary?: {
    totalPartsCost?: number;
    totalLaborCost?: number;
    totalMaterialsCost?: number;
    grandTotalRepair?: number;
    serviceOptions?: {
      authorizedServiceCenter?: number;
      multiBrandWorkshop?: number;
      localGarage?: number;
    };
  };
  className?: string;
}

export const CostSummaryCard: React.FC<CostSummaryCardProps> = ({
  enhancedRepairCost,
  comprehensiveCostSummary,
  className = ''
}) => {
  // Merge data from both sources
  const cost = {
    conservative: enhancedRepairCost?.conservative || 0,
    comprehensive: enhancedRepairCost?.comprehensive || 0,
    premium: enhancedRepairCost?.premium || 0,
    laborHours: enhancedRepairCost?.laborHours || 0,
    grandTotal: comprehensiveCostSummary?.grandTotalRepair || enhancedRepairCost?.comprehensive || 0,
    breakdown: {
      parts: comprehensiveCostSummary?.totalPartsCost || enhancedRepairCost?.breakdown?.parts || 0,
      labor: comprehensiveCostSummary?.totalLaborCost || enhancedRepairCost?.breakdown?.labor || 0,
      materials: comprehensiveCostSummary?.totalMaterialsCost || enhancedRepairCost?.breakdown?.materials || 0,
    },
    serviceOptions: comprehensiveCostSummary?.serviceOptions || {},
    regionalVariations: enhancedRepairCost?.regionalVariations || {}
  };

  // Don't render if no meaningful cost data
  if (cost.conservative === 0 && cost.comprehensive === 0 && cost.grandTotal === 0) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '₹ 0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalBreakdown = cost.breakdown.parts + cost.breakdown.labor + cost.breakdown.materials;
  const getBreakdownPercentage = (amount: number) => totalBreakdown > 0 ? (amount / totalBreakdown) * 100 : 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          <span>Repair Cost Analysis</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cost Tiers */}
        {(cost.conservative > 0 || cost.comprehensive > 0 || cost.premium > 0) && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900">Estimated Cost Range</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {cost.conservative > 0 && (
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 font-medium">Conservative</p>
                  <p className="text-lg font-bold text-blue-800">
                    {formatCurrency(cost.conservative)}
                  </p>
                </div>
              )}
              {cost.comprehensive > 0 && (
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-xs text-orange-600 font-medium">Comprehensive</p>
                  <p className="text-lg font-bold text-orange-800">
                    {formatCurrency(cost.comprehensive)}
                  </p>
                </div>
              )}
              {cost.premium > 0 && (
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-600 font-medium">Premium</p>
                  <p className="text-lg font-bold text-purple-800">
                    {formatCurrency(cost.premium)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Labor Hours */}
        {cost.laborHours > 0 && (
          <>
            <Separator />
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Estimated Labor Time</p>
                <p className="text-sm text-gray-600">
                  {cost.laborHours} hours
                </p>
              </div>
            </div>
          </>
        )}

        {/* Cost Breakdown */}
        {totalBreakdown > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                <Wrench className="h-4 w-4" />
                <span>Cost Breakdown</span>
              </h4>
              
              <div className="space-y-2">
                {cost.breakdown.parts > 0 && (
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Parts</span>
                      <span className="font-medium">{formatCurrency(cost.breakdown.parts)}</span>
                    </div>
                    <Progress value={getBreakdownPercentage(cost.breakdown.parts)} className="h-2" />
                  </div>
                )}
                
                {cost.breakdown.labor > 0 && (
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Labor</span>
                      <span className="font-medium">{formatCurrency(cost.breakdown.labor)}</span>
                    </div>
                    <Progress value={getBreakdownPercentage(cost.breakdown.labor)} className="h-2" />
                  </div>
                )}
                
                {cost.breakdown.materials > 0 && (
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Materials</span>
                      <span className="font-medium">{formatCurrency(cost.breakdown.materials)}</span>
                    </div>
                    <Progress value={getBreakdownPercentage(cost.breakdown.materials)} className="h-2" />
                  </div>
                )}
              </div>
              
              {cost.grandTotal > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(cost.grandTotal)}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Service Options */}
        {Object.keys(cost.serviceOptions).length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">Service Options</h4>
              <div className="space-y-2">
                {cost.serviceOptions.authorizedServiceCenter && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Badge variant="default" className="text-xs">Authorized</Badge>
                      <span className="text-sm">Service Center</span>
                    </div>
                    <span className="text-sm font-medium">
                      {formatCurrency(cost.serviceOptions.authorizedServiceCenter)}
                    </span>
                  </div>
                )}
                
                {cost.serviceOptions.multiBrandWorkshop && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs">Multi-brand</Badge>
                      <span className="text-sm">Workshop</span>
                    </div>
                    <span className="text-sm font-medium">
                      {formatCurrency(cost.serviceOptions.multiBrandWorkshop)}
                    </span>
                  </div>
                )}
                
                {cost.serviceOptions.localGarage && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">Local</Badge>
                      <span className="text-sm">Garage</span>
                    </div>
                    <span className="text-sm font-medium">
                      {formatCurrency(cost.serviceOptions.localGarage)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Regional Variations */}
        {Object.keys(cost.regionalVariations).length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Regional Pricing</span>
              </h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {cost.regionalVariations.metro && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Metro</p>
                    <p className="font-medium">{formatCurrency(cost.regionalVariations.metro)}</p>
                  </div>
                )}
                {cost.regionalVariations.tier1 && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Tier 1</p>
                    <p className="font-medium">{formatCurrency(cost.regionalVariations.tier1)}</p>
                  </div>
                )}
                {cost.regionalVariations.tier2 && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Tier 2</p>
                    <p className="font-medium">{formatCurrency(cost.regionalVariations.tier2)}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};