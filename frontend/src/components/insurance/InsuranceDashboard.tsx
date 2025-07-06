import React, { useState, useEffect } from 'react';
import { DollarSign, Clock, CheckCircle, FileText, ArrowUpRight, ArrowDownRight, BarChart3, PieChart } from 'lucide-react';
import AnalysisChart from '@/components/charts/AnalysisChart';
import { useDataCache } from '@/context/DataCacheContext';
import unifiedApiService from '@/services/unifiedApiService';

// Mock data structure - replace with actual data from API
interface OverviewStat {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const InsuranceDashboard = () => {
  const { getAnalysisHistory, getRecentAnalyses } = useDataCache();
  const [stats, setStats] = useState<OverviewStat[]>([]);
  const [claimsData, setClaimsData] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const history = await getAnalysisHistory();
        console.log('📊 InsuranceDashboard: Loaded history data:', history.length, 'items');
        
        // Process history to generate stats and chart data
        const totalValue = history.reduce((sum, item) => sum + (parseInt(item.repairEstimate?.replace(/[^0-9]/g, '') || '0', 10)), 0);
        const approvedClaims = history.filter(item => (item.confidence || 0) > 0.85).length;
        const successRate = history.length > 0 ? (approvedClaims / history.length) * 100 : 0;

        // Generate chart data for insurance trends
        const trendsData = history.map((item, index) => ({
          month: new Date(item.analysisDate || Date.now()).toLocaleDateString('en-US', { month: 'short' }),
          claims: Math.floor(Math.random() * 20) + 5, // Sample data
          value: parseInt(item.repairEstimate?.replace(/[^0-9]/g, '') || '0', 10) || Math.floor(Math.random() * 50000) + 10000,
          date: item.analysisDate || new Date().toISOString()
        }));

        // Generate damage type distribution for severity chart
        const damageTypes = history.reduce((acc, item) => {
          const type = item.damageType || 'Unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const severityData = Object.entries(damageTypes).map(([type, count]) => ({
          type,
          value: count,
          confidence: 0.85
        }));

        console.log('📊 InsuranceDashboard: Generated chart data:', {
          trendsData: trendsData.length,
          severityData: severityData.length,
          damageTypes
        });

        setClaimsData(trendsData);
        setChartData(severityData);

        setStats([
          {
            title: 'Total Claims Value',
            value: `₹${totalValue.toLocaleString()}`,
            change: '+12%',
            trend: 'up',
            icon: DollarSign,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-100',
          },
          {
            title: 'Success Rate',
            value: `${successRate.toFixed(1)}%`,
            change: '+2.5%',
            trend: 'up',
            icon: CheckCircle,
            color: 'text-purple-600',
            bgColor: 'bg-purple-100',
          },
          {
            title: 'Active Claims',
            value: history.length.toString(),
            change: '+5',
            trend: 'up',
            icon: FileText,
            color: 'text-amber-600',
            bgColor: 'bg-amber-100',
          },
          {
            title: 'Avg. Claim Time',
            value: '6 days',
            change: '-1 day',
            trend: 'down',
            icon: Clock,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
          },
        ]);

        setClaimsData(history);
      } catch (error) {
        console.error("Failed to fetch insurance dashboard data:", error);
        // Set fallback data if needed
      }
    };

    fetchData();
  }, [getAnalysisHistory]);

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${stat.trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                {stat.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {stat.change}
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-1">{stat.value}</h3>
            <p className="text-gray-500 font-medium">{stat.title}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">Claims Trend</h3>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-500">Last 6 months</span>
            </div>
          </div>
          <AnalysisChart type="insurance-trends" insuranceData={claimsData} />
        </div>
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">Damage Distribution</h3>
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-500">By type</span>
            </div>
          </div>
          <AnalysisChart type="severity-breakdown" damageData={chartData} />
        </div>
      </div>
    </div>
  );
};

export default InsuranceDashboard;
