import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import ImageUpload from './components/ImageUpload';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import Dashboard from './components/dashboard/Dashboard';
import HistoryPage from './components/HistoryPage';
import InsurancePage from './components/InsurancePage';
import Auth from './components/Auth';
import ErrorBoundary from './components/common/EnhancedErrorBoundary';
import APIKeyStatusPanel from './components/APIKeyStatusPanel';
import { NotificationProvider } from './context/NotificationContext';
import { useFirebaseAuth } from './context/FirebaseAuthContext';
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
          <div className="min-h-screen flex flex-col relative overflow-hidden">            {/* Clean Background with Subtle Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {/* Clean Background */}
              <div className="absolute inset-0 bg-white"></div>
              
              {/* Subtle Accent Elements */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-200 to-emerald-200"></div>
              
              {/* Soft Background Shapes for Animation */}
              <div className="absolute -top-40 -left-40 w-96 h-96 bg-rose-200/30 rounded-full filter blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-40 -right-40 w-[30rem] h-[30rem] bg-emerald-200/30 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '2s', animationDuration: '3s'}}></div>
              
              {/* Additional Floating Elements */}
              <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-rose-200/20 rounded-full filter blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
              <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-emerald-200/20 rounded-full filter blur-2xl animate-pulse" style={{animationDelay: '3s'}}></div>
            </div>

            {/* Professional Navigation */}
            <div className="relative z-50">
              <Navbar />
            </div>

            {/* Development Only Components */}
            {import.meta.env.DEV && (
              <>
                <APIKeyStatusPanel />
              </>
            )}

            {/* Professional Main Content Container */}
            <main className="flex-1 relative z-30">
              <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 bg-white/90 backdrop-blur-lg shadow-lg rounded-lg my-6 border border-gray-200 transform transition-all duration-300 hover:shadow-xl hover:scale-[1.01]">
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

                  {/* Protected Routes with Staggered Animations */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <div className="animate-fadeInUp">
                          <ImageUpload />
                        </div>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/analyze"
                    element={
                      <ProtectedRoute>
                        <div className="animate-fadeInUp">
                          <ImageUpload />
                        </div>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <div className="animate-fadeInUp">
                          <Dashboard />
                        </div>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/history"
                    element={
                      <ProtectedRoute>
                        <div className="animate-slideInFromLeft">
                          <HistoryPage />
                        </div>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/insurance"
                    element={
                      <ProtectedRoute>
                        <div className="animate-zoomIn">
                          <InsurancePage />
                        </div>
                      </ProtectedRoute>
                    }
                  />

                  {/* Fallback Route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </main>
          </div>
        </Router>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;