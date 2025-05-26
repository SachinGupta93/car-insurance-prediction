import React from 'react';
import { FaClock, FaTrash, FaCamera, FaStar, FaFileAlt } from 'react-icons/fa';
import { useHistory, AnalysisHistoryItem } from '@/context/HistoryContext'; // Adjust path as needed
import TimeBasedAnalysisCharts from './charts/TimeBasedAnalysisCharts';

interface ImageHistoryProps {
  history?: AnalysisHistoryItem[];
}

const ImageHistory: React.FC<ImageHistoryProps> = ({ history: historyProp }) => {
  const { history: contextHistory, loadingHistory, errorHistory, removeAnalysisFromHistory, clearHistory } = useHistory();
  
  // Use provided history prop or fall back to context history
  const history = historyProp || contextHistory;

  if (loadingHistory) {
    return (      <div className="min-h-screen relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-rose-50">
          <div className="absolute inset-0 bg-white/50"></div>
          <div className="absolute inset-0 opacity-15">
            <div className="absolute top-1/4 left-1/6 w-80 h-80 bg-rose-200 rounded-full filter blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/3 right-1/5 w-96 h-96 bg-emerald-200 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          </div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="bg-white/10 backdrop-blur-lg p-8 rounded-xl border border-rose-200/30 shadow-sm animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-rose-200/30 rounded-full animate-spin"></div>
              <h2 className="text-xl font-semibold text-black">Loading Analysis History...</h2>
            </div>
            <p className="text-gray-700">Please wait while we retrieve your analysis history.</p>
          </div>
        </div>
      </div>
    );
  }

  if (errorHistory) {
    return (      <div className="min-h-screen relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-rose-50">
          <div className="absolute inset-0 bg-white/50"></div>
          <div className="absolute inset-0 opacity-15">
            <div className="absolute top-1/4 left-1/6 w-80 h-80 bg-red-300 rounded-full filter blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/3 right-1/5 w-96 h-96 bg-red-200 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          </div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
          <div className="bg-white/10 backdrop-blur-lg max-w-md w-full p-8 text-center rounded-xl border border-rose-200/30 shadow-sm animate-fadeInUp">
            <div className="w-16 h-16 bg-red-300/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaFileAlt className="text-2xl text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-black mb-4">Error Loading History</h2>
            <p className="text-red-600 mb-6">{errorHistory}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-emerald-200 text-black px-4 py-2 rounded-xl hover:bg-emerald-300 transition-all duration-300"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (      <div className="min-h-screen relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-rose-50">
          <div className="absolute inset-0 bg-white/50"></div>
          <div className="absolute inset-0 opacity-15">
            <div className="absolute top-1/4 left-1/6 w-80 h-80 bg-rose-200 rounded-full filter blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/3 right-1/5 w-96 h-96 bg-emerald-200 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          </div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
          <div className="bg-white/10 backdrop-blur-lg max-w-lg w-full p-12 text-center rounded-xl border border-rose-200/30 shadow-sm animate-fadeInUp">
            <div className="w-24 h-24 bg-rose-200/20 rounded-full flex items-center justify-center mx-auto mb-8">
              <FaCamera className="text-4xl text-black" />
            </div>
            <h2 className="text-3xl font-bold text-black mb-4">No Analysis History</h2>
            <p className="text-gray-700 text-lg mb-2">Your analysis history is empty.</p>
            <p className="text-gray-600 mb-8">Upload and analyze car damage images to see them here.</p>
            <button 
              onClick={() => window.location.href = '/upload'} 
              className="bg-emerald-200 text-black px-6 py-3 rounded-xl hover:bg-emerald-300 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <FaCamera className="mr-2" />
              Start Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }
  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-rose-50">
        <div className="absolute inset-0 bg-white/50"></div>
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-1/4 left-1/6 w-80 h-80 bg-rose-200 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/5 w-96 h-96 bg-emerald-200 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-2/3 left-3/4 w-64 h-64 bg-rose-200 rounded-full filter blur-2xl animate-pulse" style={{animationDelay: '4s'}}></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          {!historyProp && (
            <div className="text-center mb-12 animate-fadeInUp">
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="p-4 bg-rose-200/20 rounded-2xl backdrop-blur-sm">
                  <FaClock className="text-3xl text-black" />
                </div>
                <h1 className="text-4xl font-bold text-black">Analysis History</h1>
              </div>
              <p className="text-xl text-gray-700 max-w-2xl mx-auto">
                Review your past car damage analyses and track your insurance claims progress
              </p>
            </div>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-fadeInUp stagger-1">
            <div className="bg-white/10 backdrop-blur-lg p-6 text-center rounded-xl border border-rose-200/30 shadow-sm">
              <div className="w-12 h-12 bg-rose-200/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FaFileAlt className="text-xl text-black" />
              </div>
              <h3 className="text-2xl font-bold text-black">{history.length}</h3>
              <p className="text-gray-700">Total Analyses</p>
            </div>
              <div className="bg-white/10 backdrop-blur-lg p-6 text-center rounded-xl border border-emerald-200/30 shadow-sm">
              <div className="w-12 h-12 bg-emerald-200/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FaStar className="text-xl text-black" />
              </div>
              <h3 className="text-2xl font-bold text-black">
                {Math.round((history.reduce((sum, item) => sum + (item.confidence || 0), 0) / history.length) * 100)}%
              </h3>
              <p className="text-gray-700">Avg. Confidence</p>
            </div>
              <div className="bg-white/10 backdrop-blur-lg p-6 text-center rounded-xl border border-rose-200/30 shadow-sm">
              <div className="w-12 h-12 bg-rose-200/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FaClock className="text-xl text-black" />
              </div>
              <h3 className="text-2xl font-bold text-black">
                {history.length > 0 ? Math.ceil((Date.now() - new Date(history[history.length - 1].analysisDate).getTime()) / (1000 * 60 * 60 * 24)) : 0}
              </h3>
              <p className="text-gray-700">Days Since Last</p>
            </div>
          </div>

          {/* Controls */}
          {!historyProp && history.length > 0 && (
            <div className="flex justify-between items-center mb-8 animate-fadeInUp stagger-2">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-black">Recent Analyses</h2>
                <span className="bg-rose-200 text-black px-3 py-1 rounded-full text-sm">{history.length} items</span>
              </div>              <button
                onClick={async () => {
                  if (window.confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
                    try {
                      await clearHistory();
                    } catch (err) {
                      console.error('Failed to clear history:', err);
                    }
                  }
                }}
                className="bg-red-300 text-black px-4 py-2 rounded-xl hover:bg-red-400 transition-all duration-300 flex items-center gap-2 text-sm"
              >
                <FaTrash className="text-sm" />
                Clear All History
              </button>
            </div>
          )}

          {/* History Items */}
          <div className="space-y-6">
            {history.map((item: AnalysisHistoryItem, index) => (
              <div key={item.id} className={`bg-white/10 backdrop-blur-lg rounded-xl border border-rose-200/30 shadow-sm hover:scale-[1.02] transition-all duration-500 animate-fadeInUp stagger-${index % 6 + 3}`}>
                <div className="md:flex">
                  {/* Image Section */}
                  <div className="md:w-1/3 relative group">
                    <img
                      src={item.imageUrl}
                      alt="Analyzed car damage"
                      className="object-cover w-full h-64 md:h-full rounded-2xl md:rounded-r-none transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl md:rounded-r-none"></div>
                  </div>
                  
                  {/* Content Section */}
                  <div className="p-8 md:w-2/3 relative">
                    {/* Remove Button */}                    <button
                      onClick={async () => {
                        try {
                          await removeAnalysisFromHistory(item.id);
                        } catch (err) {
                          console.error('Failed to remove item:', err);
                        }
                      }}
                      className="absolute top-4 right-4 w-10 h-10 bg-red-300/10 hover:bg-red-300/20 border border-red-300/20 rounded-xl flex items-center justify-center text-red-600 hover:text-red-700 transition-all duration-300 hover:scale-110"
                      aria-label="Remove history item"
                    >
                      <FaTrash className="text-sm" />
                    </button>

                    {/* Header */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <FaClock className="text-black text-sm" />
                        <p className="text-sm text-gray-600">{formatDate(item.analysisDate)}</p>
                      </div>
                      <h3 className="text-2xl font-bold text-black mb-2">
                        {item.damageDescription || 'Damage Analysis Result'}
                      </h3>
                    </div>
                    
                    {/* Analysis Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">                      {item.damageType && (
                        <div className="bg-white/5 rounded-xl p-4 border border-rose-200/30">
                          <h4 className="text-sm font-semibold text-gray-600 mb-1">Damage Type</h4>
                          <p className="text-black font-medium">{item.damageType}</p>
                        </div>
                      )}
                        {item.confidence !== undefined && (
                        <div className="bg-white/5 rounded-xl p-4 border border-emerald-200/30">
                          <h4 className="text-sm font-semibold text-gray-600 mb-1">Confidence Score</h4>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-emerald-400 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${item.confidence * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-black font-bold">{(item.confidence * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      )}
                        {item.repairEstimate && (
                        <div className="bg-white/5 rounded-xl p-4 border border-rose-200/30 sm:col-span-2">
                          <h4 className="text-sm font-semibold text-gray-600 mb-1">Estimated Repair Cost</h4>
                          <p className="text-2xl font-bold text-emerald-600">{item.repairEstimate}</p>
                        </div>
                      )}
                    </div>
                      {/* Recommendations */}
                    {item.recommendations && item.recommendations.length > 0 && (
                      <div className="bg-gradient-to-br from-rose-200/10 to-emerald-200/10 rounded-xl p-6 border border-rose-200/20">
                        <h4 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
                          <FaStar className="text-emerald-600" />
                          Recommendations
                        </h4>
                        <ul className="space-y-3">
                          {item.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-3 text-gray-700">
                              <span className="w-6 h-6 bg-rose-200/20 rounded-full flex items-center justify-center text-black text-sm font-bold mt-0.5 flex-shrink-0">
                                {index + 1}
                              </span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageHistory;
