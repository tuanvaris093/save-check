/**
 * Core type definitions for Save Check assessment system
 */

// --- Assessment Types ---

export type AssessmentType = "environment" | "health_risk" | "satisfaction";

export type AssessmentCategory = "light" | "noise" | "heat" | "general";

export type RiskLevel = "pass" | "medium" | "high_risk";

export type SubmissionStatus =
  | "started"
  | "in_progress"
  | "completed"
  | "cancelled";

// --- Submission ---

export interface Submission {
  id: number;
  submission_code: string;
  assessment_type: AssessmentType;
  assessment_category: AssessmentCategory;
  started_at: string;
  completed_at: string | null;
  status: SubmissionStatus;
  overall_score: number | null;
  overall_level: RiskLevel | null;
  created_at: string;
  updated_at: string;
}

// --- Respondent Profile ---

export interface RespondentProfile {
  id: number;
  submission_id: number;
  full_name: string;
  gender: string;
  age: number;
  weight: number | null;
  height: number | null;
  education_level: string | null;
  marital_status: string | null;
  has_underlying_disease: boolean;
  underlying_disease_details: string | null;
  created_at: string;
}

// --- Respondent Work Info ---

export interface RespondentWorkInfo {
  id: number;
  submission_id: number;
  position_type: string;
  department: string;
  work_experience_years: number | null;
  working_hours_per_day: number | null;
  working_days_per_week: number | null;
  work_area: string;
  created_at: string;
}

// --- Environment Answer ---

export interface EnvironmentAnswer {
  id: number;
  submission_id: number;
  category: AssessmentCategory;
  question_key: string;
  question_text: string;
  answer_value: string;
  answer_score: number | null;
  measured_value: number | null;
  unit: string | null;
  created_at: string;
}

// --- Health Risk Answer ---

export interface HealthRiskAnswer {
  id: number;
  submission_id: number;
  category: AssessmentCategory;
  question_no: number;
  question_text: string;
  answer_value: string;
  answer_score: number;
  created_at: string;
}

// --- Satisfaction Answer ---

export interface SatisfactionAnswer {
  id: number;
  submission_id: number;
  category: string;
  question_no: number;
  question_text: string;
  rating: number;
  created_at: string;
}

// --- Assessment Result ---

export interface AssessmentResult {
  id: number;
  submission_id: number;
  assessment_type: AssessmentType;
  assessment_category: AssessmentCategory;
  total_score: number;
  risk_level: RiskLevel;
  recommendation: string | null;
  created_at: string;
}

// --- API Response Types ---

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// --- Form Input Types ---

export interface RespondentProfileInput {
  full_name: string;
  gender: string;
  age: number;
  weight?: number;
  height?: number;
  education_level?: string;
  marital_status?: string;
  has_underlying_disease: boolean;
  underlying_disease_details?: string;
}

export interface RespondentWorkInfoInput {
  position_type: string;
  department: string;
  work_experience_years?: number;
  working_hours_per_day?: number;
  working_days_per_week?: number;
  work_area: string;
}

// --- Dashboard Types ---

export interface DashboardSummary {
  total_submissions: number;
  by_type: Record<AssessmentType, number>;
  by_category: Record<AssessmentCategory, number>;
  by_level: Record<RiskLevel, number>;
  satisfaction_avg: number | null;
}

export interface SubmissionListItem {
  submission_code: string;
  full_name: string;
  assessment_type: AssessmentType;
  assessment_category: AssessmentCategory;
  overall_score: number | null;
  overall_level: RiskLevel | null;
  completed_at: string;
}
