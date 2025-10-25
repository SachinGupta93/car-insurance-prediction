import React from 'react';
import { VerdictBanner } from './VerdictBanner';
import { VehicleInfoCard } from './VehicleInfoCard';
import { CostSummaryCard } from './CostSummaryCard';
import { InsuranceRecommendationCard } from './InsuranceRecommendationCard';

// Sample data demonstrating the new features
const sampleAnalysisResult = {
  confidence: 0.92,
  damageAssessment: {
    isDamaged: true,
    overallSeverity: 'Moderate',
    rationale: 'Multiple damage regions detected with significant impact on front and side panels. Structural integrity maintained but cosmetic and functional repairs required.',
    safetyImpact: 'Minor',
    drivabilityStatus: 'Caution_Required'
  },
  vehicleIdentification: {
    make: 'Toyota',
    model: 'Camry',
    year: '2020-2022',
    trimLevel: 'XLE',
    bodyStyle: '4-door Sedan',
    confidence: 0.89
  },
  vehicleInformation: {
    make: 'Toyota',
    model: 'Camry XLE',
    estimatedYear: '2021',
    marketSegment: 'Mid-size Premium Sedan',
    estimatedValue: '₹28,50,000'
  },
  enhancedRepairCost: {
    conservative: 45000,
    comprehensive: 67500,
    premium: 85000,
    laborHours: 18,
    breakdown: {
      parts: 38000,
      labor: 22500,
      materials: 7000
    },
    regionalVariations: {
      metro: 72000,
      tier1: 67500,
      tier2: 58500
    }
  },
  comprehensiveCostSummary: {
    totalPartsCost: 38000,
    totalLaborCost: 22500,
    totalMaterialsCost: 7000,
    grandTotalRepair: 67500,
    serviceOptions: {
      authorizedServiceCenter: 85000,
      multiBrandWorkshop: 67500,
      localGarage: 52000
    }
  },
  insuranceRecommendation: {
    recommendationStatus: 'CLAIM_RECOMMENDED',
    decisionConfidence: 'High',
    financialAnalysis: 'Total repair cost of ₹67,500 exceeds 15% of vehicle value. NCB loss of ₹18,000 is justified given the extent of damage. Net benefit after deductible: ₹42,500.',
    riskAssessment: 'Low risk claim with clear damage documentation. Vehicle age and segment support favorable claim processing. No adverse impact on premium expected.',
    rationale: 'Insurance claim strongly recommended due to repair costs exceeding cost-benefit threshold. Professional repair ensures safety and maintains vehicle value.',
    actionPlan: {
      documentation: 'Capture additional angles of damage, compile repair estimates from 2-3 authorized centers, maintain all receipts',
      serviceCenter: 'Recommend authorized Toyota service center for OEM parts and warranty coverage',
      repairTimeline: '7-10 business days for parts procurement and repair completion',
      partsStrategy: 'OEM parts recommended for front panel and lights; aftermarket acceptable for minor trim pieces',
      qualityAssurance: '2-year warranty on repairs, paint matching guarantee, post-repair inspection included'
    },
    safetyProtocol: {
      drivingSafetyStatus: 'CAUTION_REQUIRED',
      criticalRepairs: 'Left headlight requires immediate attention for night driving safety',
      temporaryMeasures: 'Use alternative lighting if available, avoid night driving until headlight repair',
      professionalInspection: 'Recommended within 48 hours to assess structural integrity and alignment'
    }
  }
};

export const DamageAnalysisShowcase: React.FC = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Enhanced Damage Analysis Features
        </h1>
        <p className="text-gray-600">
          Showcasing the new verdict banner, vehicle identification, cost analysis, and insurance recommendation components
        </p>
      </div>

      {/* Verdict Banner */}
      <VerdictBanner 
        damageAssessment={sampleAnalysisResult.damageAssessment}
        confidence={sampleAnalysisResult.confidence}
      />

      {/* Vehicle and Cost Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VehicleInfoCard 
          vehicleIdentification={sampleAnalysisResult.vehicleIdentification}
          vehicleInformation={sampleAnalysisResult.vehicleInformation}
        />
        <CostSummaryCard 
          enhancedRepairCost={sampleAnalysisResult.enhancedRepairCost}
          comprehensiveCostSummary={sampleAnalysisResult.comprehensiveCostSummary}
        />
      </div>

      {/* Insurance Recommendation */}
      <InsuranceRecommendationCard 
        insuranceRecommendation={sampleAnalysisResult.insuranceRecommendation}
      />

      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Features Demonstrated:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Verdict Banner:</strong> Clear damage assessment with confidence and severity indicators</li>
          <li>• <strong>Vehicle Info Card:</strong> Comprehensive vehicle identification with market segment details</li>
          <li>• <strong>Cost Summary Card:</strong> Tiered pricing, detailed breakdown, and regional variations</li>
          <li>• <strong>Insurance Recommendation:</strong> Strategic claim analysis with action plans and safety protocols</li>
          <li>• <strong>Responsive Design:</strong> Optimized for desktop and mobile viewing</li>
          <li>• <strong>Type Safety:</strong> Full TypeScript support with proper error handling</li>
        </ul>
      </div>
    </div>
  );
};