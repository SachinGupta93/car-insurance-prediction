import { rtdb } from '@/lib/firebase';
import { ref, push, set, get, query, orderByChild, equalTo, remove, update } from 'firebase/database';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';

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
  private isAuthenticated(): boolean {
    // This will be overridden by the hook
    return false;
  }

  private getCurrentUserId(): string | null {
    // This will be overridden by the hook
    return null;
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
    
    const analysisItem: AnalysisHistoryItem = {
      ...analysisData,
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

  async getInsurance(userId?: string): Promise<InsuranceData[]> {
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

  // Analytics and Statistics
  async getAnalyticsData(userId?: string): Promise<{
    totalAnalyses: number;
    avgConfidence: number;
    damageTypes: Record<string, number>;
    monthlyTrends: Array<{ month: string; count: number; avgCost: number }>;
    severityBreakdown: Record<string, number>;
  }> {
    const uid = userId || this.getCurrentUserId();
    if (!uid) {
      return {
        totalAnalyses: 0,
        avgConfidence: 0,
        damageTypes: {},
        monthlyTrends: [],
        severityBreakdown: {},
      };
    }

    const history = await this.getAnalysisHistory(uid);
    
    // Calculate analytics
    const totalAnalyses = history.length;
    const avgConfidence = history.length > 0 
      ? history.reduce((sum, item) => sum + item.confidence, 0) / history.length 
      : 0;

    // Group by damage types
    const damageTypes: Record<string, number> = {};
    history.forEach(item => {
      damageTypes[item.damageType] = (damageTypes[item.damageType] || 0) + 1;
    });

    // Group by severity
    const severityBreakdown: Record<string, number> = {};
    history.forEach(item => {
      if (item.severity) {
        severityBreakdown[item.severity] = (severityBreakdown[item.severity] || 0) + 1;
      }
    });

    // Monthly trends (last 12 months)
    const monthlyTrends: Array<{ month: string; count: number; avgCost: number }> = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = month.toISOString().substring(0, 7); // YYYY-MM format
      
      const monthData = history.filter(item => 
        item.analysisDate.substring(0, 7) === monthStr
      );
        const avgCost = monthData.length > 0
        ? monthData.reduce((sum, item) => {
            // Extract numeric value from repair estimate
            if (!item.repairEstimate) return sum;
            const match = item.repairEstimate.match(/\$(\d+(?:,\d+)*)/);
            return sum + (match ? parseInt(match[1].replace(/,/g, '')) : 0);
          }, 0) / monthData.length
        : 0;

      monthlyTrends.push({
        month: month.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        count: monthData.length,
        avgCost,
      });
    }

    return {
      totalAnalyses,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      damageTypes,
      monthlyTrends,
      severityBreakdown,
    };
  }
}

// Create a hook to use the Firebase service with authentication context
export const useFirebaseService = () => {
  const { firebaseUser } = useFirebaseAuth();
  
  const service = new FirebaseDataService();
  
  // Override authentication methods
  service['isAuthenticated'] = () => Boolean(firebaseUser);
  service['getCurrentUserId'] = () => firebaseUser?.uid || null;
  
  return service;
};

export default FirebaseDataService;
