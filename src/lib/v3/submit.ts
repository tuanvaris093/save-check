import {
  validateSubmission,
  type CreateSubmissionV3,
} from "../../../shared/v3";
import type { ApiResponse } from "../../types";
export interface SubmissionReceipt {
  id: number;
  submission_code: string;
  data_version?: number;
  revision_id?: string | null;
  result?: unknown;
}
export type SubmitTransport = (
  payload: CreateSubmissionV3,
) => Promise<ApiResponse<SubmissionReceipt>>;
// The caller clears a draft and navigates only after a verified server receipt.
export async function submitAssessment(
  input: unknown,
  transport: SubmitTransport,
): Promise<ApiResponse<SubmissionReceipt>> {
  const parsed = validateSubmission(input);
  if (!parsed.success) return { success: false, error: parsed.error };
  try {
    const response = await transport(parsed.data);
    if (!response.success) return response;
    if (
      !response.data ||
      !Number.isSafeInteger(response.data.id) ||
      response.data.id < 1 ||
      typeof response.data.submission_code !== "string" ||
      !response.data.submission_code.trim() ||
      !Number.isSafeInteger(response.data.data_version) ||
      (response.data.data_version ?? 0) < 1
    )
      return {
        success: false,
        error: {
          code: "INVALID_SERVER_RECEIPT",
          message:
            "server ไม่ได้ยืนยันการบันทึก ข้อมูลร่างยังอยู่ กรุณาลองใหม่",
        },
      };
    return response;
  } catch {
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message:
          "ส่งข้อมูลไม่สำเร็จ ข้อมูลร่างยังอยู่ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่",
      },
    };
  }
}
const fieldLabels: Record<string, string> = {
  profile: "ข้อมูลส่วนตัว",
  full_name: "ชื่อ-นามสกุล",
  gender: "เพศ",
  age: "อายุ",
  weight: "น้ำหนัก",
  height: "ส่วนสูง",
  education_level: "ระดับการศึกษา",
  marital_status: "สถานภาพสมรส",
  has_underlying_disease: "โรคประจำตัว",
  underlying_disease_details: "รายละเอียดโรคประจำตัว",
  workInfo: "ข้อมูลการทำงาน/การเรียน",
  program_code: "หลักสูตร / แผนก / ฝ่าย",
  study_year: "ชั้นปี",
  position_type: "ประเภทผู้ตอบ",
  working_hours_per_week: "ชั่วโมงปฏิบัติงานต่อสัปดาห์",
  working_hours_per_day: "ชั่วโมงปฏิบัติงานต่อวัน",
  inspectionData: "ข้อมูลการตรวจวัด",
  answers: "คำตอบแบบประเมิน",
  before: "คำตอบก่อน",
  after: "คำตอบหลัง",
  single: "คำตอบ",
  units: "ค่าตรวจวัด",
  layout: "ไฟล์ผัง",
  durations: "ระยะเวลา",
  healthContext: "ข้อมูลประกอบอาการทางสุขภาพ",
};
export function submissionErrorMessage(error: {
  message: string;
  issues?: { path: (string | number)[]; message: string }[];
}) {
  const first = error.issues?.[0];
  if (!first) return error.message;
  const parts = first.path.filter((v): v is string => typeof v === "string");
  const label =
    parts
      .map(
        (p) =>
          fieldLabels[p] ?? (/^q\d+$/.test(p) ? `ข้อที่ ${p.slice(1)}` : null),
      )
      .filter(Boolean)
      .join(" — ") || "ข้อมูลแบบประเมิน";
  const detail = ["Required", "Invalid input"].includes(first.message)
    ? "กรุณาระบุข้อมูลให้ครบ"
    : first.message;
  return `${error.message}: ${label} (${detail})`;
}
