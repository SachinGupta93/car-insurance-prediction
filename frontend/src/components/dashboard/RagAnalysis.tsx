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
    <div className="glass-card">
      <div className="px-6 py-8">
        <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Ask Questions About Car Damage
        </h3>
        <div className="mt-3 max-w-xl text-gray-300">
          <p>Get detailed information about car damage types, repair processes, and recommendations powered by AI.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-6">
          <div className="flex gap-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about car damage..."
              className="input-modern flex-1"
              disabled={loading || !user}
            />
            <button
              type="submit"
              className="btn-primary px-6 py-3 min-w-[120px]"
              disabled={loading || !query.trim() || !user}
            >              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="loading-pulse w-4 h-4 mr-2"></div>
                  <span>Analyzing...</span>
                </div>
              ) : (
                'Ask'
              )}
            </button>
          </div>
          {!user && (
            <p className="mt-3 text-sm text-red-400 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              You must be logged in to use this feature
            </p>
          )}
        </form>

        {error && (
          <div className="mt-6 glass-card-nested border border-red-500/20">
            <div className="flex items-start p-4">
              <svg className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="text-red-300">{error}</div>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-6">
            <div className="glass-card-nested border border-blue-500/20">
              <div className="p-6">
                <h4 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  AI Analysis
                </h4>
                <div className="prose prose-sm max-w-none text-gray-300">
                  {result.answer.split('\n').map((paragraph, i) => (
                    <p key={i} className="mb-3 leading-relaxed">{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>

            {result.sources && result.sources.length > 0 && (
              <div className="glass-card-nested">
                <div className="p-6">
                  <h4 className="text-xl font-semibold text-white mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Sources & References
                  </h4>
                  <div className="space-y-4">
                    {result.sources.map((source, index) => (
                      <div key={index} className="glass-card border border-purple-500/20 hover:border-purple-400/30 transition-all duration-300">
                        <div className="p-4">
                          <h5 className="text-lg font-medium text-white mb-2">{source.title}</h5>
                          <p className="text-gray-300 text-sm leading-relaxed mb-3">{source.content}</p>
                          {source.url && (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
                            >
                              Read more
                              <svg className="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {!result && !loading && !error && (
          <div className="mt-8 glass-card-nested border border-gray-500/20">
            <div className="p-8">
              <div className="flex flex-col items-center justify-center text-gray-400">
                <div className="relative">
                  <svg className="h-16 w-16 mb-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                    </svg>
                  </div>
                </div>
                <p className="text-lg font-medium text-gray-300 mb-2">Ready to Help</p>
                <p className="text-sm text-gray-400 text-center max-w-sm">
                  Ask any question about car damage analysis, repair processes, or insurance claims to get started
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 