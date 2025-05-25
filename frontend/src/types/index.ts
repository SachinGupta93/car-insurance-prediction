export interface DamageResult {
  damageType: string;
  confidence: number;
  description: string;
  repairEstimate: string;
  recommendations: string[];
}

export interface RagResult {
  answer: string;
  sources: {
    title: string;
    content: string;
    url: string;
  }[];
}

export interface ApiResponse<T> {
  data: T | null;  // Allow data to be null
  error?: string;
  statusCode?: number;  // Add optional statusCode
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}