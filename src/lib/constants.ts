/**
 * Application constants for Save Check
 */

import type { AssessmentType, AssessmentCategory, RiskLevel } from "@/types";

// --- API ---

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8787/api";

// --- Assessment Type Labels ---

export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  environment: "ประเมินสภาพแวดล้อมในการทำงาน",
  health_risk: "ประเมินความเสี่ยงต่อสุขภาพ",
  satisfaction: "ประเมินความพึงพอใจในการใช้แอป",
};

export const ASSESSMENT_TYPE_DESCRIPTIONS: Record<AssessmentType, string> = {
  environment:
    "ประเมินข้อมูลด้านแสงสว่าง เสียง และความร้อนในพื้นที่ทำงาน",
  health_risk:
    "ประเมินอาการหรือผลกระทบทางสุขภาพจากแสง เสียง และความร้อน",
  satisfaction:
    "ประเมินความพึงพอใจด้านเนื้อหา การออกแบบ การใช้งาน และประโยชน์ของแอป",
};

// Icon mapping moved to lucide-react components (no emoji)

// --- Assessment Category Labels ---

export const ASSESSMENT_CATEGORY_LABELS: Record<AssessmentCategory, string> = {
  light: "แสงสว่าง",
  noise: "เสียง",
  heat: "ความร้อน",
  general: "ทั่วไป",
};

// Category icon mapping moved to lucide-react components (no emoji)

// --- Risk Level Labels ---

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  pass: "ผ่านเกณฑ์",
  medium: "ปานกลาง",
  high_risk: "เสี่ยงสูง",
};

export const RISK_LEVEL_COLORS: Record<
  RiskLevel,
  { bg: string; text: string; border: string }
> = {
  pass: {
    bg: "bg-success-soft",
    text: "text-success",
    border: "border-success",
  },
  medium: {
    bg: "bg-warning-soft",
    text: "text-warning",
    border: "border-warning",
  },
  high_risk: {
    bg: "bg-danger-soft",
    text: "text-danger",
    border: "border-danger",
  },
};

// --- Scoring ---

export const HEALTH_RISK_SCORE_MAP: Record<string, number> = {
  never: 0, // ไม่เคย
  sometimes: 1, // บางครั้ง
  always: 2, // เป็นประจำ
};

export const HEALTH_RISK_ANSWER_LABELS: Record<string, string> = {
  never: "ไม่เคย",
  sometimes: "บางครั้ง",
  always: "เป็นประจำ",
};

export const HEALTH_RISK_MAX_SCORE_PER_QUESTION = 2;
export const HEALTH_RISK_QUESTIONS_PER_CATEGORY = 10;
export const HEALTH_RISK_MAX_SCORE =
  HEALTH_RISK_MAX_SCORE_PER_QUESTION * HEALTH_RISK_QUESTIONS_PER_CATEGORY; // 20

// Risk level thresholds
export const RISK_THRESHOLDS = {
  pass: { min: 0, max: 6 },
  medium: { min: 7, max: 13 },
  high_risk: { min: 14, max: 20 },
} as const;

// --- Satisfaction ---

export const SATISFACTION_CATEGORIES = [
  "accuracy",
  "design",
  "usability",
  "usefulness",
] as const;

export const SATISFACTION_CATEGORY_LABELS: Record<string, string> = {
  accuracy: "ด้านเนื้อหา (Accuracy)",
  design: "ด้านการออกแบบ (Design)",
  usability: "ด้านการใช้งาน (Usability)",
  usefulness: "ด้านประโยชน์ (Usefulness)",
};

export const SATISFACTION_RATING_LABELS: Record<number, string> = {
  5: "พึงพอใจมากที่สุด",
  4: "พึงพอใจมาก",
  3: "พึงพอใจปานกลาง",
  2: "พึงพอใจน้อย",
  1: "พึงพอใจน้อยที่สุด",
};

// --- Gender Options ---

export const GENDER_OPTIONS = [
  { value: "male", label: "ชาย" },
  { value: "female", label: "หญิง" },
  { value: "other", label: "อื่น ๆ" },
] as const;

// --- Education Level Options ---

export const EDUCATION_LEVEL_OPTIONS = [
  { value: "below_bachelor", label: "ต่ำกว่าปริญญาตรี" },
  { value: "bachelor", label: "ปริญญาตรี" },
  { value: "master", label: "ปริญญาโท" },
  { value: "doctorate", label: "ปริญญาเอก" },
] as const;

// --- Marital Status Options ---

export const MARITAL_STATUS_OPTIONS = [
  { value: "single", label: "โสด" },
  { value: "married", label: "สมรส" },
  { value: "divorced", label: "หย่าร้าง" },
  { value: "widowed", label: "หม้าย" },
] as const;

// --- Position Type Options ---

export const POSITION_TYPE_OPTIONS = [
  { value: "staff", label: "บุคลากร" },
  { value: "student", label: "นักศึกษา" },
  { value: "faculty", label: "อาจารย์" },
  { value: "other", label: "อื่น ๆ" },
] as const;

// --- Routes ---

export const ROUTES = {
  HOME: "/",
  ENVIRONMENT: "/assessment/environment",
  ENVIRONMENT_FORM: "/assessment/environment-form",
  HEALTH_RISK: "/assessment/health-risk",
  HEALTH_RISK_FORM: "/assessment/health-risk-form",
  SATISFACTION: "/assessment/satisfaction",
  RESULT: "/result",
  DASHBOARD: "/dashboard",
  COMPLETE: "/complete",
} as const;
