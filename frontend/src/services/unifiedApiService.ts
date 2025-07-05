/**
 * Unified API Service - Handles all backend communication with proper error handling
 */
import { UploadedImage, DamageResult } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5174/api';

// Development mode configuration
const DEV_MODE = import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true';
const BYPASS_AUTH_IN_DEV = import.meta.env.VITE_BYPASS_AUTH_IN_DEV === 'true';

interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

class UnifiedApiService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    console.log('🔑 [UnifiedAPI] Getting auth headers...', {
      DEV_MODE,
      BYPASS_AUTH_IN_DEV,
      API_BASE_URL
    });
    
    try {
      // In development mode, always use bypass header if configured
      if (DEV_MODE && BYPASS_AUTH_IN_DEV) {
        console.log('🔧 [UnifiedAPI] Development mode: Using auth bypass header');
        return {
          'Content-Type': 'application/json',
          'X-Dev-Auth-Bypass': 'true'
        };
      }

      // Try to get Firebase token from localStorage first
      let token = localStorage.getItem('firebaseIdToken');
      
      // If no token in localStorage, try to get it from Firebase auth
      if (!token) {
        const { auth } = await import('@/lib/firebase');
        const user = auth.currentUser;
        
        if (user) {
          token = await user.getIdToken(true);
          if (token) {
            localStorage.setItem('firebaseIdToken', token);
          }
        }
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.log('🔧 [UnifiedAPI] No token available, using dev bypass header');
        headers['X-Dev-Auth-Bypass'] = 'true';
      }

      return headers;
    } catch (error) {
      console.error('Error getting auth headers:', error);
      return {
        'Content-Type': 'application/json',
        'X-Dev-Auth-Bypass': 'true'
      };
    }
  }

  /**
   * Test backend connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
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
  async analyzeDamage(imageFile: File): Promise<DamageResult> {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const authHeaders = await this.getAuthHeaders();
      const formHeaders = { ...authHeaders };
      delete (formHeaders as any)['Content-Type']; // Remove Content-Type for FormData
      
      const response = await fetch(`${API_BASE_URL}/analyze-damage`, {
        method: 'POST',
        headers: formHeaders,
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        
        // Check if this is a quota exceeded error (429)
        if (response.status === 429 || errorData.quota_exceeded) {
          const quotaError = new Error(errorData.error || 'Quota exceeded');
          // Add quota-specific properties to help upstream handlers
          (quotaError as any).isQuotaExceeded = true;
          (quotaError as any).retryDelaySeconds = errorData.retry_delay_seconds || 60;
          throw quotaError;
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform backend response to DamageResult format
      if (data.data && data.data.structured_data) {
        return data.data.structured_data;
      }
      
      throw new Error('Invalid response format from backend');
    } catch (error) {
      console.error('Error analyzing damage:', error);
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
      console.log('🌐 [UnifiedAPI] Making request to:', `${API_BASE_URL}/analysis/history`);
      console.log('🔑 [UnifiedAPI] Headers:', headers);
      
      const response = await fetch(`${API_BASE_URL}/analysis/history`, {
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
      const response = await fetch(`${API_BASE_URL}/user/profile`, {
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
   * Ensure user profile exists
   */
  async ensureUserProfile(userData: any): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/user/ensure-profile`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(userData)
      });

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
      const response = await fetch(`${API_BASE_URL}/user/stats`, {
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
}

// Export singleton instance
export const unifiedApiService = new UnifiedApiService();
export default unifiedApiService;