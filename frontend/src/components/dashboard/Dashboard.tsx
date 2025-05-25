import React from 'react';
import { useAuth } from '@/context/AuthContext'; // Adjust path as needed
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user } = useAuth(); // Or useFirebaseAuth if you prefer firebaseUser details

  return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6 md:p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Welcome to Your Dashboard, {user?.displayName || user?.email || 'User'}!
        </h1>
        
        <p className="text-gray-600 mb-8">
          This is your central hub for managing car damage analysis, viewing history, and accessing other features of the application.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link 
            to="/" 
            className="block p-6 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition-colors duration-200 ease-in-out transform hover:scale-105"
          >
            <h2 className="text-xl font-semibold mb-2">Analyze New Image</h2>
            <p className="text-indigo-100">Upload a new car image for damage assessment.</p>
          </Link>
          <Link 
            to="/history" 
            className="block p-6 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition-colors duration-200 ease-in-out transform hover:scale-105"
          >
            <h2 className="text-xl font-semibold mb-2">View Analysis History</h2>
            <p className="text-green-100">Review your past image analyses and results.</p>
          </Link>
        </div>

        {/* Placeholder for more dashboard widgets/sections */}
        <div className="mt-10">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Quick Stats (Placeholder)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Total Analyses</p>
              <p className="text-2xl font-bold text-gray-800">0</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Pending Reviews</p>
              <p className="text-2xl font-bold text-gray-800">0</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Account Status</p>
              <p className="text-2xl font-bold text-green-600">Active</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
