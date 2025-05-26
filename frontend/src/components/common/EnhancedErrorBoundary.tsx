import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };
  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl animate-bounce" style={{ animationDelay: '0.5s' }}></div>
          </div>
          
          <div className="relative max-w-lg w-full mx-4">
            <div className="glass-card p-8 text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full border border-red-400/30 mb-6">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent mb-4">
                  Oops! Something went wrong
                </h3>
                <p className="text-gray-300 leading-relaxed mb-6">
                  We encountered an unexpected error while processing your request. Don't worry - this happens sometimes, and we're here to help you get back on track.
                </p>
                
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <div className="glass-card-nested border border-red-500/20 p-4 mb-6 text-left">
                    <h4 className="text-sm font-semibold text-red-400 mb-2">Development Error Details:</h4>
                    <pre className="text-xs text-red-300 whitespace-pre-wrap font-mono leading-relaxed">
                      {this.state.error.message}
                    </pre>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={this.handleReset}
                    className="btn-primary px-6 py-3 flex items-center justify-center"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="btn-secondary px-6 py-3 flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Page
                  </button>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-600/30">
                  <p className="text-sm text-gray-400">
                    If the problem persists, please contact our support team
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Error caught by error handler:', error, errorInfo);
    // You could also send this to an error reporting service
  };
}
