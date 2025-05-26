import React, { useEffect, useState } from 'react';
import ModernDashboard from './ModernDashboard';
import { Link } from 'react-router-dom';
import { LayoutDashboard, History, ArrowRight } from 'lucide-react';
import AnalysisChart from '../charts/AnalysisChart';
import { useFirebaseService } from '@/services/firebaseService';

const Dashboard: React.FC = () => {
  const firebaseService = useFirebaseService();
  const [analyticsData, setAnalyticsData] = useState<{
    totalAnalyses: number;
    avgConfidence: number;
    damageTypes: Record<string, number>;
    monthlyTrends: Array<{ month: string; count: number; avgCost: number }>;
    severityBreakdown: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const data = await firebaseService.getAnalyticsData();
        setAnalyticsData(data);
      } catch (error) {
        console.error('Failed to load analytics data:', error);
      }
    };

    loadAnalytics();
  }, [firebaseService]);

  const stats = [
    { id: 1, value: '12,345', label: 'Total Analyses', icon: LayoutDashboard, trend: 'up', change: 10 },
    { id: 2, value: '7,890', label: 'Completed Analyses', icon: LayoutDashboard, trend: 'up', change: 5 },
    { id: 3, value: '4,567', label: 'In Progress Analyses', icon: LayoutDashboard, trend: 'down', change: 2 },
    { id: 4, value: '2,345', label: 'Abandoned Analyses', icon: LayoutDashboard, trend: 'down', change: 1 },
  ];

  const recentAnalyses = [
    { id: 1, date: '2024-04-01', vehicle: 'Toyota Camry', damageType: 'Collision', severity: 'High', status: 'Completed' },
    { id: 2, date: '2024-03-30', vehicle: 'Honda Accord', damageType: 'Scratch', severity: 'Medium', status: 'Completed' },
    { id: 3, date: '2024-03-28', vehicle: 'Ford F-150', damageType: 'Dent', severity: 'Low', status: 'Completed' },
    { id: 4, date: '2024-03-25', vehicle: 'Chevrolet Silverado', damageType: 'Scratch', severity: 'Medium', status: 'In Progress' },
  ];

  const quickActions = [
    { id: 1, title: 'New Analysis', description: 'Start a new car damage analysis', buttonText: 'Start', link: '/new-analysis', icon: LayoutDashboard },
    { id: 2, title: 'Analysis History', description: 'View all past analyses', buttonText: 'View History', link: '/history', icon: History },
    { id: 3, title: 'Vehicle Management', description: 'Manage your vehicle fleet', buttonText: 'Manage Vehicles', link: '/vehicle-management', icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-16 h-16 bg-rose-200 rounded-2xl flex items-center justify-center">
              <LayoutDashboard className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-5xl font-bold text-black">
              Dashboard
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Welcome back! Here's an overview of your car damage analysis history and insights.
          </p>
        </div>        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="bg-white rounded-xl border border-rose-200 p-6 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-rose-200 rounded-xl flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-black" />
                </div>
                <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${
                  stat.trend === 'up' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {stat.trend === 'up' ? '+' : '-'}{stat.change}%
                </span>
              </div>
              <h3 className="text-2xl font-bold text-black mb-1">{stat.value}</h3>
              <p className="text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>        {/* Recent Analyses */}
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
          </div>          <div className="overflow-x-auto">
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        analysis.severity === 'High'
                          ? 'bg-red-100 text-red-800'
                          : analysis.severity === 'Medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {analysis.severity}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        analysis.status === 'Completed'
                          ? 'bg-green-100 text-green-800'
                          : analysis.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {analysis.status}
                      </span>                    </td>
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
            <div className="bg-white rounded-xl border border-rose-200 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-rose-200 rounded-xl flex items-center justify-center">
                  <LayoutDashboard className="w-6 h-6 text-black" />
                </div>
                <h2 className="text-2xl font-bold text-black">Damage Analysis Trends</h2>
              </div>
              <AnalysisChart 
                type="damage-analysis"
                damageData={Object.entries(analyticsData.damageTypes).map(([type, count]) => ({
                  type,
                  severity: Math.floor(Math.random() * 4) + 1, // Mock severity for visualization
                  cost: count * 500, // Mock cost calculation
                  confidence: analyticsData.avgConfidence,
                  area: 'Various'
                }))}
                className="!border-0 !shadow-none !bg-transparent"
              />
            </div>

            <div className="bg-white rounded-xl border border-rose-200 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-rose-200 rounded-xl flex items-center justify-center">
                  <History className="w-6 h-6 text-black" />
                </div>
                <h2 className="text-2xl font-bold text-black">Monthly Activity</h2>
              </div>
              <AnalysisChart 
                type="insurance-trends"
                insuranceData={analyticsData.monthlyTrends.map(trend => ({
                  month: trend.month,
                  claims: trend.count,
                  averageCost: trend.avgCost,
                  settlements: Math.floor(trend.count * 0.9) // Mock settlement rate
                }))}
                className="!border-0 !shadow-none !bg-transparent"
              />
            </div>
          </div>
        )}        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <div
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
