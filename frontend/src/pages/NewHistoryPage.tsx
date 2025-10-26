import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  Car,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  MapPin,
  FileText,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import unifiedApiService from '@/services/unifiedApiService';

interface Analysis {
  id: string;
  date: string;
  time: string;
  vehicle: string;
  damageType: string;
  severity: 'Minor' | 'Moderate' | 'Severe';
  estimatedCost: number;
  confidence: number;
  regions: number;
  status: 'Completed' | 'Pending' | 'Failed';
  imageUrl?: string;
}

const NewHistoryPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedView, setSelectedView] = useState<'timeline' | 'grid'>('timeline');
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parseRupees = (value: any): number => {
    if (!value) return 0;
    const str = typeof value === 'string' ? value : value.rupees;
    if (!str) return 0;
    const digits = str.replace(/[^0-9]/g, '');
    const num = parseInt(digits || '0', 10);
    return isNaN(num) ? 0 : num;
  };

  const toSeverity = (sev?: string): Analysis['severity'] => {
    const s = (sev || '').toLowerCase();
    if (s === 'minor') return 'Minor';
    if (s === 'severe' || s === 'critical') return 'Severe';
    return 'Moderate';
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const items = await unifiedApiService.getUserHistory();
        const mapped: Analysis[] = (items || []).map((item: any, idx: number) => {
          const result = item.result || item;
          const ts = item.uploadedAt || item.timestamp || item.analysisDate || new Date().toISOString();
          const dt = new Date(ts);
          const date = dt.toISOString().split('T')[0];
          const time = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const vi = result?.vehicleIdentification || {};
          const vehicle = [vi.make, vi.model, vi.year].filter(Boolean).join(' ').trim() || item.filename || 'Vehicle Analysis';
          const damageType = result?.damageType || 'Damage';
          const severity = toSeverity(result?.severity);
          const estimatedCost = parseRupees(result?.enhancedRepairCost?.comprehensive?.rupees) || parseRupees(result?.repairEstimate);
          const conf = result?.confidence;
          const confidence = typeof conf === 'number' ? (conf <= 1 ? Math.round(conf * 100) : Math.round(conf)) : 0;
          const regions = Array.isArray(result?.identifiedDamageRegions) ? result.identifiedDamageRegions.length : (item.damageRegions?.length || 0);
          return {
            id: item.id || `${dt.getTime()}-${idx}`,
            date,
            time,
            vehicle,
            damageType,
            severity,
            estimatedCost,
            confidence,
            regions,
            status: 'Completed',
            imageUrl: item.thumbnailUrl || item.imageUrl
          } as Analysis;
        }).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
        setAnalyses(mapped);
      } catch (e: any) {
        setError(e?.message || 'Failed to load history');
        setAnalyses([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getSeverityColor = (severity: Analysis['severity']) => {
    const colors = {
      'Minor': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Moderate': 'bg-amber-50 text-amber-700 border-amber-200',
      'Severe': 'bg-rose-50 text-rose-700 border-rose-200'
    };
    return colors[severity];
  };

  const getStatusColor = (status: Analysis['status']) => {
    const colors = {
      'Completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Pending': 'bg-amber-50 text-amber-700 border-amber-200',
      'Failed': 'bg-rose-50 text-rose-700 border-rose-200'
    };
    return colors[status];
  };

  const groupByDate = (analyses: Analysis[]) => {
    const grouped: { [key: string]: Analysis[] } = {};
    analyses.forEach(analysis => {
      if (!grouped[analysis.date]) {
        grouped[analysis.date] = [];
      }
      grouped[analysis.date].push(analysis);
    });
    return grouped;
  };

  const filteredAnalyses = analyses.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.vehicle.toLowerCase().includes(q) ||
      a.damageType.toLowerCase().includes(q) ||
      a.date.toLowerCase().includes(q)
    );
  });
  const groupedAnalyses = groupByDate(filteredAnalyses);

  const totalCost = filteredAnalyses.reduce((sum, a) => sum + (a.estimatedCost || 0), 0);
  const avgConf = filteredAnalyses.length ? (filteredAnalyses.reduce((s, a) => s + (a.confidence || 0), 0) / filteredAnalyses.length) : 0;
  const thisMonth = filteredAnalyses.filter(a => {
    const d = new Date(a.date);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;
  const stats = [
    { label: 'Total Analyses', value: filteredAnalyses.length, icon: FileText, color: 'from-blue-500 to-cyan-500' },
    { label: 'Total Cost', value: `₹${(totalCost / 1000).toFixed(1)}K`, icon: DollarSign, color: 'from-emerald-500 to-teal-500' },
    { label: 'Avg Confidence', value: `${avgConf.toFixed(1)}%`, icon: TrendingUp, color: 'from-purple-500 to-indigo-500' },
    { label: 'This Month', value: String(thisMonth), icon: Calendar, color: 'from-rose-500 to-pink-500' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
                Analysis History
              </h1>
              <p className="text-slate-600 text-lg">View and manage your past damage analyses</p>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Filter
              </Button>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 gap-2">
                <Download className="w-4 h-4" />
                Export All
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {stats.map((stat, index) => (
              <Card key={index} className="hover:shadow-xl transition-all duration-300 border-2 hover:border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center text-white`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search and View Toggle */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search by vehicle, damage type, or date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as 'timeline' | 'grid')}>
              <TabsList>
                <TabsTrigger value="timeline">Timeline View</TabsTrigger>
                <TabsTrigger value="grid">Grid View</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Timeline View */}
        {selectedView === 'timeline' && (
          <div className="space-y-8">
            {Object.entries(groupedAnalyses).map(([date, dayAnalyses]) => (
              <div key={date}>
                {/* Date Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm border border-slate-200">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-slate-900">
                      {new Date(date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div>
                </div>

                {/* Timeline Items */}
                <div className="space-y-4 relative pl-8 border-l-2 border-slate-200 ml-4">
                  {dayAnalyses.map((analysis) => (
                    <div key={analysis.id} className="relative">
                      {/* Timeline Dot */}
                      <div className="absolute -left-[37px] top-6 w-4 h-4 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 border-4 border-white shadow-lg"></div>

                      <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-purple-200">
                        <CardContent className="p-6">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            {/* Left Section */}
                            <div className="flex items-start gap-4 flex-1">
                              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white flex-shrink-0">
                                <Car className="w-8 h-8" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="text-lg font-bold text-slate-900">{analysis.vehicle}</h3>
                                  <Badge variant="outline" className={getSeverityColor(analysis.severity)}>
                                    {analysis.severity}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div className="flex items-center gap-2 text-slate-600">
                                    <Clock className="w-4 h-4" />
                                    {analysis.time}
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-600">
                                    <AlertCircle className="w-4 h-4" />
                                    {analysis.damageType}
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-600">
                                    <MapPin className="w-4 h-4" />
                                    {analysis.regions} {analysis.regions === 1 ? 'Region' : 'Regions'}
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-600">
                                    <TrendingUp className="w-4 h-4" />
                                    {analysis.confidence}% Confidence
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Right Section */}
                            <div className="flex items-center gap-4 lg:flex-shrink-0">
                              <div className="text-right">
                                <p className="text-sm text-slate-600 mb-1">Estimated Cost</p>
                                <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                  ₹{analysis.estimatedCost.toLocaleString()}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="gap-2">
                                  <Eye className="w-4 h-4" />
                                  View
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem className="gap-2">
                                      <Download className="w-4 h-4" />
                                      Download Report
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2 text-rose-600">
                                      <Trash2 className="w-4 h-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grid View */}
        {selectedView === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {analyses.map((analysis) => (
              <Card key={analysis.id} className="hover:shadow-xl transition-all duration-300 border-2 hover:border-purple-200 group">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white">
                      <Car className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className={getSeverityColor(analysis.severity)}>
                      {analysis.severity}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{analysis.vehicle}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(analysis.date).toLocaleDateString()} • {analysis.time}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Damage Type</span>
                      <span className="font-semibold text-slate-900">{analysis.damageType}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Regions</span>
                      <span className="font-semibold text-slate-900">{analysis.regions}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Confidence</span>
                      <span className="font-semibold text-slate-900">{analysis.confidence}%</span>
                    </div>
                    <div className="pt-3 border-t border-slate-200">
                      <p className="text-sm text-slate-600 mb-1">Estimated Cost</p>
                      <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        ₹{analysis.estimatedCost.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-2">
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {analyses.length === 0 && (
          <Card className="text-center py-16">
            <CardContent>
              <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No Analysis History</h3>
              <p className="text-slate-600 mb-6">Start analyzing vehicle damage to see your history here</p>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                Start New Analysis
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default NewHistoryPage;
