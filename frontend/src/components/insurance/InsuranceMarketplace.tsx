import React, { useState, useMemo } from 'react';
import { Star, Shield, Zap, Filter, Search } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  logo: string;
  rating: number;
  features: string[];
  claimSuccessRate: number;
  avgProcessingTime: number; // in days
}

const initialCompanies: Company[] = [
  { id: '1', name: 'SecureRide Insurance', logo: '🛡️', rating: 4.8, features: ['Digital Claims', 'Roadside Assistance', 'Zero Depreciation'], claimSuccessRate: 98, avgProcessingTime: 3 },
  { id: '2', name: 'AutoGuard Plus', logo: '🚗', rating: 4.6, features: ['24/7 Support', 'Cashless Garages', 'Engine Protection'], claimSuccessRate: 95, avgProcessingTime: 5 },
  { id: '3', name: 'SwiftCover', logo: '⚡', rating: 4.5, features: ['Instant Policy', 'Quick Claim Settlement', 'Add-on Covers'], claimSuccessRate: 92, avgProcessingTime: 2 },
  { id: '4', name: 'Heritage Insurance', logo: '🏛️', rating: 4.7, features: ['NCB Protection', 'Wide Network', 'Personal Accident Cover'], claimSuccessRate: 96, avgProcessingTime: 4 },
  { id: '5', name: 'NextGen Assurance', logo: '🤖', rating: 4.9, features: ['AI-Powered Claims', 'Telematics Discount', 'EV Coverage'], claimSuccessRate: 99, avgProcessingTime: 1 },
  { id: '6', name: 'ValueInsure', logo: '💰', rating: 4.3, features: ['Affordable Premiums', 'Third-Party Liability', 'Basic Own Damage'], claimSuccessRate: 90, avgProcessingTime: 7 },
];

const InsuranceMarketplace = () => {
  const [companies, setCompanies] = useState(initialCompanies);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('rating');

  const filteredAndSortedCompanies = useMemo(() => {
    return companies
      .filter(company => company.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        switch (sortBy) {
          case 'rating': return b.rating - a.rating;
          case 'successRate': return b.claimSuccessRate - a.claimSuccessRate;
          case 'processingTime': return a.avgProcessingTime - b.avgProcessingTime;
          default: return 0;
        }
      });
  }, [companies, searchTerm, sortBy]);

  return (
    <div className="space-y-6">
      {/* Filters and Sorting */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
                placeholder="Search for insurance providers..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition bg-white"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="rating">Sort by Rating</option>
              <option value="successRate">Sort by Success Rate</option>
              <option value="processingTime">Sort by Processing Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedCompanies.map(company => (
          <div key={company.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300 flex flex-col">
            <div className="flex items-start gap-4 mb-4">
              <div className="text-4xl">{company.logo}</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800">{company.name}</h3>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <span className="text-md font-bold text-gray-700">{company.rating}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6 flex-grow">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Claim Success Rate</span>
                <span className="font-semibold text-emerald-600">{company.claimSuccessRate}%</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Avg. Processing Time</span>
                <span className="font-semibold text-blue-600">{company.avgProcessingTime} days</span>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold text-gray-700 mb-2">Key Features</h4>
              <div className="flex flex-wrap gap-2">
                {company.features.map((feature, index) => (
                  <span key={index} className="px-2.5 py-1 bg-rose-100 text-rose-800 text-xs font-medium rounded-full">
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            <button className="w-full mt-auto px-4 py-2 bg-rose-500 text-white font-semibold rounded-lg hover:bg-rose-600 transition-colors duration-300 flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" />
              Get Quote
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsuranceMarketplace;
