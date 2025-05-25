'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Always redirect to the login page from the root
    router.push('/login');
  }, [router]);

  // Return null because this page will always redirect
  return null;
} 