import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import ImageUpload from './components/ImageUpload';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import Dashboard from './components/dashboard/Dashboard';
import HistoryPage from './components/HistoryPage';
import ResourcesPage from './components/resources/ResourcesPage';
import InsuranceAnalysis from './components/insurance/InsuranceAnalysis';
import IntegrationTestPage from './components/IntegrationTestPage';
import Auth from './components/Auth';
import ErrorBoundary from './components/common/EnhancedErrorBoundary';
import { NotificationProvider } from './context/NotificationContext';
import { useAuth } from './context/AuthContext';
import './App.css';

// A wrapper for protected routes
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <Router>
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
            </div>            {/* Professional Main Content Container */}
            <main className="flex-1 relative z-30">
              <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 bg-white/90 backdrop-blur-lg shadow-lg rounded-lg my-6 border border-gray-200 transform transition-all duration-300 hover:shadow-xl hover:scale-[1.01]">
                <Routes>
                  {/* Public Routes with Enhanced Animations */}
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
                  <Route 
                    path="/resources" 
                    element={
                      <div className="animate-slideInFromRight">
                        <ResourcesPage />
                      </div>
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
                  />                  <Route
                    path="/insurance"
                    element={
                      <ProtectedRoute>
                        <div className="animate-zoomIn">
                          <InsuranceAnalysis />
                        </div>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/test"
                    element={
                      <ProtectedRoute>
                        <div className="animate-fadeInUp">
                          <IntegrationTestPage />
                        </div>
                      </ProtectedRoute>
                    }
                  />

                  {/* Fallback Route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </main>            {/* Professional Footer */}
            <footer className="relative z-40 mt-auto bg-white border-t border-gray-200">
              <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                {/* Footer Header with Brand */}
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-rose-200 to-emerald-200 rounded-lg flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300">
                      <svg className="w-7 h-7 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 10 5.16-.26 9-4.45 9-10V7l-10-5z"/>
                        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="ml-4 text-left">
                      <h3 className="text-2xl font-bold text-black hover:text-gray-700 transition-colors duration-300">
                        Car Damage AI
                      </h3>
                      <p className="text-sm text-gray-600 font-medium">Intelligent Assessment Platform</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 max-w-2xl mx-auto text-base leading-relaxed hover:text-gray-800 transition-colors duration-300">
                    Professional AI-powered damage assessment technology for automotive insurance, 
                    repair estimation, and claims processing. Trusted by professionals worldwide.
                  </p>
                </div>
                
                {/* Footer Links */}
                <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-8">
                  <a href="#" className="text-gray-600 hover:text-black text-sm font-medium transition-all duration-300 hover:underline decoration-rose-200 underline-offset-4 hover:scale-105">Privacy Policy</a>
                  <a href="#" className="text-gray-600 hover:text-black text-sm font-medium transition-all duration-300 hover:underline decoration-rose-200 underline-offset-4 hover:scale-105">Terms of Service</a>
                  <a href="#" className="text-gray-600 hover:text-black text-sm font-medium transition-all duration-300 hover:underline decoration-rose-200 underline-offset-4 hover:scale-105">API Documentation</a>
                  <a href="#" className="text-gray-600 hover:text-black text-sm font-medium transition-all duration-300 hover:underline decoration-rose-200 underline-offset-4 hover:scale-105">Support Center</a>
                  <a href="#" className="text-gray-600 hover:text-black text-sm font-medium transition-all duration-300 hover:underline decoration-rose-200 underline-offset-4 hover:scale-105">Contact Us</a>
                </div>

                {/* Footer Bottom */}
                <div className="border-t border-gray-200 pt-8">
                  <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                    <p className="text-gray-600 text-sm">
                      &copy; {new Date().getFullYear()} Car Damage AI. All rights reserved.
                    </p>
                    
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-gray-600">Powered by</span>
                        <span className="text-black font-semibold">Advanced AI</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-emerald-200 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </Router>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;