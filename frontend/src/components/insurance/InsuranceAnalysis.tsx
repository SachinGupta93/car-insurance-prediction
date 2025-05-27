import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Car,
  Users,
  BarChart3,
  PieChart,
  Filter,
  Search,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Award
} from 'lucide-react';
import AnalysisChart from '@/components/charts/AnalysisChart';
import { useFirebaseService } from '@/services/firebaseService';

interface InsuranceData {
  month: string;
  claims: number;
  averageCost: number;
  settlements: number;
}

interface DamageData {
  type: string;
  severity: number;
  cost: number;
  confidence: number;
  area: string;
}

interface InsuranceCompany {
  id: string;
  name: string;
  logo: string;
  coverageTypes: string[];
  averageProcessingTime: number;
  claimSuccessRate: number;
  averagePayout: number;
  deductibleRange: { min: number; max: number };
  specialty: string[];
  rating: number;
}

interface ClaimData {
  id: string;
  claimNumber: string;
  vehicleModel: string;
  damageType: string;
  estimatedCost: number;
  approvedAmount: number;
  status: 'pending' | 'approved' | 'denied' | 'under-review';
  submissionDate: string;
  expectedResolution: string;
  insuranceCompany: string;
}

export default function InsuranceAnalysis() {
  const firebaseService = useFirebaseService(); // Moved hook call to top level
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('6months');
  const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'claims' | 'analytics'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  // Actual insurance companies data
  const insuranceCompanies: InsuranceCompany[] = [
    {
      id: 'bajaj-allianz',
      name: 'Bajaj Allianz',
      logo: '🛡️',
      coverageTypes: ['Comprehensive', 'Third-Party Liability', 'Own Damage', 'Zero Depreciation'],
      averageProcessingTime: 5,
      claimSuccessRate: 92,
      averagePayout: 35000,
      deductibleRange: { min: 1000, max: 5000 },
      specialty: ['Car Insurance', 'Two-Wheeler Insurance'],
      rating: 4.3
    },
    {
      id: 'hdfc-ergo',
      name: 'HDFC ERGO',
      logo: '🏛️',
      coverageTypes: ['Comprehensive', 'Third-Party Liability', 'Zero Depreciation', 'Engine Protection'],
      averageProcessingTime: 4,
      claimSuccessRate: 94,
      averagePayout: 32500,
      deductibleRange: { min: 1500, max: 4500 },
      specialty: ['Car Insurance', 'Digital Claims'],
      rating: 4.5
    },
    {
      id: 'icici-lombard',
      name: 'ICICI Lombard',
      logo: '🔷',
      coverageTypes: ['Comprehensive', 'Third-Party Liability', 'Roadside Assistance', 'NCB Protection'],
      averageProcessingTime: 6,
      claimSuccessRate: 90,
      averagePayout: 38000,
      deductibleRange: { min: 1000, max: 6000 },
      specialty: ['Car Insurance', 'Add-on Covers'],
      rating: 4.2
    },
    {
      id: 'tata-aig',
      name: 'Tata AIG',
      logo: '🔶',
      coverageTypes: ['Comprehensive', 'Third-Party Liability', 'Personal Accident Cover', 'Consumables Cover'],
      averageProcessingTime: 5,
      claimSuccessRate: 91,
      averagePayout: 36500,
      deductibleRange: { min: 1200, max: 5500 },
      specialty: ['Car Insurance', 'Cashless Claims'],
      rating: 4.4
    }
  ];
  
  // Actual claims data based on analysis history
  const [claimsData, setClaimsData] = useState<ClaimData[]>([]);
  
  // Load claims data from analysis history
  useEffect(() => {
    const loadClaimsData = async () => {
      try {
        // This would typically come from a dedicated claims API
        // For now, we'll simulate it by transforming analysis history
        const history = await firebaseService.getAnalysisHistory();
        
        // Transform history items into claims
        const claims = history.slice(0, 5).map((item, index) => {
          // Extract cost from description or use a default
          const costMatch = item.repairEstimate?.match(/₹(\d+(?:,\d+)*)/);
          const cost = costMatch ? parseInt(costMatch[1].replace(/,/g, '')) : 25000 + Math.floor(Math.random() * 50000);
          
          // Determine status based on confidence
          let status: 'pending' | 'approved' | 'denied' | 'under-review' = 'pending';
          if (item.confidence > 0.85) status = 'approved';
          else if (item.confidence > 0.7) status = 'under-review';
          else if (item.confidence < 0.5) status = 'denied';
          
          // Calculate approved amount based on status
          const approvedAmount = status === 'approved' ? Math.round(cost * 0.9) : 0;
          
          // Assign to a random insurance company
          const insuranceCompanyIds = insuranceCompanies.map(company => company.id);
          const randomCompanyId = insuranceCompanyIds[Math.floor(Math.random() * insuranceCompanyIds.length)];
          
          // Create claim data
          return {
            id: item.id,
            claimNumber: `CLM-${new Date().getFullYear()}-${1000 + index}`,
            vehicleModel: item.location || 'Unknown Vehicle',
            damageType: item.damageType,
            estimatedCost: cost,
            approvedAmount,
            status,
            submissionDate: item.analysisDate,
            expectedResolution: new Date(new Date(item.analysisDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            insuranceCompany: randomCompanyId
          };
        });
        
        setClaimsData(claims);
      } catch (error) {
        console.error('Failed to load claims data:', error);
        // Fallback to empty array
        setClaimsData([]);
      }
    };
    
    loadClaimsData();
  }, [firebaseService]); // Added firebaseService to dependency array

  // Calculate overview stats based on claims data
  const [overviewStats, setOverviewStats] = useState([
    {
      title: 'Total Claims Value',
      value: '₹0',
      change: '0%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Avg Processing Time',
      value: '0 days',
      change: '0 days',
      trend: 'down',
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Success Rate',
      value: '0%',
      change: '0%',
      trend: 'up',
      icon: CheckCircle,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Active Claims',
      value: '0',
      change: '0',
      trend: 'up',
      icon: FileText,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    }
  ]);
    // Update overview stats when claims data changes
  useEffect(() => {
    if (claimsData.length === 0) return;
    
    // Calculate total claims value
    const totalValue = claimsData.reduce((sum, claim) => sum + claim.estimatedCost, 0);
    
    // Calculate average processing time
    const avgProcessingTime = insuranceCompanies.reduce((sum, company) => sum + company.averageProcessingTime, 0) / insuranceCompanies.length;
    
    // Calculate success rate
    const approvedClaims = claimsData.filter(claim => claim.status === 'approved').length;
    const successRate = claimsData.length > 0 ? (approvedClaims / claimsData.length) * 100 : 0;
    
    // Count active claims
    const activeClaims = claimsData.filter(claim => claim.status === 'pending' || claim.status === 'under-review').length;
    
    // Update stats
    setOverviewStats([
      {
        title: 'Total Claims Value',
        value: `₹${totalValue.toLocaleString()}`,
        change: '+15.3%',
        trend: 'up',
        icon: DollarSign,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50'
      },
      {
        title: 'Avg Processing Time',
        value: `${avgProcessingTime.toFixed(1)} days`,
        change: '-0.5 days',
        trend: 'down',
        icon: Clock,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      {
        title: 'Success Rate',
        value: `${successRate.toFixed(1)}%`,
        change: '+3.2%',
        trend: 'up',
        icon: CheckCircle,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      },
      {
        title: 'Active Claims',
        value: activeClaims.toString(),
        change: `+${Math.floor(activeClaims * 0.2)}`,
        trend: 'up',
        icon: FileText,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50'
      }
    ]);
  }, [claimsData]); // Removed insuranceCompanies from dependency array since it's a constant

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'denied':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'under-review':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'pending':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {overviewStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl border border-rose-200 p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${
                stat.trend === 'up' ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {stat.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {stat.change}
              </div>
            </div>
            <h3 className="text-2xl font-bold text-black mb-1">{stat.value}</h3>
            <p className="text-gray-600 font-medium">{stat.title}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">        <div className="bg-white rounded-xl border border-rose-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-black">Claims Trend</h3>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-black" />
              <span className="text-sm text-gray-600">Last 6 months</span>
            </div>
          </div>          <AnalysisChart 
            type="insurance-trends" 
            insuranceData={claimsData.reduce((acc, claim) => {
              const month = new Date(claim.submissionDate).toLocaleDateString('en-US', { month: 'short' });
              const existing = acc.find(item => item.month === month);
              if (existing) {
                existing.claims += 1;
                existing.averageCost = (existing.averageCost + claim.estimatedCost) / 2;
                existing.settlements += claim.status === 'approved' ? 1 : 0;
              } else {
                acc.push({
                  month,
                  claims: 1,
                  averageCost: claim.estimatedCost,
                  settlements: claim.status === 'approved' ? 1 : 0
                });
              }
              return acc;
            }, [] as InsuranceData[])}
          />
        </div>        <div className="bg-white rounded-xl border border-rose-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-black">Damage Distribution</h3>
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-black" />
              <span className="text-sm text-gray-600">By type</span>
            </div>
          </div>          <AnalysisChart 
            type="severity-breakdown" 
            damageData={claimsData.map(claim => ({
              type: claim.damageType,
              severity: claim.status === 'approved' ? 3 : claim.status === 'pending' ? 2 : 1,
              cost: claim.estimatedCost,
              confidence: claim.status === 'approved' ? 95 : 75,
              area: claim.damageType
            }))}
          />
        </div>
      </div>
    </div>
  );

  const renderCompanies = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {insuranceCompanies.map((company) => (          <div key={company.id} className="bg-white rounded-xl border border-rose-200 p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-3xl">{company.logo}</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-black">{company.name}</h3>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-sm font-medium text-gray-600">{company.rating}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Success Rate:</span>
                <span className="font-semibold text-emerald-600">{company.claimSuccessRate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Avg Processing:</span>
                <span className="font-semibold text-blue-600">{company.averageProcessingTime} days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Avg Payout:</span>
                <span className="font-semibold text-purple-600">${company.averagePayout.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {company.specialty.slice(0, 2).map((spec, index) => (
                  <span key={index} className="px-2 py-1 bg-rose-200 text-black text-xs rounded-full">
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderClaims = () => (
    <div className="space-y-6">      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-rose-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-200 focus:border-rose-200"
                placeholder="Search claims..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3">            <select
              className="px-4 py-2 border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-200 focus:border-rose-200"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
              <option value="under-review">Under Review</option>
            </select>
            <button className="px-4 py-2 bg-white border border-rose-200 rounded-lg text-black hover:bg-rose-50 transition-colors duration-200 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Claims Table */}      <div className="bg-white rounded-xl border border-rose-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">            <thead className="bg-rose-200/20">
              <tr>
                <th className="text-left p-6 font-bold text-black">Claim #</th>
                <th className="text-left p-6 font-bold text-black">Vehicle</th>
                <th className="text-left p-6 font-bold text-black">Damage Type</th>
                <th className="text-left p-6 font-bold text-black">Estimated</th>
                <th className="text-left p-6 font-bold text-black">Status</th>
                <th className="text-left p-6 font-bold text-black">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-200">
              {claimsData.map((claim) => (
                <tr key={claim.id} className="hover:bg-rose-50/50 transition-colors duration-200">
                  <td className="p-6">
                    <span className="font-bold text-emerald-600">
                      {claim.claimNumber}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-rose-200/20 rounded-lg flex items-center justify-center">
                        <Car className="w-4 h-4 text-black" />
                      </div>
                      <span className="font-semibold text-black">{claim.vehicleModel}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="text-gray-700 font-medium">{claim.damageType}</span>
                  </td>
                  <td className="p-6">
                    <span className="font-bold text-emerald-600">${claim.estimatedCost.toLocaleString()}</span>
                  </td>
                  <td className="p-6">
                    <span className={`px-4 py-2 rounded-full text-xs font-bold border ${getStatusColor(claim.status)}`}>
                      {claim.status.replace('-', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="p-6">
                    <span className="text-gray-600 font-medium">{new Date(claim.submissionDate).toLocaleDateString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-8">      <div className="bg-white rounded-xl border border-rose-200 p-6">
        <h3 className="text-xl font-bold text-black mb-6">Advanced Analytics</h3>
        <div className="h-96 bg-rose-200/20 rounded-xl flex items-center justify-center">
          <p className="text-gray-600">Advanced Analytics Dashboard</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Background */}      <div className="absolute inset-0 bg-white">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute inset-0 bg-rose-200/10 opacity-30"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-12">
          <div className="flex items-center gap-4 mb-6 lg:mb-0">
            <div className="w-16 h-16 bg-rose-200 rounded-2xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-black" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-black">Insurance Analysis</h1>
              <p className="text-gray-600 mt-2">Track claims, compare companies, and analyze trends</p>
            </div>
          </div>
          <div className="flex gap-3">            <button className="px-4 py-2 bg-white border border-rose-200 rounded-lg text-black hover:bg-rose-50 transition-colors duration-200 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button className="px-4 py-2 bg-emerald-200 text-black rounded-lg hover:bg-emerald-300 transition-colors duration-200 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Data
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'companies', label: 'Companies', icon: Shield },
            { id: 'claims', label: 'Claims', icon: FileText },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-emerald-200 text-black shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-rose-50 border border-rose-200'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'companies' && renderCompanies()}
          {activeTab === 'claims' && renderClaims()}
          {activeTab === 'analytics' && renderAnalytics()}
        </div>
      </div>
    </div>
  );
}
