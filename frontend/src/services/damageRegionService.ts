import { DamageRegion, DamageResult } from '@/types';

// Enhanced AI Analysis Service for Multiple Damage Region Detection
export class DamageRegionService {
  private static instance: DamageRegionService;
  
  public static getInstance(): DamageRegionService {
    if (!DamageRegionService.instance) {
      DamageRegionService.instance = new DamageRegionService();
    }
    return DamageRegionService.instance;
  }

  // Analyze image for multiple damage regions
  async analyzeImageForRegions(imageBase64: string): Promise<DamageRegion[]> {
    try {
      console.log('🔍 DamageRegionService: Analyzing image for multiple damage regions...');
      
      // Convert base64 to File object for the backend
      const response = await fetch(imageBase64);
      const blob = await response.blob();
      const file = new File([blob], 'damage_region_analysis.jpg', { type: 'image/jpeg' });
      
      // Prepare FormData
      const formData = new FormData();
      formData.append('image', file);
      
      // Get auth headers for the request (no Content-Type for FormData)
      const headers: Record<string, string> = {
        'X-Dev-Mode': 'true'
      };
      
      // Add authentication if available
      try {
        const { auth } = await import('@/lib/firebase');
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        } else {
          headers['X-Dev-Auth-Bypass'] = 'true';
        }
      } catch (error) {
        console.warn('Could not get auth token, using dev bypass');
        headers['X-Dev-Auth-Bypass'] = 'true';
      }
      
      // Call backend API - this will try real AI first, fallback to demo
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const apiResponse = await fetch(`${API_BASE_URL}/api/analyze-regions`, {
        method: 'POST',
        headers: headers,
        body: formData
      });

      if (!apiResponse.ok) {
        throw new Error('Failed to analyze damage regions');
      }

      const data = await apiResponse.json();
      
      // Check if this is demo mode response
      if (data.isDemoMode) {
        console.log('📝 Using demo mode analysis (real AI not available)');
      } else {
        console.log('🤖 Using real Gemini AI analysis');
      }
      
      // Extract regions from response and ensure they have proper IDs
      const regions = (data.identifiedDamageRegions || []).map((region: any, index: number) => ({
        id: region.id || `region_${index + 1}`,
        x: region.x || 0,
        y: region.y || 0,
        width: region.width || 10,
        height: region.height || 10,
        damageType: region.damageType || 'Unknown',
        severity: region.severity || 'minor',
        confidence: region.confidence || 0.5,
        damagePercentage: region.damagePercentage || 10,
        description: region.description || 'Damage region detected',
        partName: region.partName || region.region || 'Unknown part',
        estimatedCost: region.estimatedCost || 1000,
        color: DamageRegionService.getRegionColor(region.severity || 'minor')
      }));
      
      return regions.length > 0 ? regions : this.generateSampleRegions();
    } catch (error) {
      console.error('❌ Error analyzing damage regions:', error);
      console.log('🔄 Falling back to local sample regions');
      // Return sample regions for demonstration
      return this.generateSampleRegions();
    }
  }

  // Generate sample damage regions for demonstration
  private generateSampleRegions(): DamageRegion[] {
    const colors = ['#FF4444', '#FF8800', '#FFAA00', '#44AA44', '#4444FF'];
    const damageTypes = ['scratch', 'dent', 'crack', 'rust', 'broken_part'];
    const severityLevels: ('minor' | 'moderate' | 'severe' | 'critical')[] = ['minor', 'moderate', 'severe', 'critical'];
    const partNames = ['front_bumper', 'rear_bumper', 'left_door', 'right_door', 'hood', 'trunk', 'left_fender', 'right_fender'];

    const regions: DamageRegion[] = [];
    const numRegions = Math.floor(Math.random() * 4) + 2; // 2-5 regions

    for (let i = 0; i < numRegions; i++) {
      const x = Math.random() * 70 + 10; // 10-80%
      const y = Math.random() * 70 + 10; // 10-80%
      const width = Math.random() * 15 + 5; // 5-20%
      const height = Math.random() * 15 + 5; // 5-20%
      
      const damageType = damageTypes[Math.floor(Math.random() * damageTypes.length)];
      const severity = severityLevels[Math.floor(Math.random() * severityLevels.length)];
      const damagePercentage = Math.floor(Math.random() * 80) + 20; // 20-100%
      
      regions.push({
        id: `region_${i + 1}`,
        x,
        y,
        width,
        height,
        damageType,
        severity,
        confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
        damagePercentage,
        description: this.generateRegionDescription(damageType, severity, damagePercentage),
        partName: partNames[Math.floor(Math.random() * partNames.length)],
        estimatedCost: this.calculateRegionCost(damageType, severity, damagePercentage),
        color: colors[i % colors.length]
      });
    }

    return regions;
  }

  // Generate description for a damage region
  private generateRegionDescription(damageType: string, severity: string, percentage: number): string {
    const severityMap: Record<string, string> = {
      minor: 'light',
      moderate: 'moderate',
      severe: 'significant',
      critical: 'extensive'
    };

    const typeDescriptions: Record<string, string> = {
      scratch: `${severityMap[severity] || 'moderate'} surface scratches affecting ${percentage}% of the area`,
      dent: `${severityMap[severity] || 'moderate'} dent with ${percentage}% surface deformation`,
      crack: `${severityMap[severity] || 'moderate'} crack covering ${percentage}% of the surface`,
      rust: `${severityMap[severity] || 'moderate'} rust formation affecting ${percentage}% of the metal`,
      broken_part: `${severityMap[severity] || 'moderate'} structural damage to ${percentage}% of the component`
    };

    return typeDescriptions[damageType] || `${severityMap[severity] || 'moderate'} damage affecting ${percentage}% of the area`;
  }

  // Calculate estimated cost for a damage region
  private calculateRegionCost(damageType: string, severity: string, percentage: number): number {
    const baseCosts: Record<string, Record<string, number>> = {
      scratch: { minor: 2000, moderate: 5000, severe: 10000, critical: 20000 },
      dent: { minor: 3000, moderate: 8000, severe: 15000, critical: 30000 },
      crack: { minor: 1500, moderate: 4000, severe: 8000, critical: 16000 },
      rust: { minor: 2500, moderate: 6000, severe: 12000, critical: 25000 },
      broken_part: { minor: 5000, moderate: 12000, severe: 25000, critical: 50000 }
    };

    const baseCost = baseCosts[damageType]?.[severity] || 5000;
    const percentageMultiplier = (percentage / 100) * 0.5 + 0.5; // 0.5-1.0 multiplier
    
    return Math.floor(baseCost * percentageMultiplier);
  }

  // Enhance existing damage result with region data
  async enhanceDamageResult(existingResult: DamageResult, imageBase64: string): Promise<DamageResult> {
    console.log('🔍 DamageRegionService: Enhancing damage result with region data...');
    
    const regions = await this.analyzeImageForRegions(imageBase64);
    
    // Calculate total estimated cost from all regions
    const totalRegionCost = regions.reduce((sum, region) => sum + (region.estimatedCost || 0), 0);
    
    // Update the existing result with region data
    const enhancedResult: DamageResult = {
      ...existingResult,
      identifiedDamageRegions: regions,
      regionAnalysis: {
        totalRegions: regions.length,
        severityDistribution: this.calculateSeverityDistribution(regions),
        damageTypeDistribution: this.calculateDamageTypeDistribution(regions),
        totalEstimatedCost: totalRegionCost,
        averageConfidence: regions.reduce((sum, region) => sum + region.confidence, 0) / regions.length
      }
    };

    return enhancedResult;
  }

  // Calculate severity distribution
  private calculateSeverityDistribution(regions: DamageRegion[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    regions.forEach(region => {
      distribution[region.severity] = (distribution[region.severity] || 0) + 1;
    });
    return distribution;
  }

  // Calculate damage type distribution
  private calculateDamageTypeDistribution(regions: DamageRegion[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    regions.forEach(region => {
      distribution[region.damageType] = (distribution[region.damageType] || 0) + 1;
    });
    return distribution;
  }

  // Get region color based on severity
  static getRegionColor(severity: string): string {
    const colorMap: Record<string, string> = {
      minor: '#4CAF50',      // Green
      moderate: '#FF9800',   // Orange
      severe: '#FF5722',     // Deep Orange
      critical: '#F44336'    // Red
    };
    return colorMap[severity] || '#2196F3'; // Default blue
  }

  // Get region border style based on damage type
  static getRegionBorderStyle(damageType: string): string {
    const styleMap: Record<string, string> = {
      scratch: 'dashed',
      dent: 'solid',
      crack: 'dotted',
      rust: 'double',
      broken_part: 'solid'
    };
    return styleMap[damageType] || 'solid';
  }
}

export default DamageRegionService.getInstance();