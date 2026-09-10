/**
 * API client for Save Check
 * Centralized API calls to Cloudflare Workers backend with offline localStorage support
 */

import type { ApiResponse } from "@/types";
import { API_BASE_URL } from "./constants";

interface FetchOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * Base fetch wrapper with standard error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options?: FetchOptions,
): Promise<ApiResponse<T>> {
  try {
    const controller = new AbortController();
    const timeoutMs = options?.timeoutMs ?? 10000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const { timeoutMs: _, ...fetchOptions } = options || {};

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions?.headers,
      },
      signal: controller.signal,
      ...fetchOptions,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: data?.error?.code || "API_ERROR",
          message: data?.error?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่",
        },
      };
    }

    return data as ApiResponse<T>;
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error?.name === "AbortError" ? "TIMEOUT_ERROR" : "NETWORK_ERROR",
        message:
          error?.name === "AbortError"
            ? "การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง"
            : "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้",
      },
    };
  }
}

// --- Submission APIs ---

export interface CreateSubmissionRequest {
  submission_code?: string;
  assessment_type: string;
  assessment_category: string;
  started_at?: string;
  completed_at?: string;
  status?: string;
  overall_score?: number | null;
  overall_level?: string;
  has_layout?: boolean;
  layout_file?: any;
  inspectionData?: any;
  profile?: any;
  workInfo?: any;
  answers?: any;
}

/**
 * Submit full assessment payload to Cloudflare Workers API
 */
export async function createSubmission(
  data: CreateSubmissionRequest,
): Promise<
  ApiResponse<{ id: number; submission_code: string; message: string }>
> {
  return fetchApi("/submissions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Update an existing assessment while preserving its document code. */
export async function updateSubmission(
  submissionCode: string,
  data: CreateSubmissionRequest,
): Promise<
  ApiResponse<{ id: number; submission_code: string; message: string }>
> {
  return fetchApi(`/submissions/${submissionCode}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/**
 * Update or remove layout file for an existing submission
 */
export async function updateSubmissionLayout(
  submissionCode: string,
  layoutFile: any,
): Promise<
  ApiResponse<{ submission_code: string; has_layout: boolean; message: string }>
> {
  return fetchApi(`/submissions/${submissionCode}/layout`, {
    method: "PATCH",
    body: JSON.stringify({ layout_file: layoutFile }),
  });
}

/**
 * Delete a submission and all its associated data
 */
export async function deleteSubmission(
  submissionCode: string,
): Promise<ApiResponse<{ submission_code: string; message: string }>> {
  return fetchApi(`/submissions/${submissionCode}`, {
    method: "DELETE",
  });
}

// --- Result API ---

export async function getResult(
  submissionCode: string,
): Promise<ApiResponse<Record<string, any>>> {
  return fetchApi(`/results/${submissionCode}`);
}

// --- Dashboard APIs ---

export interface DashboardSummaryData {
  total_submissions: number;
  by_type: {
    environment: number;
    health_risk: number;
    satisfaction: number;
  };
  by_category: {
    light: number;
    noise: number;
    heat: number;
    general: number;
  };
  by_level: {
    pass: number;
    medium: number;
    high_risk: number;
  };
  satisfaction_avg: number;
}

export async function getDashboardSummary(): Promise<
  ApiResponse<DashboardSummaryData>
> {
  return fetchApi<DashboardSummaryData>("/dashboard/summary");
}

export interface DashboardSubmissionsParams {
  page?: number;
  limit?: number;
  type?: string;
  category?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  sort_order?: "asc" | "desc";
}

export interface DashboardSubmissionsResponse {
  items: Array<{
    id: number;
    submission_code: string;
    assessment_type: string;
    assessment_category: string;
    status: string;
    overall_score?: number | null;
    overall_level?: string;
    has_layout: boolean;
    completed_at: string;
    created_at: string;
    inspector_name?: string;
    location?: string;
    profile_name?: string;
    department?: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export async function getDashboardSubmissions(
  params?: DashboardSubmissionsParams,
): Promise<ApiResponse<DashboardSubmissionsResponse>> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.type && params.type !== "all") query.set("type", params.type);
  if (params?.category && params.category !== "all")
    query.set("category", params.category);
  if (params?.search) query.set("search", params.search);
  if (params?.start_date) query.set("start_date", params.start_date);
  if (params?.end_date) query.set("end_date", params.end_date);
  if (params?.sort_order) query.set("sort_order", params.sort_order);

  const qs = query.toString();
  return fetchApi<DashboardSubmissionsResponse>(
    `/dashboard/submissions${qs ? `?${qs}` : ""}`,
  );
}

export interface ExportDataResponse {
  submissions: Array<any>;
  envPointsMap: Record<number, any[]>;
  hrAnswersMap: Record<number, any[]>;
  satAnswersMap: Record<number, any[]>;
}

export async function getExportData(
  params?: DashboardSubmissionsParams,
): Promise<ApiResponse<ExportDataResponse>> {
  const query = new URLSearchParams();
  if (params?.type && params.type !== "all") query.set("type", params.type);
  if (params?.category && params.category !== "all")
    query.set("category", params.category);
  if (params?.search) query.set("search", params.search);
  if (params?.start_date) query.set("start_date", params.start_date);
  if (params?.end_date) query.set("end_date", params.end_date);
  if (params?.sort_order) query.set("sort_order", params.sort_order);

  const qs = query.toString();
  return fetchApi<ExportDataResponse>(
    `/dashboard/export-data${qs ? `?${qs}` : ""}`,
    { timeoutMs: 25000 },
  );
}
