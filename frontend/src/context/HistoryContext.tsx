import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Define the shape of a single analysis history item
export interface AnalysisHistoryItem {
  id: string;
  imageUrl: string;
  analysisDate: string; // ISO date string
  damageDescription: string; // Brief description of damage
  repairEstimate?: string; // Optional repair estimate
  damageType?: string; // Added: Type of damage
  confidence?: number; // Added: Confidence score of the analysis
  recommendations?: string[]; // Added: Repair/action recommendations
  // Add other relevant fields from your analysis results if needed
}

interface HistoryContextType {
  history: AnalysisHistoryItem[];
  loadingHistory: boolean;
  errorHistory: string | null;
  addAnalysisToHistory: (item: Omit<AnalysisHistoryItem, 'id' | 'analysisDate'>) => void;
  removeAnalysisFromHistory: (id: string) => void;
  clearHistory: () => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider = ({ children }: { children: ReactNode }) => {
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorHistory, setErrorHistory] = useState<string | null>(null);

  // Load history from local storage on initial mount
  useEffect(() => {
    setLoadingHistory(true);
    try {
      const storedHistory = localStorage.getItem('analysisHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (err) {
      console.error("Failed to load history from local storage:", err);
      setErrorHistory("Failed to load history.");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Save history to local storage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('analysisHistory', JSON.stringify(history));
    } catch (err) {
      console.error("Failed to save history to local storage:", err);
      // Potentially set an error state for the user if saving fails critically
    }
  }, [history]);

  const addAnalysisToHistory = (itemData: Omit<AnalysisHistoryItem, 'id' | 'analysisDate'>) => {
    const newItem: AnalysisHistoryItem = {
      ...itemData,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 15), // More robust unique ID
      analysisDate: new Date().toISOString(),
    };
    setHistory(prevHistory => [newItem, ...prevHistory]); // Add to the beginning of the list
  };

  const removeAnalysisFromHistory = (id: string) => {
    setHistory(prevHistory => prevHistory.filter(item => item.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <HistoryContext.Provider value={{ history, loadingHistory, errorHistory, addAnalysisToHistory, removeAnalysisFromHistory, clearHistory }}>
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
