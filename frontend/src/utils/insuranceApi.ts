/**
 * Insurance Provider API Integration utilities
 * Handles communication with various insurance provider APIs
 */

import { DamageResult } from '@/types';

// Insurance provider interfaces
export interface InsuranceProvider {
  id: string;
  name: string;
  logo?: string;
  apiEndpoint?: string;
  supportedRegions: string[];
  claimTypes: string[];
  maxClaimAmount?: number;
  processingTime: string;
  digitalClaim: boolean;
  contactInfo: {
    phone?: string;
    email?: string;
    website?: string;
  };
}

export interface ClaimRequest {
  policyNumber?: string;
  vehicleInfo: {
    make?: string;
    model?: string;
    year?: string;
    registrationNumber?: string;
    vin?: string;
  };
  incidentDetails: {
    date: string;
    location: string;
    description: string;
    policeReport?: boolean;
    witnesses?: string[];
  };
  damageAssessment: {
    estimatedCost: number;
    damageRegions: Array<{
      part: string;
      severity: string;
      cost: number;
    }>;
    images: string[];
  };
  claimantInfo: {
    name: string;
    phone: string;
    email: string;
    address?: string;
  };
}

export interface ClaimResponse {
  claimId: string;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'requires_additional_info';
  estimatedProcessingTime: string;
  nextSteps: string[];
  requiredDocuments?: string[];
  contactPerson?: {
    name: string;
    phone: string;
    email: string;
  };
  trackingUrl?: string;
}

export interface QuoteRequest {
  vehicleInfo: {
    make?: string;
    model?: string;
    year?: string;
    variant?: string;
    registrationNumber?: string;
  };
  ownerInfo: {
    name: string;
    age: number;
    location: string;
    drivingExperience: number;
  };
  coverageType: 'comprehensive' | 'third_party' | 'zero_depreciation';
  addons?: string[];
}

export interface InsuranceQuote {
  providerId: string;
  providerName: string;
  premium: {
    annual: number;
    monthly?: number;
    quarterly?: number;
  };
  coverage: {
    idv: number; // Insured Declared Value
    thirdPartyLimit: number;
    personalAccident: number;
  };
  addons: Array<{
    name: string;
    cost: number;
    description: string;
  }>;
  discount: {
    amount: number;
    reasons: string[];
  };
  validity: string;
  features: string[];
  claimsProcess: {
    steps: string[];
    averageSettlementTime: string;
    cashlessGarages: number;
  };
}

// Mock insurance providers (In real implementation, these would come from actual APIs)
const mockInsuranceProviders: InsuranceProvider[] = [
  {
    id: 'icici_lombard',
    name: 'ICICI Lombard',
    supportedRegions: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad'],
    claimTypes: ['Accident', 'Theft', 'Natural Disaster', 'Vandalism'],
    maxClaimAmount: 5000000,
    processingTime: '7-10 business days',
    digitalClaim: true,
    contactInfo: {
      phone: '1800-2666',
      email: 'support@icicilombard.com',
      website: 'https://www.icicilombard.com'
    }
  },
  {
    id: 'bajaj_allianz',
    name: 'Bajaj Allianz',
    supportedRegions: ['Pan India'],
    claimTypes: ['Accident', 'Theft', 'Fire', 'Natural Disaster'],
    maxClaimAmount: 10000000,
    processingTime: '5-7 business days',
    digitalClaim: true,
    contactInfo: {
      phone: '1800-209-5858',
      email: 'bagicservice@bajajallianz.co.in',
      website: 'https://www.bajajallianz.com'
    }
  },
  {
    id: 'hdfc_ergo',
    name: 'HDFC ERGO',
    supportedRegions: ['Mumbai', 'Delhi', 'Pune', 'Bangalore', 'Chennai'],
    claimTypes: ['Accident', 'Theft', 'Flood', 'Fire'],
    maxClaimAmount: 7500000,
    processingTime: '6-8 business days',
    digitalClaim: true,
    contactInfo: {
      phone: '1800-2700-700',
      email: 'customercare@hdfcergo.com',
      website: 'https://www.hdfcergo.com'
    }
  },
  {
    id: 'tata_aig',
    name: 'Tata AIG',
    supportedRegions: ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune'],
    claimTypes: ['Accident', 'Theft', 'Natural Calamity'],
    maxClaimAmount: 6000000,
    processingTime: '8-12 business days',
    digitalClaim: true,
    contactInfo: {
      phone: '1800-266-7780',
      email: 'customer.care@tataaig.com',
      website: 'https://www.tataaig.com'
    }
  },
  {
    id: 'new_india_assurance',
    name: 'New India Assurance',
    supportedRegions: ['Pan India'],
    claimTypes: ['Accident', 'Theft', 'Fire', 'Flood', 'Riot'],
    maxClaimAmount: 15000000,
    processingTime: '10-15 business days',
    digitalClaim: false,
    contactInfo: {
      phone: '1800-209-1415',
      email: 'customercare@newindia.co.in',
      website: 'https://www.newindia.co.in'
    }
  }
];

/**
 * Get list of available insurance providers
 */
export const getInsuranceProviders = async (region?: string): Promise<InsuranceProvider[]> => {
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let providers = mockInsuranceProviders;
    
    if (region) {
      providers = providers.filter(provider => 
        provider.supportedRegions.includes(region) || 
        provider.supportedRegions.includes('Pan India')
      );
    }
    
    return providers;
  } catch (error) {
    console.error('Error fetching insurance providers:', error);
    throw new Error('Failed to fetch insurance providers');
  }
};

/**
 * Submit insurance claim to provider
 */
export const submitInsuranceClaim = async (
  providerId: string,
  claimRequest: ClaimRequest
): Promise<ClaimResponse> => {
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const provider = mockInsuranceProviders.find(p => p.id === providerId);
    if (!provider) {
      throw new Error('Insurance provider not found');
    }

    // Mock response based on provider
    const claimId = `CLM-${providerId.toUpperCase()}-${Date.now()}`;
    
    const mockResponse: ClaimResponse = {
      claimId,
      status: 'submitted',
      estimatedProcessingTime: provider.processingTime,
      nextSteps: [
        'Your claim has been successfully submitted',
        'A claims adjuster will contact you within 24-48 hours',
        'Please keep all relevant documents ready',
        provider.digitalClaim ? 'Track your claim status online' : 'Visit nearest branch for updates'
      ],
      requiredDocuments: [
        'Vehicle Registration Copy',
        'Driving License Copy',
        'Insurance Policy Copy',
        'Police FIR (if applicable)',
        'Damage Assessment Report',
        'Repair Estimates (minimum 2)'
      ],
      contactPerson: {
        name: 'Claims Department',
        phone: provider.contactInfo.phone || '',
        email: provider.contactInfo.email || ''
      },
      trackingUrl: provider.digitalClaim ? `${provider.contactInfo.website}/track-claim?id=${claimId}` : undefined
    };

    return mockResponse;
  } catch (error) {
    console.error('Error submitting insurance claim:', error);
    throw new Error('Failed to submit insurance claim');
  }
};

/**
 * Get insurance quotes from multiple providers
 */
export const getInsuranceQuotes = async (
  quoteRequest: QuoteRequest,
  region?: string
): Promise<InsuranceQuote[]> => {
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const providers = await getInsuranceProviders(region);
    
    // Generate mock quotes
    const quotes: InsuranceQuote[] = providers.map(provider => {
      const basePrice = Math.random() * 20000 + 15000; // Random base price between 15k-35k
      const idv = quoteRequest.vehicleInfo.year ? 
        Math.max(100000, 800000 - (2024 - parseInt(quoteRequest.vehicleInfo.year)) * 50000) : 
        500000;
      
      const discount = Math.random() * 0.15 + 0.05; // 5-20% discount
      const discountAmount = basePrice * discount;
      
      return {
        providerId: provider.id,
        providerName: provider.name,
        premium: {
          annual: Math.round(basePrice - discountAmount),
          monthly: Math.round((basePrice - discountAmount) / 12),
          quarterly: Math.round((basePrice - discountAmount) / 4)
        },
        coverage: {
          idv,
          thirdPartyLimit: 750000,
          personalAccident: 1500000
        },
        addons: [
          { name: 'Zero Depreciation', cost: Math.round(basePrice * 0.15), description: 'No depreciation on claims' },
          { name: 'Engine Protection', cost: Math.round(basePrice * 0.08), description: 'Coverage for engine damage' },
          { name: 'Road Side Assistance', cost: Math.round(basePrice * 0.03), description: '24x7 roadside help' }
        ],
        discount: {
          amount: Math.round(discountAmount),
          reasons: ['Online Purchase Discount', 'No Claim Bonus', 'Safe Driver Discount']
        },
        validity: '365 days',
        features: [
          'Cashless Claims',
          'Online Policy Management',
          '24x7 Customer Support',
          provider.digitalClaim ? 'Digital Claim Process' : 'Traditional Claim Process'
        ],
        claimsProcess: {
          steps: [
            'Report incident immediately',
            'Submit required documents',
            'Damage assessment by surveyor',
            'Claim approval and settlement'
          ],
          averageSettlementTime: provider.processingTime,
          cashlessGarages: Math.floor(Math.random() * 5000) + 1000
        }
      };
    });

    return quotes.sort((a, b) => a.premium.annual - b.premium.annual);
  } catch (error) {
    console.error('Error getting insurance quotes:', error);
    throw new Error('Failed to get insurance quotes');
  }
};

/**
 * Check claim status
 */
export const checkClaimStatus = async (
  providerId: string,
  claimId: string
): Promise<{ status: string; lastUpdated: string; notes: string[] }> => {
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const statuses = ['submitted', 'under_review', 'approved', 'requires_additional_info'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
      status: randomStatus,
      lastUpdated: new Date().toISOString(),
      notes: [
        'Claim received and logged in system',
        'Initial document verification completed',
        randomStatus === 'requires_additional_info' ? 'Additional documents required' : 'All documents verified',
        randomStatus === 'approved' ? 'Claim approved for settlement' : 'Under review by claims team'
      ]
    };
  } catch (error) {
    console.error('Error checking claim status:', error);
    throw new Error('Failed to check claim status');
  }
};

/**
 * Get recommended insurance providers based on damage analysis
 */
export const getRecommendedProviders = async (
  analysisResult: DamageResult,
  region?: string
): Promise<{
  provider: InsuranceProvider;
  suitabilityScore: number;
  reasons: string[];
}[]> => {
  try {
    const providers = await getInsuranceProviders(region);
    const totalCost = calculateTotalRepairCost(analysisResult);
    
    const recommendations = providers.map(provider => {
      let score = 50; // Base score
      const reasons: string[] = [];
      
      // Score based on max claim amount
      if (provider.maxClaimAmount && totalCost <= provider.maxClaimAmount) {
        score += 20;
        reasons.push('Covers estimated repair cost');
      }
      
      // Score based on digital claim support
      if (provider.digitalClaim) {
        score += 15;
        reasons.push('Digital claim process available');
      }
      
      // Score based on processing time
      const processingDays = parseInt(provider.processingTime.split('-')[0]);
      if (processingDays <= 7) {
        score += 15;
        reasons.push('Fast claim processing');
      }
      
      // Score based on region support
      if (region && provider.supportedRegions.includes(region)) {
        score += 10;
        reasons.push('Strong presence in your region');
      }
      
      return {
        provider,
        suitabilityScore: Math.min(100, score),
        reasons
      };
    });
    
    return recommendations.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  } catch (error) {
    console.error('Error getting provider recommendations:', error);
    throw new Error('Failed to get provider recommendations');
  }
};

/**
 * Helper function to calculate total repair cost
 */
const calculateTotalRepairCost = (analysisResult: DamageResult): number => {
  const costSummary = (analysisResult as any).enhancedRepairCost || (analysisResult as any).comprehensiveCostSummary;
  
  if (costSummary) {
    return (costSummary.laborCost || costSummary.labor || 0) +
           (costSummary.partsCost || costSummary.parts || 0) +
           (costSummary.paintCost || costSummary.paint || 0) +
           (costSummary.otherCosts || costSummary.miscellaneous || 0);
  }
  
  // Fallback to sum of individual region costs
  return (analysisResult.identifiedDamageRegions || [])
    .reduce((total, region) => total + (region.estimatedCost || 0), 0);
};

/**
 * Format damage analysis for insurance claim
 */
export const formatDamageForClaim = (analysisResult: DamageResult): ClaimRequest['damageAssessment'] => {
  const totalCost = calculateTotalRepairCost(analysisResult);
  
  return {
    estimatedCost: totalCost,
    damageRegions: (analysisResult.identifiedDamageRegions || []).map(region => ({
      part: region.partName || 'Unknown Part',
      severity: region.severity,
      cost: region.estimatedCost || 0
    })),
    images: [] // Would be populated with actual image URLs
  };
};

/**
 * Insurance API integration utilities
 */
export const insuranceApi = {
  getProviders: getInsuranceProviders,
  submitClaim: submitInsuranceClaim,
  getQuotes: getInsuranceQuotes,
  checkClaimStatus,
  getRecommendations: getRecommendedProviders,
  formatDamageForClaim
};