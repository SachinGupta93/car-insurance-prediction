import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  Shield, 
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
import AnalysisChart from '../charts/AnalysisChart';

// Insurance dashboard data structure
interface InsuranceDashboardData {
  totalClaims: number;
  avgClaimValue: number;
  topInsuranceType: string;
  claimsThisMonth: number;
  totalInsuranceValue: number;
  claimApprovalRate: number;
  pendingApprovals: number;
  avgProcessingTime: string;
  monthlyTrends: Array<{ month: string; claims: number; settlements: number; averageCost: number }>;
  coverageBreakdown: Record<string, number>;
  claimStatusDistribution: Record<string, number>;
  recentClaims: Array<any>;
}

// Stat card component
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  isOnline: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, isOnline }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
    <div className="flex items-center justify-between mb-4">
      <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
        <Icon className="w-6 h-6 text-rose-800" />
      </div>
      {!isOnline && (
        <div className="w-2 h-2 bg-gray-400 rounded-full" title="Offline data" />
      )}
    </div>
    <h3 className="text-2xl font-bold text-gray-800 mb-1">{value}</h3>
    <p className="text-gray-500">{label}</p>
  </div>
);

const InsuranceDashboard: React.FC = () => {
  const { firebaseUser } = useFirebaseAuth();
  const [dashboardData, setDashboardData] = useState<InsuranceDashboardData | null>(null);
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
      console.log('📡 Insurance Dashboard: Calling admin API...');
      const response = await unifiedApiService.getInsuranceDashboardData();
      console.log('🔍 Insurance Dashboard: Full API response:', response);
      console.log('🔍 Insurance Dashboard: Dashboard data:', response.data);
      console.log('🔍 Insurance Dashboard: Data source:', response.data_source);
      console.log('🔍 Insurance Dashboard: Message:', response.message);
      
      setDashboardData(response.data);
      setDataSource(response.data_source || 'unknown');
      setDataMessage(response.message || '');
      hasLoadedDataRef.current = true;
    } catch (err) {
      setError('Failed to load insurance dashboard data. Please try again later.');
      console.error('Insurance dashboard loading error:', err);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (firebaseUser && !hasLoadedDataRef.current) {
      loadDashboardData();
    }
  }, [firebaseUser, loadDashboardData]);

  if (loading && !dashboardData) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-24 w-24 border-t-2 border-b-2 border-rose-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">Loading your insurance dashboard...</p>
          {!isOnline && (
            <p className="text-sm text-gray-500 mt-2">You appear to be offline. Loading may take longer.</p>
          )}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Something Went Wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => loadDashboardData(true)}
            className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = dashboardData ? [
    { id: 1, value: (dashboardData.totalClaims || 0).toLocaleString(), label: 'Total Claims', icon: FileText },
    { id: 2, value: `₹${(dashboardData.avgClaimValue || 0).toLocaleString()}`, label: 'Avg. Claim Value', icon: DollarSign },
    { id: 3, value: `${((dashboardData.claimApprovalRate || 0) * 100).toFixed(1)}%`, label: 'Approval Rate', icon: CheckCircle },
    { id: 4, value: (dashboardData.pendingApprovals || 0).toLocaleString(), label: 'Pending Approvals', icon: Clock },
  ] : [];

  return (
    <div className="bg-gray-50 p-4 sm:p-6 rounded-xl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Insurance Dashboard</h2>
            <p className="text-gray-500">Overview of insurance claims and policies</p>
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
          </div>
        </div>

        {/* Data Source Indicator */}
        {dataSource && (
          <div className={`mb-6 p-4 rounded-lg border ${
            dataSource === 'real'
              ? 'bg-green-50 border-green-200 text-green-800'
              : dataSource === 'empty'
              ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
              : 'bg-gray-50 border-gray-200 text-gray-800'
          }`}>
            <div className="flex items-center gap-2">
              {dataSource === 'real' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="font-medium">
                {dataSource === 'real' ? 'Real Insurance Data' : dataSource === 'empty' ? 'No Data Available' : 'Unknown Data Source'}
              </span>
              <span className="text-sm opacity-75">
                {dataMessage || (dataSource === 'real' ? 'Live insurance data from Firebase' : 'No insurance data available')}
              </span>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => (
            <StatCard key={stat.id} {...stat} isOnline={isOnline} />
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Monthly Claims Trends</h3>
            <div className="h-80">
              {dashboardData && dashboardData.monthlyTrends && Array.isArray(dashboardData.monthlyTrends) && dashboardData.monthlyTrends.length > 0 ? (
                <AnalysisChart 
                  type="insurance-trends" 
                  insuranceData={dashboardData.monthlyTrends} 
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No trend data available
                </div>
              )}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Coverage Distribution</h3>
            <div className="h-80">
              {dashboardData && dashboardData.coverageBreakdown && typeof dashboardData.coverageBreakdown === 'object' ? (
                <AnalysisChart 
                  type="coverage-breakdown" 
                  data={dashboardData.coverageBreakdown}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No coverage data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Charts Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Claims Status</h3>
          <div className="h-80">
            {dashboardData && dashboardData.claimStatusDistribution && typeof dashboardData.claimStatusDistribution === 'object' ? (
              <AnalysisChart 
                type="claim-status" 
                data={dashboardData.claimStatusDistribution}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No claims status data available
              </div>
            )}
          </div>
        </div>

        {/* Recent Claims Table */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">Recent Claims</h3>
            <button className="text-rose-600 hover:underline">View All Claims</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">Policy Number</th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">Provider</th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {dashboardData?.recentClaims && Array.isArray(dashboardData.recentClaims) && dashboardData.recentClaims.length > 0 ? (
                  dashboardData.recentClaims.map((claim) => (
                    <tr key={claim.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-600">{new Date(claim.submittedAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-sm text-gray-800 font-medium">{claim.claimDetails?.policyNumber}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{claim.claimDetails?.insuranceProvider}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">₹{claim.claimDetails?.claimAmount?.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          claim.claimDetails?.status === 'approved' ? 'bg-green-100 text-green-800' :
                          claim.claimDetails?.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {claim.claimDetails?.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button className="text-rose-600 hover:underline">
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center text-gray-500">
                      No recent claims available
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

export default InsuranceDashboard;
