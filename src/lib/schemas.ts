import { z } from "zod";

// --- Step 1: Respondent Profile Schema ---

export const respondentProfileSchema = z
  .object({
    full_name: z.string().min(2, "กรุณาระบุชื่อ-นามสกุลให้ถูกต้อง"),
    gender: z.enum(["male", "female", "other"], {
      errorMap: () => ({ message: "กรุณาเลือกเพศ" }),
    }),
    age: z.coerce
      .number({ invalid_type_error: "กรุณาระบุอายุเป็นตัวเลข" })
      .min(1, "กรุณาระบุอายุให้ถูกต้อง")
      .max(120, "อายุไม่ควรเกิน 120 ปี"),
    weight: z.coerce
      .number()
      .positive("ต้องเป็นค่าบวก")
      .optional()
      .or(z.literal("")),
    height: z.coerce
      .number()
      .positive("ต้องเป็นค่าบวก")
      .optional()
      .or(z.literal("")),
    education_level: z.string().optional(),
    marital_status: z.string().optional(),
    has_underlying_disease: z.boolean().default(false),
    underlying_disease_details: z.string().optional(),
  })
  .refine(
    (data) => {
      // If they have a disease, they must provide details
      if (data.has_underlying_disease) {
        return (
          !!data.underlying_disease_details &&
          data.underlying_disease_details.trim().length > 0
        );
      }
      return true;
    },
    {
      message: "กรุณาระบุรายละเอียดโรคประจำตัว",
      path: ["underlying_disease_details"],
    },
  );

export type RespondentProfileFormValues = z.infer<
  typeof respondentProfileSchema
>;

// --- Step 1 (Environment): Inspection Data Schema ---

export const inspectionDataSchema = z
  .object({
    inspector_name: z.string().min(2, "กรุณาระบุชื่อ-นามสกุลผู้ตรวจ"),
    position: z.string().min(2, "กรุณาระบุตำแหน่ง"),
    inspection_location: z.string().min(2, "กรุณาระบุสถานที่ตรวจ"),
    inspection_date: z.string().min(1, "กรุณาระบุวันที่ทำการตรวจวัด"),
    equipment: z.string().min(2, "กรุณาระบุเครื่องมือที่ใช้ (เช่น Lux meter รุ่น: tm-204)"),
    measurement_technique: z.string().optional(),
    start_time: z.string().min(1, "กรุณาระบุเวลาเริ่ม"),
    end_time: z.string().min(1, "กรุณาระบุเวลาสิ้นสุด"),
  })
  .refine(
    (data) => {
      if (!data.start_time || !data.end_time) return true;
      // Compare HH:mm strings directly since they are zero-padded (e.g., 07:00 < 07:01)
      return data.end_time > data.start_time;
    },
    {
      message: "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม",
      path: ["end_time"],
    }
  );

export type InspectionDataFormValues = z.infer<typeof inspectionDataSchema>;

// --- Step 2: Work Info Schema ---

export const workInfoSchema = z.object({
  position_type: z.string().min(1, "กรุณาเลือกประเภทบุคลากร"),
  department: z.string().min(2, "กรุณาระบุคณะ/แผนก/ฝ่าย"),
  work_experience_years: z.coerce
    .number()
    .min(0, "อายุงานต้องไม่ติดลบ")
    .optional()
    .or(z.literal("")),
  working_hours_per_day: z.coerce
    .number()
    .min(1, "ต้องมากกว่า 0")
    .max(24, "ไม่เกิน 24 ชั่วโมง")
    .optional()
    .or(z.literal("")),
  working_days_per_week: z.coerce
    .number()
    .min(1, "ต้องมากกว่า 0")
    .max(7, "ไม่เกิน 7 วัน")
    .optional()
    .or(z.literal("")),
});

import type { LayoutFileInfo } from "@/types";

export type WorkInfoFormValues = z.infer<typeof workInfoSchema>;

// --- Helper type for the entire draft state ---

export interface AssessmentDraftData {
  profile?: RespondentProfileFormValues;
  workInfo?: WorkInfoFormValues;
  inspectionData?: InspectionDataFormValues;
  answers?: Record<string, string | number>;
  measuredValues?: Record<string, string>;
  layoutFile?: LayoutFileInfo | null;
  lastSavedAt?: string;
}
