import { rtdb } from '@/lib/firebase';
import { ref, push, set, get, query, orderByChild, equalTo, remove, update } from 'firebase/database';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';
import { useCallback, useEffect } from 'react';

export interface AnalysisHistoryItem {
  id: string;
  userId: string;
  imageUrl: string;
  analysisDate: string; // ISO date string
  damageDescription: string; // Brief description of damage
  repairEstimate?: string; // Optional repair estimate
  damageType: string; // Type of damage
  confidence: number; // Confidence score of the analysis
  description: string; // Analysis description
  recommendations: string[]; // Repair/action recommendations
  location?: string; // Location of damage
  severity?: 'minor' | 'moderate' | 'severe' | 'critical'; // Damage severity
}

export interface VehicleData {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate?: string;
  vin?: string;
  createdAt: string;
}

export interface InsuranceData {
  id: string;
  userId: string;
  vehicleId: string;
  provider: string;
  policyNumber: string;
  coverageType: string;
  startDate: string;
  endDate: string;
  contactPhone: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: string;
  lastLoginAt: string;
}

class FirebaseDataService {
  private _isAuthenticated: boolean = false;
  private _currentUserId: string | null = null;

  // Set authentication state
  setAuthState(isAuthenticated: boolean, userId: string | null) {
    this._isAuthenticated = isAuthenticated;
    this._currentUserId = userId;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this._isAuthenticated;
  }

  // Get current user ID
  getCurrentUserId() {
    return this._currentUserId;
  }

  // User Profile Management
  async createUserProfile(userData: Omit<UserProfile, 'createdAt' | 'lastLoginAt'>): Promise<void> {
    if (!this.isAuthenticated() || !this.getCurrentUserId()) {
      throw new Error('User must be authenticated');
    }

    const userId = this.getCurrentUserId()!;
    const userRef = ref(rtdb, `users/${userId}/profile`);
    
    const profileData: UserProfile = {
      ...userData,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    await set(userRef, profileData);
  }

  async getUserProfile(userId?: string): Promise<UserProfile | null> {
    const uid = userId || this.getCurrentUserId();
    if (!uid) return null;

    const userRef = ref(rtdb, `users/${uid}/profile`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as UserProfile;
    }
    return null;
  }

  async updateUserProfile(updates: Partial<UserProfile>): Promise<void> {
    if (!this.isAuthenticated() || !this.getCurrentUserId()) {
      throw new Error('User must be authenticated');
    }

    const userId = this.getCurrentUserId()!;
    const userRef = ref(rtdb, `users/${userId}/profile`);
    
    const updateData = {
      ...updates,
      lastLoginAt: new Date().toISOString(),
    };

    await update(userRef, updateData);
  }

  // Analysis History Management
  async addAnalysisToHistory(analysisData: Omit<AnalysisHistoryItem, 'id' | 'userId' | 'analysisDate'>): Promise<string> {
    if (!this.isAuthenticated() || !this.getCurrentUserId()) {
      throw new Error('User must be authenticated');
    }

    const userId = this.getCurrentUserId()!;
    const historyRef = ref(rtdb, `users/${userId}/analysis_history`);
    const newAnalysisRef = push(historyRef);
    
    // Validate imageUrl is a base64 string and not a blob URL to prevent storage issues
    if (analysisData.imageUrl && analysisData.imageUrl.startsWith('blob:')) {
      console.error('Cannot store blob URLs in Firebase - expect image loading errors');
      // We'll still proceed, but this will cause issues when trying to load the image later
    }
    
    // Ensure imageUrl is either a valid base64 string or a valid URL (not a blob)
    const validatedImageUrl = analysisData.imageUrl && !analysisData.imageUrl.startsWith('blob:') 
      ? analysisData.imageUrl 
      : ''; // Empty string as fallback if invalid
    
    const analysisItem: AnalysisHistoryItem = {
      ...analysisData,
      imageUrl: validatedImageUrl,
      id: newAnalysisRef.key!,
      userId,
      analysisDate: new Date().toISOString(),
    };

    await set(newAnalysisRef, analysisItem);
    return newAnalysisRef.key!;
  }

  async getAnalysisHistory(userId?: string): Promise<AnalysisHistoryItem[]> {
    const uid = userId || this.getCurrentUserId();
    if (!uid) return [];

    const historyRef = ref(rtdb, `users/${uid}/analysis_history`);
    const snapshot = await get(historyRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.values(data) as AnalysisHistoryItem[];
    }
    return [];
  }

  async removeAnalysisFromHistory(analysisId: string): Promise<void> {
    if (!this.isAuthenticated() || !this.getCurrentUserId()) {
      throw new Error('User must be authenticated');
    }

    const userId = this.getCurrentUserId()!;
    const analysisRef = ref(rtdb, `users/${userId}/analysis_history/${analysisId}`);
    await remove(analysisRef);
  }

  async clearAnalysisHistory(): Promise<void> {
    if (!this.isAuthenticated() || !this.getCurrentUserId()) {
      throw new Error('User must be authenticated');
    }

    const userId = this.getCurrentUserId()!;
    const historyRef = ref(rtdb, `users/${userId}/analysis_history`);
    await remove(historyRef);
  }

  // Vehicle Management
  async addVehicle(vehicleData: Omit<VehicleData, 'id' | 'userId' | 'createdAt'>): Promise<string> {
    if (!this.isAuthenticated() || !this.getCurrentUserId()) {
      throw new Error('User must be authenticated');
    }

    const userId = this.getCurrentUserId()!;
    const vehiclesRef = ref(rtdb, `users/${userId}/vehicles`);
    const newVehicleRef = push(vehiclesRef);
    
    const vehicle: VehicleData = {
      ...vehicleData,
      id: newVehicleRef.key!,
      userId,
      createdAt: new Date().toISOString(),
    };

    await set(newVehicleRef, vehicle);
    return newVehicleRef.key!;
  }

  async getVehicles(userId?: string): Promise<VehicleData[]> {
    const uid = userId || this.getCurrentUserId();
    if (!uid) return [];

    const vehiclesRef = ref(rtdb, `users/${uid}/vehicles`);
    const snapshot = await get(vehiclesRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.values(data) as VehicleData[];
    }
    return [];
  }

  async updateVehicle(vehicleId: string, updates: Partial<VehicleData>): Promise<void> {
    if (!this.isAuthenticated() || !this.getCurrentUserId()) {
      throw new Error('User must be authenticated');
    }

    const userId = this.getCurrentUserId()!;
    const vehicleRef = ref(rtdb, `users/${userId}/vehicles/${vehicleId}`);
    await update(vehicleRef, updates);
  }

  async removeVehicle(vehicleId: string): Promise<void> {
    if (!this.isAuthenticated() || !this.getCurrentUserId()) {
      throw new Error('User must be authenticated');
    }

    const userId = this.getCurrentUserId()!;
    const vehicleRef = ref(rtdb, `users/${userId}/vehicles/${vehicleId}`);
    await remove(vehicleRef);
  }

  // Insurance Management
  async addInsurance(insuranceData: Omit<InsuranceData, 'id' | 'userId' | 'createdAt'>): Promise<string> {
    if (!this.isAuthenticated() || !this.getCurrentUserId()) {
      throw new Error('User must be authenticated');
    }

    const userId = this.getCurrentUserId()!;
    const insuranceRef = ref(rtdb, `users/${userId}/insurance`);
    const newInsuranceRef = push(insuranceRef);
    
    const insurance: InsuranceData = {
      ...insuranceData,
      id: newInsuranceRef.key!,
      userId,
      createdAt: new Date().toISOString(),
    };

    await set(newInsuranceRef, insurance);
    return newInsuranceRef.key!;
  }

  async getInsurancePolicies(userId?: string): Promise<InsuranceData[]> {
    const uid = userId || this.getCurrentUserId();
    if (!uid) return [];

    const insuranceRef = ref(rtdb, `users/${uid}/insurance`);
    const snapshot = await get(insuranceRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.values(data) as InsuranceData[];
    }
    return [];
  }

  async getInsuranceByVehicle(vehicleId: string): Promise<InsuranceData[]> {
    if (!this.isAuthenticated() || !this.getCurrentUserId()) {
      throw new Error('User must be authenticated');
    }

    const userId = this.getCurrentUserId()!;
    const insuranceRef = ref(rtdb, `users/${userId}/insurance`);
    const vehicleInsuranceQuery = query(
      insuranceRef, 
      orderByChild('vehicleId'), 
      equalTo(vehicleId)
    );
    
    const snapshot = await get(vehicleInsuranceQuery);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.values(data) as InsuranceData[];
    }
    return [];
  }

  async updateInsurance(insuranceId: string, updates: Partial<InsuranceData>): Promise<void> {
    if (!this.isAuthenticated() || !this.getCurrentUserId()) {
      throw new Error('User must be authenticated');
    }

    const userId = this.getCurrentUserId()!;
    const insuranceRef = ref(rtdb, `users/${userId}/insurance/${insuranceId}`);
    await update(insuranceRef, updates);
  }
  async removeInsurance(insuranceId: string): Promise<void> {
    if (!this.isAuthenticated() || !this.getCurrentUserId()) {
      throw new Error('User must be authenticated');
    }

    const userId = this.getCurrentUserId()!;
    const insuranceRef = ref(rtdb, `users/${userId}/insurance/${insuranceId}`);
    await remove(insuranceRef);
  }
  
  // Analytics Data
  async getAnalyticsData(): Promise<{
    totalAnalyses: number;
    avgConfidence: number;
    damageTypes: Record<string, number>;
    monthlyTrends: Array<{ month: string; count: number; avgCost: number }>;
    severityBreakdown: Record<string, number>;
  }> {
    try {
      const history = await this.getAnalysisHistory();
      
      // Calculate total analyses
      const totalAnalyses = history.length;
      
      // Calculate average confidence
      const avgConfidence = history.reduce((sum, item) => sum + item.confidence, 0) / 
        (totalAnalyses || 1); // Prevent division by zero
      
      // Count damage types
      const damageTypes: Record<string, number> = {};
      history.forEach(item => {
        damageTypes[item.damageType] = (damageTypes[item.damageType] || 0) + 1;
      });
      
      // Calculate monthly trends (last 6 months)
      const monthlyTrends: Array<{ month: string; count: number; avgCost: number }> = [];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const month = new Date(today);
        month.setMonth(today.getMonth() - i);
        const monthStr = months[month.getMonth()];
        const year = month.getFullYear();
        
        const monthItems = history.filter(item => {
          const date = new Date(item.analysisDate);
          return date.getMonth() === month.getMonth() && date.getFullYear() === year;
        });
        
        const avgCost = monthItems.reduce((sum, item) => {
          const costStr = typeof item.repairEstimate === 'string' ? item.repairEstimate : '0';
          const cost = parseInt(costStr.replace(/[^\d]/g, '')) || 0;
          return sum + cost;
        }, 0) / (monthItems.length || 1);
        
        monthlyTrends.push({
          month: monthStr,
          count: monthItems.length,
          avgCost
        });
      }
      
      // Count by severity
      const severityBreakdown: Record<string, number> = {
        minor: 0,
        moderate: 0,
        severe: 0,
        critical: 0
      };
      
      history.forEach(item => {
        if (item.severity) {
          severityBreakdown[item.severity] = (severityBreakdown[item.severity] || 0) + 1;
        }
      });
      
      return {
        totalAnalyses,
        avgConfidence,
        damageTypes,
        monthlyTrends,
        severityBreakdown
      };
    } catch (error) {
      console.error('Error getting analytics data:', error);
      return {
        totalAnalyses: 0,
        avgConfidence: 0,
        damageTypes: {},
        monthlyTrends: [],
        severityBreakdown: {}
      };
    }
  }
}

// Create a singleton instance
const firebaseDataService = new FirebaseDataService();

// Hook to use Firebase Service with authentication
export function useFirebaseService() {
  const { firebaseUser } = useFirebaseAuth();
  
  // Use useEffect to set authentication state when firebaseUser changes
  useEffect(() => {
    const isAuthenticated = !!firebaseUser;
    const userId = firebaseUser ? firebaseUser.uid : null;
    firebaseDataService.setAuthState(isAuthenticated, userId);
  }, [firebaseUser]);
  
  return firebaseDataService;
}

export default firebaseDataService;
