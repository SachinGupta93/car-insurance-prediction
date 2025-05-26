import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface LogoutButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export default function LogoutButton({ 
  variant = 'secondary', 
  size = 'md', 
  showIcon = true,
  className = ''
}: LogoutButtonProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out:', error);
    } finally {
      setLoading(false);
    }
  };

  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white shadow-md hover:shadow-lg',
    ghost: 'text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-300 dark:hover:text-red-400 dark:hover:bg-red-900/20'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-sm rounded-lg',
    lg: 'px-6 py-3 text-base rounded-lg'
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading ? (
        <>
          <div className="loading-spinner w-4 h-4 mr-2"></div>
          Signing out...
        </>
      ) : (
        <>
          {showIcon && (
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          )}
          Logout
        </>
      )}
    </button>
  );
}