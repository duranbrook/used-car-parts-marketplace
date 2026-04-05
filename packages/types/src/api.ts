export interface ApiError {
  error: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// AI endpoints
export interface PartIdentificationResult {
  partType: string;
  confidence: number;
  compatibleVehicles: { year: number; make: string; model: string }[];
  suggestedTitle: string;
  notes: string;
}

export interface ConditionAssessmentResult {
  grade: "A" | "B" | "C";
  confidence: number;
  defects: { location: string; severity: "minor" | "moderate" | "major"; description: string }[];
  notes: string;
}

export interface PriceSuggestionResult {
  low: number;
  suggested: number;
  high: number;
  reasoning: string;
}

export interface VinDecodeResult {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  engineType: string | null;
  transmission: string | null;
  driveType: string | null;
  bodyType: string | null;
}
