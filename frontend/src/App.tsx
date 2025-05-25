import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import ImageUpload from './components/ImageUpload';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import Dashboard from './components/dashboard/Dashboard';
import ImageHistory from './components/ImageHistory';
import HistoryPage from './components/HistoryPage';
import SupportPage from './components/support/SupportPage';
import ResourcesPage from './components/resources/ResourcesPage';
import Auth from './components/Auth';
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
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <Auth redirectAuthenticated redirectPath="/dashboard">
                  <Login />
                </Auth>
              }
            />
            <Route
              path="/signup"
              element={
                <Auth redirectAuthenticated redirectPath="/dashboard">
                  <SignUp />
                </Auth>
              }
            />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/resources" element={<ResourcesPage />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <ImageUpload />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback for unmatched routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="bg-gray-700 text-white text-center p-4 mt-auto">
          <p>&copy; {new Date().getFullYear()} Car Damage Prediction. All rights reserved.</p>
          <p className="text-sm text-gray-400">Powered by AI</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;