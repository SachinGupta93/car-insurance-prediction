import React from 'react';
import { Loader2, Car, Zap } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
  variant?: 'default' | 'pulse' | 'glow' | 'automotive';
}

export default function LoadingSpinner({ 
  size = 'md', 
  text = 'Loading...', 
  className = '',
  variant = 'default'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10', 
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  const renderSpinner = () => {
    switch (variant) {
      case 'automotive':
        return (
          <div className="relative">
            <div className={`${sizeClasses[size]} relative`}>
              <div className="absolute inset-0 border-4 border-transparent border-t-primary-500 border-r-primary-400 rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-2 border-transparent border-t-accent-blue-400 rounded-full animate-spin animation-delay-75"></div>
              <Car className="absolute inset-0 m-auto w-1/2 h-1/2 text-primary-600" />
            </div>
          </div>
        );
      case 'glow':
        return (
          <div className="relative">
            <div className={`${sizeClasses[size]} relative animate-spin`}>
              <div className="absolute inset-0 border-4 border-transparent border-t-primary-500 rounded-full shadow-lg shadow-primary-500/50"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-primary-300 rounded-full opacity-30 animate-pulse"></div>
            </div>
          </div>
        );
      case 'pulse':
        return (
          <div className="relative">
            <div className={`${sizeClasses[size]} flex items-center justify-center`}>
              <div className="absolute inset-0 bg-primary-500 rounded-full animate-ping opacity-30"></div>
              <div className="absolute inset-2 bg-primary-400 rounded-full animate-pulse"></div>
              <Zap className="relative w-1/2 h-1/2 text-white" />
            </div>
          </div>
        );
      default:
        return (
          <Loader2 className={`${sizeClasses[size]} animate-spin text-primary-600`} />
        );
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {renderSpinner()}
      {text && (
        <div className="text-center">
          <p className={`${textSizes[size]} font-medium text-gray-700 animate-pulse`}>
            {text}
          </p>
          <div className="mt-2 w-20 h-1 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full animate-pulse"></div>
        </div>
      )}
    </div>
  );
}

export function LoadingCard({ title = 'Loading', className = '' }: { title?: string; className?: string }) {
  return (
    <div className={`card card-glass p-6 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="skeleton w-8 h-8 rounded-full"></div>
          <div className="skeleton h-4 w-1/3 rounded-lg"></div>
        </div>
        <div className="space-y-3">
          <div className="skeleton h-3 w-full rounded-lg"></div>
          <div className="skeleton h-3 w-5/6 rounded-lg"></div>
          <div className="skeleton h-3 w-4/6 rounded-lg"></div>
        </div>
        <div className="flex gap-2 pt-2">
          <div className="skeleton h-8 w-20 rounded-lg"></div>
          <div className="skeleton h-8 w-24 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

export function LoadingTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card card-glass overflow-hidden">
      {/* Table Header */}
      <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100 border-b border-white/20">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="skeleton h-4 rounded-lg"></div>
          ))}
        </div>
      </div>
      
      {/* Table Body */}
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors"
               style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, colIndex) => (
              <div key={colIndex} className="skeleton h-3 rounded"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoadingDashboard() {
  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="skeleton h-8 w-64 rounded-lg"></div>
        <div className="skeleton h-10 w-32 rounded-2xl"></div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <LoadingCard key={i} className="h-32" />
        ))}
      </div>
      
      {/* Chart Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card card-glass p-6 h-80">
          <div className="skeleton h-6 w-1/3 mb-4 rounded-lg"></div>
          <div className="skeleton h-full w-full rounded-lg"></div>
        </div>
        <div className="card card-glass p-6 h-80">
          <div className="skeleton h-6 w-1/2 mb-4 rounded-lg"></div>
          <div className="skeleton h-full w-full rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}