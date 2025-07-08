// Network Manager - Handles connectivity and network status
export interface NetworkStatus {
  isOnline: boolean;
  connectionType: 'offline' | 'slow' | 'fast';
  retryCount: number;
  lastConnected?: Date;
}

export interface NetworkManagerConfig {
  healthCheckUrl: string;
  healthCheckInterval: number;
  retryAttempts: number;
  retryDelay: number;
  timeoutMs: number;
}

class NetworkManager {
  private config: NetworkManagerConfig;
  private status: NetworkStatus;
  private listeners: Array<(status: NetworkStatus) => void> = [];
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private retryTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<NetworkManagerConfig>) {
    this.config = {
      healthCheckUrl: '/health',
      healthCheckInterval: 300000, // 5 minutes instead of 30 seconds
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      timeoutMs: 10000, // 10 seconds
      ...config
    };

    this.status = {
      isOnline: navigator.onLine,
      connectionType: 'fast',
      retryCount: 0
    };

    this.setupEventListeners();
    
    // Only start health check in development mode
    if (import.meta.env.DEV) {
      this.startHealthCheck();
    }
  }

  private setupEventListeners() {
    // Listen for browser online/offline events
    window.addEventListener('online', () => {
      this.updateStatus({
        isOnline: true,
        connectionType: 'fast',
        retryCount: 0,
        lastConnected: new Date()
      });
    });

    window.addEventListener('offline', () => {
      this.updateStatus({
        isOnline: false,
        connectionType: 'offline',
        retryCount: 0
      });
    });

    // Listen for network changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', () => {
        this.checkConnectionQuality();
      });
    }
  }

  private updateStatus(newStatus: Partial<NetworkStatus>) {
    const oldStatus = { ...this.status };
    this.status = { ...this.status, ...newStatus };
    
    // Notify listeners if status changed
    if (JSON.stringify(oldStatus) !== JSON.stringify(this.status)) {
      this.notifyListeners();
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.status);
      } catch (error) {
        console.error('Network status listener error:', error);
      }
    });
  }

  private checkConnectionQuality() {
    if (!navigator.onLine) {
      this.updateStatus({ isOnline: false, connectionType: 'offline' });
      return;
    }

    // Check connection quality based on navigator.connection if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const effectiveType = connection.effectiveType;
      
      let connectionType: 'slow' | 'fast' = 'fast';
      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        connectionType = 'slow';
      } else if (effectiveType === '3g' && connection.downlink < 1) {
        connectionType = 'slow';
      }
      
      this.updateStatus({ connectionType });
    }
  }

  private async performHealthCheck(): Promise<boolean> {
    if (!navigator.onLine) {
      return false;
    }

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const url = `${baseUrl}/api${this.config.healthCheckUrl}`;
      
      console.log(`🔍 Health check URL: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Health check passed:', data);
        this.updateStatus({
          isOnline: true,
          connectionType: 'fast',
          retryCount: 0,
          lastConnected: new Date()
        });
        return true;
      } else {
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.warn('🔥 Health check failed:', error);
      this.handleHealthCheckFailure();
      return false;
    }
  }

  private handleHealthCheckFailure() {
    const newRetryCount = this.status.retryCount + 1;
    
    if (newRetryCount >= this.config.retryAttempts) {
      this.updateStatus({
        isOnline: false,
        connectionType: 'offline',
        retryCount: newRetryCount
      });
    } else {
      this.updateStatus({
        isOnline: false,
        connectionType: 'slow',
        retryCount: newRetryCount
      });
      
      // Retry after delay
      this.retryTimer = setTimeout(() => {
        this.performHealthCheck();
      }, this.config.retryDelay * Math.pow(2, newRetryCount - 1)); // Exponential backoff
    }
  }

  private startHealthCheck() {
    // Initial check
    this.performHealthCheck();
    
    // Set up periodic checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  public async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = this.config.retryAttempts
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;
        
        if (i === maxRetries) {
          throw lastError;
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, this.config.retryDelay * Math.pow(2, i))
        );
      }
    }
    
    throw lastError!;
  }

  public onStatusChange(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.push(listener);
    
    // Call listener immediately with current status
    listener(this.status);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public getStatus(): NetworkStatus {
    return { ...this.status };
  }

  public async checkConnection(): Promise<boolean> {
    return await this.performHealthCheck();
  }

  public destroy() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    
    this.listeners = [];
    
    // Remove event listeners
    window.removeEventListener('online', this.setupEventListeners);
    window.removeEventListener('offline', this.setupEventListeners);
  }
}

// Create and export singleton instance
export const networkManager = new NetworkManager();

// Export for testing or custom instances
export { NetworkManager };