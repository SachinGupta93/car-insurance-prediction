import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { FirebaseAuthProvider } from './context/FirebaseAuthContext';
import { HistoryProvider } from './context/HistoryContext';
import { DataCacheProvider } from './context/DataCacheContext';
import './index.css'; // Assuming you have a global CSS file

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FirebaseAuthProvider>
      <AuthProvider>
        <DataCacheProvider>
          <HistoryProvider>
            <App />
          </HistoryProvider>
        </DataCacheProvider>
      </AuthProvider>
    </FirebaseAuthProvider>
  </React.StrictMode>
);