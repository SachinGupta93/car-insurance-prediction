// Enhanced Vehicle Identification Interface
export interface VehicleIdentification {
  make?: string;
  model?: string;
  year?: string;
  trimLevel?: string;
  bodyStyle?: string;
  engineSize?: string;
  fuelType?: string;
  marketSegment?: string;
  idvRange?: string;
  color?: string;
  confidence: number;
  identificationDetails?: string;
  fallbackRequired?: boolean;
}

// Enhanced Repair Cost Structure with Dual Currency
export interface RepairCostEstimate {
  conservative: CurrencyAmount;
  comprehensive: CurrencyAmount;
  premium?: CurrencyAmount;
  laborHours: string;
  breakdown: {
    parts: CurrencyAmount;
    labor: CurrencyAmount;
    materials?: CurrencyAmount;
  };
  serviceTypeComparison: {
    authorizedCenter: CurrencyAmount;
    multiBrandCenter: CurrencyAmount;
    localGarage: CurrencyAmount;
  };
  regionalVariations?: {
    metro: CurrencyAmount;
    tier1: CurrencyAmount;
    tier2: CurrencyAmount;
  };
}

// Dual Currency Amount Interface
export interface CurrencyAmount {
  rupees: string;
  dollars: string;
}

// Enhanced Insurance Provider Information
export interface InsuranceProvider {
  name: string;
  recommendation: 'PRIMARY' | 'SECONDARY' | 'AVOID';
  pros: string[];
  cons: string[];
  vehicleSpecificAdvantages?: string[];
  claimExperience: string;
  networkCoverage: string;
  digitalCapabilities: string;
  recommendedForVehicle?: boolean;
}

// Regional Insurance Insights
export interface RegionalInsuranceInsights {
  metroAdvantages: string[];
  tier2Considerations: string[];
  stateSpecificBenefits?: string[];
  regionalCostVariations: CurrencyAmount;
}

// Damage Region Interface for Visualization
export interface DamageRegion {
  id: string; // Unique identifier for the damage region
  x: number; // x-coordinate as percentage of image width (0-100)
  y: number; // y-coordinate as percentage of image height (0-100)
  width: number; // width as percentage of image width (0-100)
  height: number; // height as percentage of image height (0-100)
  damageType: string; // Type of damage (scratch, dent, crack, rust, etc.)
  severity: 'minor' | 'moderate' | 'severe' | 'critical'; // Severity level
  confidence: number; // AI confidence (0-1)
  damagePercentage: number; // Percentage of damage in this region (0-100)
  description: string; // Detailed description of the damage
  partName?: string; // Car part name (bumper, door, hood, etc.)
  estimatedCost?: number; // Estimated repair cost for this region
  color?: string; // Color for marking this region on the image
}

// Enhanced Damage Result with Indian Market Features
export interface DamageResult {
  damageType: string;
  confidence: number;
  description: string;
  damageDescription: string;
  repairEstimate?: string; // Keep for backward compatibility
  recommendations: string[];
  severity?: 'minor' | 'moderate' | 'severe' | 'critical'; // Add severity here
  
  // Enhanced Indian Market Features
  vehicleIdentification?: VehicleIdentification;
  enhancedRepairCost?: RepairCostEstimate;
  insuranceProviders?: InsuranceProvider[];
  regionalInsights?: RegionalInsuranceInsights;
  
  // Vehicle-Specific Insurance Advice
  insurance_advice?: VehicleInsuranceAdvice;
  insuranceRecommendations?: InsuranceRecommendations;
  
  marketAnalysis?: {
    currentValue: CurrencyAmount;
    depreciationImpact: string;
    resaleConsiderations: string[];
  };
  claimStrategy?: {
    recommended: 'CLAIM' | 'SELF_PAY' | 'CONDITIONAL';
    reasoning: string;
    timelineOptimization: string;
    documentationRequired: string[];
  };
  safetyAssessment?: {
    drivability: 'SAFE' | 'CAUTION' | 'UNSAFE';
    safetySystemImpacts: string[];
    recommendations: string[];
  };
  identifiedDamageRegions?: DamageRegion[]; // Added for visualizing specific damage areas
  regionAnalysis?: {
    totalRegions: number;
    severityDistribution: Record<string, number>;
    damageTypeDistribution: Record<string, number>;
    totalEstimatedCost: number;
    averageConfidence: number;
  };
  
  // Demo mode fields
  isDemoMode?: boolean;
  quotaExceeded?: boolean;
  retryDelaySeconds?: number;
}

// Interface for items stored in the analysis history (as returned by firebaseService.getAnalysisHistory)
export interface AnalysisHistoryItem {
  id: string;
  userId: string;
  imageUrl: string;
  // Minimal image storage fields
  imagePath?: string;       // Firebase Storage path to the original image
  thumbnailUrl?: string;    // Public URL (or signed) to a small thumbnail for fast lists
  thumbnailPath?: string;   // Storage path to the thumbnail
  analysisDate: string; // ISO date string
  damageDescription: string;
  repairEstimate?: string;
  damageType: string; // Top-level damage type for the analysis
  confidence: number;
  description: string;
  recommendations: string[];
  location?: string;
  severity?: 'minor' | 'moderate' | 'severe' | 'critical';
}

// Interface for items stored in the analysis history
export interface HistoricalAnalysis {
  id: string; // Unique ID for the history entry
  timestamp: string; // ISO string of when the analysis was done
  image: string; // Base64 encoded image or a URL to the image
  imageUrl?: string; // Alternative image URL field for compatibility
  // Minimal image storage fields
  imagePath?: string;       // Firebase Storage path for original image
  thumbnailUrl?: string;    // Small thumbnail URL for fast display
  thumbnailPath?: string;   // Storage path for thumbnail
  result: DamageResult; // The full damage analysis result
  userId?: string; // Optional: if you have user-specific history
  uploadedAt: string; // Added to match usage in Dashboard.tsx
  damageRegions?: DamageRegion[]; // Explicitly add here for easier access if needed, though ideally from result
  severity?: 'minor' | 'moderate' | 'severe' | 'critical'; // Add severity here
  
  // Additional properties for compatibility with components
  filename?: string; // File name for display
  analysisDate?: string; // Alias for timestamp for compatibility
  confidence?: number; // Confidence score from result
  damageType?: string; // Top-level damage type for compatibility
  repairEstimate?: string; // Repair cost estimate for compatibility
  description?: string; // Description for compatibility
  recommendations?: string[]; // Recommendations for compatibility
}

// This will be the type used in the Dashboard
export type UploadedImage = HistoricalAnalysis;

export interface RagResult {
  answer: string;
  sources: {
    title: string;
    content: string;
    url: string;
  }[];
}

export interface ApiResponse<T> {
  data: T | null;  // Allow data to be null
  error?: string;
  statusCode?: number;  // Add optional statusCode
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Vehicle-Specific Insurance Advice Interface
export interface VehicleInsuranceAdvice {
  vehicleSpecificAdvice?: string;
  ageConsiderations?: string;
  deductibleStrategy?: string;
  repairStrategy?: string;
  ncbConsiderations?: string;
  partsAvailability?: string;
  recommendedCoverage?: string[];
  estimatedPremium?: {
    range: string;
    annual: string;
    factors: string;
  };
}

// Enhanced Insurance Recommendations Interface
export interface InsuranceRecommendations {
  claimRecommendation: 'CLAIM_RECOMMENDED' | 'CLAIM_NOT_RECOMMENDED' | 'CONDITIONAL_CLAIM';
  reasoning: string;
  vehicleConsiderations?: string;
  netBenefit: string;
  deductible: string;
  brandFactor?: string;
  ageFactor?: string;
  isVehicleSpecific: boolean;
}