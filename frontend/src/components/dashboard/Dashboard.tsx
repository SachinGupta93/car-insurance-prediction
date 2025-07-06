import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, History, ArrowRight, BarChart2, AlertCircle, RefreshCw } from 'lucide-react';
import AnalysisChart from '../charts/AnalysisChart';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';
import { useDataCache } from '@/context/DataCacheContext';
import { UploadedImage } from '@/types';
import { Card } from '@/components/ui/card';

// Define a type for the analytics data to avoid using 'any'
interface AnalyticsData {
  totalAnalyses: number;
  avgConfidence: number;
  damageTypes: Record<string, number>;
  monthlyTrends: Array<{ month: string; count: number; avgCost: number }>;
  severityBreakdown: Record<string, number>;
  recentAnalyses?: UploadedImage[];
  topDamageType?: string;
}

const Dashboard: React.FC = () => {
  const { firebaseUser } = useFirebaseAuth();
  const { 
    getAnalyticsData, 
    getRecentAnalyses, 
    isLoading, 
    errors,
    invalidateCache 
  } = useDataCache();
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!firebaseUser) {
      console.log('Dashboard: No user, skipping data load');
      setDashboardLoading(false);
      return;
    }

    // Only show loading if we don't have cached data
    if (!analyticsData || forceRefresh) {
      setDashboardLoading(true);
    }
    
    try {
      console.log('🔄 Dashboard: Loading data via DataCache...', { forceRefresh, hasCachedData: !!analyticsData });

      // Load analytics data with caching (returns immediately if cached)
      const analytics: AnalyticsData = await getAnalyticsData(forceRefresh);
      console.log('📊 Dashboard: Analytics data loaded:', analytics);
      setAnalyticsData(analytics);

      // Load recent analyses with caching
      const recentItems = await getRecentAnalyses(forceRefresh);
      const processedRecentAnalyses = recentItems.map((item: UploadedImage) => ({
        id: item.id,
        date: new Date(item.uploadedAt || item.timestamp || 0).toLocaleDateString(),
        vehicle: item.result?.vehicleIdentification?.make || 'Unknown Vehicle',
        damageType: item.result?.damageType || 'Unknown',
        severity: item.result?.severity || 'moderate',
        status: 'Completed'
      }));
      setRecentAnalyses(processedRecentAnalyses);

      // Process stats from the analytics data
      if (analytics) {
        const { totalAnalyses, avgConfidence, monthlyTrends, topDamageType } = analytics;
        
        const analysesThisMonth = monthlyTrends?.find(t => {
            const thisMonth = new Date().toISOString().slice(0, 7);
            return t.month === thisMonth;
        })?.count || 0;

        setStats([
          { id: 1, value: totalAnalyses?.toLocaleString() || '0', label: 'Total Analyses', icon: BarChart2 },
          { id: 2, value: `${((avgConfidence || 0) * 100).toFixed(1)}%`, label: 'Avg. Confidence', icon: AlertCircle },
          { id: 3, value: topDamageType || 'N/A', label: 'Top Damage Type', icon: LayoutDashboard },
          { id: 4, value: analysesThisMonth.toLocaleString(), label: 'Analyses This Month', icon: History },
        ]);
      }

      console.log('✅ Dashboard: Data loaded successfully');
    } catch (error) {
      console.error('💥 Dashboard: Failed to load dashboard data:', error);
    } finally {
      setDashboardLoading(false);
    }
  }, [firebaseUser, getAnalyticsData, getRecentAnalyses, analyticsData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const quickActions = [
    { id: 1, title: 'New Analysis', description: 'Start a new car damage analysis', buttonText: 'Start', link: '/analyze', icon: LayoutDashboard },
    { id: 2, title: 'Analysis History', description: 'View all past analyses', buttonText: 'View History', link: '/history', icon: History },
    { id: 3, title: 'Vehicle Management', description: 'Manage your vehicle fleet', buttonText: 'Manage Vehicles', link: '/vehicles', icon: LayoutDashboard },
  ];

  if (dashboardLoading && !analyticsData) {
    return (
        <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-rose-500"></div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-16 h-16 bg-rose-200 rounded-2xl flex items-center justify-center">
              <LayoutDashboard className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-5xl font-bold text-black">
              Dashboard
            </h1>
            <button
              onClick={() => loadData(true)}
              className="p-3 rounded-full hover:bg-rose-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
              title="Refresh Dashboard Data"
              aria-label="Refresh dashboard data"
              disabled={dashboardLoading}
            >
              <RefreshCw className={`w-6 h-6 text-gray-700 ${dashboardLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Welcome back! Here's an overview of your car damage analysis history and insights.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat) => (
            <Card
              key={stat.id}
              className="bg-white rounded-xl border border-rose-200 p-6 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-rose-200 rounded-xl flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-black" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-black mb-1">{stat.value}</h3>
              <p className="text-gray-600">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Recent Analyses */}
        <div className="bg-white rounded-xl border border-rose-200 p-8 mb-16">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-rose-200 rounded-xl flex items-center justify-center">
                <History className="w-6 h-6 text-black" />
              </div>
              <h2 className="text-2xl font-bold text-black">Recent Analyses</h2>
            </div>
            <Link
              to="/history"
              className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium"
            >
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-rose-200">
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Date</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Vehicle</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Damage Type</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Severity</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-200">
                {recentAnalyses.map((analysis) => (
                  <tr key={analysis.id} className="hover:bg-rose-50/50 transition-colors duration-200">
                    <td className="py-4 px-6 text-sm text-gray-600">{analysis.date}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{analysis.vehicle}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{analysis.damageType}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${analysis.severity === 'High' || analysis.severity === 'severe' || analysis.severity === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : analysis.severity === 'Medium' || analysis.severity === 'moderate'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                        {analysis.severity}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800`}>
                        {analysis.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        to={`/analysis/${analysis.id}`}
                        className="text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Analytics Charts */}
        {analyticsData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            <Card className="bg-white rounded-xl border border-rose-200 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-rose-200 rounded-xl flex items-center justify-center">
                  <BarChart2 className="w-6 h-6 text-black" />
                </div>
                <h2 className="text-2xl font-bold text-black">Damage Analysis Trends</h2>
              </div>
              <AnalysisChart
                type="damage-analysis"
                damageData={analyticsData.damageTypes ? Object.entries(analyticsData.damageTypes).map(([type, count]) => ({
                  type,
                  severity: Math.floor(Math.random() * 4) + 1,
                  cost: (count as number) * 500,
                  confidence: analyticsData.avgConfidence || 0,
                  area: 'Various'
                })) : []}
                title="Damage Analysis Trends"
                className="!border-0 !shadow-none !bg-transparent"
              />
            </Card>

            <Card className="bg-white rounded-xl border border-rose-200 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-rose-200 rounded-xl flex items-center justify-center">
                  <History className="w-6 h-6 text-black" />
                </div>
                <h2 className="text-2xl font-bold text-black">Monthly Activity</h2>
              </div>
              <AnalysisChart
                type="insurance-trends"
                insuranceData={analyticsData.monthlyTrends ? analyticsData.monthlyTrends.map(trend => ({
                  month: trend.month,
                  claims: trend.count,
                  averageCost: trend.avgCost,
                  settlements: Math.floor(trend.count * 0.9)
                })) : []}
                title="Monthly Activity"
                className="!border-0 !shadow-none !bg-transparent"
              />
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <Card
              key={action.id}
              className="bg-white rounded-xl border border-rose-200 p-6 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-rose-200 rounded-xl flex items-center justify-center">
                  <action.icon className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h3 className="font-bold text-black">{action.title}</h3>
                  <p className="text-gray-600">{action.description}</p>
                </div>
              </div>
              <Link
                to={action.link}
                className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {action.buttonText}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;