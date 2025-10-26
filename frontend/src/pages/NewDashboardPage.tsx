import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Car,
  FileText,
  DollarSign,
  AlertTriangle,
  Activity,
  BarChart3,
  PieChart,
  Download,
  Calendar,
  Users,
  Shield,
  Zap,
  Clock
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import unifiedApiService from '@/services/unifiedApiService';

const NewDashboardPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [damageTypeData, setDamageTypeData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [severityData, setSeverityData] = useState<any[]>([]);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);

  const parseRupees = (value: any): number => {
    if (!value) return 0;
    const str = typeof value === 'string' ? value : value.rupees;
    if (!str) return 0;
    const digits = str.replace(/[^0-9]/g, '');
    const num = parseInt(digits || '0', 10);
    return isNaN(num) ? 0 : num;
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [dash, history] = await Promise.all([
          unifiedApiService.getDashboardData().catch(() => null),
          unifiedApiService.getUserHistory().catch(() => [])
        ]);

        const itemsAll: any[] = Array.isArray(history) ? history : [];

        // Apply time-range filter locally
        const now = Date.now();
        const ranges: Record<string, number> = {
          '24h': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000,
          '90d': 90 * 24 * 60 * 60 * 1000
        };
        const windowMs = ranges[timeRange] ?? ranges['7d'];
        const items = itemsAll.filter((it) => {
          const t = new Date(it.uploadedAt || it.timestamp || it.analysisDate || Date.now()).getTime();
          return now - t <= windowMs;
        });

        // Recent analyses (latest 5)
        const recent = items
          .slice()
          .sort((a, b) => new Date(b.uploadedAt || b.timestamp || 0).getTime() - new Date(a.uploadedAt || a.timestamp || 0).getTime())
          .slice(0, 5)
          .map((it) => {
            const res = it.result || it;
            const vi = res?.vehicleIdentification || {};
            const vehicle = [vi.make, vi.model, vi.year].filter(Boolean).join(' ').trim() || it.filename || 'Vehicle';
            const damage = res?.damageType || 'Damage';
            const cost = parseRupees(res?.enhancedRepairCost?.comprehensive?.rupees) || parseRupees(res?.repairEstimate);
            const conf = res?.confidence;
            const confidence = typeof conf === 'number' ? (conf <= 1 ? Math.round(conf * 100) : Math.round(conf)) : 0;
            return { id: it.id || vehicle, vehicle, damage, cost: cost ? `₹${cost.toLocaleString()}` : '—', confidence, status: 'Completed' };
          });
        setRecentAnalyses(recent);

        // Damage type distribution
        const typeMap = new Map<string, number>();
        items.forEach((it) => {
          const res = it.result || it;
          const t = (res?.damageType || 'Other').toString();
          typeMap.set(t, (typeMap.get(t) || 0) + 1);
        });
        const palette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6b7280'];
        const typesArr = Array.from(typeMap.entries()).slice(0, 6).map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }));
        setDamageTypeData(typesArr);

        // Trend (respect selected range)
        const dayMap = new Map<string, number>();
        items.forEach((it) => {
          const d = new Date(it.uploadedAt || it.timestamp || new Date());
          const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          dayMap.set(key, (dayMap.get(key) || 0) + 1);
        });
        const trendArr = Array.from(dayMap.entries()).map(([date, count]) => ({ date, analyses: count }));
        setTrendData(trendArr);

        // Severity
        let minor = 0, moderate = 0, severe = 0;
        items.forEach((it) => {
          const sev = ((it.result?.severity || it.severity || '').toString().toLowerCase());
          if (sev === 'minor') minor++;
          else if (sev === 'severe' || sev === 'critical') severe++;
          else moderate++;
        });
        const total = Math.max(1, minor + moderate + severe);
        setSeverityData([
          { severity: 'Minor', count: minor, percentage: Math.round((minor / total) * 100) },
          { severity: 'Moderate', count: moderate, percentage: Math.round((moderate / total) * 100) },
          { severity: 'Severe', count: severe, percentage: Math.round((severe / total) * 100) }
        ]);

        // Stats
        const totalAnalyses = items.length;
        const totalCost = items.reduce((s, it) => {
          const res = it.result || it;
          return s + (parseRupees(res?.enhancedRepairCost?.comprehensive?.rupees) || 0);
        }, 0);
        const avgConfidence = items.length ? Math.round((items.reduce((s, it) => {
          const c = it.result?.confidence ?? it.confidence ?? 0;
          const val = typeof c === 'number' ? (c <= 1 ? c * 100 : c) : 0;
          return s + val;
        }, 0) / items.length) * 10) / 10 : 0;
        const criticalCases = items.filter((it) => {
          const sev = (it.result?.severity || it.severity || '').toString().toLowerCase();
          return sev === 'severe' || sev === 'critical';
        }).length;

        const formatMillions = (n: number) => {
          if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(1)}M`;
          if (n >= 1000) return `₹${Math.round(n / 1000)}K`;
          return `₹${n.toLocaleString()}`;
        };

        setStats([
          { title: 'Total Analyses', value: totalAnalyses.toLocaleString(), change: '', trend: 'up', icon: <FileText className="w-6 h-6" />, color: 'from-blue-500 to-cyan-500' },
          { title: 'Total Cost Est.', value: formatMillions(totalCost), change: '', trend: 'up', icon: <DollarSign className="w-6 h-6" />, color: 'from-emerald-500 to-teal-500' },
          { title: 'Avg. Confidence', value: `${avgConfidence}%`, change: '', trend: 'up', icon: <Activity className="w-6 h-6" />, color: 'from-purple-500 to-indigo-500' },
          { title: 'Critical Cases', value: criticalCases.toString(), change: '', trend: 'down', icon: <AlertTriangle className="w-6 h-6" />, color: 'from-rose-500 to-pink-500' }
        ]);

      } catch (e: any) {
        setError(e?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-rose-600">{error}</p>
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
                Analytics Dashboard
              </h1>
              <p className="text-slate-600 text-lg">Monitor your damage analysis performance</p>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export Report
              </Button>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 gap-2">
                <Calendar className="w-4 h-4" />
                Schedule Report
              </Button>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-2">
            {['24h', '7d', '30d', '90d'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                onClick={() => setTimeRange(range)}
                size="sm"
                className={timeRange === range ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="hover:shadow-xl transition-all duration-300 border-2 hover:border-purple-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600">{stat.title}</CardTitle>
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} text-white`}>
                    {stat.icon}
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
                      <span className="text-sm text-slate-500">vs last period</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Trend Chart */}
          <Card className="lg:col-span-2 hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Analysis Trends
              </CardTitle>
              <CardDescription>Daily analysis volume and cost estimates</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorAnalyses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Area type="monotone" dataKey="analyses" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorAnalyses)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Damage Distribution */}
          <Card className="hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-600" />
                Damage Types
              </CardTitle>
              <CardDescription>Distribution by category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPie>
                  <Pie
                    data={damageTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {damageTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Severity Analysis */}
        <Card className="mb-8 hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              Severity Distribution
            </CardTitle>
            <CardDescription>Analysis breakdown by damage severity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {severityData.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={`
                          ${item.severity === 'Minor' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                          ${item.severity === 'Moderate' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                          ${item.severity === 'Severe' ? 'bg-rose-50 text-rose-700 border-rose-200' : ''}
                        `}
                      >
                        {item.severity}
                      </Badge>
                      <span className="text-sm font-medium text-slate-600">{item.count} cases</span>
                    </div>
                    <span className="text-lg font-bold text-slate-900">{item.percentage}%</span>
                  </div>
                  <Progress 
                    value={item.percentage} 
                    className="h-3"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Analyses Table */}
        <Card className="hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              Recent Analyses
            </CardTitle>
            <CardDescription>Latest damage assessments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Vehicle</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Damage Type</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Est. Cost</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Confidence</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAnalyses.map((analysis) => (
                    <tr key={analysis.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white">
                            <Car className="w-5 h-5" />
                          </div>
                          <span className="font-medium text-slate-900">{analysis.vehicle}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-600">{analysis.damage}</td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-slate-900">{analysis.cost}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 rounded-full h-2 max-w-[80px]">
                            <div 
                              className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full"
                              style={{ width: `${analysis.confidence}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-slate-700">{analysis.confidence}%</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge
                          variant="outline"
                          className={
                            analysis.status === 'Completed' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }
                        >
                          {analysis.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewDashboardPage;
