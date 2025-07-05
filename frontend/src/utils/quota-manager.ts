// Quota management for Gemini API
export class QuotaManager {
  private static readonly STORAGE_KEY = 'gemini_quota_tracker';
  private static readonly QUOTA_EXCEEDED_KEY = 'gemini_quota_exceeded';
  private static readonly RESET_INTERVAL = 60 * 1000; // 1 minute
  private static readonly MAX_REQUESTS_PER_MINUTE = 10; // More conservative limit
  private static readonly QUOTA_EXCEEDED_COOLDOWN = 5 * 60 * 1000; // 5 minutes cooldown when quota exceeded
  
  static getRequestCount(): number {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return 0;
    
    const data = JSON.parse(stored);
    const now = Date.now();
    
    // Reset if more than a minute has passed
    if (now - data.timestamp > this.RESET_INTERVAL) {
      this.resetCount();
      return 0;
    }
    
    return data.count || 0;
  }
  
  static incrementCount(): void {
    const current = this.getRequestCount();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
      count: current + 1,
      timestamp: Date.now()
    }));
  }
  
  static resetCount(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
      count: 0,
      timestamp: Date.now()
    }));
  }

  /**
   * Record that API quota was exceeded
   */
  static recordQuotaExceeded(): void {
    localStorage.setItem(this.QUOTA_EXCEEDED_KEY, JSON.stringify({
      timestamp: Date.now()
    }));
    console.log('[QuotaManager] Quota exceeded recorded');
  }

  /**
   * Check if we're in cooldown period after quota exceeded
   */
  static isInQuotaCooldown(): boolean {
    const stored = localStorage.getItem(this.QUOTA_EXCEEDED_KEY);
    if (!stored) return false;
    
    const data = JSON.parse(stored);
    const elapsed = Date.now() - data.timestamp;
    
    return elapsed < this.QUOTA_EXCEEDED_COOLDOWN;
  }

  /**
   * Get remaining cooldown time
   */
  static getQuotaCooldownTime(): number {
    const stored = localStorage.getItem(this.QUOTA_EXCEEDED_KEY);
    if (!stored) return 0;
    
    const data = JSON.parse(stored);
    const elapsed = Date.now() - data.timestamp;
    const remaining = this.QUOTA_EXCEEDED_COOLDOWN - elapsed;
    
    return Math.max(0, remaining);
  }
  
  static canMakeRequest(): boolean {
    // Check if we're in quota exceeded cooldown
    if (this.isInQuotaCooldown()) {
      return false;
    }
    
    return this.getRequestCount() < this.MAX_REQUESTS_PER_MINUTE;
  }
  
  static getWaitTime(): number {
    // If in quota cooldown, return cooldown time
    if (this.isInQuotaCooldown()) {
      return this.getQuotaCooldownTime();
    }
    
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return 0;
    
    const data = JSON.parse(stored);
    const elapsed = Date.now() - data.timestamp;
    const remaining = this.RESET_INTERVAL - elapsed;
    
    return Math.max(0, remaining);
  }
  
  static getQuotaStatus(): {
    canRequest: boolean;
    requestsUsed: number;
    requestsRemaining: number;
    waitTime: number;
    reason?: string;
  } {
    const used = this.getRequestCount();
    const canRequest = this.canMakeRequest();
    const remaining = this.MAX_REQUESTS_PER_MINUTE - used;
    const waitTime = canRequest ? 0 : this.getWaitTime();
    
    let reason = '';
    if (!canRequest) {
      if (this.isInQuotaCooldown()) {
        reason = 'API quota exceeded by Google, waiting for cooldown period';
      } else {
        reason = 'Rate limit reached, waiting for reset';
      }
    }
    
    return {
      canRequest,
      requestsUsed: used,
      requestsRemaining: Math.max(0, remaining),
      waitTime,
      reason
    };
  }

  /**
   * Clear quota exceeded status (for manual reset)
   */
  static clearQuotaExceeded(): void {
    localStorage.removeItem(this.QUOTA_EXCEEDED_KEY);
    console.log('[QuotaManager] Quota exceeded status cleared');
  }
}