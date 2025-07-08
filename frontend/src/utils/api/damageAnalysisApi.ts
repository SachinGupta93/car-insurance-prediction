// AI-powered damage analysis API client
import { DamageResult, DamageRegion } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Development mode flags - configurable via environment variables
const DEVELOPMENT_MODE = import.meta.env.DEV || import.meta.env.NODE_ENV === 'development';
const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true';
const DISABLE_ARTIFICIAL_TIMEOUT = import.meta.env.VITE_DISABLE_ARTIFICIAL_TIMEOUT === 'true';
const FAST_ANALYSIS_MODE = import.meta.env.VITE_FAST_ANALYSIS_MODE === 'true';

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
  
  let damageType = 'Structural Damage';
  let confidence = 0.75;

  // Enhanced damage types to look for with more specific patterns
  const damageTypes = [
    { keywords: ['scratch', 'scratches', 'scratched', 'surface damage'], type: 'Scratch Damage' },
    { keywords: ['dent', 'dents', 'dented', 'denting'], type: 'Dent Damage' },
    { keywords: ['crack', 'cracks', 'cracked', 'fracture'], type: 'Crack Damage' },
    { keywords: ['bump', 'bumper', 'front damage', 'rear damage'], type: 'Bumper Damage' },
    { keywords: ['paint', 'painting', 'paint damage', 'color'], type: 'Paint Damage' },
    { keywords: ['body damage', 'bodywork', 'panel'], type: 'Body Damage' },
    { keywords: ['headlight', 'taillight', 'light damage'], type: 'Light Damage' },
    { keywords: ['mirror', 'side mirror'], type: 'Mirror Damage' },
    { keywords: ['windshield', 'windscreen', 'glass'], type: 'Glass Damage' },
    { keywords: ['tire', 'wheel', 'rim'], type: 'Wheel Damage' },
    { keywords: ['no damage', 'good condition', 'no visible damage', 'pristine'], type: 'No Damage' }
  ];

  for (const { keywords, type } of damageTypes) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      damageType = type;
      break;
    }
  }

  // Look for confidence percentage with more flexible patterns
  const confidencePatterns = [
    /confidence[:\s]*(\d+(?:\.\d+)?)[%]?/i,
    /certainty[:\s]*(\d+(?:\.\d+)?)[%]?/i,
    /accuracy[:\s]*(\d+(?:\.\d+)?)[%]?/i,
    /(\d+(?:\.\d+)?)[%]\s*confident/i
  ];

  for (const pattern of confidencePatterns) {
    const match = text.match(pattern);
    if (match) {
      confidence = parseFloat(match[1]) / (match[1].includes('.') ? 1 : 100);
      break;
    }
  }

  // Ensure confidence is within valid range
  confidence = Math.max(0.1, Math.min(1.0, confidence));

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
  
  // Determine severity based on damage type and confidence
  let severity: 'minor' | 'moderate' | 'severe' | 'critical' = 'moderate';
  const lowerDamageType = damageInfo.damageType.toLowerCase();
  
  if (lowerDamageType.includes('scratch') || lowerDamageType.includes('paint')) {
    severity = 'minor';
  } else if (lowerDamageType.includes('dent') || lowerDamageType.includes('bumper')) {
    severity = damageInfo.confidence > 0.8 ? 'moderate' : 'minor';
  } else if (lowerDamageType.includes('crack') || lowerDamageType.includes('body')) {
    severity = damageInfo.confidence > 0.7 ? 'severe' : 'moderate';
  } else if (lowerDamageType.includes('structural') || lowerDamageType.includes('critical')) {
    severity = 'critical';
  }
  
  return {
    damageType: damageInfo.damageType,
    confidence: damageInfo.confidence,
    description: rawAnalysis, // Use full AI response
    damageDescription: `${damageInfo.damageType} detected with ${Math.round(damageInfo.confidence * 100)}% confidence`,
    severity: severity,
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
 * Retry function with exponential backoff for 429 errors
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 1, 
  baseDelay: number = 500
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a 429 (rate limit) error
      if (error instanceof Error && (error.message.includes('429') || error.message.includes('Rate limit'))) {
        if (attempt < maxRetries) {
          // Extract retry delay from Google's response
          const retryDelayMatch = error.message.match(/retry_delay\s*{\s*seconds:\s*(\d+)\s*}/) || 
                                 error.message.match(/retry_delay_seconds['":\s]*(\d+)/);
          let retryDelay = retryDelayMatch ? parseInt(retryDelayMatch[1]) * 1000 : baseDelay * Math.pow(2, attempt);
          
          // Cap the retry delay to avoid extremely long waits
          retryDelay = Math.min(retryDelay, 5000); // Max 5 seconds
          
          console.log(`[retryWithBackoff] 429 error, retrying in ${retryDelay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
      }
      
      // For non-429 errors, throw immediately
      if (attempt === 0) {
        throw error;
      }
    }
  }
  
  throw lastError!;
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

    const requestDelay = FAST_ANALYSIS_MODE ? 0 : (DEVELOPMENT_MODE ? 50 : 10); 
    if (requestDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, requestDelay));
    }

    // Check API connection first
    const isConnected = await testApiConnectivity().catch(() => false);
    if (!isConnected) {
      throw new Error('Cannot connect to API server. Please check if the backend is running.');
    }

    // Use the unified API service
    const { unifiedApiService } = await import('@/services/unifiedApiService');
    
    console.log('🔍 [damageAnalysisApi] Starting REAL Gemini AI analysis via backend...');
    
    // Use retry logic for the API call
    const performAnalysis = async () => {
      return await unifiedApiService.analyzeDamage(imageFile);
    };

    const data: DamageResult = await retryWithBackoff(performAnalysis);
    
    console.log('✅ [damageAnalysisApi] Real AI analysis completed successfully!');
    
    console.log('[damageAnalysisApi] Analysis complete:', data);
    
    return data;

  } catch (error) {
    console.error('[damageAnalysisApi] Error during AI analysis:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Analysis was cancelled');
    }
        
    // For other errors, provide a more user-friendly message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // If it's a server error, suggest checking the backend
    if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
      throw new Error('Server error occurred. Please check if the backend service is running properly.');
    }
    
    throw new Error(
      `Analysis failed: ${errorMessage}. Please try again in a few moments.`
    );
  }
};

/**
 * Test API connectivity
 */
export const testApiConnectivity = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
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

/**
 * Fetch user's analysis history from the backend
 */
export const fetchUserAnalysisHistory = async (authToken: string): Promise<any[]> => {
  console.log('🔍 [API] Fetching user analysis history...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/analysis/history`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });

    console.log('📊 [API] History fetch response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ [API] History fetch failed:', errorData);
      throw new Error(`Failed to fetch analysis history: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [API] History fetch successful, items count:', Array.isArray(data) ? data.length : 'Not an array');
    console.log('📋 [API] Raw history data:', data);
    
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('💥 [API] Error fetching user analysis history:', error);
    throw error;
  }
};

export default analyzeCarDamageWithAI;
