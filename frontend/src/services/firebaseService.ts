import { rtdb } from '@/lib/firebase';
import { ref, push, set, get, query, orderByChild, equalTo, remove, update, limitToLast } from 'firebase/database';
import { storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';
import { useCallback, useEffect } from 'react';

import { UploadedImage, DamageResult, DamageRegion } from '@/types';

// AnalysisHistoryItem is now represented by UploadedImage from '@/types'
// It includes fields like:
// id: string;
// userId: string;
// uploadedAt: string; 
// image: string; 
// result: DamageResult; // DamageResult now includes 'severity'
// damageRegions?: DamageRegion[]; // These are within result.identifiedDamageRegions
// severity?: 'minor' | 'moderate' | 'severe' | 'critical'; // This is now primarily within result.severity



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

  // Convert a data URL to a File
  private async dataUrlToFile(dataUrl: string, filename = 'image.jpg'): Promise<File> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
    return file;
  }

  /**
   * Migrate legacy history items that still store base64 `image` in RTDB.
   * For each item with a large base64 image, upload it to Storage, write minimal fields,
   * and clear the base64 from RTDB.
   */
  async migrateLegacyHistoryEntries(maxToMigrate = 10): Promise<{ migrated: number; skipped: number; errors: number; }>{
    if (!this.isAuthenticated() || !this.getCurrentUserId()) {
      throw new Error('User must be authenticated');
    }

    const uid = this.getCurrentUserId()!;
    const historyRef = ref(rtdb, `users/${uid}/analysisHistory`);
    const snapshot = await get(historyRef);
    if (!snapshot.exists()) return { migrated: 0, skipped: 0, errors: 0 };

    const entries = Object.entries(snapshot.val()) as [string, any][];
    let migrated = 0, skipped = 0, errors = 0;

    for (const [key, item] of entries) {
      if (migrated >= maxToMigrate) break;

      const img: string | undefined = item?.image;
      const hasMinimal = item?.imagePath || item?.thumbnailUrl || item?.imageUrl;
      if (!img || typeof img !== 'string' || !img.startsWith('data:image') || hasMinimal) {
        skipped++;
        continue;
      }

      try {
        const file = await this.dataUrlToFile(img, item?.filename || 'legacy.jpg');
        const media = await this.uploadAnalysisMedia(file);
        const updatePayload: any = {
          image: '',
          imagePath: media.imagePath,
          imageUrl: media.imageUrl,
          thumbnailPath: media.thumbnailPath,
          thumbnailUrl: media.thumbnailUrl,
          migratedAt: new Date().toISOString()
        };
        const itemRef = ref(rtdb, `users/${uid}/analysisHistory/${key}`);
        await update(itemRef, updatePayload);
        migrated++;
      } catch (e) {
        console.error('Migration error for key', key, e);
        errors++;
      }
    }

    return { migrated, skipped, errors };
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this._isAuthenticated;
  }

  // Get current user ID
  getCurrentUserId() {
    return this._currentUserId;
  }

  // Create a compressed thumbnail Blob from a File
  private async createThumbnail(file: File, maxWidth = 512, maxHeight = 512, quality = 0.7): Promise<Blob> {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = dataUrl;
    });

    // Calculate target dimensions while preserving aspect ratio
    let { width, height } = img;
    const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
    const targetWidth = Math.round(width * ratio);
    const targetHeight = Math.round(height * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (!b) return reject(new Error('Failed to create thumbnail blob'));
        resolve(b);
      }, 'image/jpeg', quality);
    });
    return blob;
  }

  // Upload original image and thumbnail to Firebase Storage and return minimal references
  async uploadAnalysisMedia(file: File): Promise<{ imagePath: string; imageUrl: string; thumbnailPath: string; thumbnailUrl: string; }> {
    if (!this.isAuthenticated() || !this.getCurrentUserId()) {
      throw new Error('User must be authenticated');
    }

    const userId = this.getCurrentUserId()!;
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const basePath = `users/${userId}/analysis`;

    // Original image upload
    const imagePath = `${basePath}/images/${timestamp}-${sanitizedName}`;
    const imageRef = storageRef(storage, imagePath);
    await uploadBytes(imageRef, file, { contentType: file.type || 'image/jpeg', cacheControl: 'public, max-age=86400' });
    const imageUrl = await getDownloadURL(imageRef);

    // Thumbnail upload
    const thumbBlob = await this.createThumbnail(file);
    const thumbnailPath = `${basePath}/thumbnails/${timestamp}-${sanitizedName}.jpg`;
    const thumbRef = storageRef(storage, thumbnailPath);
    await uploadBytes(thumbRef, thumbBlob, { contentType: 'image/jpeg', cacheControl: 'public, max-age=86400' });
    const thumbnailUrl = await getDownloadURL(thumbRef);

    return { imagePath, imageUrl, thumbnailPath, thumbnailUrl };
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
  async addAnalysisToHistory(analysisData: Omit<UploadedImage, 'id' | 'userId' | 'uploadedAt'>): Promise<string> {
    if (!this.isAuthenticated() || !this.getCurrentUserId()) {
      throw new Error('User must be authenticated');
    }

    const userId = this.getCurrentUserId()!;
    const historyRef = ref(rtdb, `users/${userId}/analysisHistory`);
    const newAnalysisRef = push(historyRef);
    
    // Prefer minimal image fields and avoid storing base64 in DB
    const minimalImageUrl = (analysisData as any).thumbnailUrl || (analysisData as any).imageUrl || '';

    const analysisItem: UploadedImage = {
      ...analysisData, // Spread the incoming data first
      id: newAnalysisRef.key!,
      userId,
      uploadedAt: new Date().toISOString(),
      // Do not persist large base64 strings; keep image empty and rely on imageUrl/thumbnailUrl
      image: '',
      imageUrl: minimalImageUrl,
      // result should be part of analysisData and correctly typed
      // damageRegions might be part of analysisData.result.identifiedDamageRegions or analysisData.damageRegions
      // severity might be part of analysisData.result.severity or analysisData.severity
    };


    await set(newAnalysisRef, analysisItem);
    return newAnalysisRef.key!;
  }

  async getAnalysisHistory(userId?: string, limit: number = 50): Promise<UploadedImage[]> {
    console.log('📚 FirebaseService: Getting analysis history...', { userId });
    
    const uid = userId || this.getCurrentUserId();
    if (!uid) {
      console.log('❌ FirebaseService: No user ID available for history');
      return [];
    }
    
    console.log('👤 FirebaseService: Using user ID:', uid);

    const historyRef = ref(rtdb, `users/${uid}/analysisHistory`);
    // Limit results for faster load and reduced memory
    const q = query(historyRef, orderByChild('uploadedAt'), limitToLast(limit));
    let snapshot;
    try {
      snapshot = await get(q);
    } catch (err: any) {
      const msg = (err && err.message) ? err.message.toLowerCase() : '';
      const indexMissing = msg.includes('index not defined') || msg.includes('indexon') || msg.includes('uploadedat');
      if (indexMissing) {
        console.warn('⚠️ Firebase RTDB index for "uploadedAt" is missing. Falling back to unindexed fetch. Add .indexOn ["uploadedAt"] in rules for best performance.');
        snapshot = await get(historyRef);
      } else {
        throw err;
      }
    }
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      
      // Resolve missing URLs from storage paths in parallel
      const entries = Object.entries(data) as [string, any][];
      let historyArray: UploadedImage[] = await Promise.all(entries.map(async ([key, item]) => {
        let thumb = item.thumbnailUrl || '';
        let imgUrl = item.imageUrl || '';
        try {
          if (!thumb && item.thumbnailPath) {
            thumb = await getDownloadURL(storageRef(storage, item.thumbnailPath));
          }
        } catch (e) {
          // ignore URL fetch errors for thumbnails
        }
        try {
          if (!imgUrl && item.imagePath) {
            imgUrl = await getDownloadURL(storageRef(storage, item.imagePath));
          }
        } catch (e) {
          // ignore URL fetch errors for full image
        }

        const mapped: UploadedImage = {
          id: key,
          ...item,
          image: thumb || imgUrl || '', // small preview for list
          imageUrl: imgUrl,
          thumbnailUrl: thumb,
          damageType: item.result?.damageType || item.damageType || 'Unknown',
          confidence: item.result?.confidence || item.confidence || 0,
          severity: item.result?.severity || item.severity || 'moderate',
          result: item.result || {
            damageType: item.damageType || 'Unknown',
            confidence: item.confidence || 0,
            severity: item.severity || 'moderate'
          }
        };
        return mapped;
      }));
      
      // Sort by uploadedAt/timestamp descending and limit
      historyArray.sort((a, b) => (b.uploadedAt || b.timestamp || '').localeCompare(a.uploadedAt || a.timestamp || ''));
      if (limit && historyArray.length > limit) {
        historyArray = historyArray.slice(0, limit);
      }
      
      console.log(`✅ FirebaseService: Loaded ${historyArray.length} history items`);
      return historyArray;
    }
    
    console.log('📭 FirebaseService: No history data found in Firebase');
    return [];
  }

  async removeAnalysisFromHistory(analysisId: string): Promise<void> {
    if (!this.isAuthenticated() || !this.getCurrentUserId()) {
      throw new Error('User must be authenticated');
    }

    const userId = this.getCurrentUserId()!;
    const analysisRef = ref(rtdb, `users/${userId}/analysisHistory/${analysisId}`);
    await remove(analysisRef);
  }

  async clearAnalysisHistory(): Promise<void> {
    if (!this.isAuthenticated() || !this.getCurrentUserId()) {
      throw new Error('User must be authenticated');
    }

    const userId = this.getCurrentUserId()!;
    const historyRef = ref(rtdb, `users/${userId}/analysisHistory`);
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
      console.log('📊 FirebaseService: Getting analytics data...');
      const history = await this.getAnalysisHistory();
      console.log('📈 FirebaseService: History for analytics:', {
        length: history.length,
        sample: history.slice(0, 2)
      });
      
      // Calculate total analyses
      const totalAnalyses = history.length;
      
      // Calculate average confidence
      const avgConfidence = history.reduce((sum, item) => sum + (item.result?.confidence || 0), 0) / 
        (totalAnalyses || 1); // Prevent division by zero
      
      
      // Count damage types - prioritize main damage type over regions
      const damageTypes: Record<string, number> = {};
      history.forEach(item => {
        let damageTypeFound = false;
        
        // First try the main damage type from result
        if (item.result?.damageType) {
          damageTypes[item.result.damageType] = (damageTypes[item.result.damageType] || 0) + 1;
          damageTypeFound = true;
        }
        
        // If no main damage type, try regions
        if (!damageTypeFound) {
          if (item.result?.identifiedDamageRegions && Array.isArray(item.result.identifiedDamageRegions)) {
            item.result.identifiedDamageRegions.forEach(region => {
              damageTypes[region.damageType] = (damageTypes[region.damageType] || 0) + 1;
            });
          } else if (item.damageRegions && Array.isArray(item.damageRegions)) {
            // Fallback if damageRegions is at the top level of UploadedImage
            item.damageRegions.forEach(region => {
              damageTypes[region.damageType] = (damageTypes[region.damageType] || 0) + 1;
            });
          } else {
            // If no damage types found, categorize as "Unknown"
            damageTypes['Unknown'] = (damageTypes['Unknown'] || 0) + 1;
          }
        }
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
          const date = new Date(item.uploadedAt); // Use uploadedAt
          return date.getMonth() === month.getMonth() && date.getFullYear() === year;
        });
        
        const avgCost = monthItems.reduce((sum, item) => {
          const costStr = typeof item.result?.repairEstimate === 'string' ? item.result.repairEstimate : '0';
          const cost = parseInt(costStr.replace(/[^\d]/g, '')) || 0;
          return sum + cost;
        }, 0) / (monthItems.length || 1);
        
        monthlyTrends.push({
          month: monthStr,
          count: monthItems.length,
          avgCost
        });
      }
      
      // Count by severity - more comprehensive
      const severityBreakdown: Record<string, number> = {
        'minor': 0,
        'moderate': 0,
        'severe': 0,
        'critical': 0,
        'unknown': 0
      };
      
      history.forEach(item => {
        const severity = item.result?.severity || item.severity || 'unknown';
        const normalizedSeverity = severity.toLowerCase();
        
        if (severityBreakdown.hasOwnProperty(normalizedSeverity)) {
          severityBreakdown[normalizedSeverity] += 1;
        } else {
          severityBreakdown['unknown'] += 1;
        }
      });

      const analyticsResult = {
        totalAnalyses,
        avgConfidence,
        damageTypes,
        monthlyTrends,
        severityBreakdown
      };
      
      console.log('📊 FirebaseService: Analytics data computed:', analyticsResult);
      
      return analyticsResult;
    } catch (error) {
      console.error('💥 FirebaseService: Error getting analytics data:', error);
      console.error('📚 FirebaseService: Analytics error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      
      // Return fallback data
      const fallbackData = {
        totalAnalyses: 0,
        avgConfidence: 0,
        damageTypes: {},
        monthlyTrends: [],
        severityBreakdown: {}
      };
      
      console.log('🔄 FirebaseService: Returning fallback analytics data:', fallbackData);
      return fallbackData;
    }
  }

  // Renaming getAnalysisHistory to fetchUserHistory for clarity and consistency with Dashboard
  async fetchUserHistory(userId?: string): Promise<UploadedImage[]> {
    return this.getAnalysisHistory(userId);
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
