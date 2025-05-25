import React, { useState } from 'react';
import ImageHistory from './ImageHistory';
import { useHistory, AnalysisHistoryItem } from '@/context/HistoryContext';

type FilterType = 'all' | 'recent' | 'dent' | 'scratch' | 'glass' | 'severe';

const HistoryPage: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { history } = useHistory();

  // Filter history based on current filter and search term
  const filteredHistory = history.filter((item: AnalysisHistoryItem) => {
    // Apply type filter
    if (filter !== 'all' && filter !== 'recent') {
      if (filter === 'severe') {
        // For 'severe', assume we're looking for items with high damage severity
        // This would depend on your data model and damage classification
        const confidence = item.confidence || 0;
        if (confidence < 0.7) { // If confidence is less than 70%, not considered severe
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

  // For 'recent' filter, sort by date but keep all items
  const sortedFilteredHistory = filter === 'recent' 
    ? [...filteredHistory].sort((a, b) => 
        new Date(b.analysisDate).getTime() - new Date(a.analysisDate).getTime()
      )
    : filteredHistory;

  // Get counts for each damage type for the filter badges
  const getCounts = () => {
    const counts = {
      all: history.length,
      dent: 0,
      scratch: 0,
      glass: 0,
      severe: 0
    };
    
    history.forEach(item => {
      const damageType = item.damageType?.toLowerCase();
      if (damageType?.includes('dent')) counts.dent++;
      if (damageType?.includes('scratch')) counts.scratch++;
      if (damageType?.includes('glass') || damageType?.includes('window')) counts.glass++;
      if (item.confidence && item.confidence > 0.7) counts.severe++;
    });
    
    return counts;
  };

  const counts = getCounts();

  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Analysis History</h1>

        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex-grow">
              <input
                type="text"
                placeholder="Search history..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                onClick={() => setSearchTerm('')}
                disabled={!searchTerm}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterButton 
              active={filter === 'all'} 
              onClick={() => setFilter('all')}
              count={counts.all}
            >
              All
            </FilterButton>
            <FilterButton 
              active={filter === 'recent'} 
              onClick={() => setFilter('recent')}
            >
              Most Recent
            </FilterButton>
            <FilterButton 
              active={filter === 'dent'} 
              onClick={() => setFilter('dent')}
              count={counts.dent}
            >
              Dents
            </FilterButton>
            <FilterButton 
              active={filter === 'scratch'} 
              onClick={() => setFilter('scratch')}
              count={counts.scratch}
            >
              Scratches
            </FilterButton>
            <FilterButton 
              active={filter === 'glass'} 
              onClick={() => setFilter('glass')}
              count={counts.glass}
            >
              Glass Damage
            </FilterButton>
            <FilterButton 
              active={filter === 'severe'} 
              onClick={() => setFilter('severe')}
              count={counts.severe}
            >
              Severe Damage
            </FilterButton>
          </div>
        </div>

        {/* Pass filtered history to ImageHistory component */}
        <ImageHistory history={sortedFilteredHistory} />

        {history.length > 0 && sortedFilteredHistory.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg">No results match your current filters</p>
            <button
              onClick={() => {
                setFilter('all');
                setSearchTerm('');
              }}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Filter button component
interface FilterButtonProps {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  count?: number;
}

const FilterButton: React.FC<FilterButtonProps> = ({ children, active, onClick, count }) => {
  return (
    <button
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
      }`}
      onClick={onClick}
    >
      {children}
      {count !== undefined && (
        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
          active ? 'bg-white text-blue-600' : 'bg-gray-200 text-gray-700'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
};

export default HistoryPage;