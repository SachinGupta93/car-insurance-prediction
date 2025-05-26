import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Car, 
  BarChart3, 
  TrendingUp, 
  Shield, 
  Camera, 
  History, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  FileText,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AnalysisChart from '@/components/charts/AnalysisChart';
import { useHistory, AnalysisHistoryItem } from '@/context/HistoryContext';
import { VehicleIdentification } from '@/types';

interface DashboardStats {
  totalAnalyses: number;
  pendingClaims: number;
  averageCost: number;
  successRate: number;
}

// Define a type for the processed recent analysis item for the table
interface RecentAnalysisDisplayItem {
  id: string;
  vehicleModel: string;
  damageType: string;
  severity: string;
  estimatedCost: number;
  status: string;
  date: string;
  confidence: number;
}

export default function ModernDashboard() {
  const { user } = useAuth();
  const { history, loadingHistory } = useHistory();
  const [activeTab, setActiveTab] = useState('overview');

  const [stats, setStats] = useState<DashboardStats>({
    totalAnalyses: 0,
    pendingClaims: 0, 
    averageCost: 0,
    successRate: 0,
  });

  const [recentAnalysesForDisplay, setRecentAnalysesForDisplay] = useState<RecentAnalysisDisplayItem[]>([]);

  useEffect(() => {
    if (!loadingHistory && history.length > 0) {
      const totalAnalyses = history.length;
      const totalCost = history.reduce((acc, item) => {
        const costString = item.repairEstimate?.replace(/[^\d.-]/g, '') || '0';
        return acc + parseFloat(costString);
      }, 0);
      const averageCost = totalAnalyses > 0 ? totalCost / totalAnalyses : 0;
      
      setStats({
        totalAnalyses,
        averageCost,
        pendingClaims: 12, // Placeholder
        successRate: 94.2, // Placeholder
      });

      const mappedRecentAnalyses: RecentAnalysisDisplayItem[] = history
        .slice(0, 5)
        .map((item: AnalysisHistoryItem) => {
          // Safely access vehicleIdentification properties
          const vehicleMake = (item as any).vehicleIdentification?.make || 'N/A';
          const vehicleModelName = (item as any).vehicleIdentification?.model || 'N/A';
          
          return {
            id: item.id,
            vehicleModel: `${vehicleMake} ${vehicleModelName}`,
            damageType: item.damageType,
            severity: item.severity || 'N/A',
            estimatedCost: parseFloat(item.repairEstimate?.replace(/[^\d.-]/g, '') || '0'),
            status: 'Completed', // Adjust if status is available in AnalysisHistoryItem
            date: new Date(item.analysisDate).toLocaleDateString(),
            confidence: Math.round(item.confidence * 100)
          };
        });
      setRecentAnalysesForDisplay(mappedRecentAnalyses);

    } else if (!loadingHistory && history.length === 0) {
      // Handle case with no history items
      setStats({
        totalAnalyses: 0,
        averageCost: 0,
        pendingClaims: 0,
        successRate: 0,
      });
      setRecentAnalysesForDisplay([]);
    }
  }, [history, loadingHistory]);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'minor': return 'text-success-600 bg-success-50';
      case 'moderate': return 'text-warning-600 bg-warning-50';
      case 'severe': return 'text-danger-600 bg-danger-50';
      case 'critical': return 'text-danger-800 bg-danger-100';
      default: return 'text-secondary-600 bg-secondary-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'text-success-600 bg-success-50';
      case 'under review': return 'text-warning-600 bg-warning-50';
      case 'claim filed': return 'text-insurance-600 bg-insurance-50';
      default: return 'text-secondary-600 bg-secondary-50';
    }
  };  
  
  return (
    <div className="dashboard-container min-h-screen relative">
      {/* Background */}
      <div className="absolute inset-0 bg-white">
        <div className="absolute inset-0 bg-rose-200/20"></div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-200 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-rose-200/50 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-rose-200 rounded-full filter blur-2xl animate-pulse" style={{animationDelay: '4s'}}></div>
        </div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-white/10 backdrop-blur-lg border-b border-rose-200/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center">
            <div className="animate-fadeInUp">
              <h1 className="text-4xl font-bold text-black">
                Welcome back, {user?.displayName || user?.email?.split('@')[0] || 'User'}!
              </h1>
              <p className="text-gray-700 mt-2 text-lg">
                AI-powered car damage analysis and insurance claims
              </p>
            </div>            
            <div className="flex items-center space-x-4 animate-slideInFromRight">
            <Link to="/upload" className="px-4 py-2 bg-emerald-200 text-black rounded-lg hover:bg-emerald-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 flex items-center">
                <Camera className="h-5 w-5 mr-2 inline-block" />
                <span>New Analysis</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">        
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-rose-200/30 shadow-sm hover:shadow-lg transition-all duration-300 animate-fadeInUp" style={{"animationDelay": "0.1s"}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Analyses</p>
                <p className="text-3xl font-bold text-black mt-2">{loadingHistory ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalAnalyses.toLocaleString()}</p>
              </div>
              <div className="bg-emerald-200 p-3 rounded-2xl">
                <Car className="h-8 w-8 text-black" />
              </div>
            </div>
            {/* Trend data can be added here if available */}
          </div>          
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-rose-200/30 shadow-sm hover:shadow-lg transition-all duration-300 animate-fadeInUp" style={{"animationDelay": "0.2s"}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Pending Claims</p>
                <p className="text-3xl font-bold text-black mt-2">{loadingHistory ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.pendingClaims}</p>
              </div>              
              <div className="bg-emerald-200 p-3 rounded-2xl">
                <Clock className="h-8 w-8 text-black" />
              </div>
            </div>
            {/* Trend data can be added here if available */}
          </div>          
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-rose-200/30 shadow-sm hover:shadow-lg transition-all duration-300 animate-fadeInUp" style={{"animationDelay": "0.3s"}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Average Cost</p>
                <p className="text-3xl font-bold text-black mt-2">{loadingHistory ? <Loader2 className="h-6 w-6 animate-spin" /> : `$${stats.averageCost.toFixed(2)}`}</p>
              </div>
              <div className="bg-emerald-200 p-3 rounded-2xl">
                <DollarSign className="h-8 w-8 text-black" />
              </div>
            </div>
            {/* Trend data can be added here if available */}
          </div>          
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-rose-200/30 shadow-sm hover:shadow-lg transition-all duration-300 animate-fadeInUp" style={{"animationDelay": "0.4s"}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Success Rate</p>
                <p className="text-3xl font-bold text-black mt-2">{loadingHistory ? <Loader2 className="h-6 w-6 animate-spin" /> : `${stats.successRate}%`}</p>
              </div>
              <div className="bg-emerald-200 p-3 rounded-2xl">
                <CheckCircle className="h-8 w-8 text-black" />
              </div>
            </div>
            {/* Trend data can be added here if available */}
          </div>
        </div>        
        {/* Charts Section - Keep existing charts, they use mock data internally or specific props not tied to history items directly */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-rose-200/30 shadow-sm hover:shadow-lg transition-all duration-300 animate-slideInFromLeft">
            <AnalysisChart 
              type="damage-analysis" 
              title="Recent Damage Analysis"
              className="col-span-1"
            />
          </div>
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-rose-200/30 shadow-sm hover:shadow-lg transition-all duration-300 animate-slideInFromRight">
            <AnalysisChart 
              type="cost-estimate" 
              title="Cost Trend Analysis"
              className="col-span-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-rose-200/30 shadow-sm hover:shadow-lg transition-all duration-300 animate-slideInFromLeft" style={{"animationDelay": "0.2s"}}>
            <AnalysisChart 
              type="insurance-trends" 
              title="Insurance Claims Overview"
              className="col-span-1"
            />
          </div>
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-rose-200/30 shadow-sm hover:shadow-lg transition-all duration-300 animate-slideInFromRight" style={{"animationDelay": "0.2s"}}>
            <AnalysisChart 
              type="severity-breakdown" 
              title="Damage Severity Distribution"
              className="col-span-1"
            />
          </div>
        </div>        
        {/* Recent Analyses Table */}
        <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-rose-200/30 shadow-sm hover:shadow-lg transition-all duration-300 animate-fadeInUp">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">Recent Analyses</h2>
            <Link to="/history" className="px-4 py-2 bg-emerald-200 text-black rounded-lg hover:bg-emerald-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 flex items-center">
              <History className="h-4 w-4 mr-2 inline-block" />
              <span>View All</span>
            </Link>
          </div>

          <div className="overflow-x-auto">
            {loadingHistory ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="mt-2 text-muted-foreground">Loading analyses...</p>
              </div>
            ) : recentAnalysesForDisplay.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-muted-foreground">No recent analyses found.</p>
                <p className="text-sm text-gray-500 mt-1">Start by performing a <Link to="/upload" className="text-emerald-600 hover:underline">new analysis</Link>.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-rose-200/30">
                    <th className="text-left py-4 px-4 font-semibold text-gray-600">Vehicle</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-600">Damage Type</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-600">Severity</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-600">Estimated Cost</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-600">Status</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-600">Confidence</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAnalysesForDisplay.map((analysis, index) => (
                    <tr key={analysis.id} className="border-b border-rose-200/10 hover:bg-rose-200/5 transition-all duration-300" style={{"animationDelay": `${0.1 * index}s`}}>
                      <td className="py-4 px-4 text-black">{analysis.vehicleModel}</td>
                      <td className="py-4 px-4 text-black">{analysis.damageType}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(analysis.severity)}`}>
                          {analysis.severity}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-black">${analysis.estimatedCost.toFixed(2)}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(analysis.status)}`}>
                          {analysis.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-black">{analysis.confidence}%</td>
                      <td className="py-4 px-4 text-black">{analysis.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
