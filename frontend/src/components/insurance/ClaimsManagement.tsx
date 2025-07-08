import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Car, Download } from 'lucide-react';
import { useFirebaseService } from '@/services/firebaseService';
import { UploadedImage } from '@/types';

interface Claim {
  id: string;
  claimNumber: string;
  vehicleModel: string;
  damageType: string;
  estimatedCost: number;
  status: 'pending' | 'approved' | 'denied' | 'under-review';
  submissionDate: string;
}

const ClaimsManagement = () => {
  const firebaseService = useFirebaseService();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const loadClaims = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const history: UploadedImage[] = await firebaseService.getAnalysisHistory();
        const transformedClaims = history.map((item, index) => {
          const costMatch = item.result?.repairEstimate?.match(/₹(\d+(?:,\d+)*)/);
          const cost = costMatch ? parseInt(costMatch[1].replace(/,/g, ''), 10) : 0;

          let status: Claim['status'] = 'pending';
          const confidence = item.result?.confidence || 0;
          if (confidence > 0.9) status = 'approved';
          else if (confidence > 0.75) status = 'under-review';
          else if (confidence < 0.6) status = 'denied';

          return {
            id: item.id || `claim_${index}`,
            claimNumber: `CLM-${new Date(item.uploadedAt || Date.now()).getFullYear()}-${1000 + index}`,
            vehicleModel: item.result?.vehicleIdentification?.make || 'Unknown Vehicle',
            damageType: item.result?.damageType || 'Unknown',
            estimatedCost: cost,
            status,
            submissionDate: item.uploadedAt || new Date().toISOString(),
          };
        });
        setClaims(transformedClaims);
      } catch (err) {
        console.error("Failed to load claims:", err);
        setError('Failed to load claims data. Please try again later.');
      }
      setIsLoading(false);
    };

    loadClaims();
  }, [firebaseService]);

  const filteredClaims = useMemo(() => {
    return claims
      .filter(claim => {
        if (filterStatus === 'all') return true;
        return claim.status === filterStatus;
      })
      .filter(claim => {
        const searchLower = searchTerm.toLowerCase();
        return (
          claim.claimNumber.toLowerCase().includes(searchLower) ||
          claim.vehicleModel.toLowerCase().includes(searchLower) ||
          claim.damageType.toLowerCase().includes(searchLower)
        );
      });
  }, [claims, searchTerm, filterStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'denied': return 'bg-red-100 text-red-800 border-red-200';
      case 'under-review': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
                placeholder="Search by claim #, vehicle, or damage..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition bg-white"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
              <option value="under-review">Under Review</option>
            </select>
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md">{error}</div>}

      {/* Claims Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 md:p-6 text-left font-semibold text-gray-600">Claim #</th>
                <th className="p-4 md:p-6 text-left font-semibold text-gray-600">Vehicle</th>
                <th className="p-4 md:p-6 text-left font-semibold text-gray-600">Damage</th>
                <th className="p-4 md:p-6 text-left font-semibold text-gray-600">Estimate</th>
                <th className="p-4 md:p-6 text-left font-semibold text-gray-600">Status</th>
                <th className="p-4 md:p-6 text-left font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center p-8 text-gray-500">Loading claims...</td></tr>
              ) : filteredClaims.length > 0 ? (
                filteredClaims.map(claim => (
                  <tr key={claim.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 md:p-6 font-medium text-rose-600">{claim.claimNumber}</td>
                    <td className="p-4 md:p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Car className="w-4 h-4 text-gray-600" />
                        </div>
                        <span className="font-semibold text-gray-800">{claim.vehicleModel}</span>
                      </div>
                    </td>
                    <td className="p-4 md:p-6 text-gray-700">{claim.damageType}</td>
                    <td className="p-4 md:p-6 font-semibold text-gray-800">₹{claim.estimatedCost.toLocaleString()}</td>
                    <td className="p-4 md:p-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(claim.status)}`}>
                        {claim.status.replace('-', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 md:p-6 text-gray-600">{new Date(claim.submissionDate).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="text-center p-8 text-gray-500">No claims found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClaimsManagement;
