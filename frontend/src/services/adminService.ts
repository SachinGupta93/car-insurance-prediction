/**
 * Admin Service - Handles admin-specific API calls
 */

import unifiedApiService from './unifiedApiService';

interface AdminAnalysisItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  timestamp: string;
  status: string;
  vehicleMake: string;
  vehicleModel: string;
  estimatedCost: string;
  image_url?: string;
}

class AdminService {
  private API_BASE_URL: string;
  
  constructor() {
    this.API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  }
  
  /**
   * Fetch optimized analysis data for the admin/insurance dashboard
   */
  async fetchDashboardData(page: number = 1, perPage: number = 50): Promise<{data: AdminAnalysisItem[], pagination: any}> {
    try {
      console.log(`📊 [AdminService] Fetching dashboard data (page=${page}, perPage=${perPage})...`);
      
      // Get current Firebase ID token from localStorage
      const token = localStorage.getItem('firebaseIdToken');
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      
      // Create AbortController for proper timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${this.API_BASE_URL}/api/admin/analysis_histories?page=${page}&per_page=${perPage}`, {
        method: 'GET',
        headers: authHeaders,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`✅ [AdminService] Successfully fetched ${result.data.length} dashboard items (Page ${result.pagination.page} of ${result.pagination.pages})`);
      
      return result;
    } catch (error) {
      console.error('❌ [AdminService] Error fetching dashboard data:', error);
      throw error;
    }
  }
}

export const adminService = new AdminService();
export default adminService;
