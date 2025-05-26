// Enhanced mock data for car damage analysis results with Indian market features
import { DamageResult } from '../../types';

// Create mock data in smaller, manageable pieces
const createMockDamageResult = (overrides: Partial<DamageResult>): DamageResult => ({
  damageType: 'Front Bumper Crack',
  confidence: 0.92,
  description: 'A visible crack on the lower part of the front bumper, likely from impact with a curb or road debris.',
  damageDescription: 'Crack in front bumper, lower section, with associated scratches.',
  recommendations: [
    'Clean the area and assess crack depth.',
    'For minor cracks, plastic welding or epoxy repair may be possible.',
    'If crack is severe or structural, bumper replacement is recommended.',
    'Check for damage to underlying components (sensors, fog lights).',
    'Obtain quotes from both authorized and multi-brand repair centers.'
  ],
  vehicleIdentification: {
    make: 'Maruti Suzuki',
    model: 'Swift',
    year: '2021',
    trimLevel: 'VXI',
    bodyStyle: 'Hatchback',
    confidence: 0.98,
    identificationDetails: 'Identified based on grille design and headlight shape.'
  },
  enhancedRepairCost: {
    conservative: { rupees: '₹3,500', dollars: '$45' },
    comprehensive: { rupees: '₹6,000', dollars: '$75' },
    laborHours: '2-3 hours',
    breakdown: {
      parts: { rupees: '₹2,500', dollars: '$30' },
      labor: { rupees: '₹2,000', dollars: '$25' },
      materials: { rupees: '₹500', dollars: '$5' }
    },
    serviceTypeComparison: {
      authorizedCenter: { rupees: '₹6,000', dollars: '$75' },
      multiBrandCenter: { rupees: '₹4,500', dollars: '$55' },
      localGarage: { rupees: '₹3,500', dollars: '$45' }
    },
    regionalVariations: {
      metro: { rupees: '₹5,500', dollars: '$70' },
      tier1: { rupees: '₹5,000', dollars: '$65' },
      tier2: { rupees: '₹4,200', dollars: '$50' }
    }
  },
  insuranceProviders: [
    {
      name: 'Bajaj Allianz General Insurance',
      recommendation: 'PRIMARY',
      pros: ['Strong network of cashless garages', 'Good claim settlement ratio for Maruti Suzuki'],
      cons: ['Premium can be slightly higher'],
      vehicleSpecificAdvantages: ['Tie-ups with Maruti Suzuki authorized workshops'],
      claimExperience: 'Generally smooth, with dedicated support for Maruti vehicles.',
      networkCoverage: 'Extensive across India, including Tier 2 cities.',
      digitalCapabilities: 'Mobile app for claims, policy management.',
      recommendedForVehicle: true
    }
  ],
  regionalInsights: {
    metroAdvantages: ['Access to specialized plastic repair shops', 'Quicker parts availability'],
    tier2Considerations: ['Ensure local garages have experience with modern bumper materials'],
    regionalCostVariations: { rupees: '₹4,000 - ₹6,500', dollars: '$50 - $80' }
  },
  marketAnalysis: {
    currentValue: { rupees: '₹6,50,000', dollars: '$7,800' },
    depreciationImpact: 'Minor, if repaired professionally.',
    resaleConsiderations: ['Documented professional repair is key.']
  },
  claimStrategy: {
    recommended: 'SELF_PAY',
    reasoning: 'Cost of repair is likely below deductible.',
    timelineOptimization: 'Repair can be done within 1-2 days.',
    documentationRequired: ['Photos of damage', 'Repair estimate from garage']
  },
  safetyAssessment: {
    drivability: 'SAFE',
    safetySystemImpacts: ['If parking sensors are near the crack, function might be impaired.'],
    recommendations: ['Visually inspect parking sensor alignment if applicable.']
  },
  ...overrides
});

// Export a small set of mock analyses
export const enhancedMockDamageAnalyses: DamageResult[] = [
  createMockDamageResult({}),
  createMockDamageResult({
    damageType: 'Driver-side Door Dent',
    confidence: 0.88,
    description: 'A noticeable dent on the driver-side door panel with deep scratches.',
    damageDescription: 'Dent and deep scratches on driver-side door.',
    vehicleIdentification: {
      make: 'Hyundai',
      model: 'Creta',
      year: '2022',
      trimLevel: 'SX',
      bodyStyle: 'SUV',
      confidence: 0.96,
      identificationDetails: 'Identified by tail light design and C-pillar shape.'
    }
  })
];

/**
 * Returns a random enhanced mock damage analysis for testing purposes
 */
export const getRandomEnhancedDamageAnalysis = (): DamageResult => {
  const randomIndex = Math.floor(Math.random() * enhancedMockDamageAnalyses.length);
  return enhancedMockDamageAnalyses[randomIndex];
};

/**
 * Simulates an API call to analyze damage with a delay (enhanced version)
 */
export const simulateEnhancedAnalysisRequest = (imageUrl: string, signal?: AbortSignal): Promise<DamageResult> => {
  return new Promise((resolve, reject) => {
    const delay = 1500 + Math.random() * 2000; // 1.5 to 3.5 seconds
    
    const timeoutId = setTimeout(() => {
      const analysis = getRandomEnhancedDamageAnalysis();
      resolve(analysis);
    }, delay);

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }
  });
};

// Legacy mock data for backward compatibility
export interface MockDamageAnalysis {
  id: string;
  damageType: string;
  confidence: number;
  description: string;
  damageDescription?: string;
  recommendations: string[];
  repairEstimate?: string;
  severity: 'low' | 'medium' | 'high';
  affectedParts: string[];
  possibleCauses: string[];
  additionalInfo?: Record<string, any>;
}

export const mockDamageAnalyses: MockDamageAnalysis[] = [
  {
    id: 'damage-001',
    damageType: 'Scratch',
    confidence: 0.95,
    description: 'Light surface scratches on the front bumper',
    damageDescription: 'Light surface scratches on the front bumper, paint not broken.',
    recommendations: ['Use a scratch repair kit for minor scratches'],
    repairEstimate: '$150 - $300',
    severity: 'low',
    affectedParts: ['Front Bumper'],
    possibleCauses: ['Parking contact', 'Road debris'],
    additionalInfo: { notes: 'Customer reported incident occurred in a tight parking spot.' }
  }
];

export const simulateAnalysisRequest = (imageUrl: string): Promise<MockDamageAnalysis> => {
  return new Promise((resolve) => {
    const delay = 1500 + Math.random() * 2000;
    setTimeout(() => {
      resolve({
        ...mockDamageAnalyses[0],
        id: `damage-${Date.now()}`
      });
    }, delay);
  });
};
