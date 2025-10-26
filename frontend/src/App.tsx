import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import Auth from './components/Auth';
import ErrorBoundary from './components/common/EnhancedErrorBoundary';
import APIKeyStatusPanel from './components/APIKeyStatusPanel';
import { NotificationProvider } from './context/NotificationContext';
import { useFirebaseAuth } from './context/FirebaseAuthContext';

// New redesigned pages
import LandingPage from './pages/LandingPage';
import NewDashboardPage from './pages/NewDashboardPage';
import NewAnalyzePage from './pages/NewAnalyzePage';
import NewHistoryPage from './pages/NewHistoryPage';
import NewInsurancePage from './pages/NewInsurancePage';
import NewProfilePage from './pages/NewProfilePage';

import './App.css';

// A wrapper for protected routes
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { firebaseUser, loading } = useFirebaseAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="min-h-screen">
            {/* Navigation */}
            <Navbar />

            {/* Development Only Components */}
            {import.meta.env.DEV && <APIKeyStatusPanel />}

            {/* Main Content */}
            <main>
              <Routes>
                  {/* Public Routes with Enhanced Animations */}
                  <Route
                    path="/auth"
                    element={
                      <Auth redirectAuthenticated redirectPath="/dashboard">
                        <div className="animate-fadeInUp">
                          <Login />
                        </div>
                      </Auth>
                    }
                  />
                  <Route
                    path="/login"
                    element={
                      <Auth redirectAuthenticated redirectPath="/dashboard">
                        <div className="animate-fadeInUp">
                          <Login />
                        </div>
                      </Auth>
                    }
                  />
                  <Route
                    path="/signup"
                    element={
                      <Auth redirectAuthenticated redirectPath="/dashboard">
                        <div className="animate-zoomIn">
                          <SignUp />
                        </div>
                      </Auth>
                    }
                  />

                  {/* Protected Routes with Redesigned Pages */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <LandingPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/analyze"
                    element={
                      <ProtectedRoute>
                        <NewAnalyzePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <NewDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/history"
                    element={
                      <ProtectedRoute>
                        <NewHistoryPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/insurance"
                    element={
                      <ProtectedRoute>
                        <NewInsurancePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <NewProfilePage />
                      </ProtectedRoute>
                    }
                  />

                {/* Fallback Route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </Router>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;