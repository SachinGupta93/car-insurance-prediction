// Sample mock data for car damage analysis results
// This can be used during development and testing before the backend is fully integrated

export interface MockDamageAnalysis {
  id: string;
  damageType: string;
  confidence: number;
  description: string;
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
    recommendations: [
      'Use a scratch repair kit for minor scratches',
      'Consider professional paint touch-up for deeper scratches',
      'Protect the area from further damage with a clear film'
    ],
    repairEstimate: '$150 - $300',
    severity: 'low',
    affectedParts: ['Front Bumper'],
    possibleCauses: ['Parking contact', 'Road debris']
  },
  {
    id: 'damage-002',
    damageType: 'Dent',
    confidence: 0.89,
    description: 'Medium-sized dent on rear passenger door',
    recommendations: [
      'Visit a professional dent repair service',
      'Consider paintless dent removal if paint is intact',
      'Check for any paint damage requiring touch-up'
    ],
    repairEstimate: '$250 - $500',
    severity: 'medium',
    affectedParts: ['Rear Passenger Door'],
    possibleCauses: ['Parking incident', 'Shopping cart collision']
  },
  {
    id: 'damage-003',
    damageType: 'Broken Headlight',
    confidence: 0.97,
    description: 'Completely shattered driver-side headlight assembly',
    recommendations: [
      'Replace entire headlight assembly',
      'Check for any electrical damage',
      'Verify surrounding panels for additional damage'
    ],
    repairEstimate: '$350 - $700',
    severity: 'high',
    affectedParts: ['Driver-side Headlight', 'Front Bumper'],
    possibleCauses: ['Collision', 'Road debris impact']
  },
  {
    id: 'damage-004',
    damageType: 'Glass Damage',
    confidence: 0.94,
    description: 'Cracked windshield with spread starting from passenger side',
    recommendations: [
      'Replace windshield completely',
      'Do not drive with severely compromised windshield',
      'Check with insurance as glass damage might be covered'
    ],
    repairEstimate: '$400 - $1,000',
    severity: 'high',
    affectedParts: ['Windshield'],
    possibleCauses: ['Rock impact', 'Temperature stress', 'Manufacturing defect']
  },
  {
    id: 'damage-005',
    damageType: 'Paint Chip',
    confidence: 0.91,
    description: 'Multiple small paint chips on hood',
    recommendations: [
      'Use touch-up paint to prevent rust',
      'Consider clear coat application after repair',
      'Inspect for underlying metal damage'
    ],
    repairEstimate: '$100 - $200',
    severity: 'low',
    affectedParts: ['Hood'],
    possibleCauses: ['Road debris', 'Gravel', 'Normal wear']
  },
  {
    id: 'damage-006',
    damageType: 'Severe Collision Damage',
    confidence: 0.98,
    description: 'Major structural damage to front end',
    recommendations: [
      'Contact insurance immediately',
      'Have vehicle transported to certified repair facility',
      'Request comprehensive inspection for hidden damage'
    ],
    repairEstimate: '$3,000 - $8,000',
    severity: 'high',
    affectedParts: ['Front Bumper', 'Hood', 'Radiator', 'Frame'],
    possibleCauses: ['Front-end collision']
  }
];

/**
 * Returns a random mock damage analysis for testing purposes
 */
export const getRandomDamageAnalysis = (): MockDamageAnalysis => {
  const randomIndex = Math.floor(Math.random() * mockDamageAnalyses.length);
  return mockDamageAnalyses[randomIndex];
};

/**
 * Simulates an API call to analyze damage with a delay
 */
export const simulateAnalysisRequest = (imageUrl: string): Promise<MockDamageAnalysis> => {
  return new Promise((resolve) => {
    // Simulate network delay
    const delay = 1500 + Math.random() * 2000; // 1.5 to 3.5 seconds
    
    setTimeout(() => {
      const analysis = getRandomDamageAnalysis();
      resolve({
        ...analysis,
        id: `damage-${Date.now()}` // Generate unique ID
      });
    }, delay);
  });
};

export default mockDamageAnalyses;