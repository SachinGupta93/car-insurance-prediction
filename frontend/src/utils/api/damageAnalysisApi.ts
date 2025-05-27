// AI-powered damage analysis API client
import { DamageResult, DamageRegion } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface APIResponse {
  data: {
    raw_analysis: string;
    structured_data: DamageResult;
  };
  error?: string;
}

/**
 * Parses damage regions from AI response text
 */
const parseDamageRegionsFromText = (text: string): DamageRegion[] => {
  try {
    // Look for JSON array in the text
    const regexPatterns = [
      /"identifiedDamageRegions"\s*:\s*(\[[\s\S]*?\])/,
      /identifiedDamageRegions\s*:\s*(\[[\s\S]*?\])/,
      /"identifiedDamageRegions":\s*(\[[\s\S]*?\])/
    ];

    for (const pattern of regexPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        try {
          const regions = JSON.parse(match[1]);
          if (Array.isArray(regions) && regions.length > 0) {
            // Validate structure
            const validRegions = regions.filter(r => 
              typeof r.x === 'number' && 
              typeof r.y === 'number' &&
              typeof r.width === 'number' && 
              typeof r.height === 'number' &&
              typeof r.damageType === 'string' && 
              typeof r.confidence === 'number'
            );
            return validRegions;
          }
        } catch (parseError) {
          console.warn('Failed to parse damage regions JSON:', parseError);
        }
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error parsing damage regions from text:', error);
    return [];
  }
};

/**
 * Extracts vehicle identification from AI response text
 */
const parseVehicleIdentification = (text: string) => {
  const defaultResult = {
    make: 'Unknown',
    model: 'Unknown',
    year: 'Unknown',
    trimLevel: 'Unknown',
    bodyStyle: 'Unknown',
    confidence: 0.5,
    identificationDetails: 'Could not parse vehicle details from AI response'
  };

  try {
    // Look for common patterns in AI response
    const makeMatch = text.match(/(?:Make|Brand):\s*([^\n]+)/i);
    const modelMatch = text.match(/Model:\s*([^\n]+)/i);
    const yearMatch = text.match(/Year:\s*([^\n]+)/i);
    const confidenceMatch = text.match(/(?:confidence|certainty).*?(\d+(?:\.\d+)?%?)/i);

    return {
      make: makeMatch ? makeMatch[1].trim() : defaultResult.make,
      model: modelMatch ? modelMatch[1].trim() : defaultResult.model,
      year: yearMatch ? yearMatch[1].trim() : defaultResult.year,
      trimLevel: defaultResult.trimLevel,
      bodyStyle: defaultResult.bodyStyle,
      confidence: confidenceMatch ? parseFloat(confidenceMatch[1].replace('%', '')) / 100 : defaultResult.confidence,
      identificationDetails: `Parsed from AI response: ${makeMatch ? 'Make found' : 'Make not found'}, ${modelMatch ? 'Model found' : 'Model not found'}`
    };
  } catch (error) {
    console.error('Error parsing vehicle identification:', error);
    return defaultResult;
  }
};

/**
 * Extracts repair cost information from AI response text
 */
const parseRepairCosts = (text: string) => {
  const defaultCost = {
    conservative: { rupees: '₹0', dollars: '$0' },
    comprehensive: { rupees: '₹0', dollars: '$0' },
    laborHours: 'Not specified',
    breakdown: {
      parts: { rupees: '₹0', dollars: '$0' },
      labor: { rupees: '₹0', dollars: '$0' },
      materials: { rupees: '₹0', dollars: '$0' }
    },
    serviceTypeComparison: {
      authorizedCenter: { rupees: '₹0', dollars: '$0' },
      multiBrandCenter: { rupees: '₹0', dollars: '$0' },
      localGarage: { rupees: '₹0', dollars: '$0' }
    },
    regionalVariations: {
      metro: { rupees: '₹0', dollars: '$0' },
      tier1: { rupees: '₹0', dollars: '$0' },
      tier2: { rupees: '₹0', dollars: '$0' }
    }
  };

  try {
    // Extract cost estimates from text
    const rupeePattern = /₹[\d,]+/g;
    const dollarPattern = /\$[\d,]+/g;
    
    const rupeeMatches = text.match(rupeePattern) || [];
    const dollarMatches = text.match(dollarPattern) || [];

    if (rupeeMatches.length >= 2) {
      return {
        ...defaultCost,
        conservative: { 
          rupees: rupeeMatches[0] || defaultCost.conservative.rupees,
          dollars: dollarMatches[0] || defaultCost.conservative.dollars
        },
        comprehensive: { 
          rupees: rupeeMatches[1] || defaultCost.comprehensive.rupees,
          dollars: dollarMatches[1] || defaultCost.comprehensive.dollars
        }
      };
    }

    return defaultCost;
  } catch (error) {
    console.error('Error parsing repair costs:', error);
    return defaultCost;
  }
};

/**
 * Determines damage type and confidence from AI response
 */
const parseDamageInfo = (text: string) => {
  const lowerText = text.toLowerCase();
  
  let damageType = 'General Damage';
  let confidence = 0.8;

  // Common damage types to look for
  const damageTypes = [
    { keywords: ['scratch', 'scratches'], type: 'Scratch' },
    { keywords: ['dent', 'dents'], type: 'Dent' },
    { keywords: ['crack', 'cracks'], type: 'Crack' },
    { keywords: ['bump', 'bumper'], type: 'Bumper Damage' },
    { keywords: ['paint', 'painting'], type: 'Paint Damage' },
    { keywords: ['no damage', 'good condition', 'no visible damage'], type: 'No Damage' }
  ];

  for (const { keywords, type } of damageTypes) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      damageType = type;
      break;
    }
  }

  // Look for confidence percentage
  const confidenceMatch = text.match(/confidence[:\s]*(\d+(?:\.\d+)?)[%]?/i);
  if (confidenceMatch) {
    confidence = parseFloat(confidenceMatch[1]) / (confidenceMatch[1].includes('.') ? 1 : 100);
  }

  return { damageType, confidence };
};

/**
 * Converts AI raw response to structured DamageResult format
 */
const convertToStructuredResult = (rawAnalysis: string): DamageResult => {
  const damageInfo = parseDamageInfo(rawAnalysis);
  const vehicleId = parseVehicleIdentification(rawAnalysis);
  const repairCosts = parseRepairCosts(rawAnalysis);
  const damageRegions = parseDamageRegionsFromText(rawAnalysis);

  // Check if this is a "no damage" scenario
  if (damageInfo.damageType === 'No Damage') {
    return {
      damageType: 'No Damage',
      confidence: damageInfo.confidence,
      description: 'The vehicle appears to be in good condition with no visible damage detected.',
      damageDescription: 'No damage detected',
      recommendations: [
        'Vehicle appears to be in good condition',
        'Regular maintenance is recommended',
        'Consider preventive measures to maintain condition'
      ],
      identifiedDamageRegions: [], // Empty array for no damage
      vehicleIdentification: vehicleId,
      enhancedRepairCost: repairCosts,
      insuranceProviders: [],
      regionalInsights: {
        metroAdvantages: [],
        tier2Considerations: [],
        regionalCostVariations: { rupees: '₹0', dollars: '$0' }
      },
      marketAnalysis: {
        currentValue: { rupees: '₹0', dollars: '$0' },
        depreciationImpact: 'No impact - vehicle in good condition',
        resaleConsiderations: ['Maintain current condition', 'Document regular maintenance']
      },      claimStrategy: {
        recommended: 'SELF_PAY',
        reasoning: 'No damage detected, no insurance claim necessary',
        timelineOptimization: 'N/A',
        documentationRequired: []
      },
      safetyAssessment: {
        drivability: 'SAFE',
        safetySystemImpacts: [],
        recommendations: ['Continue normal operation']
      }
    };
  }

  // Extract recommendations from text
  const recommendations = rawAnalysis
    .split('\n')
    .filter(line => line.trim().startsWith('•') || line.trim().startsWith('-'))
    .map(line => line.replace(/^[•-]\s*/, '').trim())
    .filter(rec => rec.length > 0);
  return {
    damageType: damageInfo.damageType,
    confidence: damageInfo.confidence,
    description: rawAnalysis, // Use full AI response
    damageDescription: `${damageInfo.damageType} detected with ${Math.round(damageInfo.confidence * 100)}% confidence`,
    recommendations: recommendations.length > 0 ? recommendations : [
      'Professional assessment recommended',
      'Document damage with photos',
      'Get repair estimates from certified technicians'
    ],
    identifiedDamageRegions: damageRegions,
    vehicleIdentification: vehicleId,
    enhancedRepairCost: repairCosts,
    insuranceProviders: [], // Will be populated by insurance analysis
    regionalInsights: {
      metroAdvantages: ['Better repair facilities available', 'Faster parts availability'],
      tier2Considerations: ['Verify technician expertise', 'Parts delivery may take longer'],
      regionalCostVariations: repairCosts.regionalVariations.metro
    },
    marketAnalysis: {
      currentValue: { rupees: '₹5,00,000', dollars: '$6,000' }, // Default estimate
      depreciationImpact: 'Minor impact if repaired professionally',
      resaleConsiderations: ['Professional repair documentation important', 'Quality of repair affects resale value']
    },
    claimStrategy: {
      recommended: 'CONDITIONAL',
      reasoning: 'Consider repair cost vs deductible and NCB impact',
      timelineOptimization: 'Get multiple quotes before proceeding',
      documentationRequired: ['Damage photos', 'Repair estimates', 'Police report if applicable']
    },
    safetyAssessment: {
      drivability: 'SAFE',
      safetySystemImpacts: ['Monitor for any warning indicators'],
      recommendations: ['Ensure no safety systems are affected', 'Professional inspection recommended']
    }
  };
};

/**
 * Analyzes car damage using AI backend
 */
export const analyzeCarDamageWithAI = async (
  imageFile: File, 
  signal?: AbortSignal
): Promise<DamageResult> => {
  try {
    console.log('[damageAnalysisApi] Starting AI analysis for file:', imageFile.name);

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('image', imageFile);
    
    // Check API connection first
    const isConnected = await testApiConnectivity().catch(() => false);
    if (!isConnected) {
      throw new Error('Cannot connect to API server. Please check if the backend is running.');
    }

    const response = await fetch(`${API_BASE_URL}/analyze-damage`, {
      method: 'POST',
      headers: {
        'X-Dev-Auth-Bypass': 'true', // For development
        // Don't set Content-Type for FormData, let browser set it
      },
      body: formData,
      signal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data: APIResponse = await response.json();
    console.log('[damageAnalysisApi] Raw API response:', data);

    if (data.error) {
      throw new Error(data.error);
    }    // If the backend already returns structured data, use it
    if (data.data.structured_data) {
      console.log('[damageAnalysisApi] Using structured data from backend');
      // Make sure to include essential fields - especially for low confidence results
      const structuredData = data.data.structured_data;
      
      // Ensure we have the necessary fields regardless of confidence level
      return {
        ...structuredData,
        // Always include a damageType
        damageType: structuredData.damageType || "Analysis Complete",
        // Always include proper confidence (default to 0.3 if missing)
        confidence: typeof structuredData.confidence === 'number' ? structuredData.confidence : 0.3,
        // Always include some description
        description: structuredData.description || "AI analysis completed",
        damageDescription: structuredData.damageDescription || "AI completed the analysis",
        // Ensure recommendations is always an array
        recommendations: Array.isArray(structuredData.recommendations) 
          ? structuredData.recommendations 
          : [],
        // Ensure identifiedDamageRegions is always an array
        identifiedDamageRegions: Array.isArray(structuredData.identifiedDamageRegions) 
          ? structuredData.identifiedDamageRegions 
          : []
      };
    }

    // Otherwise, parse the raw analysis text
    console.log('[damageAnalysisApi] Converting raw analysis to structured format');
    const structuredResult = convertToStructuredResult(data.data.raw_analysis);
    
    console.log('[damageAnalysisApi] Analysis complete:', structuredResult);
    return structuredResult;

  } catch (error) {
    console.error('[damageAnalysisApi] Error during AI analysis:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Analysis was cancelled');
    }
      throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Failed to analyze image. Please try again.'
    );
  }
};

/**
 * Test API connectivity
 */
export const testApiConnectivity = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return response.ok;
  } catch (error) {
    console.error('API connectivity test failed:', error);
    return false;
  }
};

export default analyzeCarDamageWithAI;
