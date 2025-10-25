import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  BarChart3, 
  FileText, 
  Download, 
  Printer,
  Car,
  DollarSign,
  Shield,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  PieChart,
  LineChart,
  Wrench
} from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, Pie, BarChart, Bar } from 'recharts';
import { DamageResult } from '@/types';

interface DetailedGeminiAnalysisModalProps {
  analysisResult: DamageResult;
  onExportPDF?: () => void;
  onPrint?: () => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const DetailedGeminiAnalysisModal: React.FC<DetailedGeminiAnalysisModalProps> = ({ 
  analysisResult, 
  onExportPDF,
  onPrint 
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Enhanced damage regions data processing
  const damageRegionsData = useMemo(() => {
    const regions = (analysisResult as any).identifiedDamageRegions || 
                   (analysisResult as any).mandatoryOutput?.identifiedDamageRegions || [];
    
    return regions.map((region: any, index: number) => ({
      name: region.partName || 
            region.technicalDetails?.componentName || 
            `Region ${index + 1}`,
      damage: region.damagePercentage || 
             region.damageClassification?.affectedPercentage || 0,
      severity: region.severity || 
               region.damageClassification?.severity || 'unknown',
      confidence: (() => {
        const conf = region.confidence || region.damageClassification?.confidence || 0;
        // Handle both decimal (0.73) and percentage (73) formats
        return conf > 1 ? conf : conf * 100;
      })(),
      cost: region.estimatedCost || 
           region.costEstimation?.totalCost || 0
    }));
  }, [analysisResult]);

  // Enhanced cost breakdown data
  const costBreakdownData = useMemo(() => {
    const cost = (analysisResult as any).enhancedRepairCost || (analysisResult as any).comprehensiveCostSummary;
    const regionsMO = (analysisResult as any).mandatoryOutput?.identifiedDamageRegions || [];
    const regionsTop = (analysisResult as any).identifiedDamageRegions || [];

    const toNumber = (v: any) => {
      if (!v) return 0;
      if (typeof v === 'number') return v;
      if (typeof v === 'string') return parseInt(v.replace(/[^0-9]/g, '')) || 0;
      if (typeof v === 'object' && v.rupees) return parseInt(String(v.rupees).replace(/[^0-9]/g, '')) || 0;
      return 0;
    };
    
    if (!cost && regionsMO.length === 0 && regionsTop.length === 0) return [];
    
    // Prefer detailed per-region breakdown when available
    if (regionsMO.length > 0) {
      const totalParts = regionsMO.reduce((sum: number, region: any) => sum + (region.costEstimation?.partsCost || 0), 0);
      const totalLabor = regionsMO.reduce((sum: number, region: any) => sum + (region.costEstimation?.laborCost || 0), 0);
      const totalMaterials = regionsMO.reduce((sum: number, region: any) => sum + (region.costEstimation?.materialsCost || 0), 0);
      return [
        { name: 'Parts', value: totalParts, color: '#0088FE' },
        { name: 'Labor', value: totalLabor, color: '#00C49F' },
        { name: 'Materials', value: totalMaterials, color: '#FFBB28' }
      ].filter(item => item.value > 0);
    }

    // If we only have top-level estimatedCost on regions, try to split into parts/labor
    if (regionsTop.length > 0) {
      const total = regionsTop.reduce((sum: number, r: any) => sum + (toNumber(r.estimatedCost) || 0), 0);
      if (total > 0) {
        // Estimate breakdown: 60% parts, 35% labor, 5% materials
        return [
          { name: 'Parts', value: Math.round(total * 0.6), color: '#0088FE' },
          { name: 'Labor', value: Math.round(total * 0.35), color: '#00C49F' },
          { name: 'Materials', value: Math.round(total * 0.05), color: '#FFBB28' }
        ].filter(item => item.value > 0);
      }
    }
    
    // Fallback to basic cost structure provided by enhancedRepairCost/comprehensiveCostSummary
    return [
      { name: 'Labor', value: toNumber(cost?.laborCost || cost?.labor), color: '#0088FE' },
      { name: 'Parts', value: toNumber(cost?.partsCost || cost?.parts), color: '#00C49F' },
      { name: 'Paint', value: toNumber(cost?.paintCost || cost?.paint), color: '#FFBB28' },
      { name: 'Other', value: toNumber(cost?.otherCosts || cost?.miscellaneous), color: '#FF8042' }
    ].filter(item => item.value > 0);
  }, [analysisResult]);

  // Confidence trend data
  const confidenceTrendData = damageRegionsData.map((region: any, index: number) => ({
    region: region.name,
    confidence: region.confidence,
    index: index + 1
  }));

  // Enhanced vehicle information extraction
  const vehicleInfo = useMemo(() => {
    const basic = (analysisResult as any).vehicleIdentification || (analysisResult as any).vehicleInformation;
    const mandatory = (analysisResult as any).mandatoryOutput?.vehicleInformation;
    
    const filterUnknown = (value: any) => value && value !== 'Unknown' ? value : undefined;
    
    return {
      make: filterUnknown(basic?.make || mandatory?.make),
      model: filterUnknown(basic?.model || mandatory?.model), 
      year: filterUnknown(basic?.year || basic?.estimatedYear || mandatory?.estimatedYear),
      trim: filterUnknown(basic?.trimLevel),
      trimLevel: filterUnknown(basic?.trimLevel),
      bodyStyle: filterUnknown(basic?.bodyStyle || mandatory?.bodyStyle),
      category: filterUnknown(basic?.bodyStyle || basic?.marketSegment || mandatory?.marketSegment),
      bodyType: filterUnknown(basic?.bodyStyle || mandatory?.bodyStyle),
      confidence: basic?.confidence || 0.4,
      marketSegment: filterUnknown(basic?.marketSegment || mandatory?.marketSegment),
      estimatedValue: mandatory?.estimatedValue || 0
    };
  }, [analysisResult]);

  const damageAssessment = (analysisResult as any).damageAssessment || (analysisResult as any).mandatoryOutput?.damageAssessment;
  const insuranceRecommendation = (analysisResult as any).insuranceRecommendation;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white">
          <Brain className="w-4 h-4 mr-2" />
          Complete Gemini AI Analysis
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            <Brain className="w-6 h-6 mr-2 text-purple-600" />
            Complete Gemini AI Analysis Report
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="vehicle" className="flex items-center gap-2">
                <Car className="w-4 h-4" />
                Vehicle
              </TabsTrigger>
              <TabsTrigger value="damage" className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Damage
              </TabsTrigger>
              <TabsTrigger value="cost" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Costs
              </TabsTrigger>
              <TabsTrigger value="insurance" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Insurance
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Analysis Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Overall Confidence:</span>
                        <Badge variant={analysisResult.confidence > 0.8 ? "default" : analysisResult.confidence > 0.6 ? "secondary" : "destructive"}>
                          {(analysisResult.confidence * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Damage Type:</span>
                        <span className="text-right">{analysisResult.damageType}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Regions Identified:</span>
                        <Badge variant="outline">{damageRegionsData.length}</Badge>
                      </div>
                      {damageAssessment && (
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Damage Status:</span>
                          <Badge variant={damageAssessment.isDamaged ? "destructive" : "default"}>
                            {damageAssessment.isDamaged ? "Damaged" : "No Damage"}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Confidence by Region
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <RechartsLineChart data={confidenceTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="region" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Confidence']} />
                        <Line type="monotone" dataKey="confidence" stroke="#8884d8" strokeWidth={2} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Analysis Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Vehicle Overview */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2">Vehicle Information</h4>
                      <p className="text-blue-700">
                        <strong>{vehicleInfo.make} {vehicleInfo.model}</strong> ({vehicleInfo.year}) - {vehicleInfo.category}
                        {vehicleInfo.estimatedValue > 0 && (
                          <span className="block text-sm mt-1">
                            Estimated Value: ₹{vehicleInfo.estimatedValue.toLocaleString()}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Damage Summary */}
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-red-800 mb-2">Damage Assessment</h4>
                      <p className="text-red-700">
                        <strong>Severity:</strong> {damageAssessment?.overallSeverity || 'Moderate'} damage detected
                      </p>
                      <p className="text-red-700">
                        <strong>Regions Affected:</strong> {damageRegionsData.length} areas identified
                      </p>
                      <div className="mt-2">
                        {damageRegionsData.map((region: any, index: number) => (
                          <span key={index} className="inline-block bg-red-100 text-red-800 px-2 py-1 rounded text-sm mr-2 mb-1">
                            {region.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Cost Summary */}
                    {costBreakdownData.length > 0 && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-green-800 mb-2">Repair Cost Estimate</h4>
                        <p className="text-green-700">
                          <strong>Total Estimated Cost:</strong> ₹{costBreakdownData.reduce((sum: number, item: any) => sum + item.value, 0).toLocaleString()}
                        </p>
                        <div className="mt-2 text-sm text-green-600">
                          {costBreakdownData.map((item: any, index: number) => (
                            <span key={index} className="block">
                              • {item.name}: ₹{item.value.toLocaleString()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Safety Assessment */}
                    {damageAssessment?.drivabilityStatus && (
                      <div className={`p-4 rounded-lg ${
                        damageAssessment.drivabilityStatus.toLowerCase().includes('unsafe') 
                          ? 'bg-red-50' 
                          : 'bg-yellow-50'
                      }`}>
                        <h4 className={`font-semibold mb-2 ${
                          damageAssessment.drivabilityStatus.toLowerCase().includes('unsafe')
                            ? 'text-red-800'
                            : 'text-yellow-800'
                        }`}>
                          Safety Assessment
                        </h4>
                        <p className={`${
                          damageAssessment.drivabilityStatus.toLowerCase().includes('unsafe')
                            ? 'text-red-700'
                            : 'text-yellow-700'
                        }`}>
                          <strong>Drivability Status:</strong> {damageAssessment.drivabilityStatus.replace(/_/g, ' ')}
                        </p>
                        <p className={`text-sm mt-1 ${
                          damageAssessment.drivabilityStatus.toLowerCase().includes('unsafe')
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        }`}>
                          {damageAssessment.drivabilityStatus.toLowerCase().includes('unsafe')
                            ? '⚠️ Vehicle requires immediate attention before driving'
                            : '⚠️ Drive with caution and schedule repairs soon'
                          }
                        </p>
                      </div>
                    )}

                    {/* Insurance Recommendation */}
                    {(analysisResult as any).mandatoryOutput?.insuranceRecommendation && (
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-purple-800 mb-2">Insurance Recommendation</h4>
                        <p className="text-purple-700">
                          <strong>Status:</strong> {(analysisResult as any).mandatoryOutput.insuranceRecommendation.recommendationStatus.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-purple-600 mt-1">
                          {(analysisResult as any).mandatoryOutput.insuranceRecommendation.rationale}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Vehicle Tab */}
            <TabsContent value="vehicle" className="mt-6">
              {vehicleInfo ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Car className="w-5 h-5 mr-2" />
                        Vehicle Identification
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="font-medium text-gray-600">Make:</span>
                            <p className="text-lg font-semibold">{vehicleInfo.make || 'Unknown'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Model:</span>
                            <p className="text-lg font-semibold">{vehicleInfo.model || 'Unknown'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Year:</span>
                            <p className="text-lg font-semibold">{vehicleInfo.year || 'Unknown'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Trim:</span>
                            <p className="text-lg font-semibold">{vehicleInfo.trim || 'Unknown'}</p>
                          </div>
                        </div>
                        {vehicleInfo.confidence && (
                          <div className="mt-4">
                            <span className="font-medium text-gray-600">Identification Confidence:</span>
                            <div className="flex items-center mt-1">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${(vehicleInfo.confidence || 0) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{((vehicleInfo.confidence || 0) * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Additional Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {vehicleInfo.marketSegment && (
                          <div>
                            <span className="font-medium text-gray-600">Market Segment:</span>
                            <Badge variant="outline" className="ml-2">{vehicleInfo.marketSegment}</Badge>
                          </div>
                        )}
                        {vehicleInfo.category && (
                          <div>
                            <span className="font-medium text-gray-600">Category:</span>
                            <Badge variant="outline" className="ml-2">{vehicleInfo.category}</Badge>
                          </div>
                        )}
                        {vehicleInfo.bodyType && (
                          <div>
                            <span className="font-medium text-gray-600">Body Type:</span>
                            <p className="text-sm text-gray-700">{vehicleInfo.bodyType}</p>
                          </div>
                        )}
                        {vehicleInfo.estimatedValue && (
                          <div>
                            <span className="font-medium text-gray-600">Estimated Value:</span>
                            <p className="text-lg font-semibold text-green-600">₹{vehicleInfo.estimatedValue.toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Car className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No vehicle identification data available</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Damage Tab */}
            <TabsContent value="damage" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <PieChart className="w-5 h-5 mr-2" />
                      Damage Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {damageRegionsData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={damageRegionsData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, damage }) => `${name}: ${damage}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="damage"
                          >
                            {damageRegionsData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No damage regions identified</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Severity Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={damageRegionsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="damage" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Damage Regions Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {damageRegionsData.map((region: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-semibold text-lg mb-2">{region.name}</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Damage Level:</span>
                            <Badge variant="outline">{region.damage}%</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Severity:</span>
                            <Badge variant={
                              region.severity === 'severe' || region.severity === 'critical' ? 'destructive' : 
                              region.severity === 'moderate' ? 'secondary' : 'default'
                            }>
                              {region.severity}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Confidence:</span>
                            <span>{region.confidence.toFixed(1)}%</span>
                          </div>
                          {region.cost > 0 && (
                            <div className="flex justify-between">
                              <span>Est. Cost:</span>
                              <span className="font-medium">₹{region.cost.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cost Tab */}
            <TabsContent value="cost" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {costBreakdownData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <PieChart className="w-5 h-5 mr-2" />
                        Cost Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={costBreakdownData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ₹${value.toLocaleString()}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {costBreakdownData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DollarSign className="w-5 h-5 mr-2" />
                      Cost Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {costBreakdownData.map((item, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded mr-2" 
                              style={{ backgroundColor: item.color }}
                            ></div>
                            <span className="font-medium">{item.name}:</span>
                          </div>
                          <span className="text-lg font-semibold">₹{item.value.toLocaleString()}</span>
                        </div>
                      ))}
                      
                      {costBreakdownData.length > 0 && (
                        <>
                          <div className="border-t pt-3 mt-4">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-lg">Total Estimated Cost:</span>
                              <span className="text-xl font-bold text-blue-600">
                                ₹{costBreakdownData.reduce((sum: number, item: any) => sum + item.value, 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          
                          {/* Additional cost information */}
                          {(() => {
                            const cost = (analysisResult as any).enhancedRepairCost;
                            const laborHours = cost?.laborHours || 
                                             (analysisResult as any).mandatoryOutput?.identifiedDamageRegions?.reduce(
                                               (sum: number, region: any) => sum + (region.repairSpecification?.estimatedTime || 0), 0
                                             );
                            
                            return laborHours ? (
                              <div className="mt-2 text-sm text-gray-600">
                                <div className="flex justify-between">
                                  <span>Estimated Labor Hours:</span>
                                  <span className="font-medium">{laborHours} hours</span>
                                </div>
                              </div>
                            ) : null;
                          })()}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Region-wise cost breakdown */}
              {damageRegionsData.length > 0 && damageRegionsData.some((region: any) => region.cost > 0) && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Wrench className="w-5 h-5 mr-2" />
                      Region-wise Cost Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {damageRegionsData
                        .filter((region: any) => region.cost > 0)
                        .map((region: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                              <div className="font-medium">{region.name}</div>
                              <div className="text-sm text-gray-500 capitalize">
                                {region.severity} damage • {region.confidence.toFixed(1)}% confidence
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-lg">₹{region.cost.toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Insurance Tab */}
            <TabsContent value="insurance" className="mt-6">
              {(() => {
                const toNumber = (v: any) => {
                  if (!v) return 0;
                  if (typeof v === 'number') return v;
                  if (typeof v === 'string') return parseInt(v.replace(/[^0-9]/g, '')) || 0;
                  if (typeof v === 'object' && v.rupees) return parseInt(String(v.rupees).replace(/[^0-9]/g, '')) || 0;
                  return 0;
                };
                const baseRec = (analysisResult as any).mandatoryOutput?.insuranceRecommendation || insuranceRecommendation;
                let insuranceRec = baseRec;
                if (!insuranceRec) {
                  const cost = (analysisResult as any).enhancedRepairCost || {};
                  const parts = toNumber(cost?.breakdown?.parts);
                  const labor = toNumber(cost?.breakdown?.labor);
                  const materials = toNumber(cost?.breakdown?.materials);
                  const cons = toNumber(cost?.conservative);
                  const total = cons || parts + labor + materials;
                  const sev = ((analysisResult as any).severity || 'moderate').toString().toLowerCase();
                  const recommend = total > 10000 || sev === 'severe' || sev === 'critical';
                  insuranceRec = {
                    recommendationStatus: recommend ? 'CLAIM_RECOMMENDED' : 'SELF_PAY_RECOMMENDED',
                    decisionConfidence: recommend ? 'High' : 'Medium',
                    rationale: recommend ? 'Estimated repair cost justifies filing a claim.' : 'Estimated cost appears low; self-pay may preserve NCB.',
                    financialAnalysis: total ? `Approximate total cost ₹${total.toLocaleString()}` : undefined,
                    riskAssessment: sev === 'critical' || sev === 'severe' ? 'High risk if driven without repair' : 'Moderate risk; drive with caution',
                    actionPlan: {
                      documentation: 'Upload clear photos and invoices',
                      serviceCenter: 'Choose authorized or trusted multi-brand center',
                      repairTimeline: recommend ? 'Initiate claim within 48 hours' : 'Schedule repair this week',
                      partsStrategy: 'Use OEM or high-quality aftermarket as appropriate'
                    },
                    safetyProtocol: {
                      drivingSafetyStatus: sev === 'critical' || sev === 'severe' ? 'UNSAFE_TO_DRIVE' : 'DRIVE_WITH_CAUTION',
                      criticalRepairs: sev === 'critical' || sev === 'severe' ? 'Address structural and safety-critical components immediately' : undefined,
                      temporaryMeasures: 'Avoid long trips until repairs are complete',
                      professionalInspection: 'Seek professional inspection if warning lights or handling changes occur'
                    }
                  } as any;
                }
                return insuranceRec ? (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Shield className="w-5 h-5 mr-2" />
                          Insurance Recommendation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold mb-2">Recommendation Status</h4>
                            <Badge variant={
                              insuranceRec.recommendationStatus?.includes('RECOMMENDED') ? 'default' :
                              insuranceRec.recommendationStatus?.includes('REVIEW') ? 'secondary' : 'destructive'
                            } className="text-lg p-2">
                              {insuranceRec.recommendationStatus?.replace(/_/g, ' ') || 'Under Review'}
                            </Badge>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Decision Confidence</h4>
                            <Badge variant="outline" className="text-sm">
                              {insuranceRec.decisionConfidence || 'Medium'}
                            </Badge>
                          </div>
                        </div>
                        {insuranceRec.rationale && (
                          <div className="mt-4">
                            <h4 className="font-semibold mb-2">Analysis</h4>
                            <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                              {insuranceRec.rationale}
                            </p>
                          </div>
                        )}
                        {insuranceRec.financialAnalysis && (
                          <div className="mt-4">
                            <h4 className="font-semibold mb-2">Financial Assessment</h4>
                            <p className="text-sm text-gray-700 bg-green-50 p-3 rounded border-l-4 border-green-400">
                              {insuranceRec.financialAnalysis}
                            </p>
                          </div>
                        )}
                        {insuranceRec.riskAssessment && (
                          <div className="mt-4">
                            <h4 className="font-semibold mb-2">Risk Assessment</h4>
                            <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                              {insuranceRec.riskAssessment}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    {insuranceRec.actionPlan && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Recommended Action Plan
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {insuranceRec.actionPlan.documentation && (
                              <div>
                                <h4 className="font-semibold mb-2 text-blue-700">📋 Documentation Required</h4>
                                <p className="text-sm text-gray-700">{insuranceRec.actionPlan.documentation}</p>
                              </div>
                            )}
                            {insuranceRec.actionPlan.serviceCenter && (
                              <div>
                                <h4 className="font-semibold mb-2 text-green-700">🔧 Service Center</h4>
                                <p className="text-sm text-gray-700">{insuranceRec.actionPlan.serviceCenter}</p>
                              </div>
                            )}
                            {insuranceRec.actionPlan.repairTimeline && (
                              <div>
                                <h4 className="font-semibold mb-2 text-purple-700">⏰ Timeline</h4>
                                <p className="text-sm text-gray-700">{insuranceRec.actionPlan.repairTimeline}</p>
                              </div>
                            )}
                            {insuranceRec.actionPlan.partsStrategy && (
                              <div>
                                <h4 className="font-semibold mb-2 text-orange-700">🔩 Parts Strategy</h4>
                                <p className="text-sm text-gray-700">{insuranceRec.actionPlan.partsStrategy}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {insuranceRec.safetyProtocol && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <AlertTriangle className="w-5 h-5 mr-2" />
                            Safety Protocol
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className={`p-4 rounded-lg ${
                              insuranceRec.safetyProtocol.drivingSafetyStatus?.includes('UNSAFE') 
                                ? 'bg-red-50 border border-red-200' 
                                : 'bg-yellow-50 border border-yellow-200'
                            }`}>
                              <h4 className={`font-semibold mb-2 ${
                                insuranceRec.safetyProtocol.drivingSafetyStatus?.includes('UNSAFE')
                                  ? 'text-red-800'
                                  : 'text-yellow-800'
                              }`}>
                                🚗 Driving Safety Status
                              </h4>
                              <p className={`font-medium ${
                                insuranceRec.safetyProtocol.drivingSafetyStatus?.includes('UNSAFE')
                                  ? 'text-red-700'
                                  : 'text-yellow-700'
                              }`}>
                                {insuranceRec.safetyProtocol.drivingSafetyStatus?.replace(/_/g, ' ')}
                              </p>
                            </div>
                            {insuranceRec.safetyProtocol.criticalRepairs && (
                              <div>
                                <h4 className="font-semibold mb-2 text-red-700">🚨 Critical Repairs Required</h4>
                                <p className="text-sm text-gray-700 bg-red-50 p-3 rounded">
                                  {insuranceRec.safetyProtocol.criticalRepairs}
                                </p>
                              </div>
                            )}
                            {insuranceRec.safetyProtocol.temporaryMeasures && (
                              <div>
                                <h4 className="font-semibold mb-2 text-blue-700">⚡ Immediate Action</h4>
                                <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded">
                                  {insuranceRec.safetyProtocol.temporaryMeasures}
                                </p>
                              </div>
                            )}
                            {insuranceRec.safetyProtocol.professionalInspection && (
                              <div>
                                <h4 className="font-semibold mb-2 text-green-700">✅ Professional Inspection</h4>
                                <p className="text-sm text-gray-700 bg-green-50 p-3 rounded">
                                  {insuranceRec.safetyProtocol.professionalInspection}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">No insurance recommendation data available</p>
                    </CardContent>
                  </Card>
                );
              })()}
            </TabsContent>

          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
            <Button variant="outline" onClick={onPrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print Report
            </Button>
            <Button variant="outline" onClick={onExportPDF}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DetailedGeminiAnalysisModal;