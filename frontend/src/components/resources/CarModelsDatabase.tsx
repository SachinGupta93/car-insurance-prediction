import React, { useState, useEffect } from 'react';
import { Search, Car, Shield, Clock, DollarSign, Star, Filter } from 'lucide-react';

interface CarModel {
  id: string;
  make: string;
  model: string;
  year: number;
  bodyType: string;
  marketValue: string;
  insuranceRating: number;
  repairCost: string;
  safetyRating: number;
  preferredInsurers: string[];
  coverageRecommendations: {
    comprehensive: boolean;
    collision: boolean;
    gap: boolean;
    roadside: boolean;
  };
  timeToRepair: string;
  commonDamages: string[];
  partsCost: string;
}

interface InsuranceCompany {
  name: string;
  rating: number;
  specialties: string[];
  avgProcessingTime: string;
  customerSatisfaction: number;
  coverageTypes: string[];
  discounts: string[];
}

const CarModelsDatabase: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedInsurer, setSelectedInsurer] = useState('');
  const [filteredCars, setFilteredCars] = useState<CarModel[]>([]);

  // Sample car models data - in a real app, this would come from an API
  const carModels: CarModel[] = [
    {
      id: '1',
      make: 'Honda',
      model: 'Civic',
      year: 2023,
      bodyType: 'Sedan',
      marketValue: '$25,000 - $28,000',
      insuranceRating: 4.5,
      repairCost: 'Low',
      safetyRating: 5,
      preferredInsurers: ['State Farm', 'Geico', 'Progressive'],
      coverageRecommendations: {
        comprehensive: true,
        collision: true,
        gap: false,
        roadside: true
      },
      timeToRepair: '3-5 days',
      commonDamages: ['Door dings', 'Bumper scratches', 'Mirror damage'],
      partsCost: 'Moderate'
    },
    {
      id: '2',
      make: 'BMW',
      model: 'X5',
      year: 2023,
      bodyType: 'SUV',
      marketValue: '$65,000 - $75,000',
      insuranceRating: 3.8,
      repairCost: 'High',
      safetyRating: 5,
      preferredInsurers: ['BMW Insurance', 'Allstate', 'Liberty Mutual'],
      coverageRecommendations: {
        comprehensive: true,
        collision: true,
        gap: true,
        roadside: true
      },
      timeToRepair: '7-14 days',
      commonDamages: ['Sensor damage', 'Body panel replacement', 'Paint work'],
      partsCost: 'High'
    },
    {
      id: '3',
      make: 'Toyota',
      model: 'Camry',
      year: 2023,
      bodyType: 'Sedan',
      marketValue: '$26,000 - $30,000',
      insuranceRating: 4.7,
      repairCost: 'Low-Moderate',
      safetyRating: 5,
      preferredInsurers: ['State Farm', 'USAA', 'Farmers'],
      coverageRecommendations: {
        comprehensive: true,
        collision: true,
        gap: false,
        roadside: true
      },
      timeToRepair: '3-6 days',
      commonDamages: ['Rear-end collisions', 'Side damage', 'Windshield chips'],
      partsCost: 'Low-Moderate'
    },
    {
      id: '4',
      make: 'Tesla',
      model: 'Model 3',
      year: 2023,
      bodyType: 'Sedan',
      marketValue: '$40,000 - $50,000',
      insuranceRating: 3.2,
      repairCost: 'Very High',
      safetyRating: 5,
      preferredInsurers: ['Tesla Insurance', 'Progressive', 'State Farm'],
      coverageRecommendations: {
        comprehensive: true,
        collision: true,
        gap: true,
        roadside: true
      },
      timeToRepair: '14-30 days',
      commonDamages: ['Battery damage', 'Sensor recalibration', 'Specialized parts'],
      partsCost: 'Very High'
    },
    {
      id: '5',
      make: 'Ford',
      model: 'F-150',
      year: 2023,
      bodyType: 'Truck',
      marketValue: '$35,000 - $45,000',
      insuranceRating: 4.2,
      repairCost: 'Moderate',
      safetyRating: 4,
      preferredInsurers: ['Ford Protect', 'Geico', 'American Family'],
      coverageRecommendations: {
        comprehensive: true,
        collision: true,
        gap: false,
        roadside: true
      },
      timeToRepair: '5-10 days',
      commonDamages: ['Bed damage', 'Tailgate issues', 'Running board damage'],
      partsCost: 'Moderate'
    }
  ];

  const insuranceCompanies: InsuranceCompany[] = [
    {
      name: 'State Farm',
      rating: 4.6,
      specialties: ['Full Coverage', 'Multi-Policy Discounts', 'Accident Forgiveness'],
      avgProcessingTime: '3-5 business days',
      customerSatisfaction: 4.4,
      coverageTypes: ['Liability', 'Comprehensive', 'Collision', 'Gap', 'Roadside'],
      discounts: ['Safe Driver', 'Multi-Vehicle', 'Student', 'Anti-Theft']
    },
    {
      name: 'Geico',
      rating: 4.3,
      specialties: ['Competitive Rates', 'Digital Experience', 'Military Discounts'],
      avgProcessingTime: '2-4 business days',
      customerSatisfaction: 4.2,
      coverageTypes: ['Liability', 'Comprehensive', 'Collision', 'Emergency Roadside'],
      discounts: ['Federal Employee', 'Military', 'Multi-Policy', 'Good Student']
    },
    {
      name: 'Progressive',
      rating: 4.1,
      specialties: ['Usage-Based Insurance', 'Snapshot Program', 'Name Your Price'],
      avgProcessingTime: '1-3 business days',
      customerSatisfaction: 4.0,
      coverageTypes: ['Liability', 'Comprehensive', 'Collision', 'Gap', 'Custom Parts'],
      discounts: ['Snapshot', 'Multi-Policy', 'Online Quote', 'Continuous Coverage']
    },
    {
      name: 'Tesla Insurance',
      rating: 3.8,
      specialties: ['Tesla Vehicles', 'Real-Time Driving Data', 'Safety Score'],
      avgProcessingTime: '1-2 business days',
      customerSatisfaction: 3.9,
      coverageTypes: ['Comprehensive', 'Collision', 'Liability', 'Glass Coverage'],
      discounts: ['Safety Score', 'Autopilot Usage', 'Tesla Ownership']
    }
  ];

  const makes = [...new Set(carModels.map(car => car.make))].sort();
  const years = [...new Set(carModels.map(car => car.year))].sort().reverse();
  const insurers = insuranceCompanies.map(company => company.name);

  useEffect(() => {
    let filtered = carModels;

    if (searchTerm) {
      filtered = filtered.filter(car => 
        car.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        car.model.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedMake) {
      filtered = filtered.filter(car => car.make === selectedMake);
    }

    if (selectedYear) {
      filtered = filtered.filter(car => car.year === parseInt(selectedYear));
    }

    if (selectedInsurer) {
      filtered = filtered.filter(car => 
        car.preferredInsurers.includes(selectedInsurer)
      );
    }

    setFilteredCars(filtered);
  }, [searchTerm, selectedMake, selectedYear, selectedInsurer]);

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const getInsuranceRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-yellow-600';
    if (rating >= 3.5) return 'text-orange-600';
    return 'text-red-600';
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="bg-pattern-grid opacity-5"></div>
        <div className="floating-shape floating-shape-1 bg-gradient-to-r from-blue-400/10 to-purple-400/10"></div>
        <div className="floating-shape floating-shape-2 bg-gradient-to-r from-green-400/10 to-blue-400/10"></div>
        <div className="floating-shape floating-shape-3 bg-gradient-to-r from-purple-400/10 to-pink-400/10"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 animate-fadeInUp">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
            Car Models & Insurance Database
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Comprehensive database of car models with insurance ratings, repair costs, 
            and coverage recommendations from top insurance providers.
          </p>
        </div>        {/* Search and Filters */}
        <div className="glass-card p-6 mb-8 animate-slideInFromLeft">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search make or model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-modern w-full pl-10"
              />
            </div>

            {/* Make Filter */}
            <select
              value={selectedMake}
              onChange={(e) => setSelectedMake(e.target.value)}
              className="input-modern w-full"
            >
              <option value="">All Makes</option>
              {makes.map(make => (
                <option key={make} value={make}>{make}</option>
              ))}
            </select>

            {/* Year Filter */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="input-modern w-full"
            >
              <option value="">All Years</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            {/* Insurer Filter */}
            <select
              value={selectedInsurer}
              onChange={(e) => setSelectedInsurer(e.target.value)}              className="input-modern w-full"
            >
              <option value="">All Insurers</option>
              {insurers.map(insurer => (
                <option key={insurer} value={insurer}>{insurer}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {filteredCars.map((car, index) => (
            <div 
              key={car.id} 
              className="glass-card hover:scale-105 transition-all duration-300 p-6 hover-glow"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Car Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Car className="w-8 h-8 text-blue-400 mr-3" />
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {car.year} {car.make} {car.model}
                    </h3>
                    <p className="text-sm text-slate-300">{car.bodyType}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center">
                    {getRatingStars(car.insuranceRating)}
                  </div>
                  <p className={`text-sm font-medium ${getInsuranceRatingColor(car.insuranceRating)}`}>
                    {car.insuranceRating}/5
                  </p>
                </div>
              </div>

              {/* Market Value */}
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">Market Value</span>
                  <span className="text-lg font-bold text-green-400">{car.marketValue}</span>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-500/20 backdrop-blur-sm rounded-xl border border-blue-400/20">
                  <DollarSign className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-300">Repair Cost</p>
                  <p className="font-semibold text-blue-300">{car.repairCost}</p>
                </div>
                <div className="text-center p-3 bg-green-500/20 backdrop-blur-sm rounded-xl border border-green-400/20">
                  <Clock className="w-5 h-5 text-green-400 mx-auto mb-1" />                  <p className="text-xs text-slate-300">Repair Time</p>
                  <p className="font-semibold text-green-300">{car.timeToRepair}</p>
                </div>
              </div>

              {/* Preferred Insurers */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center">
                  <Shield className="w-4 h-4 mr-1 text-blue-400" />
                  Preferred Insurers
                </h4>
                <div className="flex flex-wrap gap-1">
                  {car.preferredInsurers.map(insurer => (
                    <span 
                      key={insurer}
                      className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-400/30"
                    >
                      {insurer}
                    </span>
                  ))}
                </div>
              </div>

              {/* Coverage Recommendations */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-300 mb-2">Coverage Recommendations</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className={`flex items-center ${car.coverageRecommendations.comprehensive ? 'text-green-400' : 'text-slate-500'}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${car.coverageRecommendations.comprehensive ? 'bg-green-400' : 'bg-slate-600'}`}></div>
                    Comprehensive
                  </div>
                  <div className={`flex items-center ${car.coverageRecommendations.collision ? 'text-green-400' : 'text-slate-500'}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${car.coverageRecommendations.collision ? 'bg-green-400' : 'bg-slate-600'}`}></div>
                    Collision
                  </div>
                  <div className={`flex items-center ${car.coverageRecommendations.gap ? 'text-green-400' : 'text-slate-500'}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${car.coverageRecommendations.gap ? 'bg-green-400' : 'bg-slate-600'}`}></div>
                    Gap Coverage
                  </div>
                  <div className={`flex items-center ${car.coverageRecommendations.roadside ? 'text-green-400' : 'text-slate-500'}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${car.coverageRecommendations.roadside ? 'bg-green-400' : 'bg-slate-600'}`}></div>
                    Roadside
                  </div>
                </div>
              </div>              {/* Common Damages */}
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">Common Damage Types</h4>
                <div className="flex flex-wrap gap-1">
                  {car.commonDamages.map(damage => (
                    <span 
                      key={damage}
                      className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full border border-orange-400/30"
                    >
                      {damage}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Insurance Companies Section */}
        <div className="glass-card p-8 animate-slideInFromRight">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <Shield className="w-8 h-8 text-blue-400 mr-3" />
            Insurance Company Partners
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {insuranceCompanies.map((company, index) => (
              <div 
                key={company.name} 
                className="glass-card-nested p-4 hover:scale-105 transition-all duration-300 hover-glow"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-white">{company.name}</h3>
                  <div className="flex justify-center items-center mt-2">
                    {getRatingStars(company.rating)}
                    <span className="ml-2 text-sm text-slate-300">{company.rating}/5</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-300 mb-1">Processing Time</p>
                    <p className="text-sm text-white">{company.avgProcessingTime}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-300 mb-1">Specialties</p>
                    <div className="flex flex-wrap gap-1">
                      {company.specialties.slice(0, 2).map(specialty => (
                        <span 
                          key={specialty}
                          className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-400/30"
                        >
                          {specialty}
                        </span>                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-300 mb-1">Available Discounts</p>
                    <div className="flex flex-wrap gap-1">
                      {company.discounts.slice(0, 2).map(discount => (
                        <span 
                          key={discount}
                          className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-400/30"
                        >
                          {discount}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Statistics Section */}
        <div className="mt-8 glass-card p-8 animate-fadeInUp">
          <h2 className="text-2xl font-bold mb-6 text-white">Database Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">{carModels.length}</div>
              <div className="text-slate-300">Car Models</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">{makes.length}</div>
              <div className="text-slate-300">Manufacturers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">{insuranceCompanies.length}</div>
              <div className="text-slate-300">Insurance Partners</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400">24/7</div>
              <div className="text-slate-300">Support Available</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarModelsDatabase;
