'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LogoutButton from '@/components/auth/LogoutButton';
import ImageUpload from '@/components/dashboard/ImageUpload';
import DamageAnalysis from '@/components/dashboard/DamageAnalysis';
import RagAnalysis from '@/components/dashboard/RagAnalysis';

export default function DashboardPage() {
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>();

  const handleImageUploaded = (imageUrl: string) => {
    setCurrentImageUrl(imageUrl);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">Car Damage Prediction</h1>
              </div>
              <div className="flex items-center">
                <LogoutButton />
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="grid grid-cols-1 gap-6">
              <ImageUpload onImageUploaded={handleImageUploaded} />
              <DamageAnalysis imageUrl={currentImageUrl} />
              <RagAnalysis />
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
} 