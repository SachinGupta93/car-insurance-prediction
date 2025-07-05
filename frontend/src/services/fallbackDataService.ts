/**
 * Fallback Data Service - Provides sample data when backend is not available
 */
import { UploadedImage } from '@/types';

export class FallbackDataService {
  /**
   * Generate sample analysis history data
   */
  static generateSampleHistory(): UploadedImage[] {
    const sampleData: UploadedImage[] = [];
    
    const damageTypes = ['Scratches', 'Dents', 'Bumper Damage', 'Side Impact', 'Paint Damage'];
    const vehicleMakes = ['Toyota', 'Honda', 'Ford', 'BMW', 'Mercedes'];
    const severities = ['minor', 'moderate', 'severe', 'critical'] as const;
    
    for (let i = 0; i < 8; i++) {
      const damageType = damageTypes[Math.floor(Math.random() * damageTypes.length)];
      const vehicleMake = vehicleMakes[Math.floor(Math.random() * vehicleMakes.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      const confidence = 0.7 + Math.random() * 0.25; // 0.7 to 0.95
      const repairCost = 5000 + Math.floor(Math.random() * 45000); // 5000 to 50000
      
      // Create date within last 6 months
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 180));
      
      sampleData.push({
        id: `sample_${i}`,
        userId: 'sample_user',
        uploadedAt: date.toISOString(),
        analysisDate: date.toISOString(),
        timestamp: date.toISOString(),
        filename: `damage_${i}.jpg`,
        image: `data:image/svg+xml;base64,${btoa(`
          <svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="150" fill="#f0f0f0"/>
            <text x="100" y="75" text-anchor="middle" fill="#666" font-size="14">
              Sample Image ${i + 1}
            </text>
            <text x="100" y="95" text-anchor="middle" fill="#888" font-size="12">
              ${damageType}
            </text>
          </svg>
        `)}`,
        result: {
          damageType,
          confidence,
          severity,
          repairEstimate: `₹${repairCost.toLocaleString()}`,
          description: `Detected ${damageType.toLowerCase()} on ${vehicleMake} vehicle. Estimated repair cost: ₹${repairCost.toLocaleString()}. Severity: ${severity}.`,
          damageDescription: `${damageType} detected on ${vehicleMake} vehicle`,
          recommendations: [
            'Contact insurance provider immediately',
            'Get detailed repair estimate from authorized center',
            'Document all damage with photos',
            'Consider professional inspection'
          ],
          vehicleIdentification: {
            make: vehicleMake,
            model: `Model ${i + 1}`,
            year: (2018 + Math.floor(Math.random() * 5)).toString(),
            confidence
          },
          identifiedDamageRegions: [
            {
              x: 10 + Math.random() * 40, // random x position
              y: 10 + Math.random() * 40, // random y position
              width: 20 + Math.random() * 20, // random width
              height: 20 + Math.random() * 20, // random height
              damageType,
              confidence
            }
          ],
          enhancedRepairCost: {
            laborHours: `${8 + Math.floor(Math.random() * 8)} hours`,
            breakdown: {
              parts: {
                rupees: `₹${Math.floor(repairCost * 0.6).toLocaleString()}`,
                dollars: `$${Math.floor(repairCost * 0.6 / 80)}`
              },
              labor: {
                rupees: `₹${Math.floor(repairCost * 0.4).toLocaleString()}`,
                dollars: `$${Math.floor(repairCost * 0.4 / 80)}`
              }
            },
            serviceTypeComparison: {
              authorizedCenter: {
                rupees: `₹${repairCost.toLocaleString()}`,
                dollars: `$${Math.floor(repairCost / 80)}`
              },
              multiBrandCenter: {
                rupees: `₹${Math.floor(repairCost * 0.8).toLocaleString()}`,
                dollars: `$${Math.floor(repairCost * 0.8 / 80)}`
              },
              localGarage: {
                rupees: `₹${Math.floor(repairCost * 0.6).toLocaleString()}`,
                dollars: `$${Math.floor(repairCost * 0.6 / 80)}`
              }
            },
            conservative: {
              rupees: `₹${repairCost.toLocaleString()}`,
              dollars: `$${Math.floor(repairCost / 80)}`
            },
            comprehensive: {
              rupees: `₹${(repairCost + 5000).toLocaleString()}`,
              dollars: `$${Math.floor((repairCost + 5000) / 80)}`
            }
          }
        },
        severity,
        confidence
      });
    }
    
    return sampleData;
  }
  
  /**
   * Generate sample analytics data
   */
  static generateSampleAnalytics() {
    const sampleHistory = this.generateSampleHistory();
    
    // Calculate analytics from sample data
    const totalAnalyses = sampleHistory.length;
    const avgConfidence = sampleHistory.reduce((sum, item) => sum + (item.confidence || 0), 0) / totalAnalyses;
    
    // Count damage types
    const damageTypes: Record<string, number> = {};
    sampleHistory.forEach(item => {
      const damageType = (item as any).damageType || item.result?.damageType || 'Unknown';
      damageTypes[damageType] = (damageTypes[damageType] || 0) + 1;
    });
    
    // Generate monthly trends
    const monthlyTrends = [
      { month: 'Jan', count: 12, avgCost: 25000 },
      { month: 'Feb', count: 18, avgCost: 28000 },
      { month: 'Mar', count: 24, avgCost: 22000 },
      { month: 'Apr', count: 15, avgCost: 32000 },
      { month: 'May', count: 21, avgCost: 26000 },
      { month: 'Jun', count: 19, avgCost: 30000 }
    ];
    
    // Count severity breakdown
    const severityBreakdown: Record<string, number> = {
      minor: 0,
      moderate: 0,
      severe: 0,
      critical: 0
    };
    
    sampleHistory.forEach(item => {
      if (item.severity) {
        severityBreakdown[item.severity] = (severityBreakdown[item.severity] || 0) + 1;
      }
    });
    
    return {
      totalAnalyses,
      avgConfidence,
      damageTypes,
      monthlyTrends,
      severityBreakdown
    };
  }
  
  /**
   * Generate sample insurance data
   */
  static generateSampleInsuranceData() {
    return [
      { month: 'Jan', claims: 45, averageCost: 25000, settlements: 42 },
      { month: 'Feb', claims: 52, averageCost: 28000, settlements: 48 },
      { month: 'Mar', claims: 38, averageCost: 22000, settlements: 35 },
      { month: 'Apr', claims: 61, averageCost: 32000, settlements: 58 },
      { month: 'May', claims: 47, averageCost: 26000, settlements: 44 },
      { month: 'Jun', claims: 54, averageCost: 30000, settlements: 51 }
    ];
  }
}