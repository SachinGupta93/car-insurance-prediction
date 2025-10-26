import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';

const Navbar: React.FC = () => {
  const { firebaseUser, loading: loadingAuth, signOut } = useFirebaseAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();  const isActive = (path: string) => {
    return location.pathname === path;
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
  };  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-lg shadow-slate-200/50">
      <div className="container mx-auto px-6 py-3">
        <div className="flex justify-between items-center">
          <Link to="/" className="group flex items-center space-x-3">
            <div className="relative w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
              <svg className="w-6 h-6 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:to-indigo-600 transition-all duration-300">
                CarGuard AI
              </span>
              <span className="text-[10px] text-slate-500 -mt-1">Intelligent Damage Analysis</span>
            </div>
          </Link>

          <div className="flex items-center space-x-2">
            <button 
              className="md:hidden relative z-50 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 flex items-center justify-center hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            >
              <div className="relative w-6 h-6">
                <span className={`absolute block w-full h-0.5 bg-white rounded-full transition-all duration-300 ${isMenuOpen ? 'top-3 rotate-45' : 'top-1'}`}></span>
                <span className={`absolute block w-full h-0.5 bg-white rounded-full transition-all duration-300 ${isMenuOpen ? 'opacity-0' : 'top-3'}`}></span>
                <span className={`absolute block w-full h-0.5 bg-white rounded-full transition-all duration-300 ${isMenuOpen ? 'top-3 -rotate-45' : 'top-5'}`}></span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-1">
            <Link to="/" className={`px-4 py-2.5 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${isActive('/') ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-700 hover:bg-slate-100'}`}>
              Home
            </Link>
            {firebaseUser ? (
              <>
                <Link to="/dashboard" className={`px-4 py-2.5 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${isActive('/dashboard') ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-700 hover:bg-slate-100'}`}>
                  Dashboard
                </Link>
                <Link to="/history" className={`px-4 py-2.5 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${isActive('/history') ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-700 hover:bg-slate-100'}`}>
                  History
                </Link>
                <Link to="/insurance" className={`px-4 py-2.5 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${isActive('/insurance') ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-700 hover:bg-slate-100'}`}>
                  Insurance
                </Link>
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent mx-2"></div>
                <button 
                  onClick={handleLogout} 
                  className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-gradient-to-r hover:from-red-500 hover:to-pink-600 hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-red-500/30 flex items-center space-x-2 disabled:opacity-50 hover:scale-105 transition-all duration-300 font-medium"
                  disabled={loadingAuth}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </button>
              </>
            ): (
              <>
                <Link to="/login" className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${isActive('/login') ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-700 hover:bg-slate-100'}`}>
                  Login
                </Link>
                <Link to="/signup" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium hover:from-emerald-600 hover:to-teal-700 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105 transition-all duration-300">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={`mobile-menu fixed inset-0 top-16 bg-slate-900/60 backdrop-blur-md transition-all duration-300 md:hidden ${isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200/50 shadow-2xl shadow-slate-900/20 m-4 rounded-3xl overflow-hidden">
            <div className="flex flex-col p-4 space-y-1">
              <Link 
                to="/" 
                className={`px-4 py-3.5 rounded-2xl transition-all duration-300 hover:scale-[1.02] flex items-center space-x-3 font-medium ${isActive('/') ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-700 hover:bg-slate-100'}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isActive('/') ? 'bg-white/20' : 'bg-slate-100'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <span>Home</span>
              </Link>
              {firebaseUser ? (
              <>
                <Link 
                  to="/dashboard" 
                  className={`px-4 py-3.5 rounded-2xl transition-all duration-300 hover:scale-[1.02] flex items-center space-x-3 font-medium ${isActive('/dashboard') ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-700 hover:bg-slate-100'}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isActive('/dashboard') ? 'bg-white/20' : 'bg-slate-100'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <span>Dashboard</span>
                </Link>
                <Link 
                  to="/history" 
                  className={`px-4 py-3.5 rounded-2xl transition-all duration-300 hover:scale-[1.02] flex items-center space-x-3 font-medium ${isActive('/history') ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-700 hover:bg-slate-100'}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isActive('/history') ? 'bg-white/20' : 'bg-slate-100'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span>History</span>
                </Link>
                <Link 
                  to="/insurance" 
                  className={`px-4 py-3.5 rounded-2xl transition-all duration-300 hover:scale-[1.02] flex items-center space-x-3 font-medium ${isActive('/insurance') ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-700 hover:bg-slate-100'}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isActive('/insurance') ? 'bg-white/20' : 'bg-slate-100'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span>Insurance</span>
                </Link>
                <Link 
                  to="/support" 
                  className={`px-4 py-3.5 rounded-2xl transition-all duration-300 hover:scale-[1.02] flex items-center space-x-3 font-medium ${isActive('/support') ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-700 hover:bg-slate-100'}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isActive('/support') ? 'bg-white/20' : 'bg-slate-100'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <span>Support</span>
                </Link>
                <Link 
                  to="/settings" 
                  className={`px-4 py-3.5 rounded-2xl transition-all duration-300 hover:scale-[1.02] flex items-center space-x-3 font-medium ${isActive('/settings') ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-700 hover:bg-slate-100'}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isActive('/settings') ? 'bg-white/20' : 'bg-slate-100'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span>Settings</span>
                </Link>
                <div className="border-t border-slate-200 my-3"></div>
                <button 
                  onClick={handleLogout} 
                  className="px-4 py-3.5 rounded-2xl bg-gradient-to-r from-red-500 to-pink-600 text-white transition-all duration-300 hover:scale-[1.02] flex items-center space-x-3 disabled:opacity-50 hover:shadow-lg hover:shadow-red-500/30 font-medium"
                  disabled={loadingAuth}
                >
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <span>Logout</span>
                </button>
              </>
            ): (
              <>
                <Link 
                  to="/login" 
                  className={`px-4 py-3.5 rounded-2xl transition-all duration-300 hover:scale-[1.02] flex items-center space-x-3 font-medium ${isActive('/login') ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-700 hover:bg-slate-100'}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isActive('/login') ? 'bg-white/20' : 'bg-slate-100'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <span>Login</span>
                </Link>
                <Link 
                  to="/signup" 
                  className="px-4 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white transition-all duration-300 hover:scale-[1.02] flex items-center space-x-3 hover:shadow-lg hover:shadow-emerald-500/30 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <span>Sign Up</span>
                </Link>
                <Link 
                  to="/support" 
                  className={`px-4 py-3.5 rounded-2xl transition-all duration-300 hover:scale-[1.02] flex items-center space-x-3 font-medium ${isActive('/support') ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-700 hover:bg-slate-100'}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isActive('/support') ? 'bg-white/20' : 'bg-slate-100'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <span>Support</span>
                </Link>
              </>
            )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
