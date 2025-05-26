import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useFirebaseService } from '@/services/firebaseService';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';

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
      // Sort by analysis date (newest first)
      const sortedHistory = firebaseHistory.sort((a, b) => 
        new Date(b.analysisDate).getTime() - new Date(a.analysisDate).getTime()
      );
      setHistory(sortedHistory);
    } catch (err) {
      console.error('Failed to load history from Firebase:', err);
      setErrorHistory('Failed to load analysis history. Please try again.');
      
      // Fallback to localStorage for offline access
      try {
        const storedHistory = localStorage.getItem('analysisHistory');
        if (storedHistory) {
          const parsed = JSON.parse(storedHistory);
          setHistory(parsed);
        }
      } catch (localErr) {
        console.error('Failed to load from localStorage fallback:', localErr);
      }
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
        localStorage.setItem('analysisHistory', JSON.stringify(history));
      } catch (err) {
        console.error('Failed to backup history to localStorage:', err);
      }
    }
  }, [history]);

  const addAnalysisToHistory = async (itemData: Omit<AnalysisHistoryItem, 'id' | 'userId' | 'analysisDate'>) => {
    if (!firebaseUser) {
      throw new Error('User must be authenticated to save analysis');
    }

    try {
      // Add to Firebase
      const newId = await firebaseService.addAnalysisToHistory(itemData);
      
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
