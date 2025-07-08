// Optimized Dashboard - Implements all performance best practices
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  History, 
  ArrowRight, 
  BarChart2, 
  AlertCircle, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Database,
  TrendingUp,
  Car,
  FileText
} from 'lucide-react';
import { useFirebaseAuth } from '../../context/FirebaseAuthContext';
import { useOptimizedAnalysisHistory, useOptimizedVehicleData } from '../../hooks/useOptimizedFirestore';
import { useDebouncedSearch, useThrottledCallback } from '../../hooks/useDebounce';
import { networkManager } from '../../utils/networkManager';
import { improvedStorageManager } from '../../utils/improvedStorageManager';
import OptimizedImageLoader from './OptimizedImageLoader';

// Memoized components for better performance
const StatCard = React.memo<{
  icon: React.ComponentType<any>;
  value: string;
  label: string;
  isOnline: boolean;
  trend?: { value: number; isPositive: boolean };
}>(({ icon: Icon, value, label, isOnline, trend }) => (
  <div className="bg-white rounded-xl border border-rose-200 p-6 hover:shadow-lg transition-all duration-300">
    <div className="flex items-center justify-between mb-4">
      <div className="w-12 h-12 bg-rose-200 rounded-xl flex items-center justify-center">
        <Icon className="w-6 h-6 text-black" />
      </div>
      <div className="flex items-center gap-2">
        {!isOnline && (
          <div className="w-2 h-2 bg-gray-400 rounded-full" title="Offline data" />
        )}
        {trend && (
          <div className={`flex items-center text-xs ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp className={`w-3 h-3 mr-1 ${
              trend.isPositive ? '' : 'rotate-180'
            }`} />
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
    </div>
    <h3 className="text-2xl font-bold text-black mb-1">{value}</h3>
    <p className="text-gray-600">{label}</p>
  </div>
));

const RecentAnalysisRow = React.memo<{
  analysis: any;
  onViewDetails: (id: string) => void;
}>(({ analysis, onViewDetails }) => (
  <tr className="hover:bg-rose-50/50 transition-colors duration-200">
    <td className="py-4 px-6 text-sm text-gray-600">{analysis.date}</td>
    <td className="py-4 px-6 text-sm text-gray-600">{analysis.vehicle}</td>
    <td className="py-4 px-6 text-sm text-gray-600">{analysis.damageType}</td>
    <td className="py-4 px-6">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        analysis.severity === 'severe' || analysis.severity === 'critical'
          ? 'bg-red-100 text-red-800'
          : analysis.severity === 'moderate'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-green-100 text-green-800'
      }`}>
        {analysis.severity}
      </span>
    </td>
    <td className="py-4 px-6">
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        {analysis.status}
      </span>
    </td>
    <td className="py-4 px-6 text-right">
      <button
        onClick={() => onViewDetails(analysis.id)}
        className="text-emerald-600 hover:text-emerald-700 font-medium"
      >
        View Details
      </button>
    </td>
  </tr>
));

const QuickActionCard = React.memo<{
  action: {
    id: number;
    title: string;
    description: string;
    buttonText: string;
    link: string;
    icon: React.ComponentType<any>;
  };
}>(({ action }) => (
  <div className="bg-white rounded-xl border border-rose-200 p-6 hover:shadow-lg transition-all duration-300">
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
  </div>
));

const OptimizedDashboard: React.FC = () => {
  const { firebaseUser } = useFirebaseAuth();
  
  // Use optimized Firestore hooks with pagination and caching
  const {
    data: analysisHistory,
    loading: historyLoading,
    error: historyError,
    refresh: refreshHistory,
    totalCount: totalAnalyses
  } = useOptimizedAnalysisHistory(firebaseUser?.uid);

  const {
    data: vehicles,
    loading: vehiclesLoading,
    error: vehiclesError,
    refresh: refreshVehicles
  } = useOptimizedVehicleData(firebaseUser?.uid);

  // Local state
  const [storageStats, setStorageStats] = useState<any>(null);
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: true,
    connectionType: 'fast' as 'offline' | 'slow' | 'fast',
    retryCount: 0
  });

  // Debounced search for future filtering
  const { searchTerm, debouncedSearchTerm, setSearchTerm } = useDebouncedSearch('', 300);

  // Monitor network status with throttling
  useEffect(() => {
    const unsubscribe = networkManager.onStatusChange(
      useThrottledCallback((status) => {
        setNetworkStatus({
          isOnline: status.isOnline,
          connectionType: status.connectionType,
          retryCount: status.retryCount
        });
      }, 1000) // Throttle network status updates
    );
    
    return unsubscribe;
  }, []);

  // Load storage stats with caching
  useEffect(() => {
    const loadStorageStats = async () => {
      try {
        const stats = await improvedStorageManager.getStorageStats();
        setStorageStats(stats);
      } catch (error) {
        console.error('Failed to load storage stats:', error);
      }
    };
    
    loadStorageStats();
    
    // Refresh storage stats every 30 seconds
    const interval = setInterval(loadStorageStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Memoized analytics data processing
  const analyticsData = useMemo(() => {
    if (!analysisHistory.length) {
      return {
        totalAnalyses: 0,
        avgConfidence: 0,
        damageTypes: {},
        severityBreakdown: {},
        monthlyTrends: [],
        topDamageType: 'N/A'
      };
    }

    console.time('Analytics Processing');
    
    const damageTypes: Record<string, number> = {};
    const severityBreakdown: Record<string, number> = {};
    let totalConfidence = 0;

    analysisHistory.forEach(item => {
      // Count damage types
      const damageType = item.damageType || 'Unknown';
      damageTypes[damageType] = (damageTypes[damageType] || 0) + 1;

      // Count severity
      const severity = item.severity || 'moderate';
      severityBreakdown[severity] = (severityBreakdown[severity] || 0) + 1;

      // Sum confidence
      totalConfidence += item.confidence || 0;
    });

    const avgConfidence = analysisHistory.length > 0 ? totalConfidence / analysisHistory.length : 0;
    const topDamageType = Object.entries(damageTypes).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    // Generate monthly trends (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7);
      
      const monthData = analysisHistory.filter(item => 
        item.analysisDate?.startsWith(monthKey)
      );
      
      monthlyTrends.push({
        month: monthKey,
        count: monthData.length,
        avgCost: monthData.reduce((sum, item) => {
          const cost = parseFloat(item.repairEstimate?.replace(/[^\d]/g, '') || '0');
          return sum + cost;
        }, 0) / (monthData.length || 1)
      });
    }

    console.timeEnd('Analytics Processing');

    return {
      totalAnalyses: analysisHistory.length,
      avgConfidence,
      damageTypes,
      severityBreakdown,
      monthlyTrends,
      topDamageType
    };
  }, [analysisHistory]);

  // Memoized stats for performance
  const stats = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const thisMonthAnalyses = analyticsData.monthlyTrends.find(t => t.month === thisMonth)?.count || 0;
    const lastMonth = analyticsData.monthlyTrends[analyticsData.monthlyTrends.length - 2]?.count || 0;
    const trend = lastMonth > 0 ? ((thisMonthAnalyses - lastMonth) / lastMonth) * 100 : 0;

    return [
      { 
        id: 1, 
        value: totalAnalyses.toLocaleString(), 
        label: 'Total Analyses', 
        icon: BarChart2,
        trend: { value: Math.round(Math.abs(trend)), isPositive: trend >= 0 }
      },
      { 
        id: 2, 
        value: `${(analyticsData.avgConfidence * 100).toFixed(1)}%`, 
        label: 'Avg. Confidence', 
        icon: AlertCircle 
      },
      { 
        id: 3, 
        value: analyticsData.topDamageType, 
        label: 'Top Damage Type', 
        icon: LayoutDashboard 
      },
      { 
        id: 4, 
        value: vehicles.length.toLocaleString(), 
        label: 'Registered Vehicles', 
        icon: Car 
      },
    ];
  }, [analyticsData, totalAnalyses, vehicles.length]);

  // Memoized recent analyses for table
  const recentAnalyses = useMemo(() => {
    return analysisHistory.slice(0, 10).map(item => ({
      id: item.id,
      date: new Date(item.analysisDate || 0).toLocaleDateString(),
      vehicle: `${item.vehicleInfo?.make || 'Unknown'} ${item.vehicleInfo?.model || 'Vehicle'}`,
      damageType: item.damageType || 'Unknown',
      severity: item.severity || 'moderate',
      status: 'Completed'
    }));
  }, [analysisHistory]);

  // Memoized quick actions
  const quickActions = useMemo(() => [
    { 
      id: 1, 
      title: 'New Analysis', 
      description: 'Start a new car damage analysis', 
      buttonText: 'Start Analysis', 
      link: '/analyze', 
      icon: LayoutDashboard 
    },
    { 
      id: 2, 
      title: 'Analysis History', 
      description: 'View all past analyses with filtering', 
      buttonText: 'View History', 
      link: '/history', 
      icon: History 
    },
    { 
      id: 3, 
      title: 'Vehicle Management', 
      description: 'Manage your vehicle fleet', 
      buttonText: 'Manage Vehicles', 
      link: '/vehicles', 
      icon: Car 
    },
    { 
      id: 4, 
      title: 'Insurance Claims', 
      description: 'Process insurance claims', 
      buttonText: 'View Claims', 
      link: '/insurance', 
      icon: FileText 
    },
  ], []);

  // Throttled refresh handler
  const handleRefreshData = useThrottledCallback(async () => {
    console.log('🔄 Refreshing dashboard data...');
    await Promise.all([
      refreshHistory(),
      refreshVehicles()
    ]);
  }, 2000); // Prevent spam clicking

  // Throttled storage optimization
  const handleOptimizeStorage = useThrottledCallback(async () => {
    try {
      await improvedStorageManager.optimizeStorage();
      const newStats = await improvedStorageManager.getStorageStats();
      setStorageStats(newStats);
    } catch (error) {
      console.error('Failed to optimize storage:', error);
    }
  }, 5000); // Prevent frequent optimization

  // Memoized view details handler
  const handleViewDetails = useCallback((id: string) => {
    // Navigate to analysis details
    window.location.href = `/analysis/${id}`;
  }, []);

  // Loading state
  if (historyLoading && analysisHistory.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-rose-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your optimized dashboard...</p>
          {!networkStatus.isOnline && (
            <p className="text-sm text-gray-500 mt-2">You're offline - loading cached data</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header with Network Status */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-16 h-16 bg-rose-200 rounded-2xl flex items-center justify-center">
              <LayoutDashboard className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-5xl font-bold text-black">
              Optimized Dashboard
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshData}
                className="p-3 rounded-full hover:bg-rose-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                title="Refresh Dashboard Data"
                disabled={historyLoading}
              >
                <RefreshCw className={`w-6 h-6 text-gray-700 ${historyLoading ? 'animate-spin' : ''}`} />
              </button>
              
              {/* Network Status Indicator */}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                networkStatus.isOnline 
                  ? networkStatus.connectionType === 'slow'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {networkStatus.isOnline ? (
                  <>
                    <Wifi className="w-4 h-4" />
                    <span>{networkStatus.connectionType === 'slow' ? 'Slow' : 'Online'}</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4" />
                    <span>Offline</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Welcome back! Here's your optimized dashboard with enhanced performance and caching.
          </p>
          
          {/* Error Messages */}
          {(historyError || vehiclesError) && (
            <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span className="text-yellow-700">
                  Some data might be outdated due to connectivity issues
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Storage Stats */}
        {storageStats && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  Storage Usage: {storageStats.used.toFixed(1)}MB / {storageStats.quota.toFixed(1)}MB
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      storageStats.percentage > 80 ? 'bg-red-500' : 
                      storageStats.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(storageStats.percentage, 100)}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600">
                  {storageStats.percentage.toFixed(1)}%
                </span>
                {storageStats.percentage > 70 && (
                  <button
                    onClick={handleOptimizeStorage}
                    className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Optimize
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat) => (
            <StatCard
              key={stat.id}
              icon={stat.icon}
              value={stat.value}
              label={stat.label}
              isOnline={networkStatus.isOnline}
              trend={stat.trend}
            />
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
              {!networkStatus.isOnline && (
                <div className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                  Cached Data
                </div>
              )}
            </div>
            <Link
              to="/history"
              className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium"
            >
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
          
          {recentAnalyses.length > 0 ? (
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
                    <RecentAnalysisRow
                      key={analysis.id}
                      analysis={analysis}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <LayoutDashboard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No analyses yet</h3>
              <p className="text-gray-600 mb-6">Start your first car damage analysis to see data here.</p>
              <Link
                to="/analyze"
                className="inline-flex items-center px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
              >
                Start Analysis
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => (
            <QuickActionCard key={action.id} action={action} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default OptimizedDashboard;