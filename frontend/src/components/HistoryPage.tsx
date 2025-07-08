import React, { useState, useEffect, useMemo } from 'react';
import ImageHistory from './ImageHistory';
import { useHistory, AnalysisHistoryItem } from '@/context/HistoryContext';

type FilterType = 'all' | 'recent' | 'dent' | 'scratch' | 'glass' | 'severe';
type SortOrder = 'newest' | 'oldest' | 'confidence';

const HistoryPage: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const { history, loadingHistory, errorHistory, refreshHistory } = useHistory();

  useEffect(() => {
    // Refresh history when the component mounts
    refreshHistory();
  }, []); // Empty dependency array ensures this runs only once on mount

  const filteredHistory = useMemo(() => {
    return history.filter((item: AnalysisHistoryItem) => {
      // Apply type filter
      if (filter !== 'all' && filter !== 'recent') {
        if (filter === 'severe') {
          const confidence = item.confidence || 0;
          if (confidence < 0.7) {
            return false;
          }
        } else if (!item.damageType?.toLowerCase().includes(filter.toLowerCase())) {
          return false;
        }
      }

      // Apply search filter
      if (searchTerm && !Object.values(item).some(val => 
        typeof val === 'string' && val.toLowerCase().includes(searchTerm.toLowerCase())
      )) {
        return false;
      }

      return true;
    });
  }, [history, filter, searchTerm]);

  const sortedAndFilteredHistory = useMemo(() => {
    const sorted = [...filteredHistory];
    switch (sortOrder) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.analysisDate).getTime() - new Date(a.analysisDate).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.analysisDate).getTime() - new Date(b.analysisDate).getTime());
      case 'confidence':
        return sorted.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
      default:
        return sorted;
    }
  }, [filteredHistory, sortOrder]);

  const counts = useMemo(() => {
    const counts = {
      all: history.length,
      dent: 0,
      scratch: 0,
      glass: 0,
      severe: 0,
    };
    
    history.forEach(item => {
      const damageType = item.damageType?.toLowerCase();
      if (damageType?.includes('dent')) counts.dent++;
      if (damageType?.includes('scratch')) counts.scratch++;
      if (damageType?.includes('glass') || damageType?.includes('window')) counts.glass++;
      if (item.confidence && item.confidence > 0.7) counts.severe++;
    });
    
    return counts;
  }, [history]);

  // Filter Button Component
  const FilterButton: React.FC<{
    active: boolean;
    onClick: () => void;
    count: number;
    children: React.ReactNode;
    icon?: React.ReactNode;
  }> = ({ active, onClick, count, children, icon }) => (
    <button
      onClick={onClick}      className={`inline-flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
        active
          ? 'bg-emerald-200 text-black'
          : 'bg-white/10 text-gray-700 border border-rose-200/30 hover:bg-rose-200/20 hover:text-black'
      }`}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
        active ? 'bg-black/10' : 'bg-rose-200/20 text-gray-600'
      }`}>
        {count}
      </span>
    </button>
  );
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}      <div className="absolute inset-0 bg-white">
        <div className="absolute inset-0 bg-rose-200/20"></div>
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-1/4 left-1/6 w-80 h-80 bg-rose-200 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/5 w-96 h-96 bg-rose-200/50 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-2/3 left-3/4 w-64 h-64 bg-rose-200 rounded-full filter blur-2xl animate-pulse" style={{animationDelay: '4s'}}></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen py-8 px-4">
        <div className="max-w-7xl mx-auto">          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-200 mb-4">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-black mb-2">
              Analysis History
            </h1>
            <p className="text-gray-600 text-lg">
              Track and review your car damage analysis results
            </p>
          </div>          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-rose-200 shadow-sm hover:shadow-lg transition-all duration-300 text-center">
              <div className="text-2xl font-bold text-black mb-1">{counts.all}</div>
              <div className="text-sm text-gray-600">Total Analyses</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-rose-200 shadow-sm hover:shadow-lg transition-all duration-300 text-center">
              <div className="text-2xl font-bold text-black mb-1">{counts.dent}</div>
              <div className="text-sm text-gray-600">Dent Damages</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-rose-200 shadow-sm hover:shadow-lg transition-all duration-300 text-center">
              <div className="text-2xl font-bold text-black mb-1">{counts.scratch}</div>
              <div className="text-sm text-gray-600">Scratch Damages</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-rose-200 shadow-sm hover:shadow-lg transition-all duration-300 text-center">
              <div className="text-2xl font-bold text-black mb-1">{counts.severe}</div>
              <div className="text-sm text-gray-600">Severe Cases</div>
            </div>
          </div>          {/* Search and Filter Panel */}
          <div className="bg-white rounded-xl border border-rose-200 p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search analyses..."
                    className="w-full pl-10 pr-4 py-2 border border-rose-200 rounded-lg focus:ring-2 focus:ring-emerald-200 focus:border-emerald-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex gap-4">
                <select 
                  className="px-4 py-2 border border-rose-200 rounded-lg focus:ring-2 focus:ring-emerald-200 focus:border-emerald-200"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as FilterType)}
                >
                  <option value="all">All Types</option>
                  <option value="recent">Recent</option>
                  <option value="dent">Dent</option>
                  <option value="scratch">Scratch</option>
                  <option value="glass">Glass</option>
                  <option value="severe">Severe</option>
                </select>
                <select 
                  className="px-4 py-2 border border-rose-200 rounded-lg focus:ring-2 focus:ring-emerald-200 focus:border-emerald-200"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="confidence">Confidence</option>
                </select>
              </div>
            </div>
          </div>{/* History Content */}
          {loadingHistory && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading History...</p>
            </div>
          )}

          {errorHistory && (
            <div className="text-center py-12 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 font-semibold">An Error Occurred</p>
              <p className="text-gray-600 mt-2">{errorHistory}</p>
              <button 
                onClick={() => refreshHistory()} 
                className="mt-4 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {!loadingHistory && !errorHistory && (
            <div className="animate-fadeInUp animation-delay-300">
              <ImageHistory history={sortedAndFilteredHistory.map(item => ({
                ...item,
                image: item.imageUrl,
                uploadedAt: item.analysisDate,
                timestamp: item.analysisDate,
                result: {
                  damageType: item.damageType,
                  confidence: item.confidence,
                  damageDescription: item.damageDescription, // Corrected property name
                  description: item.damageDescription, // Keep description for safety, but damageDescription is what ImageHistory expects
                  recommendations: item.recommendations
                }
              }))} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;