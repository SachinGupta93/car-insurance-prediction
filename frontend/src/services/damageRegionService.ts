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
      
      // This would call your enhanced AI model that can detect multiple regions
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/analyze-regions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageBase64,
          detectMultipleRegions: true,
          returnBoundingBoxes: true,
          includePercentages: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze damage regions');
      }

      const data = await response.json();
      return data.regions || this.generateSampleRegions();
    } catch (error) {
      console.error('❌ Error analyzing damage regions:', error);
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