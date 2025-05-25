import { useState, useCallback } from 'react';
import { analyzeWithRag as apiAnalyzeWithRag } from '@/lib/api';
import { RagResult } from '@/types';
import { useAuth } from '@/context/AuthContext';

export function useRagAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RagResult | null>(null);
  const { user } = useAuth();

  const analyzeWithRag = useCallback(async (query: string, context: string = '') => {
    if (!query.trim()) {
      setError('Please enter a question');
      return;
    }

    if (!user) {
      setError('You must be logged in to use this feature');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiAnalyzeWithRag(query, context);
      
      if (response.data) {
        setResult(response.data);
      } else {
        console.error('Invalid response format:', response);
        setError('Received invalid response format from server');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze with RAG');
      console.error('RAG Analysis Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    loading,
    error,
    result,
    analyzeWithRag,
  };
} 