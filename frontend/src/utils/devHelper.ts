/**
 * Development Helper Utilities
 * 
 * This module provides utility functions to assist with debugging during development.
 * These functions should not be used in production code.
 */

// Determine if we're in development mode
export const isDev = import.meta.env.DEV;

/**
 * Enhanced console logging with timestamps and labels
 */
export const devLog = (label: string, ...data: any[]): void => {
  if (!isDev) return;

  const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
  console.log(`[${timestamp}] ${label}:`, ...data);
};

/**
 * Enhanced console error with timestamps and labels
 */
export const devError = (label: string, ...data: any[]): void => {
  if (!isDev) return;

  const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
  console.error(`[${timestamp}] ${label}:`, ...data);
};

/**
 * Simple performance measurement utility
 */
export class PerformanceTimer {
  private startTime: number = 0;
  private label: string;

  constructor(label: string = 'Timer') {
    this.label = label;
    this.start();
  }

  start(): void {
    this.startTime = performance.now();
  }

  end(): number {
    const duration = performance.now() - this.startTime;
    if (isDev) {
      console.log(`[${this.label}] Execution time: ${duration.toFixed(2)}ms`);
    }
    return duration;
  }
}

/**
 * Create a delay promise for testing async operations
 * @param ms Delay in milliseconds
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Mock API response generator
 */
export const mockApiResponse = <T>(data: T, options?: { delay?: number, errorRate?: number }): Promise<T> => {
  const delayMs = options?.delay || 500;
  const errorRate = options?.errorRate || 0;

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Randomly fail based on error rate (0-1)
      if (Math.random() < errorRate) {
        reject(new Error('Mock API Error - Random failure'));
        return;
      }
      
      resolve(data);
    }, delayMs);
  });
};

/**
 * Get current used memory
 */
export const getMemoryUsage = (): string => {
  if (typeof window === 'undefined' || !isDev || !('performance' in window)) {
    return 'Memory usage not available';
  }
  
  // @ts-ignore - TypeScript doesn't know about memory property
  const memory = (window.performance as any).memory;
  if (!memory) return 'Memory usage not available';
  
  const usedHeap = memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
  return `${usedHeap.toFixed(2)} MB`;
};

/**
 * Print component render count in development
 */
export const useRenderCount = (componentName: string): number => {
  if (typeof window === 'undefined' || !isDev) return 0;

  // @ts-ignore - Using a simple hack for dev-only tool
  window.__renderCounts = window.__renderCounts || {};
  // @ts-ignore
  window.__renderCounts[componentName] = (window.__renderCounts[componentName] || 0) + 1;
  
  // @ts-ignore
  const count = window.__renderCounts[componentName];
  
  console.log(`[Render] ${componentName} rendered ${count} time(s)`);
  
  return count;
};

export default {
  isDev,
  devLog,
  devError,
  PerformanceTimer,
  delay,
  mockApiResponse,
  getMemoryUsage,
  useRenderCount
};