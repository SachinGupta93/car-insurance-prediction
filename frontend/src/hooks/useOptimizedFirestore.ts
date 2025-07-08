// Optimized Firestore Hook - Implements Firebase best practices
import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  doc, 
  getDoc,
  enableIndexedDbPersistence,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Enable offline persistence
try {
  enableIndexedDbPersistence(db);
} catch (err) {
  console.warn('Firestore persistence failed:', err);
}

interface UseOptimizedFirestoreOptions {
  collectionName: string;
  userId?: string;
  pageSize?: number;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  selectFields?: string[];
  enablePagination?: boolean;
  enableCaching?: boolean;
}

interface FirestoreResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  totalCount: number;
}

// Cache for storing query results
const queryCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useOptimizedFirestore<T extends DocumentData>(
  options: UseOptimizedFirestoreOptions
): FirestoreResult<T> {
  const {
    collectionName,
    userId,
    pageSize = 10,
    orderByField = 'createdAt',
    orderDirection = 'desc',
    selectFields,
    enablePagination = true,
    enableCaching = true
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Generate cache key
  const cacheKey = useMemo(() => {
    return `${collectionName}_${userId || 'all'}_${orderByField}_${orderDirection}_${selectFields?.join(',') || 'all'}`;
  }, [collectionName, userId, orderByField, orderDirection, selectFields]);

  // Check cache first
  const getCachedData = useCallback(() => {
    if (!enableCaching) return null;
    
    const cached = queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }, [cacheKey, enableCaching]);

  // Set cache
  const setCachedData = useCallback((newData: T[]) => {
    if (!enableCaching) return;
    
    queryCache.set(cacheKey, {
      data: newData,
      timestamp: Date.now()
    });
  }, [cacheKey, enableCaching]);

  // Build optimized query
  const buildQuery = useCallback((startAfterDoc?: QueryDocumentSnapshot) => {
    let q = query(collection(db, collectionName));

    if (userId) {
      q = query(q, where('userId', '==', userId));
    }

    q = query(q, orderBy(orderByField, orderDirection));

    if (enablePagination) {
      q = query(q, limit(pageSize));
      if (startAfterDoc) {
        q = query(q, startAfter(startAfterDoc));
      }
    }

    return q;
  }, [collectionName, userId, pageSize, orderByField, orderDirection, enablePagination]);

  // Fetch data with optimizations
  const fetchData = useCallback(async (refreshing = false) => {
    const cached = getCachedData();
    if (cached && !refreshing) {
      setData(cached as T[]);
      setLoading(false);
      return;
    }

    if (!refreshing) {
      setLoading(true);
    }
    setError(null);

    try {
      const q = buildQuery(refreshing ? undefined : (lastDoc || undefined));
      const querySnapshot = await getDocs(q);

      const newDocs = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Cast to unknown first to satisfy TypeScript's generic constraints
        return { id: doc.id, ...data } as unknown as T;
      });

      if (refreshing) {
        setData(newDocs);
        setCachedData(newDocs);
      } else {
        setData(prev => [...prev, ...newDocs]);
        setCachedData([...data, ...newDocs]);
      }

      setHasMore(querySnapshot.docs.length === pageSize && enablePagination);
      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null);

      if (querySnapshot.docs.length > 0 && !totalCount) {
        // This is a simplified count, for a real total count a separate query would be needed
        setTotalCount(prev => prev + querySnapshot.docs.length);
      }

    } catch (e: any) {
      console.error("Error fetching from Firestore:", e);
      setError(e.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [buildQuery, getCachedData, setCachedData, lastDoc, pageSize, enablePagination, totalCount, data]);

  // Load more data (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchData(true);
  }, [hasMore, loading, fetchData]);

  // Refresh data
  const refresh = useCallback(async () => {
    // Clear cache
    queryCache.delete(cacheKey);
    setLastDoc(null);
    setHasMore(true);
    await fetchData(false);
  }, [cacheKey, fetchData]);

  // Initial load
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    totalCount
  };
}

// Specialized hook for analysis history with optimizations
export function useOptimizedAnalysisHistory(userId?: string) {
  return useOptimizedFirestore({
    collectionName: 'analysisHistory',
    userId,
    pageSize: 20,
    orderByField: 'analysisDate',
    orderDirection: 'desc',
    selectFields: [
      'analysisDate',
      'damageType',
      'confidence',
      'severity',
      'repairEstimate',
      'damageDescription',
      'vehicleInfo' // Only basic vehicle info, not full details
    ],
    enablePagination: true,
    enableCaching: true
  });
}

// Specialized hook for vehicle data with lazy loading
export function useOptimizedVehicleData(userId?: string) {
  return useOptimizedFirestore({
    collectionName: 'vehicles',
    userId,
    pageSize: 50,
    orderByField: 'createdAt',
    orderDirection: 'desc',
    selectFields: [
      'make',
      'model',
      'year',
      'licensePlate',
      'color',
      'status'
      // Exclude heavy fields like images, full identification details
    ],
    enablePagination: false, // Usually fewer vehicles
    enableCaching: true
  });
}

// Hook for loading detailed data on demand
export function useDetailedDocument<T extends DocumentData>(
  collectionName: string,
  documentId: string | null
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    if (!documentId) return;

    setLoading(true);
    setError(null);

    try {
      console.time(`Detailed Document: ${documentId}`);
      
      const docRef = doc(db, collectionName, documentId);
      const docSnap = await getDoc(docRef);
      
      console.timeEnd(`Detailed Document: ${documentId}`);

      if (docSnap.exists()) {
        setData({ ...docSnap.data(), id: docSnap.id } as unknown as T);
      } else {
        setError('Document not found');
      }
    } catch (err) {
      console.error('Error loading document details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load details');
    } finally {
      setLoading(false);
    }
  }, [collectionName, documentId]);

  useEffect(() => {
    if (documentId) {
      loadDetails();
    }
  }, [documentId, loadDetails]);

  return { data, loading, error, reload: loadDetails };
}

// Utility function to clear Firestore cache
export function clearFirestoreCache() {
  queryCache.clear();
  console.log('🧹 Firestore cache cleared');
}

// Utility function to get cache stats
export function getFirestoreCacheStats() {
  const stats = {
    totalEntries: queryCache.size,
    totalSize: 0,
    entries: [] as Array<{ key: string; size: number; age: number }>
  };

  queryCache.forEach((value, key) => {
    const size = JSON.stringify(value.data).length;
    const age = Date.now() - value.timestamp;
    
    stats.totalSize += size;
    stats.entries.push({ key, size, age });
  });

  return stats;
}