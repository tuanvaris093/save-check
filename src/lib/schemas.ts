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
  work_area: z.string().min(2, "กรุณาระบุพื้นที่ปฏิบัติงาน"),
});

export type WorkInfoFormValues = z.infer<typeof workInfoSchema>;

// --- Helper type for the entire draft state ---

export interface AssessmentDraftData {
  profile?: RespondentProfileFormValues;
  workInfo?: WorkInfoFormValues;
  answers?: Record<string, string | number>;
  measuredValues?: Record<string, string>;
  lastSavedAt: string;
}
