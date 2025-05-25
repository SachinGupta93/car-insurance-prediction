import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';

const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const { firebaseUser, loadingAuth } = useFirebaseAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path ? 'text-blue-300' : '';
  };

  const handleLogout = async () => {
    try {
      await signOut();
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsMenuOpen(false); // Close mobile menu after logout
    }
  };

  return (
    <nav className="bg-gray-800 text-white p-4 shadow-md">
      <div className="container mx-auto">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-xl font-bold hover:text-gray-300 transition-colors">
            Car Damage Predictor
          </Link>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden focus:outline-none" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Desktop Navigation */}          <div className="hidden md:flex md:items-center md:space-x-4">
            <Link to="/" className={`hover:text-gray-300 transition-colors ${isActive('/')}`}>Home</Link>
            
            {user || firebaseUser ? (
              <>
                <Link to="/dashboard" className={`hover:text-gray-300 transition-colors ${isActive('/dashboard')}`}>Dashboard</Link>
                <Link to="/history" className={`hover:text-gray-300 transition-colors ${isActive('/history')}`}>History</Link>
                <Link to="/resources" className={`hover:text-gray-300 transition-colors ${isActive('/resources')}`}>Resources</Link>
                <Link to="/support" className={`hover:text-gray-300 transition-colors ${isActive('/support')}`}>Support</Link>
                <button 
                  onClick={handleLogout} 
                  className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded transition-colors disabled:opacity-50"
                  disabled={loadingAuth}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={`hover:text-gray-300 transition-colors ${isActive('/login')}`}>Login</Link>
                <Link to="/signup" className={`hover:text-gray-300 transition-colors ${isActive('/signup')}`}>Sign Up</Link>
                <Link to="/resources" className={`hover:text-gray-300 transition-colors ${isActive('/resources')}`}>Resources</Link>
                <Link to="/support" className={`hover:text-gray-300 transition-colors ${isActive('/support')}`}>Support</Link>
              </>
            )}
          </div>
        </div>
        
        {/* Mobile Navigation */}          <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden mt-4 transition-all duration-300 ease-in-out`}>
          <div className="flex flex-col space-y-2">
            <Link 
              to="/" 
              className={`px-3 py-2 rounded hover:bg-gray-700 transition-colors ${isActive('/')}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            
            {user || firebaseUser ? (
              <>
                <Link 
                  to="/dashboard" 
                  className={`px-3 py-2 rounded hover:bg-gray-700 transition-colors ${isActive('/dashboard')}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/history" 
                  className={`px-3 py-2 rounded hover:bg-gray-700 transition-colors ${isActive('/history')}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  History
                </Link>
                <Link 
                  to="/resources" 
                  className={`px-3 py-2 rounded hover:bg-gray-700 transition-colors ${isActive('/resources')}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Resources
                </Link>
                <Link 
                  to="/support" 
                  className={`px-3 py-2 rounded hover:bg-gray-700 transition-colors ${isActive('/support')}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Support
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="bg-red-500 hover:bg-red-600 px-3 py-2 text-left rounded transition-colors disabled:opacity-50"
                  disabled={loadingAuth}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className={`px-3 py-2 rounded hover:bg-gray-700 transition-colors ${isActive('/login')}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link 
                  to="/signup" 
                  className={`px-3 py-2 rounded hover:bg-gray-700 transition-colors ${isActive('/signup')}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
                <Link 
                  to="/resources" 
                  className={`px-3 py-2 rounded hover:bg-gray-700 transition-colors ${isActive('/resources')}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Resources
                </Link>
                <Link 
                  to="/support" 
                  className={`px-3 py-2 rounded hover:bg-gray-700 transition-colors ${isActive('/support')}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Support
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
