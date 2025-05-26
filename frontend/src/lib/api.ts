const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

import { auth } from './firebase';

interface ApiResponse<T> {
  data: T;
  error?: string;
}

// Helper function to get the current user's ID token
async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    return await user.getIdToken();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

// Helper function to create headers with authentication
async function createAuthHeaders(contentType?: string): Promise<HeadersInit> {
  const token = await getAuthToken();
  const headers: HeadersInit = {};
  
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

export async function uploadImage(file: File): Promise<ApiResponse<{ imageUrl: string }>> {
  const formData = new FormData();
  formData.append('image', file);

  const headers = await createAuthHeaders();
  
  const response = await fetch(`${API_BASE_URL}/analyze/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload image');
  }

  return response.json();
}

export async function analyzeDamage(imageUrl: string): Promise<ApiResponse<{
  results: Array<{
    damageType: string;
    confidence: number;
    description: string;
    damageDescription: string;
    repairEstimate?: string;
    recommendations: string[];
  }>;
}>> {
  const headers = await createAuthHeaders('application/json');
  
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ imageUrl }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to analyze damage');
  }

  return response.json();
}

export async function analyzeWithRag(query: string, context: string): Promise<ApiResponse<{
  answer: string;
  sources: Array<{
    title: string;
    content: string;
    url: string;
  }>;
}>> {
  const headers = await createAuthHeaders('application/json');
  
  const response = await fetch(`${API_BASE_URL}/rag/analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, context }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to analyze with RAG');
  }

  return response.json();
}

// Get user profile
export async function getUserProfile(): Promise<ApiResponse<{
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  uid: string;
}>> {
  const headers = await createAuthHeaders();
  
  const response = await fetch(`${API_BASE_URL}/user/profile`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get user profile');
  }

  return response.json();
}

// Update user profile
export async function updateUserProfile(profileData: {
  displayName?: string;
  photoURL?: string;
}): Promise<ApiResponse<{ success: boolean }>> {
  const headers = await createAuthHeaders('application/json');
  
  const response = await fetch(`${API_BASE_URL}/user/profile`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(profileData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update user profile');
  }

  return response.json();
}

// Get analysis history
export async function getAnalysisHistory(): Promise<ApiResponse<{
  history: Array<{
    id: string;
    timestamp: string;
    imageUrl: string;
    results: any;
  }>;
}>> {
  const headers = await createAuthHeaders();
  
  const response = await fetch(`${API_BASE_URL}/user/analysis-history`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get analysis history');
  }

  return response.json();
} 