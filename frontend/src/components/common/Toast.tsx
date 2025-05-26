import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X, Zap, Shield, Car } from 'lucide-react';

interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info' | 'automotive';
  title: string;
  message?: string;
  className?: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
  variant?: 'default' | 'glass' | 'modern' | 'minimal';
}

export default function Toast({ 
  type, 
  title, 
  message, 
  className = '',
  onClose,
  autoClose = true,
  duration = 5000,
  variant = 'modern'
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (autoClose) {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (duration / 100));
          if (newProgress <= 0) {
            clearInterval(progressInterval);
            handleClose();
            return 0;
          }
          return newProgress;
        });
      }, 100);

      return () => clearInterval(progressInterval);
    }
  }, [autoClose, duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  const getIcon = () => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'success':
        return <CheckCircle className={`${iconClass} text-emerald-500`} />;
      case 'error':
        return <AlertCircle className={`${iconClass} text-red-500`} />;
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-amber-500`} />;
      case 'automotive':
        return <Car className={`${iconClass} text-primary-500`} />;
      case 'info':
      default:
        return <Info className={`${iconClass} text-blue-500`} />;
    }
  };

  const getStyles = () => {
    const baseStyles = "relative border transition-all duration-300 transform";
    
    if (variant === 'glass') {
      switch (type) {
        case 'success':
          return `${baseStyles} card-glass border-emerald-200/30 text-emerald-800 backdrop-blur-xl`;
        case 'error':
          return `${baseStyles} card-glass border-red-200/30 text-red-800 backdrop-blur-xl`;
        case 'warning':
          return `${baseStyles} card-glass border-amber-200/30 text-amber-800 backdrop-blur-xl`;
        case 'automotive':
          return `${baseStyles} card-glass border-primary-200/30 text-primary-800 backdrop-blur-xl`;
        case 'info':
        default:
          return `${baseStyles} card-glass border-blue-200/30 text-blue-800 backdrop-blur-xl`;
      }
    }

    if (variant === 'minimal') {
      switch (type) {
        case 'success':
          return `${baseStyles} bg-emerald-50/80 border-emerald-200 text-emerald-900`;
        case 'error':
          return `${baseStyles} bg-red-50/80 border-red-200 text-red-900`;
        case 'warning':
          return `${baseStyles} bg-amber-50/80 border-amber-200 text-amber-900`;
        case 'automotive':
          return `${baseStyles} bg-primary-50/80 border-primary-200 text-primary-900`;
        case 'info':
        default:
          return `${baseStyles} bg-blue-50/80 border-blue-200 text-blue-900`;
      }
    }

    // Modern variant (default)
    switch (type) {
      case 'success':
        return `${baseStyles} bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-300 text-emerald-900 shadow-lg shadow-emerald-500/20`;
      case 'error':
        return `${baseStyles} bg-gradient-to-r from-red-50 to-red-100 border-red-300 text-red-900 shadow-lg shadow-red-500/20`;
      case 'warning':
        return `${baseStyles} bg-gradient-to-r from-amber-50 to-amber-100 border-amber-300 text-amber-900 shadow-lg shadow-amber-500/20`;
      case 'automotive':
        return `${baseStyles} bg-gradient-to-r from-primary-50 to-primary-100 border-primary-300 text-primary-900 shadow-lg shadow-primary-500/20`;
      case 'info':
      default:
        return `${baseStyles} bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 text-blue-900 shadow-lg shadow-blue-500/20`;
    }
  };

  const getProgressColor = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-amber-500';
      case 'automotive':
        return 'bg-primary-500';
      case 'info':
      default:
        return 'bg-blue-500';
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`
      ${getStyles()} 
      rounded-2xl p-4 max-w-md mx-auto
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      ${className}
    `}>
      {/* Progress bar */}
      {autoClose && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/10 rounded-t-2xl overflow-hidden">
          <div 
            className={`h-full ${getProgressColor()} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm mb-1">{title}</h4>
          {message && (
            <p className="text-sm opacity-80 leading-relaxed">{message}</p>
          )}
        </div>
        {onClose && (
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-black/10 transition-colors duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
