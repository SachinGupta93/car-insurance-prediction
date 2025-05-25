
// d:\Car-damage-prediction\frontend\src\utils\apiHandler.ts
interface ApiCallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any; // Can be FormData, JSON string, etc.
  isFormData?: boolean;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'; // Adjusted for Vite

/**
 * A generic function to handle API calls.
 * @param endpoint The API endpoint (e.g., '/users', '/analyze-damage').
 * @param options Configuration for the API call (method, headers, body).
 * @returns A promise that resolves to an ApiResponse object.
 */
export const apiHandler = async <T = any>(
  endpoint: string,
  options: ApiCallOptions = {}
): Promise<ApiResponse<T>> => {
  const { method = 'GET', headers: customHeaders = {}, body, isFormData = false } = options;

  const headers: Record<string, string> = {
    ...customHeaders,
  };

  if (!isFormData && body) {
    headers['Content-Type'] = 'application/json';
  }

  // Get the token from localStorage
  // In our updated FirebaseAuthContext, this is stored automatically
  let token: string | null = null;
  try {
    token = localStorage.getItem('firebaseIdToken');
    if (!token) {
      // Try to get from session storage as a fallback
      token = sessionStorage.getItem('firebaseIdToken');
    }
  } catch (e) {
    console.warn('Could not retrieve auth token:', e);
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: isFormData ? body : (body ? JSON.stringify(body) : null),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: response.statusText };
      }
      return {
        error: errorData?.message || errorData?.error || `HTTP error! status: ${response.status}`,
        status: response.status,
      };
    }

    if (response.status === 204) {
      return { status: response.status };
    }
    
    const data: T = await response.json();
    return { data, status: response.status };

  } catch (error) {
    console.error('API Handler Error:', error);
    return {
      error: error instanceof Error ? error.message : 'An unknown network error occurred.',
      status: 0, 
    };
  }
};

export default apiHandler;
