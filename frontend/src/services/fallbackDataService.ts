/**
 * Fallback Data Service - Provides sample data when backend is not available
 */
import { UploadedImage } from '@/types';
import { BarChart2, AlertCircle, LayoutDashboard, History } from 'lucide-react';

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
              id: `region_${i}_1`,
              x: 10 + Math.random() * 40, // random x position
              y: 10 + Math.random() * 40, // random y position
              width: 20 + Math.random() * 20, // random width
              height: 20 + Math.random() * 20, // random height
              damageType,
              severity: 'moderate' as const,
              confidence,
              damagePercentage: Math.floor(Math.random() * 40) + 30,
              description: `${damageType} damage detected with ${Math.floor(confidence * 100)}% confidence`,
              partName: 'front_bumper',
              estimatedCost: Math.floor(Math.random() * 20000) + 5000,
              color: '#FF9800'
            }
          ],
          enhancedRepairCost: {
            conservative: {
              rupees: `₹${Math.floor(repairCost * 0.8).toLocaleString()}`,
              dollars: `$${Math.floor(repairCost * 0.8 / 80)}`
            },
            comprehensive: {
              rupees: `₹${Math.floor(repairCost * 1.2).toLocaleString()}`,
              dollars: `$${Math.floor(repairCost * 1.2 / 80)}`
            },
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
                rupees: `₹${Math.floor(repairCost * 1.3).toLocaleString()}`,
                dollars: `$${Math.floor(repairCost * 1.3 / 80)}`
              },
              multiBrandCenter: {
                rupees: `₹${Math.floor(repairCost * 1.0).toLocaleString()}`,
                dollars: `$${Math.floor(repairCost * 1.0 / 80)}`
              },
              localGarage: {
                rupees: `₹${Math.floor(repairCost * 0.7).toLocaleString()}`,
                dollars: `$${Math.floor(repairCost * 0.7 / 80)}`
              }
            }
          }
        },
      });
    }
    
    return sampleData;
  }
  
  /**
   * Generate sample analytics data based on sample history
   */
  static generateSampleAnalytics() {
    const history = this.generateSampleHistory();
    const totalAnalyses = history.length;
    
    const confidences = history.map(item => item.result?.confidence || 0);
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / (confidences.length || 1);

    const damageTypes: Record<string, number> = {};
    history.forEach(item => {
      const type = item.result?.damageType || 'Unknown';
      damageTypes[type] = (damageTypes[type] || 0) + 1;
    });

    const topDamageType = Object.keys(damageTypes).reduce((a, b) => damageTypes[a] > damageTypes[b] ? a : b, 'N/A');

    const monthlyTrends: Array<{ month: string; count: number; avgCost: number }> = [];
    const trendsMap: Record<string, { count: number; totalCost: number }> = {};
    history.forEach(item => {
      const month = new Date(item.timestamp || 0).toISOString().slice(0, 7);
      if (!trendsMap[month]) {
        trendsMap[month] = { count: 0, totalCost: 0 };
      }
      trendsMap[month].count++;
      const cost = parseInt(item.result?.repairEstimate?.replace(/[^0-9]/g, '') || '0', 10);
      trendsMap[month].totalCost += cost;
    });

    for (const [month, data] of Object.entries(trendsMap)) {
      monthlyTrends.push({
        month,
        count: data.count,
        avgCost: data.totalCost / data.count,
      });
    }

    return {
      totalAnalyses,
      avgConfidence,
      damageTypes,
      monthlyTrends,
      severityBreakdown: { 'minor': 2, 'moderate': 4, 'severe': 2 },
      recentAnalyses: history.slice(0, 5),
      topDamageType,
    };
  }

  /**
   * Generate sample stats for the dashboard overview
   * @param analytics - Sample analytics data
   */
  static generateSampleStats(analytics: ReturnType<typeof this.generateSampleAnalytics>) {
    const { totalAnalyses, avgConfidence, monthlyTrends, topDamageType } = analytics;

    const thisMonthKey = new Date().toISOString().slice(0, 7);
    const analysesThisMonth = monthlyTrends.find(t => t.month === thisMonthKey)?.count || 0;

    return [
      { id: 1, value: totalAnalyses.toLocaleString(), label: 'Total Analyses', icon: BarChart2 },
      { id: 2, value: `${(avgConfidence * 100).toFixed(1)}%`, label: 'Avg. Confidence', icon: AlertCircle },
      { id: 3, value: topDamageType, label: 'Top Damage Type', icon: LayoutDashboard },
      { id: 4, value: analysesThisMonth.toLocaleString(), label: 'Analyses This Month', icon: History },
    ];
  }
}