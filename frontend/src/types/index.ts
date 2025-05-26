// Enhanced Vehicle Identification Interface
export interface VehicleIdentification {
  make?: string;
  model?: string;
  year?: string;
  trimLevel?: string;
  bodyStyle?: string;
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
  x: number; // x-coordinate as percentage of image width
  y: number; // y-coordinate as percentage of image height
  width: number; // width as percentage of image width
  height: number; // height as percentage of image height
  damageType: string;
  confidence: number;
}

// Enhanced Damage Result with Indian Market Features
export interface DamageResult {
  damageType: string;
  confidence: number;
  description: string;
  damageDescription: string;
  repairEstimate?: string; // Keep for backward compatibility
  recommendations: string[];
  
  // Enhanced Indian Market Features
  vehicleIdentification?: VehicleIdentification;
  enhancedRepairCost?: RepairCostEstimate;
  insuranceProviders?: InsuranceProvider[];
  regionalInsights?: RegionalInsuranceInsights;
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
}

// Interface for items stored in the analysis history
export interface HistoricalAnalysis {
  id: string; // Unique ID for the history entry
  timestamp: string; // ISO string of when the analysis was done
  image: string; // Base64 encoded image or a URL to the image
  result: DamageResult; // The full damage analysis result
  userId?: string; // Optional: if you have user-specific history
}

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