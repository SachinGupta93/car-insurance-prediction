import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  PieChart,
  DollarSign,
  CheckCircle,
  FileText,
  Clock
} from 'lucide-react';
import { useFirebaseAuth } from '../../context/FirebaseAuthContext';
import { unifiedApiService } from '../../services/unifiedApiService';
import { UploadedImage } from '../../types';
import { networkManager } from '../../utils/networkManager';
import AnalysisChart from '../charts/AnalysisChart';

// Main dashboard data structure
interface DashboardData {
  totalAnalyses: number;
  avgConfidence: number;
  topDamageType: string;
  analysesThisMonth: number;
  totalClaimsValue: number;
  claimsSuccessRate: number;
  activeClaims: number;
  avgClaimTime: string;
  monthlyTrends: Array<{ month: string; count: number; avgCost: number }>;
  severityBreakdown: Record<string, number>;
  damageTypeDistribution: Record<string, any>;
  recentAnalyses: UploadedImage[];
}

// Stat card component
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  change?: string;
  isOnline: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, isOnline }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
    <div className="flex items-center justify-between mb-4">
      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
        <Icon className="w-6 h-6 text-gray-800" />
      </div>
      {!isOnline && (
        <div className="w-2 h-2 bg-gray-400 rounded-full" title="Offline data" />
      )}
    </div>
    <h3 className="text-2xl font-bold text-gray-800 mb-1">{value}</h3>
    <p className="text-gray-500">{label}</p>
  </div>
);

const NewDashboard: React.FC = () => {
  const { firebaseUser } = useFirebaseAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dataSource, setDataSource] = useState<string>('');
  const [dataMessage, setDataMessage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const hasLoadedDataRef = useRef(false);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadDashboardData = useCallback(async (forceRefresh = false) => {
    if (!firebaseUser) {
      setLoading(false);
      return;
    }

    if (forceRefresh || !hasLoadedDataRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await unifiedApiService.getAggregatedDashboardData();
      setDashboardData(response.data);
      setDataSource(response.data_source || 'unknown');
      setDataMessage(response.message || '');
      hasLoadedDataRef.current = true;
    } catch (err) {
      setError('Failed to load dashboard data. Please try again later.');
      console.error('Dashboard loading error:', err);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]); // Removed dashboardData from dependencies to prevent infinite loop

  useEffect(() => {
    if (firebaseUser && !hasLoadedDataRef.current) {
      loadDashboardData();
    }
  }, [firebaseUser]); // Removed loadDashboardData from dependencies

  if (loading && !dashboardData) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-24 w-24 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">Loading your enhanced dashboard...</p>
          {!isOnline && (
            <p className="text-sm text-gray-500 mt-2">You appear to be offline. Loading may take longer.</p>
          )}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-50">
            <div className="text-center p-8 bg-white rounded-lg shadow-md">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Something Went Wrong</h2>
                <p className="text-gray-600 mb-6">{error}</p>
                <button
                    onClick={() => loadDashboardData(true)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        </div>
    );
  }

  const stats = dashboardData ? [
    { id: 1, value: (dashboardData.totalAnalyses || 0).toLocaleString(), label: 'Total Analyses', icon: BarChart2 },
    { id: 2, value: `${((dashboardData.avgConfidence || 0) * 100).toFixed(1)}%`, label: 'Avg. Confidence', icon: CheckCircle },
    { id: 3, value: `₹${(dashboardData.totalClaimsValue || 0).toLocaleString()}`, label: 'Total Claims Value', icon: DollarSign },
    { id: 4, value: (dashboardData.activeClaims || 0).toLocaleString(), label: 'Active Claims', icon: FileText },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-8xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-gray-500">Welcome back! Here's your analytics overview.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <button
              onClick={() => loadDashboardData(true)}
              className="p-3 rounded-full hover:bg-gray-100 transition-colors"
              title="Refresh Data"
              disabled={loading}
            >
              <RefreshCw className={`w-5 h-5 text-gray-700 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link to="/analyze" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              New Analysis
            </Link>
          </div>
        </div>

        {/* Data Source Indicator */}
        {dataSource && (
          <div className={`mb-6 p-4 rounded-lg border ${
            dataSource === 'real' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : dataSource === 'sample' 
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-yellow-50 border-yellow-200 text-yellow-800'
          }`}>
            <div className="flex items-center gap-2">
              {dataSource === 'real' ? (
                <CheckCircle className="w-5 h-5" />
              ) : dataSource === 'sample' ? (
                <BarChart2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="font-medium">
                {dataSource === 'real' ? 'Real Data' : dataSource === 'sample' ? 'Sample Data' : 'Fallback Data'}
              </span>
              <span className="text-sm opacity-75">
                {dataMessage || (dataSource === 'real' ? 'Live data from Firebase' : 'Sample data for demonstration')}
              </span>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <StatCard key={stat.id} {...stat} isOnline={isOnline} />
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Monthly Analysis Trends</h3>
            <div className="h-80">
              {dashboardData && dashboardData.monthlyTrends && Array.isArray(dashboardData.monthlyTrends) && dashboardData.monthlyTrends.length > 0 ? (
                <AnalysisChart 
                  type="insurance-trends" 
                  insuranceData={dashboardData.monthlyTrends.map(item => ({
                    ...item, 
                    claims: item?.count || 0, 
                    averageCost: item?.avgCost || 0, 
                    settlements: 0
                  }))} 
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No trend data available
                </div>
              )}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Damage Severity</h3>
            <div className="h-80">
              {dashboardData && dashboardData.severityBreakdown && typeof dashboardData.severityBreakdown === 'object' ? (
                <AnalysisChart 
                  type="severity-breakdown" 
                  data={dashboardData.severityBreakdown}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No damage severity data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Damage Type Distribution</h3>
            <div className="h-80">
              {dashboardData && dashboardData.damageTypeDistribution && typeof dashboardData.damageTypeDistribution === 'object' ? (
                <AnalysisChart 
                  type="damage-analysis" 
                  damageData={Object.entries(dashboardData.damageTypeDistribution).map(([type, value]) => ({ 
                    type, 
                    count: (typeof value === 'number' ? value : 0) 
                  }))} 
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No damage type data available
                </div>
              )}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Claims Overview</h3>
            <div className="h-80 flex flex-col justify-center items-center space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{((dashboardData?.claimsSuccessRate || 0) * 100).toFixed(1)}%</div>
                <div className="text-gray-500">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{dashboardData?.avgClaimTime || 'N/A'}</div>
                <div className="text-gray-500">Avg. Processing Time</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Analyses Table */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">Recent Analyses</h3>
            <Link to="/history" className="text-blue-600 hover:underline">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">Vehicle</th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">Damage Type</th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">Severity</th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {dashboardData?.recentAnalyses && Array.isArray(dashboardData.recentAnalyses) && dashboardData.recentAnalyses.length > 0 ? (
                  dashboardData.recentAnalyses.slice(0, 5).map((analysis) => (
                    <tr key={analysis.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-600">{new Date(analysis.uploadedAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-sm text-gray-800 font-medium">{analysis.result?.vehicleIdentification?.make} {analysis.result?.vehicleIdentification?.model}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{analysis.result?.damageType}</td>
                      <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        analysis.result?.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        analysis.result?.severity === 'severe' ? 'bg-orange-100 text-orange-800' :
                        analysis.result?.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {analysis.result?.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link to={`/analysis/${analysis.id}`} className="text-blue-600 hover:underline">
                        Details
                      </Link>
                    </td>
                  </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-gray-500">
                      No recent analyses available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewDashboard;
