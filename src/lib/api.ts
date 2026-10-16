/**
 * API client for Save Check
 * Centralized API calls to Cloudflare Workers backend with offline localStorage support
 */

import type { ApiResponse } from "@/types";
import { API_BASE_URL } from "./constants";
import { beginGlobalLoading } from "./global-loading";

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
  const finishLoading = beginGlobalLoading();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const controller = new AbortController();
    const timeoutMs = options?.timeoutMs ?? 10000;
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
          issues: data?.error?.issues,
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
  } finally {
    clearTimeout(timeoutId);
    finishLoading();
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
  options: { version?: string; revision?: string } = {},
): Promise<ApiResponse<Record<string, any>>> {
  const query = new URLSearchParams();
  if (options.version) query.set("version", options.version);
  if (options.revision) query.set("revision", options.revision);
  return fetchApi(
    `/results/${encodeURIComponent(submissionCode)}${query.size ? "?" + query : ""}`,
  );
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
  total_environment_revisions: number;
  by_group: Record<string, number>;
  satisfaction_avg_by_group: Record<string, number | null>;
  by_form: Record<string, number>;
  satisfaction_dimensions_by_group: Record<string, (number | null)[]>;
}

export interface DashboardSubmissionsParams {
  page?: number;
  limit?: number;
  submission_code?: string;
  type?: string;
  category?: string;
  /** Dashboard's two top-level types; includes that group's satisfaction forms. */
  group?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  sort_order?: "asc" | "desc";
  archived?: "active" | "only" | "all";
  date_basis?: "latest_measurement" | "created";
  revision_scope?: "latest" | "history";
  revision_page?: number;
  revision_limit?: number;
}
export interface DashboardItem {
  id: number;
  submission_code: string;
  assessment_type: string;
  assessment_category: string;
  assessment_group: string;
  schema_version: number;
  data_version: number;
  overall_score: number | null;
  overall_level: string | null;
  has_layout: boolean;
  completed_at: string;
  created_at: string;
  latest_measured_at: string | null;
  latest_revision_id: string | null;
  revision_count: number;
  display_name: string | null;
  location: string | null;
  archived_at: string | null;
}
export interface DashboardSubmissionsResponse {
  items: DashboardItem[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}
function dashboardQuery(params: DashboardSubmissionsParams = {}) {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== "" && v !== "all") query.set(k, String(v));
  // 'all' is meaningful for archive scope; other filters use omission.
  if (params.archived === "all") query.set("archived", "all");
  return query.size ? "?" + query : "";
}
export async function getDashboardSummary(params?: DashboardSubmissionsParams) {
  return fetchApi<DashboardSummaryData>(
    "/dashboard/summary" + dashboardQuery(params),
  );
}
export async function getDashboardSubmissions(
  params?: DashboardSubmissionsParams,
) {
  return fetchApi<DashboardSubmissionsResponse>(
    "/dashboard/submissions" + dashboardQuery(params),
  );
}
/** Compatibility type for the old workbook adapter. New exports use stored result records. */
export interface ExportDataResponse {
  submissions: Array<Record<string, any>>;
  envPointsMap: Record<number, any[]>;
  hrAnswersMap: Record<number, any[]>;
  satAnswersMap: Record<number, any[]>;
}
export interface StoredExportPage extends DashboardSubmissionsResponse {
  records: Record<string, unknown>[];
  next_page: number | null;
  revision_scope: "latest" | "history";
  revision_pages: {
    submission_code: string;
    total: number;
    page: number;
    limit: number;
    next_page: number | null;
  }[];
}
export async function getExportData(params?: DashboardSubmissionsParams) {
  return fetchApi<StoredExportPage>(
    "/dashboard/export-data" + dashboardQuery(params),
    { timeoutMs: 30000 },
  );
}
export async function getSubmissionVersionsV3(code: string, page = 1) {
  return fetchApi<{
    items: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
    data_version: number;
  }>(`/submissions/${encodeURIComponent(code)}/versions?page=${page}&limit=20`);
}

// v3 entry points for the upcoming form phases; every mutation has a persistent request key.
export interface V3MutationResult {
  id: number;
  submission_code: string;
  data_version?: number;
  revision_id?: string | null;
  revision_no?: number;
  result?: unknown;
}
export async function createSubmissionV3(
  payload: import("../../shared/v3").CreateSubmissionV3,
) {
  return fetchApi<V3MutationResult>("/submissions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export async function retestSubmissionV3(
  code: string,
  payload: import("../../shared/v3").RetestRequestV3,
) {
  return fetchApi<V3MutationResult>(
    `/submissions/${encodeURIComponent(code)}/retests`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}
export async function correctSubmissionV3(
  code: string,
  payload: {
    schema_version: 3;
    idempotency_key: string;
    reason?: string;
    expected_data_version: number;
    base_revision_id?: string;
    payload: import("../../shared/v3").CreateSubmissionV3;
  },
) {
  return fetchApi<V3MutationResult>(
    `/submissions/${encodeURIComponent(code)}/corrections`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}
export async function supplementLegacySubmissionV3(
  code: string,
  payload: import("../../shared/v3").LegacySupplementRequestV3,
) {
  return fetchApi<V3MutationResult>(
    `/submissions/${encodeURIComponent(code)}/metadata-supplement`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}
export async function getResultV3(
  code: string,
  options: { revision?: string; version?: number } = {},
) {
  const query = new URLSearchParams();
  if (options.revision) query.set("revision", options.revision);
  if (options.version) query.set("version", String(options.version));
  return fetchApi<Record<string, unknown>>(
    `/results/${encodeURIComponent(code)}${query.size ? "?" + query : ""}`,
  );
}
export async function getSubmissionRevisionsV3(
  code: string,
  page = 1,
  limit = 20,
) {
  return fetchApi<{
    items: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
    latest_revision_id: string;
  }>(
    `/submissions/${encodeURIComponent(code)}/revisions?page=${page}&limit=${limit}`,
  );
}
export async function uploadLayoutV3(file: File, idempotencyKey: string) {
  return fetchApi<{
    file_id: string;
    file_name: string;
    mime_type: string;
    byte_size: number;
    state: string;
    download_url: string;
  }>("/files", {
    method: "POST",
    headers: {
      "Content-Type": file.type,
      "X-File-Name": encodeURIComponent(file.name),
      "Idempotency-Key": idempotencyKey,
    },
    body: file,
    timeoutMs: 30000,
  });
}
export const layoutDownloadUrlV3 = (fileId: string) =>
  `${API_BASE_URL}/files/${encodeURIComponent(fileId)}`;
