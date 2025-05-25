'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // If loading, you might want to show a loading spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        {/* You can add a loading spinner component here */}
        <p>Loading...</p>
      </div>
    );
  }

  // If not authenticated, show the login form
  if (!user) {
    return <LoginForm />;
  }

  // If authenticated, return null or a loading state while redirecting
  return null;
} 