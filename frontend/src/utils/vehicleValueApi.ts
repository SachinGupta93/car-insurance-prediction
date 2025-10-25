/**
 * Vehicle Value Estimation API Integration
 * Provides accurate vehicle pricing using multiple data sources
 */

import { DamageResult } from '../types';

// Vehicle value estimation interfaces
export interface VehicleDetails {
  make: string;
  model: string;
  year: number;
  variant?: string;
  fuelType?: 'Petrol' | 'Diesel' | 'CNG' | 'Electric' | 'Hybrid';
  transmission?: 'Manual' | 'Automatic' | 'CVT' | 'AMT';
  kmDriven?: number;
  location?: string;
  registrationState?: string;
  owners?: number;
  condition?: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

export interface VehicleValuation {
  source: string;
  currentMarketValue: number;
  originalPrice?: number;
  depreciation: {
    amount: number;
    percentage: number;
    reason: string;
  };
  priceRange: {
    min: number;
    max: number;
  };
  confidence: number;
  factors: {
    age: number;
    mileage: number;
    condition: number;
    location: number;
    ownership: number;
  };
  marketTrends: {
    demand: 'High' | 'Medium' | 'Low';
    supply: 'High' | 'Medium' | 'Low';
    priceDirection: 'Rising' | 'Stable' | 'Declining';
  };
  recommendations: string[];
  insuranceIdv?: number;
  lastUpdated: Date;
}

export interface VehicleComparisonReport {
  vehicleDetails: VehicleDetails;
  valuations: VehicleValuation[];
  averageValue: number;
  recommendedValue: number;
  postDamageValue?: number;
  summary: {
    highest: VehicleValuation;
    lowest: VehicleValuation;
    mostReliable: VehicleValuation;
  };
  marketInsights: {
    averageDepreciation: number;
    marketPosition: 'Above Average' | 'Average' | 'Below Average';
    resaleProspects: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  };
  generatedAt: Date;
}

// Mock vehicle database with comprehensive pricing data
const mockVehicleDatabase: Record<string, Record<string, Record<number, { price: number; depreciation: number }>>> = {
  'Maruti Suzuki': {
    'Swift': {
      2023: { price: 650000, depreciation: 5 },
      2022: { price: 600000, depreciation: 12 },
      2021: { price: 550000, depreciation: 18 },
      2020: { price: 500000, depreciation: 25 },
      2019: { price: 450000, depreciation: 32 },
      2018: { price: 400000, depreciation: 40 },
    },
    'Baleno': {
      2023: { price: 750000, depreciation: 5 },
      2022: { price: 700000, depreciation: 12 },
      2021: { price: 650000, depreciation: 18 },
      2020: { price: 600000, depreciation: 25 },
      2019: { price: 550000, depreciation: 32 },
    },
    'Alto': {
      2023: { price: 450000, depreciation: 8 },
      2022: { price: 420000, depreciation: 15 },
      2021: { price: 380000, depreciation: 22 },
      2020: { price: 350000, depreciation: 28 },
    }
  },
  'Hyundai': {
    'i20': {
      2023: { price: 800000, depreciation: 6 },
      2022: { price: 750000, depreciation: 13 },
      2021: { price: 700000, depreciation: 19 },
      2020: { price: 650000, depreciation: 26 },
      2019: { price: 600000, depreciation: 33 },
    },
    'Creta': {
      2023: { price: 1400000, depreciation: 4 },
      2022: { price: 1300000, depreciation: 11 },
      2021: { price: 1200000, depreciation: 17 },
      2020: { price: 1100000, depreciation: 24 },
    },
    'Verna': {
      2023: { price: 1200000, depreciation: 5 },
      2022: { price: 1100000, depreciation: 12 },
      2021: { price: 1000000, depreciation: 18 },
    }
  },
  'Honda': {
    'City': {
      2023: { price: 1300000, depreciation: 5 },
      2022: { price: 1200000, depreciation: 12 },
      2021: { price: 1100000, depreciation: 18 },
      2020: { price: 1000000, depreciation: 25 },
    },
    'Civic': {
      2023: { price: 2200000, depreciation: 6 },
      2022: { price: 2000000, depreciation: 13 },
      2021: { price: 1800000, depreciation: 20 },
    },
    'Amaze': {
      2023: { price: 800000, depreciation: 7 },
      2022: { price: 750000, depreciation: 14 },
      2021: { price: 700000, depreciation: 21 },
    }
  },
  'Toyota': {
    'Innova Crysta': {
      2023: { price: 2000000, depreciation: 4 },
      2022: { price: 1900000, depreciation: 10 },
      2021: { price: 1800000, depreciation: 16 },
      2020: { price: 1700000, depreciation: 22 },
    },
    'Fortuner': {
      2023: { price: 3500000, depreciation: 3 },
      2022: { price: 3300000, depreciation: 9 },
      2021: { price: 3100000, depreciation: 15 },
    },
    'Etios': {
      2022: { price: 700000, depreciation: 15 },
      2021: { price: 650000, depreciation: 22 },
      2020: { price: 600000, depreciation: 28 },
    }
  },
  'Tata': {
    'Nexon': {
      2023: { price: 1200000, depreciation: 6 },
      2022: { price: 1100000, depreciation: 13 },
      2021: { price: 1000000, depreciation: 19 },
      2020: { price: 900000, depreciation: 26 },
    },
    'Harrier': {
      2023: { price: 1800000, depreciation: 5 },
      2022: { price: 1700000, depreciation: 12 },
      2021: { price: 1600000, depreciation: 18 },
    },
    'Tiago': {
      2023: { price: 600000, depreciation: 8 },
      2022: { price: 550000, depreciation: 15 },
      2021: { price: 500000, depreciation: 22 },
    }
  }
};

// CarWale API Integration (Mock)
const getCarWaleValuation = async (vehicleDetails: VehicleDetails): Promise<VehicleValuation | null> => {
  try {
    const vehicleData = mockVehicleDatabase[vehicleDetails.make]?.[vehicleDetails.model]?.[vehicleDetails.year];
    
    if (!vehicleData) {
      return null;
    }

    const basePrice = vehicleData.price;
    const depreciationRate = vehicleData.depreciation;

    // Apply additional factors
    let adjustedPrice = basePrice * (1 - depreciationRate / 100);
    
    // Mileage adjustment
    if (vehicleDetails.kmDriven) {
      const mileageFactors = {
        low: vehicleDetails.kmDriven < 30000 ? 1.05 : 1,
        medium: vehicleDetails.kmDriven < 60000 ? 1 : 0.95,
        high: vehicleDetails.kmDriven >= 60000 ? 0.9 : 1
      };
      
      if (vehicleDetails.kmDriven < 30000) adjustedPrice *= 1.05;
      else if (vehicleDetails.kmDriven > 60000) adjustedPrice *= 0.9;
    }

    // Condition adjustment
    const conditionMultipliers = {
      'Excellent': 1.1,
      'Good': 1.0,
      'Fair': 0.9,
      'Poor': 0.75
    };
    
    if (vehicleDetails.condition) {
      adjustedPrice *= conditionMultipliers[vehicleDetails.condition];
    }

    // Ownership adjustment
    if (vehicleDetails.owners && vehicleDetails.owners > 1) {
      adjustedPrice *= Math.pow(0.95, vehicleDetails.owners - 1);
    }

    return {
      source: 'CarWale',
      currentMarketValue: Math.round(adjustedPrice),
      originalPrice: basePrice,
      depreciation: {
        amount: basePrice - adjustedPrice,
        percentage: ((basePrice - adjustedPrice) / basePrice) * 100,
        reason: `Age-based depreciation and condition factors`
      },
      priceRange: {
        min: Math.round(adjustedPrice * 0.9),
        max: Math.round(adjustedPrice * 1.1)
      },
      confidence: 85,
      factors: {
        age: vehicleDetails.year < 2020 ? -15 : vehicleDetails.year < 2022 ? -8 : -3,
        mileage: vehicleDetails.kmDriven ? (vehicleDetails.kmDriven > 60000 ? -10 : vehicleDetails.kmDriven < 30000 ? 5 : 0) : 0,
        condition: vehicleDetails.condition === 'Excellent' ? 10 : vehicleDetails.condition === 'Poor' ? -25 : 0,
        location: 0, // Regional variations not implemented in mock
        ownership: vehicleDetails.owners ? Math.max(-15, (vehicleDetails.owners - 1) * -5) : 0
      },
      marketTrends: {
        demand: 'Medium',
        supply: 'Medium',
        priceDirection: 'Stable'
      },
      recommendations: [
        'Vehicle shows good market position',
        'Consider timing of sale for better returns',
        'Regular maintenance helps retain value'
      ],
      insuranceIdv: Math.round(adjustedPrice * 0.95),
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('CarWale API error:', error);
    return null;
  }
};

// Droom API Integration (Mock)
const getDroomValuation = async (vehicleDetails: VehicleDetails): Promise<VehicleValuation | null> => {
  try {
    const vehicleData = mockVehicleDatabase[vehicleDetails.make]?.[vehicleDetails.model]?.[vehicleDetails.year];
    
    if (!vehicleData) {
      return null;
    }

    const basePrice = vehicleData.price;
    let adjustedPrice = basePrice * (1 - vehicleData.depreciation / 100);

    // Droom typically gives slightly lower valuations
    adjustedPrice *= 0.95;

    // Apply fuel type adjustment
    const fuelAdjustments = {
      'Petrol': 1.0,
      'Diesel': 1.05,
      'CNG': 0.98,
      'Electric': 1.1,
      'Hybrid': 1.08
    };

    if (vehicleDetails.fuelType) {
      adjustedPrice *= fuelAdjustments[vehicleDetails.fuelType];
    }

    // Transmission adjustment
    if (vehicleDetails.transmission === 'Automatic') {
      adjustedPrice *= 1.05;
    }

    return {
      source: 'Droom',
      currentMarketValue: Math.round(adjustedPrice),
      originalPrice: basePrice,
      depreciation: {
        amount: basePrice - adjustedPrice,
        percentage: ((basePrice - adjustedPrice) / basePrice) * 100,
        reason: `Market-based depreciation with fuel and transmission factors`
      },
      priceRange: {
        min: Math.round(adjustedPrice * 0.85),
        max: Math.round(adjustedPrice * 1.05)
      },
      confidence: 80,
      factors: {
        age: vehicleDetails.year < 2020 ? -18 : vehicleDetails.year < 2022 ? -10 : -5,
        mileage: vehicleDetails.kmDriven ? (vehicleDetails.kmDriven > 80000 ? -15 : vehicleDetails.kmDriven < 20000 ? 8 : 0) : 0,
        condition: vehicleDetails.condition === 'Excellent' ? 8 : vehicleDetails.condition === 'Poor' ? -30 : 0,
        location: 0,
        ownership: vehicleDetails.owners ? Math.max(-20, (vehicleDetails.owners - 1) * -7) : 0
      },
      marketTrends: {
        demand: 'Medium',
        supply: 'High',
        priceDirection: 'Declining'
      },
      recommendations: [
        'Quick sale recommended in current market',
        'Price competitively for faster sale',
        'Consider certified pre-owned programs'
      ],
      insuranceIdv: Math.round(adjustedPrice * 0.9),
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('Droom API error:', error);
    return null;
  }
};

// Cars24 API Integration (Mock)
const getCars24Valuation = async (vehicleDetails: VehicleDetails): Promise<VehicleValuation | null> => {
  try {
    const vehicleData = mockVehicleDatabase[vehicleDetails.make]?.[vehicleDetails.model]?.[vehicleDetails.year];
    
    if (!vehicleData) {
      return null;
    }

    const basePrice = vehicleData.price;
    let adjustedPrice = basePrice * (1 - vehicleData.depreciation / 100);

    // Cars24 instant buying model - typically 10-15% below market
    adjustedPrice *= 0.88;

    // Location-based adjustment (mock)
    const locationMultipliers: Record<string, number> = {
      'Mumbai': 1.05,
      'Delhi': 1.03,
      'Bangalore': 1.02,
      'Chennai': 1.0,
      'Pune': 0.98,
      'Hyderabad': 0.97
    };

    if (vehicleDetails.location && locationMultipliers[vehicleDetails.location]) {
      adjustedPrice *= locationMultipliers[vehicleDetails.location];
    }

    return {
      source: 'Cars24',
      currentMarketValue: Math.round(adjustedPrice),
      originalPrice: basePrice,
      depreciation: {
        amount: basePrice - adjustedPrice,
        percentage: ((basePrice - adjustedPrice) / basePrice) * 100,
        reason: `Instant sale valuation with location factors`
      },
      priceRange: {
        min: Math.round(adjustedPrice * 0.95),
        max: Math.round(adjustedPrice * 1.02)
      },
      confidence: 90,
      factors: {
        age: vehicleDetails.year < 2020 ? -20 : vehicleDetails.year < 2022 ? -12 : -6,
        mileage: vehicleDetails.kmDriven ? (vehicleDetails.kmDriven > 70000 ? -12 : vehicleDetails.kmDriven < 25000 ? 6 : 0) : 0,
        condition: vehicleDetails.condition === 'Excellent' ? 5 : vehicleDetails.condition === 'Poor' ? -35 : 0,
        location: vehicleDetails.location === 'Mumbai' ? 5 : vehicleDetails.location === 'Delhi' ? 3 : -2,
        ownership: vehicleDetails.owners ? Math.max(-25, (vehicleDetails.owners - 1) * -8) : 0
      },
      marketTrends: {
        demand: 'High',
        supply: 'Medium',
        priceDirection: 'Stable'
      },
      recommendations: [
        'Instant sale option available',
        'No paperwork hassles',
        'Immediate payment guarantee'
      ],
      insuranceIdv: Math.round(adjustedPrice * 0.85),
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('Cars24 API error:', error);
    return null;
  }
};

// Main vehicle valuation function
export const getVehicleValuation = async (
  vehicleDetails: VehicleDetails,
  damageResult?: DamageResult
): Promise<VehicleComparisonReport | null> => {
  try {
    // Get valuations from multiple sources
    const [carWaleVal, droomVal, cars24Val] = await Promise.all([
      getCarWaleValuation(vehicleDetails),
      getDroomValuation(vehicleDetails),
      getCars24Valuation(vehicleDetails)
    ]);

    const validValuations = [carWaleVal, droomVal, cars24Val].filter(Boolean) as VehicleValuation[];

    if (validValuations.length === 0) {
      return null;
    }

    // Calculate average and recommended values
    const values = validValuations.map(v => v.currentMarketValue);
    const averageValue = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Recommended value is weighted average with higher confidence sources
    const weightedSum = validValuations.reduce((sum, val) => sum + (val.currentMarketValue * val.confidence), 0);
    const totalWeight = validValuations.reduce((sum, val) => sum + val.confidence, 0);
    const recommendedValue = weightedSum / totalWeight;

    // Calculate post-damage value if damage analysis is available
    let postDamageValue: number | undefined;
    if (damageResult) {
      const damageDepreciation = calculateDamageDepreciation(damageResult);
      postDamageValue = recommendedValue * (1 - damageDepreciation / 100);
    }

    // Find highest, lowest, and most reliable valuations
    const highest = validValuations.reduce((prev, current) => 
      current.currentMarketValue > prev.currentMarketValue ? current : prev
    );
    
    const lowest = validValuations.reduce((prev, current) => 
      current.currentMarketValue < prev.currentMarketValue ? current : prev
    );
    
    const mostReliable = validValuations.reduce((prev, current) => 
      current.confidence > prev.confidence ? current : prev
    );

    // Calculate market insights
    const currentYear = new Date().getFullYear();
    const vehicleAge = currentYear - vehicleDetails.year;
    const averageDepreciation = validValuations.reduce((sum, val) => sum + val.depreciation.percentage, 0) / validValuations.length;
    
    const standardDepreciation = vehicleAge * 10; // Rough standard: 10% per year
    const marketPosition = averageDepreciation < standardDepreciation - 5 ? 'Above Average' :
                          averageDepreciation > standardDepreciation + 5 ? 'Below Average' : 'Average';
    
    const resaleProspects = vehicleAge < 3 ? 'Excellent' :
                           vehicleAge < 6 ? 'Good' :
                           vehicleAge < 10 ? 'Fair' : 'Poor';

    return {
      vehicleDetails,
      valuations: validValuations,
      averageValue: Math.round(averageValue),
      recommendedValue: Math.round(recommendedValue),
      postDamageValue: postDamageValue ? Math.round(postDamageValue) : undefined,
      summary: {
        highest,
        lowest,
        mostReliable
      },
      marketInsights: {
        averageDepreciation: Math.round(averageDepreciation),
        marketPosition,
        resaleProspects
      },
      generatedAt: new Date()
    };
  } catch (error) {
    console.error('Vehicle valuation error:', error);
    return null;
  }
};

// Calculate damage-based depreciation
const calculateDamageDepreciation = (damageResult: DamageResult): number => {
  // Base depreciation based on damage severity
  const severityDepreciation: Record<string, number> = {
    'minor': 5,
    'moderate': 15,
    'severe': 30,
    'critical': 50
  };

  let totalDepreciation = 10; // Default depreciation
  
  if (damageResult.severity) {
    totalDepreciation = severityDepreciation[damageResult.severity] || 10;
  }

  // Add depreciation based on damage types from description
  const damageTypeDepreciation: Record<string, number> = {
    'dent': 2,
    'scratch': 1,
    'crack': 3,
    'broken': 5,
    'shattered': 8,
    'rust': 4,
    'collision': 10,
    'frame damage': 20
  };

  // Check damage description for keywords
  const description = (damageResult.description + ' ' + damageResult.damageDescription).toLowerCase();
  Object.keys(damageTypeDepreciation).forEach(type => {
    if (description.includes(type)) {
      totalDepreciation += damageTypeDepreciation[type];
    }
  });

  // Consider repair cost from enhanced repair cost if available
  if (damageResult.enhancedRepairCost?.comprehensive?.rupees) {
    const repairCostStr = damageResult.enhancedRepairCost.comprehensive.rupees.replace(/[₹,]/g, '');
    const repairCost = parseInt(repairCostStr) || 0;
    if (repairCost > 0) {
      // Assume vehicle value around 1000000 for calculation (will be adjusted in real scenario)
      const costPercentage = (repairCost / 1000000) * 100;
      totalDepreciation += Math.min(costPercentage, 25); // Cap at 25%
    }
  }

  return Math.min(totalDepreciation, 50); // Cap total depreciation at 50%
};

// Insurance IDV calculation helper
export const calculateInsuranceIDV = (vehicleDetails: VehicleDetails): Promise<number> => {
  return getVehicleValuation(vehicleDetails).then(report => {
    if (!report) return 0;
    
    // IDV is typically 90-95% of market value
    const baseIDV = report.recommendedValue * 0.92;
    
    // Apply age-based additional depreciation for insurance
    const currentYear = new Date().getFullYear();
    const age = currentYear - vehicleDetails.year;
    
    const insuranceDepreciation = age <= 6 ? age * 5 : 30; // Max 30% depreciation
    return Math.round(baseIDV * (1 - insuranceDepreciation / 100));
  });
};

// Get regional price variations
export const getRegionalPriceVariation = (location: string): number => {
  const regionMultipliers: Record<string, number> = {
    // Metro cities
    'Mumbai': 1.08,
    'Delhi': 1.06,
    'Bangalore': 1.05,
    'Chennai': 1.03,
    'Kolkata': 1.02,
    'Hyderabad': 1.04,
    'Pune': 1.02,
    
    // Tier 2 cities
    'Ahmedabad': 1.0,
    'Surat': 0.98,
    'Jaipur': 0.97,
    'Lucknow': 0.96,
    'Kanpur': 0.95,
    'Nagpur': 0.97,
    'Indore': 0.96,
    'Coimbatore': 0.98,
    
    // Others
    'Other': 0.94
  };
  
  return regionMultipliers[location] || regionMultipliers['Other'];
};