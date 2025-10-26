import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
  Send,
  DollarSign,
  Calendar,
  Clock,
  BarChart3,
  Info,
  ArrowRight,
  Sparkles,
  Loader
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { UnifiedApiService } from '@/services/unifiedApiService';

interface Claim {
  id: string;
  vehicle: string;
  damageType: string;
  estimatedCost: number;
  claimAmount: number;
  status: 'Approved' | 'Pending' | 'Rejected';
  submittedDate: string;
  approvalDate: string | null;
  confidence: number;
  result?: any;
}

interface Stat {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: any;
  color: string;
}

const NewInsurancePage: React.FC = () => {
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [claimStatusData, setClaimStatusData] = useState<any[]>([]);
  const [monthlyClaimsData, setMonthlyClaimsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiService = new UnifiedApiService();

  // Transform API data to Claim format
  const transformAnalysisToClain = (analysis: any, index: number): Claim => {
    const result = analysis.result || analysis;
    const timestamp = analysis.uploadedAt || analysis.timestamp || analysis.created_at || new Date().toISOString();
    const date = new Date(timestamp);
    
    // Determine status based on confidence
    const confidence = Math.round((result?.confidence || 0) * 100);
    let status: 'Approved' | 'Pending' | 'Rejected' = 'Pending';
    if (confidence >= 85) {
      status = 'Approved';
    } else if (confidence < 60) {
      status = 'Rejected';
    }

    // Generate claim ID
    const claimId = analysis.id || `CLM-${String(index + 1).padStart(3, '0')}`;

    // Extract vehicle info
    const vehicleInfo = result?.vehicleIdentification || {};
    const vehicle = `${vehicleInfo.make || 'Unknown'} ${vehicleInfo.model || ''} ${vehicleInfo.year || ''}`.trim();

    // Estimate cost based on severity
    const severityMultiplier = {
      'severe': 50000,
      'moderate': 25000,
      'minor': 10000,
      'light': 5000
    } as Record<string, number>;
    
    const estimatedCost = severityMultiplier[result?.severity as string] || 20000;
    const claimAmount = Math.round(estimatedCost * (confidence / 100));

    return {
      id: claimId,
      vehicle: vehicle || 'Vehicle Analysis',
      damageType: result?.damageType || 'Damage',
      estimatedCost: estimatedCost,
      claimAmount: claimAmount,
      status: status,
      submittedDate: date.toISOString().split('T')[0],
      approvalDate: status !== 'Pending' ? date.toISOString().split('T')[0] : null,
      confidence: confidence,
      result: result
    };
  };

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get dashboard data which includes history
        const dashboardData = await apiService.getDashboardData();
        
        // Get recent analyses from the dashboard data
        const recentAnalyses = dashboardData.recentAnalyses || [];
        
        // Get full history for more comprehensive claims list
        const history = await apiService.getUserHistory();
        
        // Combine and transform data
        const allAnalyses = [...recentAnalyses, ...(history || [])];
        const transformedClaims = allAnalyses
          .map((analysis, index) => transformAnalysisToClain(analysis, index))
          .slice(0, 20); // Limit to 20 most recent

        setClaims(transformedClaims);

        // Calculate stats from claims
        const approvedCount = transformedClaims.filter(c => c.status === 'Approved').length;
        const totalClaimed = transformedClaims.reduce((sum, c) => sum + c.claimAmount, 0);
        const successRate = transformedClaims.length > 0 
          ? Math.round((approvedCount / transformedClaims.length) * 100)
          : 0;

        const calculatedStats: Stat[] = [
          {
            title: 'Total Claims',
            value: transformedClaims.length.toString(),
            change: '+2',
            trend: 'up',
            icon: FileText,
            color: 'from-blue-500 to-cyan-500'
          },
          {
            title: 'Approved Claims',
            value: approvedCount.toString(),
            change: '+1',
            trend: 'up',
            icon: CheckCircle2,
            color: 'from-emerald-500 to-teal-500'
          },
          {
            title: 'Total Claimed',
            value: `₹${(totalClaimed / 1000).toFixed(0)}K`,
            change: '+15%',
            trend: 'up',
            icon: DollarSign,
            color: 'from-purple-500 to-indigo-500'
          },
          {
            title: 'Success Rate',
            value: `${successRate}%`,
            change: successRate >= 70 ? '+5%' : '-5%',
            trend: successRate >= 70 ? 'up' : 'down',
            icon: TrendingUp,
            color: successRate >= 70 ? 'from-emerald-500 to-teal-500' : 'from-rose-500 to-pink-500'
          }
        ];
        setStats(calculatedStats);

        // Calculate claim status distribution
        const claimStatuses = {
          Approved: transformedClaims.filter(c => c.status === 'Approved').length,
          Pending: transformedClaims.filter(c => c.status === 'Pending').length,
          Rejected: transformedClaims.filter(c => c.status === 'Rejected').length
        };

        const statusData = [
          { name: 'Approved', value: claimStatuses.Approved, color: '#10b981' },
          { name: 'Pending', value: claimStatuses.Pending, color: '#f59e0b' },
          { name: 'Rejected', value: claimStatuses.Rejected, color: '#ef4444' }
        ].filter(item => item.value > 0); // Only show statuses with claims

        setClaimStatusData(statusData);

        // Calculate monthly trend from claims data
        const monthlyMap = new Map<string, { approved: number; pending: number; rejected: number }>();
        
        transformedClaims.forEach(claim => {
          const date = new Date(claim.submittedDate);
          const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
          
          if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, { approved: 0, pending: 0, rejected: 0 });
          }
          
          const monthData = monthlyMap.get(monthKey)!;
          if (claim.status === 'Approved') monthData.approved++;
          else if (claim.status === 'Pending') monthData.pending++;
          else if (claim.status === 'Rejected') monthData.rejected++;
        });

        // Get last 4 months or available data
        const months = Array.from(monthlyMap.entries())
          .map(([month, data]) => ({
            month,
            approved: data.approved,
            pending: data.pending,
            rejected: data.rejected
          }))
          .slice(-4);

        setMonthlyClaimsData(months.length > 0 ? months : [
          { month: 'Jan', approved: 0, rejected: 0, pending: 0 }
        ]);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load claims data';
        console.error('Error fetching dashboard data:', err);
        setError(errorMessage);
        
        // Set empty state for UI to not break
        setClaims([]);
        setStats([
          {
            title: 'Total Claims',
            value: '0',
            change: '+0',
            trend: 'up',
            icon: FileText,
            color: 'from-blue-500 to-cyan-500'
          },
          {
            title: 'Approved Claims',
            value: '0',
            change: '+0',
            trend: 'up',
            icon: CheckCircle2,
            color: 'from-emerald-500 to-teal-500'
          },
          {
            title: 'Total Claimed',
            value: '₹0K',
            change: '+0%',
            trend: 'up',
            icon: DollarSign,
            color: 'from-purple-500 to-indigo-500'
          },
          {
            title: 'Success Rate',
            value: '0%',
            change: '+0%',
            trend: 'up',
            icon: TrendingUp,
            color: 'from-rose-500 to-pink-500'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'Approved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Pending': 'bg-amber-50 text-amber-700 border-amber-200',
      'Rejected': 'bg-rose-50 text-rose-700 border-rose-200'
    };
    return colors[status] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'Pending':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'Rejected':
        return <XCircle className="w-5 h-5 text-rose-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Loading your insurance claims...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
                Insurance Claims
              </h1>
              <p className="text-slate-600 text-lg">Track and manage your insurance claims</p>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export Claims
              </Button>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 gap-2">
                <Send className="w-4 h-4" />
                Submit New Claim
              </Button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </p>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <Card key={index} className="hover:shadow-xl transition-all duration-300 border-2 hover:border-purple-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-600">{stat.title}</CardTitle>
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} text-white`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                      <div className="flex items-center gap-1 mt-1">
                        {stat.trend === 'up' ? (
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-rose-600" />
                        )}
                        <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {stat.change}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Claim Status Distribution */}
          <Card className="hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Claim Status
              </CardTitle>
              <CardDescription>Distribution of claims by status</CardDescription>
            </CardHeader>
            <CardContent>
              {claimStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={claimStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {claimStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  <p>No claim data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Claims Trend */}
          <Card className="lg:col-span-2 hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Monthly Claims Trend
              </CardTitle>
              <CardDescription>Track your claims over time</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyClaimsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyClaimsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                    <Legend />
                    <Bar dataKey="approved" fill="#10b981" name="Approved" />
                    <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                    <Bar dataKey="rejected" fill="#ef4444" name="Rejected" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  <p>No trend data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Claims List */}
        <Card className="hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Recent Claims
            </CardTitle>
            <CardDescription>View details of your insurance claims</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {claims.length > 0 ? (
                claims.map((claim) => (
                  <div
                    key={claim.id}
                    className="p-6 rounded-lg border-2 border-slate-200 hover:border-purple-300 transition-all cursor-pointer bg-white"
                    onClick={() => setSelectedClaim(claim.id)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Left Section */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white">
                            <Shield className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">{claim.vehicle}</h3>
                            <p className="text-sm text-slate-600">Claim ID: {claim.id}</p>
                          </div>
                          <Badge variant="outline" className={getStatusColor(claim.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(claim.status)}
                              {claim.status}
                            </span>
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-slate-600 mb-1">Damage Type</p>
                            <p className="font-semibold text-slate-900">{claim.damageType}</p>
                          </div>
                          <div>
                            <p className="text-slate-600 mb-1">Estimated Cost</p>
                            <p className="font-semibold text-slate-900">₹{claim.estimatedCost.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-slate-600 mb-1">Claim Amount</p>
                            <p className="font-semibold text-emerald-600">₹{claim.claimAmount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-slate-600 mb-1">Submitted</p>
                            <p className="font-semibold text-slate-900">
                              {new Date(claim.submittedDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right Section */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm text-slate-600 mb-1">AI Confidence</p>
                          <div className="flex items-center gap-2">
                            <Progress value={claim.confidence} className="w-24 h-2" />
                            <span className="text-sm font-semibold text-slate-900">{claim.confidence}%</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2">
                          <ArrowRight className="w-4 h-4" />
                          Details
                        </Button>
                      </div>
                    </div>

                    {/* Timeline for approved/rejected claims */}
                    {claim.approvalDate && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="w-4 h-4" />
                          <span>Decision Date: {new Date(claim.approvalDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No claims found. Submit an analysis to create your first claim.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Card className="hover:shadow-xl transition-shadow border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Info className="w-5 h-5" />
                Claim Submission Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
                <p className="text-sm">Upload clear, well-lit images of the vehicle damage</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
                <p className="text-sm">Include all relevant documentation and police reports if applicable</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
                <p className="text-sm">AI analysis reports with high confidence (&gt;85%) have better approval rates</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-shadow border-2 border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <Sparkles className="w-5 h-5" />
                AI-Powered Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-purple-600" />
                <p className="text-sm">Advanced computer vision detects damage automatically</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-purple-600" />
                <p className="text-sm">AI estimates repair costs with 95% accuracy</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-purple-600" />
                <p className="text-sm">Instant processing - get results in seconds</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NewInsurancePage;
