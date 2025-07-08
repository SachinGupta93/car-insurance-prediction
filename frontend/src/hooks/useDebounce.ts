// Debounce and Throttle Hooks - Optimize user input handling
import { useState, useEffect, useCallback, useRef, DependencyList } from 'react';

// Debounce hook - delays execution until after delay period
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Debounced callback hook
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: DependencyList = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay, ...deps]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

// Throttle hook - limits execution to once per delay period
export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef<number>(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      const now = Date.now();
      if (now >= lastExecuted.current + delay) {
        setThrottledValue(value);
        lastExecuted.current = now;
      }
    }, delay - (Date.now() - lastExecuted.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return throttledValue;
}

// Throttled callback hook
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: DependencyList = []
): T {
  const lastExecuted = useRef<number>(0);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastExecuted.current >= delay) {
        lastExecuted.current = now;
        callback(...args);
      }
    },
    [callback, delay, ...deps]
  ) as T;

  return throttledCallback;
}

// Search input hook with debouncing
export function useDebouncedSearch(
  initialValue: string = '',
  delay: number = 300
) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, delay);

  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [searchTerm, debouncedSearchTerm]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  return {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm,
    clearSearch,
    isSearching
  };
}

// API call debouncing hook
export function useDebouncedApiCall<T, P extends any[]>(
  apiFunction: (...args: P) => Promise<T>,
  delay: number = 500
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const debouncedCall = useDebouncedCallback(
    async (...args: P) => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const result = await apiFunction(...args);
        setData(result);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err);
        }
      } finally {
        setLoading(false);
      }
    },
    delay
  );

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    call: debouncedCall,
    cancel: () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
  };
}

// Form validation with debouncing
export function useDebouncedValidation<T>(
  value: T,
  validator: (value: T) => string | null,
  delay: number = 300
) {
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const debouncedValue = useDebounce(value, delay);

  useEffect(() => {
    if (value !== debouncedValue) {
      setIsValidating(true);
    } else {
      setIsValidating(false);
      const validationError = validator(debouncedValue);
      setError(validationError);
    }
  }, [value, debouncedValue, validator]);

  return {
    error,
    isValidating,
    isValid: error === null && !isValidating
  };
}

// Scroll event throttling hook
export function useThrottledScroll(
  callback: (scrollY: number) => void,
  delay: number = 100
) {
  const throttledCallback = useThrottledCallback(callback, delay);

  useEffect(() => {
    const handleScroll = () => {
      throttledCallback(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [throttledCallback]);
}

// Resize event throttling hook
export function useThrottledResize(
  callback: (width: number, height: number) => void,
  delay: number = 250
) {
  const throttledCallback = useThrottledCallback(callback, delay);

  useEffect(() => {
    const handleResize = () => {
      throttledCallback(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [throttledCallback]);
}

// Mouse move throttling hook
export function useThrottledMouseMove(
  callback: (x: number, y: number) => void,
  delay: number = 50
) {
  const throttledCallback = useThrottledCallback(callback, delay);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      throttledCallback(event.clientX, event.clientY);
    },
    [throttledCallback]
  );

  return handleMouseMove;
}

// Performance monitoring for debounced operations
export function useDebouncePerformance<T>(
  value: T,
  delay: number,
  label: string = 'debounced-operation'
) {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = performance.now();
    
    const handler = setTimeout(() => {
      const endTime = performance.now();
      const duration = endTime - startTimeRef.current;
      
      console.log(`📊 ${label} debounce duration: ${duration.toFixed(2)}ms`);
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, label]);

  return debouncedValue;
}

// Batch operations with debouncing
export function useBatchedOperations<T>(
  batchProcessor: (items: T[]) => void,
  delay: number = 500,
  maxBatchSize: number = 10
) {
  const [batch, setBatch] = useState<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const processBatch = useCallback(() => {
    if (batch.length > 0) {
      batchProcessor([...batch]);
      setBatch([]);
    }
  }, [batch, batchProcessor]);

  const addToBatch = useCallback((item: T) => {
    setBatch(prev => {
      const newBatch = [...prev, item];
      
      // Process immediately if batch is full
      if (newBatch.length >= maxBatchSize) {
        setTimeout(() => batchProcessor([...newBatch]), 0);
        return [];
      }
      
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new timeout
      timeoutRef.current = setTimeout(processBatch, delay);
      
      return newBatch;
    });
  }, [delay, maxBatchSize, batchProcessor, processBatch]);

  const flushBatch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    processBatch();
  }, [processBatch]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    addToBatch,
    flushBatch,
    batchSize: batch.length
  };
}