import React from 'react';
import { DamageResult } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface PrintFriendlyReportProps {
  analysisResult: DamageResult;
  imageUrl?: string;
  reportId?: string;
  generatedDate?: Date;
}

const PrintFriendlyReport: React.FC<PrintFriendlyReportProps> = ({
  analysisResult,
  imageUrl,
  reportId = `RPT-${Date.now()}`,
  generatedDate = new Date()
}) => {
  const vehicleInfo = (analysisResult as any).vehicleIdentification || (analysisResult as any).vehicleInformation;
  const damageAssessment = (analysisResult as any).damageAssessment;
  const costSummary = (analysisResult as any).enhancedRepairCost || (analysisResult as any).comprehensiveCostSummary;
  const insuranceRecommendation = (analysisResult as any).insuranceRecommendation;

  const totalCost = costSummary ? 
    (costSummary.laborCost || costSummary.labor || 0) +
    (costSummary.partsCost || costSummary.parts || 0) +
    (costSummary.paintCost || costSummary.paint || 0) +
    (costSummary.otherCosts || costSummary.miscellaneous || 0) : 0;

  return (
    <div className="print-friendly-report bg-white p-8 font-serif max-w-4xl mx-auto">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .print-friendly-report {
            margin: 0;
            padding: 20px;
            font-size: 12px;
            line-height: 1.4;
            color: #000 !important;
            background: white !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          .page-break {
            page-break-after: always;
          }
          
          .page-break-inside-avoid {
            page-break-inside: avoid;
          }
          
          h1, h2, h3 {
            color: #000 !important;
            margin-top: 20px;
            margin-bottom: 10px;
          }
          
          .report-header {
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          
          .report-section {
            margin-bottom: 25px;
            border: 1px solid #ccc;
            padding: 15px;
          }
          
          .cost-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 10px;
          }
          
          .damage-regions-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 15px;
          }
          
          .signature-section {
            margin-top: 50px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 50px;
          }
          
          .signature-box {
            border-top: 1px solid #000;
            padding-top: 10px;
            margin-top: 40px;
            text-align: center;
          }
        }
      `}} />

      {/* Header */}
      <div className="report-header text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Vehicle Damage Analysis Report
        </h1>
        <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
          <div>
            <strong>Report ID:</strong> {reportId}
          </div>
          <div>
            <strong>Generated:</strong> {generatedDate.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="report-section page-break-inside-avoid">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Executive Summary</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p><strong>Damage Status:</strong> {damageAssessment?.isDamaged ? 'Damaged' : 'No Damage Detected'}</p>
            <p><strong>Overall Severity:</strong> {damageAssessment?.overallSeverity || 'Not Specified'}</p>
            <p><strong>Analysis Confidence:</strong> {(analysisResult.confidence * 100).toFixed(1)}%</p>
            <p><strong>Damage Type:</strong> {analysisResult.damageType}</p>
          </div>
          <div>
            <p><strong>Regions Identified:</strong> {(analysisResult.identifiedDamageRegions || []).length}</p>
            <p><strong>Estimated Total Cost:</strong> ₹{totalCost.toLocaleString()}</p>
            <p><strong>Insurance Action:</strong> {insuranceRecommendation?.recommendationStatus || 'Review Required'}</p>
          </div>
        </div>
      </div>

      {/* Vehicle Information */}
      {vehicleInfo && (
        <div className="report-section page-break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Vehicle Information</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p><strong>Make:</strong> {vehicleInfo.make || 'Unknown'}</p>
              <p><strong>Model:</strong> {vehicleInfo.model || 'Unknown'}</p>
              <p><strong>Year:</strong> {vehicleInfo.year || 'Unknown'}</p>
              <p><strong>Trim:</strong> {vehicleInfo.trim || 'Unknown'}</p>
            </div>
            <div>
              <p><strong>Body Type:</strong> {vehicleInfo.bodyType || 'Unknown'}</p>
              <p><strong>Market Segment:</strong> {vehicleInfo.marketSegment || 'Unknown'}</p>
              <p><strong>Estimated Value:</strong> {vehicleInfo.estimatedValue ? `₹${vehicleInfo.estimatedValue.toLocaleString()}` : 'Not Available'}</p>
              <p><strong>ID Confidence:</strong> {vehicleInfo.confidence ? `${(vehicleInfo.confidence * 100).toFixed(1)}%` : 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Damage Assessment */}
      <div className="report-section">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Damage Assessment</h2>
        
        {/* Image if available */}
        {imageUrl && (
          <div className="text-center mb-6">
            <img 
              src={imageUrl} 
              alt="Analyzed Vehicle" 
              className="max-w-full h-auto border border-gray-300"
              style={{ maxHeight: '300px' }}
            />
            <p className="text-sm text-gray-600 mt-2">Analyzed Vehicle Image</p>
          </div>
        )}

        {/* Damage Description */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Analysis Description</h3>
          <div className="bg-gray-50 p-4 rounded border text-sm">
            {analysisResult.description || analysisResult.damageDescription || 'No detailed description available.'}
          </div>
        </div>

        {/* Damage Regions */}
        {(analysisResult.identifiedDamageRegions || []).length > 0 && (
          <div className="damage-regions">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Identified Damage Regions</h3>
            <div className="damage-regions-grid">
              {(analysisResult.identifiedDamageRegions || []).map((region, index) => (
                <div key={index} className="border border-gray-300 p-3 bg-gray-50">
                  <h4 className="font-semibold text-base mb-2">Region {index + 1}: {region.partName || `Area ${index + 1}`}</h4>
                  <p className="text-sm"><strong>Damage Type:</strong> {region.damageType}</p>
                  <p className="text-sm"><strong>Severity:</strong> {region.severity}</p>
                  <p className="text-sm"><strong>Confidence:</strong> {((region.confidence || 0) * 100).toFixed(1)}%</p>
                  <p className="text-sm"><strong>Damage Level:</strong> {region.damagePercentage || 0}%</p>
                  <p className="text-sm"><strong>Location:</strong> ({region.x}, {region.y})</p>
                  {region.estimatedCost && (
                    <p className="text-sm"><strong>Est. Cost:</strong> ₹{region.estimatedCost.toLocaleString()}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cost Analysis */}
      {costSummary && (
        <div className="report-section page-break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Cost Analysis</h2>
          <div className="cost-grid">
            <div className="border border-gray-300 p-3">
              <h4 className="font-semibold mb-2">Labor Costs</h4>
              <p className="text-lg font-bold">₹{(costSummary.laborCost || costSummary.labor || 0).toLocaleString()}</p>
            </div>
            <div className="border border-gray-300 p-3">
              <h4 className="font-semibold mb-2">Parts Costs</h4>
              <p className="text-lg font-bold">₹{(costSummary.partsCost || costSummary.parts || 0).toLocaleString()}</p>
            </div>
            <div className="border border-gray-300 p-3">
              <h4 className="font-semibold mb-2">Paint Costs</h4>
              <p className="text-lg font-bold">₹{(costSummary.paintCost || costSummary.paint || 0).toLocaleString()}</p>
            </div>
            <div className="border border-gray-300 p-3">
              <h4 className="font-semibold mb-2">Other Costs</h4>
              <p className="text-lg font-bold">₹{(costSummary.otherCosts || costSummary.miscellaneous || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-gray-100 border-2 border-gray-400">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Total Estimated Cost:</h3>
              <p className="text-2xl font-bold">₹{totalCost.toLocaleString()}</p>
            </div>
          </div>

          {/* Regional Variations */}
          {costSummary.regionalVariations && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Regional Cost Variations</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {Object.entries(costSummary.regionalVariations).map(([region, cost]) => (
                  <div key={region} className="border border-gray-300 p-2 text-center">
                    <p className="font-medium">{region}</p>
                    <p>₹{(cost as number).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Insurance Recommendation */}
      {insuranceRecommendation && (
        <div className="report-section page-break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Insurance Recommendation</h2>
          
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <h4 className="font-semibold mb-2">Recommendation Status</h4>
              <p className="text-lg font-bold">{insuranceRecommendation.recommendationStatus}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Required Action</h4>
              <p>{insuranceRecommendation.action || 'No specific action required'}</p>
            </div>
          </div>

          {insuranceRecommendation.rationale && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Rationale</h4>
              <div className="bg-gray-50 p-3 border text-sm">
                {insuranceRecommendation.rationale}
              </div>
            </div>
          )}

          {insuranceRecommendation.actionPlan && (
            <div>
              <h4 className="font-semibold mb-2">Action Plan</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                {insuranceRecommendation.actionPlan.map((action: string, index: number) => (
                  <li key={index}>{action}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {analysisResult.recommendations && (
        <div className="report-section page-break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Expert Recommendations</h2>
          <ul className="list-disc list-inside space-y-2 text-sm">
            {analysisResult.recommendations.map((rec: string, index: number) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Safety Assessment */}
      {(analysisResult as any).safetyAssessment && (
        <div className="report-section page-break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Safety Assessment</h2>
          <p><strong>Drivability Status:</strong> {(analysisResult as any).safetyAssessment.drivability}</p>
          
          {(analysisResult as any).safetyAssessment.safetySystemImpacts && (
            <div className="mt-3">
              <h4 className="font-semibold mb-2">Safety System Impacts</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {(analysisResult as any).safetyAssessment.safetySystemImpacts.map((impact: string, index: number) => (
                  <li key={index}>{impact}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Footer with signatures */}
      <div className="signature-section page-break-inside-avoid">
        <div>
          <div className="signature-box">
            <p>AI Analysis System</p>
            <p className="text-sm text-gray-600">Automated Assessment</p>
          </div>
        </div>
        <div>
          <div className="signature-box">
            <p>Inspector Signature</p>
            <p className="text-sm text-gray-600">Date: _______________</p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-8 p-4 bg-gray-100 border text-xs text-gray-700 page-break-inside-avoid">
        <h4 className="font-semibold mb-2">Disclaimer</h4>
        <p>
          This report is generated by an AI-powered analysis system and should be used as a preliminary assessment tool. 
          All findings should be verified by qualified professionals before making final decisions. The accuracy of cost 
          estimates may vary based on location, labor rates, and parts availability. This report does not constitute a 
          formal insurance claim or professional vehicle assessment.
        </p>
      </div>
    </div>
  );
};

export default PrintFriendlyReport;