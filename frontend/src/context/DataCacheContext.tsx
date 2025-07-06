import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { UploadedImage, DamageResult, AnalysisHistoryItem } from '@/types';
import { unifiedApiService } from '@/services/unifiedApiService';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';
import { FallbackDataService } from '@/services/fallbackDataService';
import { useFirebaseService } from '@/services/firebaseService';

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Analytics data interface
interface AnalyticsData {
  totalAnalyses: number;
  avgConfidence: number;
  damageTypes: Record<string, number>;
  monthlyTrends: Array<{ month: string; count: number; avgCost: number }>;
  severityBreakdown: Record<string, number>;
  recentAnalyses?: UploadedImage[];
  topDamageType?: string;
}

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isValid: boolean;
}

// Cache state interface
interface CacheState {
  analysisHistory: CacheEntry<AnalysisHistoryItem[]> | null;
  analyticsData: CacheEntry<AnalyticsData> | null;
  userStats: CacheEntry<any> | null;
  recentAnalyses: CacheEntry<UploadedImage[]> | null;
}

// Context type
interface DataCacheContextType {
  // Cache state
  cacheState: CacheState;
  
  // Data getters with caching
  getAnalysisHistory: (forceRefresh?: boolean) => Promise<AnalysisHistoryItem[]>;
  getAnalyticsData: (forceRefresh?: boolean) => Promise<AnalyticsData>;
  getUserStats: (forceRefresh?: boolean) => Promise<any>;
  getRecentAnalyses: (forceRefresh?: boolean) => Promise<UploadedImage[]>;
  
  // Cache management
  invalidateCache: (key?: keyof CacheState) => void;
  clearAllCache: () => void;
  
  // Loading states
  isLoading: {
    analysisHistory: boolean;
    analyticsData: boolean;
    userStats: boolean;
    recentAnalyses: boolean;
  };
  
  // Error states
  errors: {
    analysisHistory: string | null;
    analyticsData: string | null;
    userStats: string | null;
    recentAnalyses: string | null;
  };
  
  // Data modification methods
  addAnalysisToCache: (analysis: UploadedImage) => void;
  removeAnalysisFromCache: (id: string) => void;
  updateAnalysisInCache: (id: string, updates: Partial<UploadedImage>) => void;
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined);

// Helper function to check if cache is valid
const isCacheValid = <T,>(cacheEntry: CacheEntry<T> | null): boolean => {
  if (!cacheEntry) return false;
  return cacheEntry.isValid && (Date.now() - cacheEntry.timestamp) < CACHE_DURATION;
};

// Helper function to create cache entry
const createCacheEntry = <T,>(data: T): CacheEntry<T> => ({
  data,
  timestamp: Date.now(),
  isValid: true
});

export const DataCacheProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { firebaseUser } = useFirebaseAuth();
  const firebaseService = useFirebaseService();
  
  // Cache state
  const [cacheState, setCacheState] = useState<CacheState>({
    analysisHistory: null,
    analyticsData: null,
    userStats: null,
    recentAnalyses: null
  });
  
  // Loading states
  const [isLoading, setIsLoading] = useState({
    analysisHistory: false,
    analyticsData: false,
    userStats: false,
    recentAnalyses: false
  });
  
  // Error states
  const [errors, setErrors] = useState({
    analysisHistory: null,
    analyticsData: null,
    userStats: null,
    recentAnalyses: null
  });
  
  // Set loading state
  const setLoadingState = (key: keyof typeof isLoading, value: boolean) => {
    setIsLoading(prev => ({ ...prev, [key]: value }));
  };
  
  // Set error state
  const setErrorState = (key: keyof typeof errors, value: string | null) => {
    setErrors(prev => ({ ...prev, [key]: value }));
  };
  
  // Load from persistent storage on mount and preload data
  useEffect(() => {
    const savedCache = localStorage.getItem('dataCache');
    if (savedCache && firebaseUser) {
      try {
        const parsedCache = JSON.parse(savedCache);
        // Validate cache entries
        const validatedCache: CacheState = {
          analysisHistory: parsedCache.analysisHistory ? 
            (isCacheValid(parsedCache.analysisHistory) ? parsedCache.analysisHistory : null) : null,
          analyticsData: parsedCache.analyticsData ? 
            (isCacheValid(parsedCache.analyticsData) ? parsedCache.analyticsData : null) : null,
          userStats: parsedCache.userStats ? 
            (isCacheValid(parsedCache.userStats) ? parsedCache.userStats : null) : null,
          recentAnalyses: parsedCache.recentAnalyses ? 
            (isCacheValid(parsedCache.recentAnalyses) ? parsedCache.recentAnalyses : null) : null
        };
        setCacheState(validatedCache);
        
        // Preload fresh data in background if cache is stale
        console.log('🚀 DataCache: Checking for stale data and preloading...');
        if (!validatedCache.analysisHistory || !validatedCache.analyticsData) {
          setTimeout(() => {
            getAnalysisHistory(true).catch(console.error);
            getAnalyticsData(true).catch(console.error);
          }, 500);
        }
      } catch (error) {
        console.error('Failed to load cache from localStorage:', error);
      }
    }
  }, [firebaseUser]);
  
  // Save to persistent storage when cache changes
  useEffect(() => {
    if (firebaseUser) {
      localStorage.setItem('dataCache', JSON.stringify(cacheState));
    }
  }, [cacheState, firebaseUser]);
  
  // Clear cache when user logs out
  useEffect(() => {
    if (!firebaseUser) {
      clearAllCache();
    }
  }, [firebaseUser]);
  
  // Get analysis history with caching
  const getAnalysisHistory = useCallback(async (forceRefresh = false): Promise<AnalysisHistoryItem[]> => {
    // Check cache first - return stale data immediately if available
    if (!forceRefresh && cacheState.analysisHistory && cacheState.analysisHistory.data.length > 0) {
      // Return cached data immediately
      const cachedData = cacheState.analysisHistory.data;
      
      // If cache is stale, refresh in background
      if (!isCacheValid(cacheState.analysisHistory)) {
        console.log('📊 DataCache: Returning stale data, refreshing in background...');
        // Refresh in background without waiting
        setTimeout(() => {
          getAnalysisHistory(true).catch(console.error);
        }, 100);
      }
      
      return cachedData;
    }
    
    if (!firebaseUser) {
      return [];
    }
    
    setLoadingState('analysisHistory', true);
    setErrorState('analysisHistory', null);
    
    try {
      const firebaseHistory = await firebaseService.getAnalysisHistory();
      
      // Convert to AnalysisHistoryItem format
      const convertedHistory: AnalysisHistoryItem[] = firebaseHistory.map(item => ({
        id: item.id,
        userId: item.userId || '',
        imageUrl: item.image || '',
        analysisDate: item.analysisDate || item.timestamp || new Date().toISOString(),
        damageDescription: item.result?.damageDescription || item.result?.description || 'No description',
        repairEstimate: item.result?.repairEstimate || 
          (item.result?.enhancedRepairCost?.conservative?.rupees || 'N/A'),
        damageType: item.result?.damageType || 'Unknown',
        confidence: item.confidence || item.result?.confidence || 0,
        description: item.result?.description || 'No description',
        recommendations: item.result?.recommendations || [],
        severity: item.severity || item.result?.severity || 'minor'
      }));
      
      const sortedHistory = convertedHistory.sort((a, b) => 
        new Date(b.analysisDate).getTime() - new Date(a.analysisDate).getTime()
      );
      
      // Update cache
      setCacheState(prev => ({
        ...prev,
        analysisHistory: createCacheEntry(sortedHistory)
      }));
      
      return sortedHistory;
    } catch (error) {
      console.error('Failed to load analysis history:', error);
      setErrorState('analysisHistory', 'Failed to load analysis history');
      
      // Return cached data if available, otherwise fallback
      if (cacheState.analysisHistory) {
        return cacheState.analysisHistory.data;
      }
      
      // Use fallback data
      const fallbackHistory = FallbackDataService.generateSampleHistory();
      const fallbackConverted: AnalysisHistoryItem[] = fallbackHistory.map(item => ({
        id: item.id,
        userId: item.userId || '',
        imageUrl: item.image || '',
        analysisDate: item.analysisDate || item.timestamp || new Date().toISOString(),
        damageDescription: item.result?.damageDescription || item.result?.description || 'No description',
        repairEstimate: item.result?.repairEstimate || 'N/A',
        damageType: item.result?.damageType || 'Unknown',
        confidence: item.confidence || item.result?.confidence || 0,
        description: item.result?.description || 'No description',
        recommendations: item.result?.recommendations || [],
        severity: item.severity || item.result?.severity || 'minor'
      }));
      
      return fallbackConverted;
    } finally {
      setLoadingState('analysisHistory', false);
    }
  }, [cacheState.analysisHistory, firebaseUser, firebaseService]);
  
  // Get analytics data with caching
  const getAnalyticsData = useCallback(async (forceRefresh = false): Promise<AnalyticsData> => {
    // Check cache first - return stale data immediately if available
    if (!forceRefresh && cacheState.analyticsData && cacheState.analyticsData.data) {
      // Return cached data immediately
      const cachedData = cacheState.analyticsData.data;
      
      // If cache is stale, refresh in background
      if (!isCacheValid(cacheState.analyticsData)) {
        console.log('📊 DataCache: Returning stale analytics data, refreshing in background...');
        // Refresh in background without waiting
        setTimeout(() => {
          getAnalyticsData(true).catch(console.error);
        }, 100);
      }
      
      return cachedData;
    }
    
    if (!firebaseUser) {
      return FallbackDataService.generateSampleAnalytics();
    }
    
    setLoadingState('analyticsData', true);
    setErrorState('analyticsData', null);
    
    try {
      const stats = await unifiedApiService.getUserStats();
      
      // Update cache
      setCacheState(prev => ({
        ...prev,
        analyticsData: createCacheEntry(stats)
      }));
      
      return stats;
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      setErrorState('analyticsData', 'Failed to load analytics data');
      
      // Return cached data if available, otherwise fallback
      if (cacheState.analyticsData) {
        return cacheState.analyticsData.data;
      }
      
      return FallbackDataService.generateSampleAnalytics();
    } finally {
      setLoadingState('analyticsData', false);
    }
  }, [cacheState.analyticsData, firebaseUser]);
  
  // Get user stats with caching
  const getUserStats = useCallback(async (forceRefresh = false): Promise<any> => {
    // Check cache first
    if (!forceRefresh && isCacheValid(cacheState.userStats)) {
      return cacheState.userStats!.data;
    }
    
    if (!firebaseUser) {
      return {};
    }
    
    setLoadingState('userStats', true);
    setErrorState('userStats', null);
    
    try {
      const stats = await unifiedApiService.getUserStats();
      
      // Update cache
      setCacheState(prev => ({
        ...prev,
        userStats: createCacheEntry(stats)
      }));
      
      return stats;
    } catch (error) {
      console.error('Failed to load user stats:', error);
      setErrorState('userStats', 'Failed to load user stats');
      
      // Return cached data if available
      if (cacheState.userStats) {
        return cacheState.userStats.data;
      }
      
      return {};
    } finally {
      setLoadingState('userStats', false);
    }
  }, [cacheState.userStats, firebaseUser]);
  
  // Get recent analyses with caching
  const getRecentAnalyses = useCallback(async (forceRefresh = false): Promise<UploadedImage[]> => {
    // Check cache first
    if (!forceRefresh && isCacheValid(cacheState.recentAnalyses)) {
      return cacheState.recentAnalyses!.data;
    }
    
    if (!firebaseUser) {
      return [];
    }
    
    setLoadingState('recentAnalyses', true);
    setErrorState('recentAnalyses', null);
    
    try {
      const history = await getAnalysisHistory(forceRefresh);
      // Convert to UploadedImage format and take first 10
      const recentAnalyses: UploadedImage[] = history.slice(0, 10).map(item => ({
        id: item.id,
        userId: item.userId,
        uploadedAt: item.analysisDate,
        analysisDate: item.analysisDate,
        timestamp: item.analysisDate,
        filename: item.imageUrl.split('/').pop() || 'Unknown',
        image: item.imageUrl,
        result: {
          damageType: item.damageType,
          confidence: item.confidence,
          description: item.description,
          damageDescription: item.damageDescription,
          recommendations: item.recommendations,
          repairEstimate: item.repairEstimate,
          severity: item.severity
        },
        confidence: item.confidence,
        severity: item.severity
      }));
      
      // Update cache
      setCacheState(prev => ({
        ...prev,
        recentAnalyses: createCacheEntry(recentAnalyses)
      }));
      
      return recentAnalyses;
    } catch (error) {
      console.error('Failed to load recent analyses:', error);
      setErrorState('recentAnalyses', 'Failed to load recent analyses');
      
      // Return cached data if available
      if (cacheState.recentAnalyses) {
        return cacheState.recentAnalyses.data;
      }
      
      return [];
    } finally {
      setLoadingState('recentAnalyses', false);
    }
  }, [cacheState.recentAnalyses, firebaseUser, getAnalysisHistory]);
  
  // Invalidate specific cache entry
  const invalidateCache = (key?: keyof CacheState) => {
    if (key) {
      setCacheState(prev => ({
        ...prev,
        [key]: prev[key] ? { ...prev[key]!, isValid: false } : null
      }));
    } else {
      // Invalidate all cache entries
      setCacheState(prev => ({
        analysisHistory: prev.analysisHistory ? { ...prev.analysisHistory, isValid: false } : null,
        analyticsData: prev.analyticsData ? { ...prev.analyticsData, isValid: false } : null,
        userStats: prev.userStats ? { ...prev.userStats, isValid: false } : null,
        recentAnalyses: prev.recentAnalyses ? { ...prev.recentAnalyses, isValid: false } : null
      }));
    }
  };
  
  // Clear all cache
  const clearAllCache = () => {
    setCacheState({
      analysisHistory: null,
      analyticsData: null,
      userStats: null,
      recentAnalyses: null
    });
    localStorage.removeItem('dataCache');
  };
  
  // Add analysis to cache
  const addAnalysisToCache = (analysis: UploadedImage) => {
    setCacheState(prev => {
      const newRecentAnalyses = prev.recentAnalyses ? 
        createCacheEntry([analysis, ...prev.recentAnalyses.data].slice(0, 10)) : 
        createCacheEntry([analysis]);
      
      return {
        ...prev,
        recentAnalyses: newRecentAnalyses,
        // Invalidate other caches that might be affected
        analyticsData: prev.analyticsData ? { ...prev.analyticsData, isValid: false } : null,
        userStats: prev.userStats ? { ...prev.userStats, isValid: false } : null
      };
    });
  };
  
  // Remove analysis from cache
  const removeAnalysisFromCache = (id: string) => {
    setCacheState(prev => {
      const newRecentAnalyses = prev.recentAnalyses ? 
        createCacheEntry(prev.recentAnalyses.data.filter(item => item.id !== id)) : 
        null;
      
      return {
        ...prev,
        recentAnalyses: newRecentAnalyses,
        // Invalidate other caches that might be affected
        analyticsData: prev.analyticsData ? { ...prev.analyticsData, isValid: false } : null,
        userStats: prev.userStats ? { ...prev.userStats, isValid: false } : null
      };
    });
  };
  
  // Update analysis in cache
  const updateAnalysisInCache = (id: string, updates: Partial<UploadedImage>) => {
    setCacheState(prev => {
      const newRecentAnalyses = prev.recentAnalyses ? 
        createCacheEntry(prev.recentAnalyses.data.map(item => 
          item.id === id ? { ...item, ...updates } : item
        )) : 
        null;
      
      return {
        ...prev,
        recentAnalyses: newRecentAnalyses
      };
    });
  };
  
  const contextValue: DataCacheContextType = {
    cacheState,
    getAnalysisHistory,
    getAnalyticsData,
    getUserStats,
    getRecentAnalyses,
    invalidateCache,
    clearAllCache,
    isLoading,
    errors,
    addAnalysisToCache,
    removeAnalysisFromCache,
    updateAnalysisInCache
  };
  
  return (
    <DataCacheContext.Provider value={contextValue}>
      {children}
    </DataCacheContext.Provider>
  );
};

// Custom hook to use data cache
export const useDataCache = () => {
  const context = useContext(DataCacheContext);
  if (context === undefined) {
    throw new Error('useDataCache must be used within a DataCacheProvider');
  }
  return context;
};

export default DataCacheContext;