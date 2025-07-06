import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

interface LoadingIndicatorProps {
  isLoading: boolean;
  message?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'spinner' | 'refresh' | 'dots';
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  isLoading,
  message = 'Loading...',
  size = 'medium',
  variant = 'spinner'
}) => {
  if (!isLoading) return null;

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  };

  const containerClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  const renderIcon = () => {
    const iconClass = `${sizeClasses[size]} animate-spin text-rose-500`;
    
    switch (variant) {
      case 'refresh':
        return <RefreshCw className={iconClass} />;
      case 'dots':
        return (
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-rose-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        );
      default:
        return <Loader2 className={iconClass} />;
    }
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${containerClasses[size]} text-gray-600`}>
      {renderIcon()}
      {message && <span className="font-medium">{message}</span>}
    </div>
  );
};

export default LoadingIndicator;