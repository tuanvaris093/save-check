/**
 * API client for Save Check
 * Centralized API calls to Cloudflare Workers backend
 */

import type { ApiResponse } from "@/types";
import { API_BASE_URL } from "./constants";

/**
 * Base fetch wrapper with standard error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

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
  } catch (error) {
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ต",
      },
    };
  }
}

// --- Submission APIs ---

export async function startSubmission(data: {
  assessment_type: string;
  assessment_category: string;
}): Promise<ApiResponse<{ submission_id: number; submission_code: string }>> {
  return fetchApi("/submissions/start", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function saveProfile(
  submissionId: number,
  data: Record<string, unknown>,
): Promise<ApiResponse<{ id: number }>> {
  return fetchApi(`/submissions/${submissionId}/profile`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function saveWorkInfo(
  submissionId: number,
  data: Record<string, unknown>,
): Promise<ApiResponse<{ id: number }>> {
  return fetchApi(`/submissions/${submissionId}/work-info`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function saveAnswers(
  submissionId: number,
  data: Record<string, unknown>,
): Promise<ApiResponse<{ count: number }>> {
  return fetchApi(`/submissions/${submissionId}/answers`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function completeSubmission(
  submissionId: number,
  data: Record<string, unknown>,
): Promise<ApiResponse<{ submission_code: string }>> {
  return fetchApi(`/submissions/${submissionId}/complete`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- Result API ---

export async function getResult(
  submissionId: string,
): Promise<ApiResponse<Record<string, unknown>>> {
  return fetchApi(`/results/${submissionId}`);
}

// --- Dashboard APIs ---

export async function getDashboardSummary(): Promise<
  ApiResponse<Record<string, unknown>>
> {
  return fetchApi("/dashboard/summary");
}

export async function getDashboardSubmissions(): Promise<
  ApiResponse<Record<string, unknown>[]>
> {
  return fetchApi("/dashboard/submissions");
}

export async function getDashboardByCategory(): Promise<
  ApiResponse<Record<string, unknown>>
> {
  return fetchApi("/dashboard/by-category");
}
