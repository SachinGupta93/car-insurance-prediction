// filepath: d:/Car-damage-prediction/frontend/src/api/index.ts
import { ApiResponse, DamageResult, RagResult, User } from '@/types';

// Check if we're running in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// API base URL with fallback options
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
                     process.env.VITE_API_BASE_URL ||  
                     'http://localhost:5000/api';

// Timeout for API requests in milliseconds
const API_TIMEOUT = 15000; // 15 seconds

// Helper function to create a timeout promise
const timeoutPromise = <T>(ms: number, errorMessage: string): Promise<ApiResponse<T>> => {
  return new Promise<ApiResponse<T>>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timed out after ${ms}ms: ${errorMessage}`));
    }, ms);
  });
};

/**
 * Core API fetch function with improved error handling
 */
async function fetchApi<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  // Initialize headers as Headers object for easier manipulation
  const requestHeaders = new Headers(options.headers);

  // Only set Content-Type if body is not FormData and not already set
  if (!(options.body instanceof FormData) && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  // Attempt to get the token from localStorage
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('firebaseToken');
    if (token && !requestHeaders.has('Authorization')) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  // Log requests in development mode
  if (isDevelopment) {
    console.log(`API Request: ${options.method || 'GET'} ${API_BASE_URL}${url}`);
  }
  try {
    // Race between the fetch request and a timeout
    const response = await Promise.race([
      fetch(`${API_BASE_URL}${url}`, { ...options, headers: requestHeaders }),
      timeoutPromise<T>(API_TIMEOUT, `${options.method || 'GET'} ${API_BASE_URL}${url}`)
    ]) as Response;

    // Log successful connection in dev mode
    if (isDevelopment) {
      console.log(`✅ Connected successfully to: ${API_BASE_URL}${url}`);
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `HTTP status ${response.status}: ${response.statusText}` };
      }

      // Special handling for common error codes
      let errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
      
      if (response.status === 401) {
        errorMessage = 'Authentication required. Please log in again.';
        // Optionally trigger logout or token refresh here
      } else if (response.status === 403) {
        errorMessage = 'You do not have permission to perform this action.';
      } else if (response.status === 404) {
        errorMessage = 'The requested resource was not found.';
      } else if (response.status === 500) {
        errorMessage = 'The server encountered an error. Please try again later.';
      }
      
      return { data: null, error: errorMessage, statusCode: response.status };
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      const data = await response.json();
      return { data };
    } else if (response.status === 204) {
      // No content response
      return { data: null };
    } else {
      // Handle non-JSON responses
      const text = await response.text();
      return { data: text as unknown as T };
    }
  } catch (error) {
    console.error('API call failed:', error);
    
    // Provide more helpful error messages for common issues
    let errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    if (errorMessage.includes('Failed to fetch') || 
        errorMessage.includes('NetworkError') || 
        errorMessage.includes('ERR_CONNECTION_REFUSED')) {
      errorMessage = `Cannot connect to server at ${API_BASE_URL}. Please ensure the backend is running.`;
        // Development helper messages
      if (isDevelopment) {
        console.warn('👉 Troubleshooting tips for CONNECTION_REFUSED errors:');
        console.warn('1. Make sure the backend server is running (`run-backend.ps1`)');
        console.warn('2. Check if the server is running on the expected port (5000)');
        console.warn('3. Verify there are no firewall issues blocking the connection');
        console.warn('4. Check for any errors in the backend server console');
        console.warn('5. Try accessing the health endpoint directly: http://localhost:5000/api/health');
      }
    } else if (errorMessage.includes('timed out')) {
      errorMessage = 'The server is taking too long to respond. Please try again later.';
    } else if (errorMessage.includes('CORS')) {
      errorMessage = 'Cross-Origin Request Blocked. This is a CORS configuration issue.';
    }
    
    return { data: null, error: errorMessage };
  }
}

// Authentication
export const registerUser = (userData: any) => fetchApi<any>('/auth/register', { method: 'POST', body: JSON.stringify(userData) });
export const loginUser = (credentials: any) => fetchApi<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
export const verifyToken = (token: string) => fetchApi<any>('/auth/verify', { method: 'POST', body: JSON.stringify({ token }) });
export const getUserProfile = () => fetchApi<User>('/profile');
export const updateUserProfile = (profileData: any) => fetchApi<any>('/profile', { method: 'PUT', body: JSON.stringify(profileData) });

// Vehicle Management
export const addVehicle = (vehicleData: any) => fetchApi<any>('/vehicles', { method: 'POST', body: JSON.stringify(vehicleData) });
export const getVehicles = () => fetchApi<any[]>('/vehicles');
export const getVehicleInfo = (make: string, model: string, year: string) => fetchApi<any>(`/vehicle/info?make=${make}&model=${model}&year=${year}`);
export const estimateRepairCost = (data: {make: string, model: string, damage_type: string}) => fetchApi<any>('/vehicle/repair-cost', { method: 'POST', body: JSON.stringify(data) });

// Damage Analysis
export const analyzeDamage = async (formData: FormData): Promise<ApiResponse<DamageResult>> => {
  return fetchApi<DamageResult>('/analyze', {
    method: 'POST',
    body: formData,
  });
};

export const analyzeDamageGeminiOnly = async (formData: FormData): Promise<ApiResponse<any>> => {
  return fetchApi<any>('/analyze/gemini-only', {
    method: 'POST',
    body: formData,
  });
};
export const getAnalysisHistory = () => fetchApi<any[]>('/analysis/history');
export const getLatestAnalysisTechniques = () => fetchApi<any>('/analysis/latest-techniques');


// Insurance
export const addInsurance = (insuranceData: any) => fetchApi<any>('/insurance', { method: 'POST', body: JSON.stringify(insuranceData) });
export const getInsurance = () => fetchApi<any[]>('/insurance');
export const getInsuranceRecommendations = (damageAssessment: any) => fetchApi<any>('/insurance/recommendations', { method: 'POST', body: JSON.stringify(damageAssessment) });

// RAG specific 
export const analyzeWithRag = (query: string, context?: any): Promise<ApiResponse<RagResult>> => {
  // Since RAG endpoint appears to be misconfigured or missing,
  // let's provide a mock implementation for development
  if (isDevelopment) {
    console.warn("RAG API is not fully configured. In development mode, using mock data.");
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ 
          data: { 
            answer: `This is a mock response for your query about: "${query}".\n\n` +
                   `In a production environment, this would connect to your backend RAG system. ` +
                   `Please ensure your backend has a proper RAG endpoint configured.`,
            sources: [
              {
                title: "Mock Source",
                content: "This is mock content for development purposes.",
                url: "#"
              }
            ] 
          }
        });
      }, 1000); // Simulate network delay
    });
  }
    // If not in development, try the actual endpoint
  return fetchApi<RagResult>('/rag/analyze', { 
    method: 'POST', 
    body: JSON.stringify({ query, context }) 
  });
};

// Repair Recommendations
export const getRepairRecommendations = (damageAnalysis: any) => fetchApi<any>('/damage/recommendations', { method: 'POST', body: JSON.stringify(damageAnalysis) });


// Health Check 
export const healthCheck = () => fetchApi<any>('/health');

// Generic function to upload image 
export const uploadImage = async (file: File): Promise<ApiResponse<DamageResult>> => {
  console.log(`Uploading image: ${file.name} (${Math.round(file.size / 1024)}KB)`);
  
  const formData = new FormData();
  formData.append('image', file);
  
  try {
    return await analyzeDamage(formData);
  } catch (error) {
    console.error('Image upload error:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Failed to upload image' 
    };
  }
};
