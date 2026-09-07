// Cloudflare Worker Environment Bindings
export interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
  FRONTEND_URL?: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Submission Request Body Payload
export interface CreateSubmissionPayload {
  submission_code?: string;
  assessment_type: "environment" | "health_risk" | "satisfaction";
  assessment_category: "light" | "noise" | "heat" | "general";
  started_at?: string;
  completed_at?: string;
  status?: "draft" | "completed";
  overall_score?: number | null;
  overall_level?: "pass" | "medium" | "high_risk";
  has_layout?: boolean;
  layout_file?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    fileData: string;
    uploadedAt?: string;
  } | null;

  // Environment Inspection data
  inspectionData?: {
    inspector_name: string;
    position?: string;
    inspection_location: string;
    inspection_date: string;
    equipment?: string;
    measurement_technique?: string;
    start_time?: string;
    end_time?: string;
  };

  // Profile data (Health Risk)
  profile?: {
    full_name?: string;
    gender?: string;
    age?: number;
    weight?: number;
    height?: number;
    education_level?: string;
    marital_status?: string;
    has_underlying_disease?: boolean;
    underlying_disease_details?: string;
  };

  // Work Info data (Health Risk)
  workInfo?: {
    position_type?: string;
    department?: string;
    position?: string;
    work_experience_years?: number;
    working_hours_per_day?: number;
    working_days_per_week?: number;
    work_area?: string;
  };

  // Answers payload
  answers?: Record<string, any>;
}
