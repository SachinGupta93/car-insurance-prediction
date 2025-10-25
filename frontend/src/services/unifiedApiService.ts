/**
 * Unified API Service - Handles all backend communication with proper error handling
 */
import { UploadedImage, DamageResult } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Development mode configuration
const DEV_MODE = import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true';

interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

class UnifiedApiService {
  // Simple in-memory caches and in-flight deduplication
  private aggregatedCache: any | null = null;
  private insuranceCache: any | null = null;
  private inflightAggregated: Promise<any> | null = null;
  private inflightInsurance: Promise<any> | null = null;
  private async getAuthHeaders(): Promise<HeadersInit> {
    console.log('🔑 [UnifiedAPI] Getting auth headers...');
    
    try {
      const { auth } = await import('@/lib/firebase');
      const user = auth.currentUser;

      if (!user) {
        console.error('❌ [UnifiedAPI] User not authenticated.');
        // Development convenience: allow backend dev bypass when enabled
        if (DEV_MODE) {
          console.warn('🔧 [UnifiedAPI] DEV_MODE active; using X-Dev-Auth-Bypass header');
          const devHeaders: HeadersInit = {
            'Content-Type': 'application/json',
            'X-Dev-Auth-Bypass': 'true'
          };
          return devHeaders;
        }
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken(); // Allow cached token

      if (!token) {
        console.error('❌ [UnifiedAPI] Could not retrieve Firebase ID token.');
        if (DEV_MODE) {
          console.warn('🔧 [UnifiedAPI] DEV_MODE active; falling back to X-Dev-Auth-Bypass');
          return {
            'Content-Type': 'application/json',
            'X-Dev-Auth-Bypass': 'true'
          } as HeadersInit;
        }
        throw new Error('Could not retrieve Firebase ID token');
      }
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      console.log('✅ [UnifiedAPI] Auth headers created successfully.');
      return headers;

    } catch (error) {
      console.error('💥 [UnifiedAPI] Error getting auth headers:', error);
      // Re-throw the error to be caught by the calling function
      throw error;
    }
  }

  /**
   * Test backend connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Analyze car damage from image file
   */
  async analyzeDamage(
    imageFile: File,
    opts?: { signal?: AbortSignal; timeoutMs?: number }
  ): Promise<DamageResult> {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const authHeaders = await this.getAuthHeaders();
      const formHeaders = { ...authHeaders };
      delete (formHeaders as any)['Content-Type']; // Remove Content-Type for FormData
      
      // Create AbortController for proper timeout handling
      const controller = new AbortController();
      // Merge with caller-provided signal if any
      if (opts?.signal) {
        const onAbort = () => {
          try { controller.abort(); } catch {}
        };
        if (opts.signal.aborted) {
          // If already aborted, abort immediately
          onAbort();
        } else {
          opts.signal.addEventListener('abort', onAbort, { once: true });
        }
      }
      const timeoutMs = Math.max(10000, opts?.timeoutMs ?? 90000); // default 90s for complex analysis
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${API_BASE_URL}/api/analyze-damage`, {
        method: 'POST',
        headers: formHeaders,
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        
        // Check if this is a quota exceeded error (429) with demo data
        if (response.status === 429 || errorData.quota_exceeded) {
          // If the backend provided demo data with the error, use it
          if (errorData.data && errorData.data.structured_data) {
            console.log('📊 [UnifiedAPI] Using demo data from quota exceeded response');
            return errorData.data.structured_data;
          }
          
          // Otherwise, throw the quota error for upstream handling
          const quotaError = new Error(errorData.error || 'Quota exceeded');
          (quotaError as any).isQuotaExceeded = true;
          (quotaError as any).retryDelaySeconds = errorData.retry_delay_seconds || 60;
          throw quotaError;
        }
        
        // Check if this is a 500 error with a 429 quota message - backend demo mode handling
        if (response.status === 500 && errorData.error) {
          const errorMsg = errorData.error.toLowerCase();
          if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('exceeded')) {
            console.log('📊 [UnifiedAPI] Detected quota exceeded in 500 error, requesting demo mode...');
            // If backend couldn't return demo data due to error handling, create a fallback
            const demoResult: DamageResult = {
              damageType: "Structural Damage",
              confidence: 0.85,
              severity: "moderate" as const,
              description: "Demo analysis - API quota exceeded",
              damageDescription: "Sample damage analysis due to quota limits",
              vehicleIdentification: {
                make: "Demo Vehicle",
                model: "Sample Model",
                year: "2020",
                confidence: 0.8,
                identificationDetails: "Demo mode - API quota exceeded"
              },
              repairEstimate: "₹25,000 - ₹35,000",
              recommendations: [
                "Professional assessment recommended",
                "Contact insurance provider"
              ],
              identifiedDamageRegions: [],
              isDemoMode: true,
              quotaExceeded: true
            };
            return demoResult;
          }
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform backend response to DamageResult format with flexible parsing
      let result: any = null;
      if (data?.data?.structured_data) {
        result = data.data.structured_data;
        // Add demo flags if present on wrapper
        if (data.demo_mode) {
          result.isDemoMode = true;
          result.quotaExceeded = data.quota_exceeded;
          result.retryDelaySeconds = data.retry_delay_seconds;
        }
      } else if (data?.structured_data) {
        result = data.structured_data;
      } else if (data && typeof data === 'object' && 'damageType' in data && 'confidence' in data) {
        // Some endpoints (e.g., multi-region) may return the structured payload directly
        result = data;
      }
      
      if (result) {
        console.log('✅ [UnifiedAPI] Returning structured data:', result);
        return result as DamageResult;
      }
      
      throw new Error('Invalid response format from backend');
    } catch (error) {
      console.error('Error analyzing damage:', error);
      
      // Handle AbortError specifically
      if (error instanceof Error && error.name === 'AbortError') {
        // Distinguish between caller-cancelled vs timeout
        if (opts?.signal?.aborted) {
          throw new Error('Analysis was cancelled');
        }
        throw new Error('Request timeout - Analysis took too long');
      }
      
      throw error;
    }
  }

  /**
   * Get user's analysis history
   */
  async getUserHistory(): Promise<UploadedImage[]> {
    console.log('📚 [UnifiedAPI] Getting user history...');
    
    try {
      const headers = await this.getAuthHeaders();
      const limit = 50;
      console.log('🌐 [UnifiedAPI] Making request to:', `${API_BASE_URL}/api/analysis/history?limit=${limit}`);

      // Do not log headers to avoid exposing bearer token
      
      const response = await fetch(`${API_BASE_URL}/api/analysis/history?limit=${limit}`, {
        method: 'GET',
        headers: headers
      });

      console.log('📡 [UnifiedAPI] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 [UnifiedAPI] Raw response data:', data);
      
      // Handle the response format {data: [...], success: true}
      const historyData = data.data || data;
      console.log('📈 [UnifiedAPI] Processed history data:', {
        type: typeof historyData,
        isArray: Array.isArray(historyData),
        length: Array.isArray(historyData) ? historyData.length : 'not array'
      });
      
      if (Array.isArray(historyData)) {
        console.log('✅ [UnifiedAPI] Returning array data:', historyData.length + ' items');
        return historyData;
      } else if (historyData && typeof historyData === 'object') {
        // Convert Firebase-style object to array
        const convertedData = Object.entries(historyData).map(([id, item]) => ({
          id,
          ...item as any
        }));
        console.log('✅ [UnifiedAPI] Converted object to array:', convertedData.length + ' items');
        return convertedData;
      }
      
      console.log('📭 [UnifiedAPI] No valid history data found, returning empty array');
      return [];
    } catch (error) {
      console.error('💥 [UnifiedAPI] Error fetching user history:', error);
      console.error('📚 [UnifiedAPI] Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      throw error;
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  /**
   * Add analysis to history
   */
  async addAnalysisToHistory(analysisData: any): Promise<string> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/user/history/add`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(analysisData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.id || data.data?.id || 'unknown';
    } catch (error) {
      console.error('Error adding analysis to history:', error);
      throw error;
    }
  }

  /**
   * Ensure user profile exists
   */
  async ensureUserProfile(userData: any): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(`${API_BASE_URL}/api/user/ensure-profile`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(userData),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        console.error('❌ [UnifiedAPI] Profile creation failed:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ [UnifiedAPI] User profile ensured:', data);
      return data;
    } catch (error) {
      console.error('💥 [UnifiedAPI] Error ensuring user profile:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        const isDevelopment = import.meta.env.DEV || import.meta.env.NODE_ENV === 'development';
        if (isDevelopment) {
          console.warn('🔧 [UnifiedAPI] ensure-profile timed out in dev mode, returning fallback');
          return {
            success: true,
            created: false,
            data: {
              uid: userData?.uid || 'dev-fallback',
              email: userData?.email || 'dev@example.com',
              display_name: userData?.name || userData?.displayName || 'Dev User'
            }
          };
        }
        throw new Error('Request timeout while ensuring user profile');
      }
      
      // In development mode, provide a fallback
      const isDevelopment = import.meta.env.DEV || import.meta.env.NODE_ENV === 'development';
      if (isDevelopment && error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn('🔧 [UnifiedAPI] Backend connection failed in dev mode, using fallback');
        return {
          success: true,
          created: false,
          data: {
            uid: 'dev-fallback',
            email: userData?.email || 'dev@example.com',
            display_name: userData?.displayName || 'Dev User'
          }
        };
      }
      
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/user/stats`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  }

  /**
   * Get combined dashboard data (stats + recent history) - optimized single call
   */
  async getDashboardData(): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/user/dashboard-data`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get aggregated dashboard data for admin/insurance views
   */
  async getAggregatedDashboardData(): Promise<any> {
    // If there's an in-flight request, reuse it
    if (this.inflightAggregated) {
      return this.inflightAggregated;
    }
    this.inflightAggregated = (async () => {
      try {
        const headers = await this.getAuthHeaders();
        const perUser = 20;
        const maxUsers = 20;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(`${API_BASE_URL}/api/admin/aggregated-dashboard-data?per_user_limit=${perUser}&max_users=${maxUsers}`, {
          method: 'GET',
          headers: headers,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Network error' }));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        // Cache last good payload
        this.aggregatedCache = data;
        return data;
      } catch (error: any) {
        // Gracefully handle aborts: return cached data if available
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn('🔁 [UnifiedAPI] Aggregated request aborted; returning cached data if available');
          if (this.aggregatedCache) {
            return this.aggregatedCache;
          }
          // Safe minimal structure to avoid UI errors
          return { success: true, data: {}, data_source: 'empty', message: 'Request aborted (no cache)' };
        }
        console.error('Error fetching aggregated dashboard data:', error);
        throw error;
      } finally {
        this.inflightAggregated = null;
      }
    })();
    return this.inflightAggregated;
  }

  /**
   * Get insurance-specific dashboard data
   */
  async getInsuranceDashboardData(): Promise<any> {
    if (this.inflightInsurance) {
      return this.inflightInsurance;
    }
    this.inflightInsurance = (async () => {
      try {
        const headers = await this.getAuthHeaders();
        const perUser = 20;
        const maxUsers = 20;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(`${API_BASE_URL}/api/admin/insurance-dashboard-data?per_user_limit=${perUser}&max_users=${maxUsers}`, {
          method: 'GET',
          headers: headers,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Network error' }));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        this.insuranceCache = data;
        return data;
      } catch (error: any) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn('🔁 [UnifiedAPI] Insurance request aborted; returning cached data if available');
          if (this.insuranceCache) {
            return this.insuranceCache;
          }
          return { success: true, data: {}, data_source: 'empty', message: 'Request aborted (no cache)' };
        }
        console.error('Error fetching insurance dashboard data:', error);
        throw error;
      } finally {
        this.inflightInsurance = null;
      }
    })();
    return this.inflightInsurance;
  }
  
  /**
   * Get Firebase usage status for admins
   */
  async getFirebaseUsageStatus(): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/admin/firebase-usage`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        if (response.status === 403) {
          // Not an admin or not authenticated
          return null;
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching Firebase usage status:', error);
      return null;  // Silently fail for this non-critical feature
    }
  }
}

// Export singleton instance
export const unifiedApiService = new UnifiedApiService();
export default unifiedApiService;