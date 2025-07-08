// Lazy Loaded Components - Code splitting and dynamic imports
import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

// Loading component with skeleton
const LoadingFallback: React.FC<{ 
  height?: string; 
  message?: string;
  showSkeleton?: boolean;
}> = ({ 
  height = 'h-64', 
  message = 'Loading...', 
  showSkeleton = false 
}) => {
  if (showSkeleton) {
    return (
      <div className={`${height} animate-pulse`}>
        <div className="bg-gray-200 rounded-lg h-full flex flex-col space-y-4 p-6">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          <div className="flex-1 bg-gray-300 rounded"></div>
          <div className="h-4 bg-gray-300 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${height} flex items-center justify-center`}>
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-rose-500" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
};

// Lazy loaded components with proper error boundaries
const LazyDashboard = lazy(() => 
  import('@/components/dashboard/Dashboard').then(module => ({
    default: module.default
  }))
);

const LazyHistoryPage = lazy(() => 
  import('@/components/HistoryPage').then(module => ({
    default: module.default
  }))
);

const LazyAnalysisChart = lazy(() => 
  import('@/components/charts/DisableChartInAnalysis').then(module => ({
    default: module.default
  }))
);

const LazyInsurancePage = lazy(() => 
  import('@/components/InsurancePage').then(module => ({
    default: module.default
  }))
);

// Error boundary for lazy components
class LazyComponentErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center text-red-600">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold mb-2">Component Failed to Load</h3>
            <p className="text-sm text-gray-600">
              {this.state.error?.message || 'Unknown error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-rose-500 text-white rounded hover:bg-rose-600"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper component for lazy loading with enhanced features
const LazyWrapper: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  height?: string;
  showSkeleton?: boolean;
  preload?: boolean;
}> = ({ 
  children, 
  fallback, 
  height = 'h-64', 
  showSkeleton = true,
  preload = false 
}) => {
  return (
    <LazyComponentErrorBoundary fallback={fallback}>
      <Suspense 
        fallback={
          fallback || (
            <LoadingFallback 
              height={height} 
              showSkeleton={showSkeleton}
              message="Loading component..."
            />
          )
        }
      >
        {children}
      </Suspense>
    </LazyComponentErrorBoundary>
  );
};

// Pre-configured lazy components with optimized loading
export const OptimizedDashboard: React.FC = () => (
  <LazyWrapper height="min-h-screen" showSkeleton={true}>
    <LazyDashboard />
  </LazyWrapper>
);

export const OptimizedHistoryPage: React.FC = () => (
  <LazyWrapper height="min-h-screen" showSkeleton={true}>
    <LazyHistoryPage />
  </LazyWrapper>
);

export const OptimizedAnalysisChart: React.FC<any> = (props) => (
  <LazyWrapper height="h-96" showSkeleton={true}>
    <LazyAnalysisChart {...props} />
  </LazyWrapper>
);

export const OptimizedInsurancePage: React.FC = () => (
  <LazyWrapper height="min-h-screen" showSkeleton={true}>
    <LazyInsurancePage />
  </LazyWrapper>
);

// Preloader utility for critical components
export const preloadCriticalComponents = async () => {
  console.log('🚀 Preloading critical components...');
  
  const criticalComponents = [
    () => import('@/components/HistoryPage'),
    () => import('@/components/charts/DisableChartInAnalysis')
  ];

  try {
    await Promise.all(criticalComponents.map(loader => loader()));
    console.log('✅ Critical components preloaded');
  } catch (error) {
    console.warn('⚠️ Some components failed to preload:', error);
  }
};

// Component preloader hook
export const useComponentPreloader = (componentLoaders: Array<() => Promise<any>>) => {
  const [preloaded, setPreloaded] = React.useState(false);
  const [preloading, setPreloading] = React.useState(false);

  const preload = React.useCallback(async () => {
    if (preloaded || preloading) return;
    
    setPreloading(true);
    try {
      await Promise.all(componentLoaders.map(loader => loader()));
      setPreloaded(true);
    } catch (error) {
      console.warn('Component preloading failed:', error);
    } finally {
      setPreloading(false);
    }
  }, [componentLoaders, preloaded, preloading]);

  return { preload, preloaded, preloading };
};

// Route-based component preloader
export const RoutePreloader: React.FC<{ route: string }> = ({ route }) => {
  React.useEffect(() => {
    const preloadForRoute = async () => {
      switch (route) {
        case '/dashboard':
          await import('@/components/dashboard/Dashboard');
          break;
        case '/history':
          await import('@/components/HistoryPage');
          await import('@/components/charts/AnalysisChart');
          break;
        case '/insurance':
          await import('@/components/InsurancePage');
          break;
        default:
          break;
      }
    };

    // Preload after a short delay to not block initial render
    const timer = setTimeout(preloadForRoute, 100);
    return () => clearTimeout(timer);
  }, [route]);

  return null;
};

// Performance monitoring for lazy components
export const LazyComponentPerformanceMonitor: React.FC<{
  componentName: string;
  children: React.ReactNode;
}> = ({ componentName, children }) => {
  React.useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      console.log(`📊 Component ${componentName} render time: ${loadTime.toFixed(2)}ms`);
      
      // Log slow components
      if (loadTime > 1000) {
        console.warn(`⚠️ Slow component detected: ${componentName} took ${loadTime.toFixed(2)}ms`);
      }
    };
  }, [componentName]);

  return <>{children}</>;
};

// Bundle analyzer helper
export const getBundleInfo = () => {
  if (process.env.NODE_ENV === 'development') {
    return {
      chunks: performance.getEntriesByType('navigation'),
      resources: performance.getEntriesByType('resource'),
      timing: performance.timing
    };
  }
  return null;
};

export default LazyWrapper;