import { useState } from 'react';
import { useRagAnalysis } from '@/hooks/useRagAnalysis';
import { useAuth } from '@/context/AuthContext';

export default function RagAnalysis() {
  const [query, setQuery] = useState('');
  const { loading, error, result, analyzeWithRag } = useRagAnalysis();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    try {
      await analyzeWithRag(query, '');
    } catch (err) {
      console.error('Error analyzing query:', err);
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Ask Questions About Car Damage
        </h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>Get detailed information about car damage types, repair processes, and recommendations.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-5">
          <div className="flex gap-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about car damage..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              disabled={loading || !user}
            />
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={loading || !query.trim() || !user}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  <span>Analyzing...</span>
                </div>
              ) : (
                'Ask'
              )}
            </button>
          </div>
          {!user && (
            <p className="mt-2 text-xs text-red-500">You must be logged in to use this feature</p>
          )}
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {result && (
          <div className="mt-6 space-y-6">
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="text-lg font-medium leading-6 text-gray-900">Answer</h4>
              <div className="mt-2 prose prose-sm max-w-none text-gray-700">
                {result.answer.split('\n').map((paragraph, i) => (
                  <p key={i} className="mb-2">{paragraph}</p>
                ))}
              </div>
            </div>

            {result.sources && result.sources.length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-900">Sources</h4>
                <div className="mt-2 space-y-4">
                  {result.sources.map((source, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-white">
                      <h5 className="text-sm font-medium text-gray-900">{source.title}</h5>
                      <p className="mt-1 text-sm text-gray-500">{source.content}</p>
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500"
                        >
                          Read more
                          <svg className="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                          </svg>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {!result && !loading && !error && (
          <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex items-center justify-center text-gray-400">
              <svg className="h-8 w-8 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">Ask a question to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 