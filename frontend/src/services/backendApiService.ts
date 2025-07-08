/**
 * Backend API Service - Handles all communication with the Flask backend
 */
import { UploadedImage } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class BackendApiService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    console.log('🔑 BackendApiService: Getting auth headers...');
    
    try {
      // Try to get Firebase token from localStorage first
      let token = localStorage.getItem('firebaseIdToken');
      console.log('📱 BackendApiService: Token from localStorage', { 
        hasToken: !!token,
        tokenLength: token ? token.length : 0
      });

      // If no token in localStorage, try to get it from Firebase auth
      if (!token) {
        console.log('� BackendApiService: No token in localStorage, attempting to get from Firebase...');
        
        // We need to import Firebase auth here
        const { auth } = await import('@/lib/firebase');
        const user = auth.currentUser;
        
        if (user) {
          console.log('👤 BackendApiService: Firebase user found, getting fresh token...');
          token = await user.getIdToken(true);
          if (token) {
            localStorage.setItem('firebaseIdToken', token);
            console.log('✅ BackendApiService: Fresh token obtained and stored');
          }
        } else {
          console.log('🚫 BackendApiService: No Firebase user found');
        }
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('🎫 BackendApiService: Authorization header added');
      } else {
        console.warn('⚠️ BackendApiService: No token available, adding dev bypass header');
        headers['X-Dev-Auth-Bypass'] = 'true';
      }

      console.log('📋 BackendApiService: Final headers prepared', { 
        hasAuth: !!headers['Authorization'],
        hasDevBypass: !!headers['X-Dev-Auth-Bypass']
      });

      return headers;

    } catch (error) {
      console.error('💥 BackendApiService: Error getting auth headers', { error });
      
      // Fallback to dev mode
      console.log('🔧 BackendApiService: Falling back to dev mode headers');
      return {
        'Content-Type': 'application/json',
        'X-Dev-Auth-Bypass': 'true'
      };
    }
  }

  /**
   * Fetch user's analysis history from backend
   */
  async fetchUserHistory(userId?: string): Promise<UploadedImage[]> {
    console.log('📊 BackendApiService: Fetching user history...', { userId });
    
    try {
      const headers = await this.getAuthHeaders();
      console.log('🌐 BackendApiService: Making request to /analysis/history', { 
        url: `${API_BASE_URL}/api/analysis/history`,
        headers: headers
      });

      const response = await fetch(`${API_BASE_URL}/api/analysis/history`, {
        method: 'GET',
        headers: headers,
        credentials: 'include'
      });

      console.log('📡 BackendApiService: Response received', { 
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ BackendApiService: API error response', { 
          status: response.status,
          errorText
        });
        throw new Error(`Failed to fetch history: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ BackendApiService: Successfully fetched history', { 
        dataType: typeof data,
        isArray: Array.isArray(data),
        hasDataField: 'data' in data,
        dataFieldType: data.data ? typeof data.data : 'undefined',
        isDataArray: data.data ? Array.isArray(data.data) : false,
        itemCount: data.data && Array.isArray(data.data) ? data.data.length : 'not array',
        dataPreview: data
      });

      // Handle the response format {data: [...], success: true}
      let historyData = data;
      if (data && typeof data === 'object' && 'data' in data) {
        historyData = data.data;
        console.log('📦 BackendApiService: Extracted data field from response');
      }

      // Ensure we return an array
      if (Array.isArray(historyData)) {
        return historyData;
      } else if (historyData && typeof historyData === 'object') {
        // If it's an object, convert to array with proper IDs included
        const historyArray = Object.entries(historyData).map(([id, item]) => ({
          id,
          ...item as object
        })) as UploadedImage[];
        
        console.log('🔄 BackendApiService: Converted object to array', { 
          originalKeys: Object.keys(historyData),
          arrayLength: historyArray.length
        });
        return historyArray;
      } else {
        console.warn('⚠️ BackendApiService: Unexpected data format, returning empty array', { data });
        return [];
      }

    } catch (error) {
      console.error('💥 BackendApiService: Error fetching user history', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack'
      });
      throw error;
    }
  }

  /**
   * Fetch user profile from backend
   */
  async fetchUserProfile(userId?: string): Promise<any> {
    console.log('👤 BackendApiService: Fetching user profile...', { userId });
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        method: 'GET',
        headers: headers,
        credentials: 'include'
      });

      console.log('📡 BackendApiService: Profile response', { 
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ BackendApiService: Profile API error', { 
          status: response.status,
          errorText
        });
        throw new Error(`Failed to fetch profile: ${response.status} ${response.statusText}`);
      }

      const profile = await response.json();
      console.log('✅ BackendApiService: Profile fetched successfully', { profile });
      return profile;

    } catch (error) {
      console.error('💥 BackendApiService: Error fetching profile', { error });
      throw error;
    }
  }

  // Cache connectivity status
  private lastConnectivityCheck = 0;
  private isConnected = false;
  private readonly CONNECTIVITY_CHECK_TIMEOUT = 5000; // 5 second timeout for health checks
  private readonly CONNECTIVITY_CHECK_INTERVAL = 60000; // 1 minute cache time

  /**
   * Test backend connectivity with caching to prevent redundant calls
   */
  async testConnection(forceCheck = false): Promise<boolean> {
    const now = Date.now();
    
    // Return cached result if available and not forced
    if (!forceCheck && (now - this.lastConnectivityCheck) < this.CONNECTIVITY_CHECK_INTERVAL) {
      console.log('⏭️ BackendApiService: Using cached connectivity status', { 
        connected: this.isConnected,
        cachedFor: Math.round((now - this.lastConnectivityCheck) / 1000) + 's'
      });
      return this.isConnected;
    }
    
    console.log('🔌 BackendApiService: Testing backend connection...');
    
    try {
      // Create an AbortController to handle timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.CONNECTIVITY_CHECK_TIMEOUT);
      
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);

      this.isConnected = response.ok;
      this.lastConnectivityCheck = now;
      
      console.log(`${this.isConnected ? '✅' : '❌'} BackendApiService: Backend connection test`, { 
        status: response.status,
        connected: this.isConnected
      });

      return this.isConnected;
    } catch (error) {
      console.error('💥 BackendApiService: Connection test failed', { error });
      return false;
    }
  }

  /**
   * Get user profile from backend
   */
  async getUserProfile(): Promise<any> {
    console.log('👤 BackendApiService: Fetching user profile...');
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'GET',
        headers: headers,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ BackendApiService: Profile fetch error', { 
          status: response.status,
          errorText
        });
        throw new Error(`Failed to fetch profile: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ BackendApiService: Successfully fetched profile', { data });
      return data.data || data;
    } catch (error) {
      console.error('💥 BackendApiService: Profile fetch failed', { error });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(profileData: any): Promise<any> {
    console.log('🔄 BackendApiService: Updating user profile...');
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'PUT',
        headers: headers,
        credentials: 'include',
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ BackendApiService: Profile update error', { 
          status: response.status,
          errorText
        });
        throw new Error(`Failed to update profile: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ BackendApiService: Successfully updated profile', { data });
      return data;
    } catch (error) {
      console.error('💥 BackendApiService: Profile update failed', { error });
      throw error;
    }
  }

  /**
   * Ensure user profile exists (create if doesn't exist)
   */
  async ensureUserProfile(additionalData: any = {}): Promise<any> {
    console.log('🔍 BackendApiService: Ensuring user profile exists...');
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/user/ensure-profile`, {
        method: 'POST',
        headers: headers,
        credentials: 'include',
        body: JSON.stringify(additionalData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ BackendApiService: Profile ensure error', { 
          status: response.status,
          errorText
        });
        throw new Error(`Failed to ensure profile: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ BackendApiService: Successfully ensured profile', { 
        data: data.data,
        created: data.created 
      });
      return data;
    } catch (error) {
      console.error('💥 BackendApiService: Profile ensure failed', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const backendApiService = new BackendApiService();
export default backendApiService;
