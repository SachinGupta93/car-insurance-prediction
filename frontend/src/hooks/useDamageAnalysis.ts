import { useState, useCallback } from 'react';
import { analyzeDamage } from '@/lib/api';
import { DamageResult } from '@/types';
import { useAuth } from '@/context/AuthContext';

export function useDamageAnalysis() {
  const [results, setResults] = useState<DamageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const analyzeImage = useCallback(async (imageUrl: string) => {
    if (!imageUrl) {
      setError('No image URL provided');
      return;
    }

    if (!user) {
      setError('You must be logged in to analyze images');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await analyzeDamage(imageUrl);
      console.log('API Response Data:', response.data);
      
      if (response.data && Array.isArray(response.data.results)) {
        setResults(response.data.results);
      } else {
        console.error('Invalid response format:', response);
        setError('Received invalid response format from server');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image');
      console.error('API Call Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    results,
    loading,
    error,
    analyzeImage,
  };
} 