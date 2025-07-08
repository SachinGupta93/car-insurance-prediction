// Performance Monitor - Track and optimize app performance
import React from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'render' | 'api' | 'image' | 'cache' | 'bundle';
  metadata?: Record<string, any>;
}

interface PerformanceStats {
  averageRenderTime: number;
  averageApiTime: number;
  averageImageLoadTime: number;
  cacheHitRate: number;
  slowComponents: Array<{ name: string; time: number }>;
  totalMetrics: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();
  private enabled: boolean = true;
  private maxMetrics: number = 1000; // Keep last 1000 metrics

  constructor() {
    this.enabled = import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING !== 'false';
    
    if (this.enabled) {
      this.setupPerformanceObserver();
      this.setupNavigationTiming();
    }
  }

  // Setup Performance Observer for Web Vitals
  private setupPerformanceObserver() {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      // Observe paint timing
      const paintObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.addMetric({
            name: entry.name,
            value: entry.startTime,
            timestamp: Date.now(),
            type: 'render',
            metadata: { entryType: entry.entryType }
          });
        });
      });
      paintObserver.observe({ entryTypes: ['paint'] });

      // Observe navigation timing
      const navigationObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const navEntry = entry as PerformanceNavigationTiming;
          this.addMetric({
            name: 'page-load',
            value: navEntry.loadEventEnd,
            timestamp: Date.now(),
            type: 'render',
            metadata: {
              domContentLoaded: navEntry.domContentLoadedEventEnd,
              firstByte: navEntry.responseStart
            }
          });
        });
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });

      // Observe resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          let type: PerformanceMetric['type'] = 'api';
          if (resourceEntry.name.includes('.jpg') || resourceEntry.name.includes('.png') || resourceEntry.name.includes('.webp')) {
            type = 'image';
          }

          this.addMetric({
            name: resourceEntry.name,
            value: resourceEntry.responseEnd - resourceEntry.requestStart,
            timestamp: Date.now(),
            type,
            metadata: {
              size: resourceEntry.transferSize,
              cached: resourceEntry.transferSize === 0
            }
          });
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });

    } catch (error) {
      console.warn('Performance Observer setup failed:', error);
    }
  }

  // Setup Navigation Timing
  private setupNavigationTiming() {
    if (typeof performance === 'undefined' || !performance.timing) return;

    window.addEventListener('load', () => {
      const timing = performance.timing;
      const navigationStart = timing.navigationStart;

      this.addMetric({
        name: 'dns-lookup',
        value: timing.domainLookupEnd - timing.domainLookupStart,
        timestamp: Date.now(),
        type: 'render'
      });

      this.addMetric({
        name: 'tcp-connection',
        value: timing.connectEnd - timing.connectStart,
        timestamp: Date.now(),
        type: 'render'
      });

      this.addMetric({
        name: 'server-response',
        value: timing.responseEnd - timing.requestStart,
        timestamp: Date.now(),
        type: 'api'
      });

      this.addMetric({
        name: 'dom-processing',
        value: timing.domComplete - timing.domLoading,
        timestamp: Date.now(),
        type: 'render'
      });
    });
  }

  // Add a performance metric
  private addMetric(metric: PerformanceMetric) {
    if (!this.enabled) return;

    this.metrics.push(metric);

    // Keep only the last N metrics to prevent memory issues
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow operations
    if (metric.value > 1000) { // > 1 second
      console.warn(`🐌 Slow ${metric.type}: ${metric.name} took ${metric.value.toFixed(2)}ms`);
    }
  }

  // Start timing an operation
  public startTimer(name: string): void {
    if (!this.enabled) return;
    this.timers.set(name, performance.now());
  }

  // End timing an operation
  public endTimer(name: string, type: PerformanceMetric['type'] = 'render', metadata?: Record<string, any>): number {
    if (!this.enabled) return 0;

    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer ${name} was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    this.addMetric({
      name,
      value: duration,
      timestamp: Date.now(),
      type,
      metadata
    });

    return duration;
  }

  // Measure a function execution time
  public measure<T>(name: string, fn: () => T, type: PerformanceMetric['type'] = 'render'): T {
    if (!this.enabled) return fn();

    this.startTimer(name);
    try {
      const result = fn();
      this.endTimer(name, type);
      return result;
    } catch (error) {
      this.endTimer(name, type, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  // Measure an async function execution time
  public async measureAsync<T>(name: string, fn: () => Promise<T>, type: PerformanceMetric['type'] = 'api'): Promise<T> {
    if (!this.enabled) return fn();

    this.startTimer(name);
    try {
      const result = await fn();
      this.endTimer(name, type);
      return result;
    } catch (error) {
      this.endTimer(name, type, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  // Get performance statistics
  public getStats(): PerformanceStats {
    if (!this.enabled || this.metrics.length === 0) {
      return {
        averageRenderTime: 0,
        averageApiTime: 0,
        averageImageLoadTime: 0,
        cacheHitRate: 0,
        slowComponents: [],
        totalMetrics: 0
      };
    }

    const renderMetrics = this.metrics.filter(m => m.type === 'render');
    const apiMetrics = this.metrics.filter(m => m.type === 'api');
    const imageMetrics = this.metrics.filter(m => m.type === 'image');
    const cacheMetrics = this.metrics.filter(m => m.metadata?.cached !== undefined);

    const averageRenderTime = renderMetrics.length > 0 
      ? renderMetrics.reduce((sum, m) => sum + m.value, 0) / renderMetrics.length 
      : 0;

    const averageApiTime = apiMetrics.length > 0 
      ? apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length 
      : 0;

    const averageImageLoadTime = imageMetrics.length > 0 
      ? imageMetrics.reduce((sum, m) => sum + m.value, 0) / imageMetrics.length 
      : 0;

    const cacheHits = cacheMetrics.filter(m => m.metadata?.cached === true).length;
    const cacheHitRate = cacheMetrics.length > 0 ? (cacheHits / cacheMetrics.length) * 100 : 0;

    const slowComponents = this.metrics
      .filter(m => m.value > 500) // > 500ms
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map(m => ({ name: m.name, time: m.value }));

    return {
      averageRenderTime,
      averageApiTime,
      averageImageLoadTime,
      cacheHitRate,
      slowComponents,
      totalMetrics: this.metrics.length
    };
  }

  // Get metrics by type
  public getMetricsByType(type: PerformanceMetric['type']): PerformanceMetric[] {
    return this.metrics.filter(m => m.type === type);
  }

  // Get recent metrics (last N minutes)
  public getRecentMetrics(minutes: number = 5): PerformanceMetric[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  // Clear all metrics
  public clearMetrics(): void {
    this.metrics = [];
    this.timers.clear();
  }

  // Export metrics for analysis
  public exportMetrics(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      metrics: this.metrics,
      stats: this.getStats()
    }, null, 2);
  }

  // Generate performance report
  public generateReport(): string {
    const stats = this.getStats();
    const recentMetrics = this.getRecentMetrics(5);
    
    let report = '📊 Performance Report\n';
    report += '='.repeat(50) + '\n\n';
    
    report += `📈 Overall Statistics:\n`;
    report += `  • Average Render Time: ${stats.averageRenderTime.toFixed(2)}ms\n`;
    report += `  • Average API Time: ${stats.averageApiTime.toFixed(2)}ms\n`;
    report += `  • Average Image Load Time: ${stats.averageImageLoadTime.toFixed(2)}ms\n`;
    report += `  • Cache Hit Rate: ${stats.cacheHitRate.toFixed(1)}%\n`;
    report += `  • Total Metrics: ${stats.totalMetrics}\n\n`;
    
    if (stats.slowComponents.length > 0) {
      report += `🐌 Slow Components (>500ms):\n`;
      stats.slowComponents.forEach(comp => {
        report += `  • ${comp.name}: ${comp.time.toFixed(2)}ms\n`;
      });
      report += '\n';
    }
    
    report += `⏱️  Recent Activity (last 5 minutes): ${recentMetrics.length} operations\n\n`;
    
    // Performance recommendations
    report += `💡 Recommendations:\n`;
    if (stats.averageRenderTime > 100) {
      report += `  • Consider optimizing render performance (current: ${stats.averageRenderTime.toFixed(2)}ms)\n`;
    }
    if (stats.averageApiTime > 1000) {
      report += `  • API calls are slow (current: ${stats.averageApiTime.toFixed(2)}ms)\n`;
    }
    if (stats.cacheHitRate < 50) {
      report += `  • Low cache hit rate (current: ${stats.cacheHitRate.toFixed(1)}%)\n`;
    }
    if (stats.slowComponents.length > 5) {
      report += `  • Multiple slow components detected, consider code splitting\n`;
    }
    
    return report;
  }

  // Enable/disable monitoring
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearMetrics();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor(componentName: string) {
  React.useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      performanceMonitor.measure(
        `Component: ${componentName}`,
        () => renderTime,
        'render'
      );
    };
  }, [componentName]);
}

// Higher-order component for performance monitoring
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const MonitoredComponent = React.forwardRef<any, P>((props, ref) => {
    usePerformanceMonitor(displayName);
    return <WrappedComponent {...(props as P)} ref={ref} />;
  });
  
  MonitoredComponent.displayName = `withPerformanceMonitoring(${displayName})`;
  return MonitoredComponent;
}

// Utility functions
export const measureRender = (name: string, fn: () => void) => {
  performanceMonitor.measure(name, fn, 'render');
};

export const measureApi = async <T extends any>(name: string, fn: () => Promise<T>): Promise<T> => {
  return performanceMonitor.measureAsync(name, fn, 'api');
};

export const measureImage = (name: string, fn: () => void) => {
  performanceMonitor.measure(name, fn, 'image');
};

// Console commands for debugging
if (typeof window !== 'undefined') {
  (window as any).performanceMonitor = {
    getStats: () => performanceMonitor.getStats(),
    generateReport: () => console.log(performanceMonitor.generateReport()),
    exportMetrics: () => performanceMonitor.exportMetrics(),
    clearMetrics: () => performanceMonitor.clearMetrics(),
    setEnabled: (enabled: boolean) => performanceMonitor.setEnabled(enabled)
  };
}

export default performanceMonitor;