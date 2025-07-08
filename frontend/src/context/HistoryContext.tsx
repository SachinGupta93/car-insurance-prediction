import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useFirebaseService } from '@/services/firebaseService';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';
import { HistoricalAnalysis } from '@/types';

// Define the shape of a single analysis history item
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

interface HistoryContextType {
  history: AnalysisHistoryItem[];
  loadingHistory: boolean;
  errorHistory: string | null;
  addAnalysisToHistory: (item: Omit<AnalysisHistoryItem, 'id' | 'userId' | 'analysisDate'>) => Promise<void>;
  removeAnalysisFromHistory: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  refreshHistory: () => Promise<void>;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider = ({ children }: { children: ReactNode }) => {
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorHistory, setErrorHistory] = useState<string | null>(null);
  
  const firebaseService = useFirebaseService();
  const { firebaseUser } = useFirebaseAuth();

  // Load history from Firebase when user changes
  const loadHistory = async () => {
    if (!firebaseUser) {
      setHistory([]);
      setLoadingHistory(false);
      return;
    }

    setLoadingHistory(true);
    setErrorHistory(null);
    
    try {
      const firebaseHistory = await firebaseService.getAnalysisHistory();
      // Convert HistoricalAnalysis to AnalysisHistoryItem and sort by date (newest first)
      const convertedHistory: AnalysisHistoryItem[] = firebaseHistory.map(item => {
        // Safely extract damage description with fallbacks
        const damageDescription = item.result?.damageDescription || 
                                 item.result?.description || 
                                 'No damage description available';
        
        // Safely extract other fields with fallbacks
        const repairEstimate = item.result?.repairEstimate || 
                              (item.result?.enhancedRepairCost?.conservative?.rupees 
                                ? item.result.enhancedRepairCost.conservative.rupees
                                : 'N/A');
        
        return {
          id: item.id,
          userId: item.userId || '',
          imageUrl: item.image || '',
          analysisDate: item.analysisDate || item.timestamp || new Date().toISOString(),
          damageDescription,
          repairEstimate,
          damageType: item.result?.damageType || 'Unknown',
          confidence: item.confidence || item.result?.confidence || 0,
          description: item.result?.description || damageDescription,
          recommendations: item.result?.recommendations || [],
          location: undefined, // location is not part of DamageResult
          severity: item.severity || item.result?.severity || 'minor'
        };
      });
      
      const sortedHistory = convertedHistory.sort((a, b) => 
        new Date(b.analysisDate).getTime() - new Date(a.analysisDate).getTime()
      );
      setHistory(sortedHistory);
    } catch (err) {
      console.error('Failed to load history from Firebase:', err);
      setErrorHistory('Failed to load analysis history. Please try again.');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load history when user authentication state changes
  useEffect(() => {
    loadHistory();
  }, [firebaseUser]);

  // Keep localStorage as backup sync whenever Firebase history changes
  useEffect(() => {
    if (history.length > 0) {
      try {
        // Only store essential data without large base64 images to avoid quota issues
        const lightweightHistory = history.map(item => ({
          ...item,
          image: '', // Remove large base64 images from localStorage backup
        })).slice(-10); // Only keep last 10 items
        
        localStorage.setItem('analysisHistory', JSON.stringify(lightweightHistory));
      } catch (err) {
        console.error('Failed to backup history to localStorage:', err);
        // If still failing, clear localStorage entirely
        try {
          localStorage.removeItem('analysisHistory');
        } catch (clearErr) {
          console.error('Failed to clear localStorage:', clearErr);
        }
      }
    }
  }, [history]);

  const addAnalysisToHistory = async (itemData: Omit<AnalysisHistoryItem, 'id' | 'userId' | 'analysisDate'>) => {
    if (!firebaseUser) {
      throw new Error('User must be authenticated to save analysis');
    }

    try {
      // Convert AnalysisHistoryItem to HistoricalAnalysis format for Firebase
      const historicalAnalysisData: Omit<HistoricalAnalysis, 'id' | 'userId' | 'uploadedAt'> = {
        timestamp: new Date().toISOString(),
        image: itemData.imageUrl,
        result: {
          damageType: itemData.damageType,
          confidence: itemData.confidence,
          description: itemData.description,
          damageDescription: itemData.damageDescription,
          recommendations: itemData.recommendations,
          repairEstimate: itemData.repairEstimate,
          severity: itemData.severity
        },
        analysisDate: new Date().toISOString(),
        confidence: itemData.confidence,
        filename: itemData.imageUrl.split('/').pop() || 'Unknown',
        severity: itemData.severity
      };
      
      // Add to Firebase
      const newId = await firebaseService.addAnalysisToHistory(historicalAnalysisData);
      
      // Update local state immediately for better UX
      const newItem: AnalysisHistoryItem = {
        ...itemData,
        id: newId,
        userId: firebaseUser.uid,
        analysisDate: new Date().toISOString(),
      };
      
      setHistory(prevHistory => [newItem, ...prevHistory]);
    } catch (err) {
      console.error('Failed to add analysis to history:', err);
      
      // Fallback to localStorage
      const fallbackItem: AnalysisHistoryItem = {
        ...itemData,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 15),
        userId: firebaseUser.uid,
        analysisDate: new Date().toISOString(),
      };
      
      setHistory(prevHistory => [fallbackItem, ...prevHistory]);
      setErrorHistory('Analysis saved locally. Will sync when connection is restored.');
    }
  };

  const removeAnalysisFromHistory = async (id: string) => {
    if (!firebaseUser) {
      throw new Error('User must be authenticated');
    }

    try {
      // Remove from Firebase
      await firebaseService.removeAnalysisFromHistory(id);
      
      // Update local state
      setHistory(prevHistory => prevHistory.filter(item => item.id !== id));
    } catch (err) {
      console.error('Failed to remove analysis from history:', err);
      
      // Still remove from local state
      setHistory(prevHistory => prevHistory.filter(item => item.id !== id));
      setErrorHistory('Failed to sync removal with server. Changes saved locally.');
    }
  };

  const clearHistory = async () => {
    if (!firebaseUser) {
      throw new Error('User must be authenticated');
    }

    try {
      // Clear from Firebase
      await firebaseService.clearAnalysisHistory();
      
      // Update local state
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear history from Firebase:', err);
      
      // Still clear local state
      setHistory([]);
      setErrorHistory('Failed to sync clear with server. Changes saved locally.');
    }
  };

  const refreshHistory = async () => {
    await loadHistory();
  };
  return (
    <HistoryContext.Provider value={{ 
      history, 
      loadingHistory, 
      errorHistory, 
      addAnalysisToHistory, 
      removeAnalysisFromHistory, 
      clearHistory, 
      refreshHistory 
    }}>
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = () => {
  const context = useContext(HistoryContext);
  if (context === undefined) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
};

export default HistoryContext;
