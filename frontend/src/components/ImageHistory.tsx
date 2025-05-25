import React from 'react';
import { useHistory, AnalysisHistoryItem } from '@/context/HistoryContext'; // Adjust path as needed

interface ImageHistoryProps {
  history?: AnalysisHistoryItem[];
}

const ImageHistory: React.FC<ImageHistoryProps> = ({ history: historyProp }) => {
  const { history: contextHistory, loadingHistory, errorHistory, removeAnalysisFromHistory, clearHistory } = useHistory();
  
  // Use provided history prop or fall back to context history
  const history = historyProp || contextHistory;

  if (loadingHistory) {
    return <div className="p-4 text-center text-gray-500">Loading history...</div>;
  }

  if (errorHistory) {
    return <div className="p-4 text-center text-red-500">Error loading history: {errorHistory}</div>;
  }

  if (history.length === 0) {
    return (
      <div className="p-6 bg-white shadow-lg rounded-lg text-center">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Analysis History</h2>
        <p className="text-gray-500">No analysis history found.</p>
        <p className="text-sm text-gray-400 mt-1">Upload an image to see its analysis here.</p>
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

  return (
    <div className="bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {!historyProp && (
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Analysis History</h2>
            {history.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
                    clearHistory();
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                Clear All History
              </button>
            )}
          </div>
        )}

        <div className="space-y-4">
          {history.map((item: AnalysisHistoryItem) => (
            <div key={item.id} className="bg-white shadow-lg rounded-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
              <div className="md:flex">
                <div className="md:w-1/3">
                  <img
                    src={item.imageUrl}
                    alt="Analyzed car damage"
                    className="object-cover w-full h-48 md:h-full"
                  />
                </div>
                <div className="p-4 md:p-6 md:w-2/3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs text-gray-500">{formatDate(item.analysisDate)}</p>
                      <h3 className="text-lg font-semibold text-gray-800 mt-1">
                        {item.damageDescription || 'Analysis Result'}
                      </h3>
                    </div>
                    <button
                      onClick={() => removeAnalysisFromHistory(item.id)}
                      className="text-red-500 hover:text-red-700 transition-colors text-sm p-1 -mr-1 -mt-1"
                      aria-label="Remove history item"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  
                  {item.damageType && (
                    <p className="text-sm text-gray-600">
                      <strong>Damage Type:</strong> {item.damageType}
                    </p>
                  )}
                  {item.confidence !== undefined && (
                    <p className="text-sm text-gray-600">
                      <strong>Confidence:</strong> {(item.confidence * 100).toFixed(2)}%
                    </p>
                  )}
                  {item.repairEstimate && (
                    <p className="text-sm text-gray-600">
                      <strong>Est. Repair Cost:</strong> {item.repairEstimate}
                    </p>
                  )}
                  {item.recommendations && item.recommendations.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-xs font-semibold text-gray-700 mb-1">Recommendations:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-0.5">
                        {item.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
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
  );
};

export default ImageHistory;
