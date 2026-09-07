import { z } from "zod";
import type { AssessmentCategory } from "@/types";

// Schema for the Environment Measurement Form (Step 3)
export const environmentMeasurementSchema = z.object({
  // Generic fields
  environment_condition: z.string().optional(), // Made optional so Noise can skip it if needed
  job_characteristic: z.string().optional(),
  
  // Heat specific
  workload_level: z.string().optional(), 
  
  // Standard (Global for Noise/Heat)
  standard_value: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number().min(1).optional()
  ) as z.ZodType<number | undefined, z.ZodTypeDef, any>,
  
  // Generic Measures (Used by Heat)
  measure_1: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number().min(0, "ค่าตรวจวัดไม่สามารถติดลบได้").optional()
  ) as z.ZodType<number | undefined, z.ZodTypeDef, any>,
  measure_2: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number().min(0).optional()
  ) as z.ZodType<number | undefined, z.ZodTypeDef, any>,
  measure_3: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number().min(0).optional()
  ) as z.ZodType<number | undefined, z.ZodTypeDef, any>,

  // Noise specific fields
  working_duration: z.string().optional(),
  twa_8hr: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number({ invalid_type_error: "กรุณาระบุค่า" }).min(0).optional()
  ) as z.ZodType<number | undefined, z.ZodTypeDef, any>,
  
  noise_areas: z.array(
    z.object({
      location_desc: z.string().min(1, "กรุณาระบุสถานที่/ลักษณะงาน"),
      min_dBA: z.preprocess(
        (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
        z.number({ invalid_type_error: "กรุณาระบุค่า" }).min(0, "ไม่สามารถติดลบได้")
      ) as z.ZodType<number, z.ZodTypeDef, any>,
      max_dBA: z.preprocess(
        (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
        z.number({ invalid_type_error: "กรุณาระบุค่า" }).min(0, "ไม่สามารถติดลบได้")
      ) as z.ZodType<number, z.ZodTypeDef, any>,
      avg_dBA: z.preprocess(
        (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
        z.number({ invalid_type_error: "กรุณาระบุค่า" }).min(0, "ไม่สามารถติดลบได้")
      ) as z.ZodType<number, z.ZodTypeDef, any>,
      remark: z.string().optional(),
    })
  ).optional(),

  // Light specific fields
  light_areas: z.array(
    z.object({
      location_desc: z.string().min(1, "กรุณาระบุสถานที่/ลักษณะงาน"),
      standard_value: z.preprocess(
        (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
        z.number({ invalid_type_error: "กรุณาเลือกมาตรฐาน" }).min(1, "กรุณาเลือกมาตรฐาน")
      ) as z.ZodType<number, z.ZodTypeDef, any>,
      standard_text: z.string().optional(),
      measure: z.preprocess(
        (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
        z.number({ invalid_type_error: "กรุณาระบุค่า Lux" }).min(0, "ไม่สามารถติดลบได้")
      ) as z.ZodType<number, z.ZodTypeDef, any>,
      remark: z.string().optional(),
    })
  ).optional(),
  // Heat specific fields
  heat_areas: z.array(
    z.object({
      location_desc: z.string().min(1, "กรุณาระบุสถานที่/แผนกตรวจวัด"),
      start_time: z.string().min(1, "กรุณาระบุเวลาเริ่มต้น"),
      end_time: z.string().min(1, "กรุณาระบุเวลาสิ้นสุด"),
      db_temp: z.preprocess(
        (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
        z.number().min(0, "ไม่สามารถติดลบได้").optional()
      ) as z.ZodType<number | undefined, z.ZodTypeDef, any>,
      wb_temp: z.preprocess(
        (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
        z.number().min(0, "ไม่สามารถติดลบได้").optional()
      ) as z.ZodType<number | undefined, z.ZodTypeDef, any>,
      gt_temp: z.preprocess(
        (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
        z.number().min(0, "ไม่สามารถติดลบได้").optional()
      ) as z.ZodType<number | undefined, z.ZodTypeDef, any>,
      wbgt_in: z.preprocess(
        (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
        z.number({ invalid_type_error: "กรุณาระบุค่า" }).min(0, "ไม่สามารถติดลบได้").optional()
      ) as z.ZodType<number | undefined, z.ZodTypeDef, any>,
      wbgt_type: z.enum(["in", "out"]).default("in").optional(),
      workload: z.string().min(1, "กรุณาเลือกระดับภาระงาน"),
      wbgt_avg: z.preprocess(
        (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
        z.number({ invalid_type_error: "กรุณาระบุค่า WBGT เฉลี่ย" }).min(0, "ไม่สามารถติดลบได้")
      ) as z.ZodType<number, z.ZodTypeDef, any>,
      standard_value: z.preprocess(
        (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
        z.number({ invalid_type_error: "กรุณาระบุมาตรฐาน" }).min(0, "ไม่สามารถติดลบได้")
      ) as z.ZodType<number, z.ZodTypeDef, any>,
      remark: z.string().optional(),
    }).superRefine((data, ctx) => {
      if (data.start_time && data.end_time) {
        const [startHours, startMinutes] = data.start_time.split(':').map(Number);
        const [endHours, endMinutes] = data.end_time.split(':').map(Number);
        
        const startTotalMinutes = (startHours * 60) + startMinutes;
        const endTotalMinutes = (endHours * 60) + endMinutes;
        
        if (startTotalMinutes >= endTotalMinutes) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น",
            path: ["end_time"],
          });
        }
      }
    })
  ).optional(),
});

export type EnvironmentMeasurementFormValues = z.infer<
  typeof environmentMeasurementSchema
>;

// --- Constants & Standards ---

export const LIGHT_STANDARDS = [
  { value: 50, label: "50 Lux - ทางเดิน/บันได" },
  { value: 100, label: "100 Lux - งานหยาบ/โกดัง" },
  { value: 200, label: "200 Lux - งานปานกลาง" },
  { value: 300, label: "300 Lux - งานละเอียดปานกลาง" },
  { value: 400, label: "400 Lux - งานสำนักงานทั่วไป" },
  { value: 500, label: "500 Lux - งานละเอียด/ห้องตรวจ" },
  { value: 750, label: "750 Lux - งานรายละเอียดมาก" },
  { value: 1000, label: "1000 Lux - งานรายละเอียดพิเศษ/ห้องผ่าตัด" },
];

export const LIGHT_POINT_STANDARDS = [
  { value: 50, display: "50", label: "50 Lux (ทางเดิน/บันได)" },
  { value: 100, display: "100", label: "100 Lux (งานหยาบ/โกดัง)" },
  { value: 200, display: "200", label: "200 Lux (งานปานกลาง)" },
  { value: 300, display: "300", label: "300 Lux (จุดฉีดยา/หัตถการ/งานทั่วไป)" },
  { value: 400, display: "400-500", label: "400-500 Lux (โต๊ะปฏิบัติงานหน้าคอม)" },
  { value: 500, display: "500", label: "500 Lux (งานรายละเอียด/ห้องตรวจ)" },
  { value: 750, display: "750", label: "750 Lux (งานรายละเอียดมาก)" },
  { value: 1000, display: "1000", label: "1000 Lux (ห้องผ่าตัด)" },
];

export const NOISE_STANDARDS = [
  { value: 85, label: "85 dBA - ปฏิบัติงาน 8 ชั่วโมง" },
];

export const HEAT_WORKLOADS = [
  { value: "light", label: "งานเบา" },
  { value: "moderate", label: "งานปานกลาง" },
  { value: "heavy", label: "งานหนัก" },
];

export const HEAT_STANDARDS: Record<string, { value: number; label: string }> = {
  light: { value: 34, label: "34 °C (งานเบา)" },
  moderate: { value: 32, label: "32 °C (งานปานกลาง)" },
  heavy: { value: 30, label: "30 °C (งานหนัก)" },
};

export function getEnvironmentStandards(category: AssessmentCategory) {
  switch (category) {
    case "light":
      return LIGHT_STANDARDS;
    case "noise":
      return NOISE_STANDARDS;
    case "heat":
      return Object.values(HEAT_STANDARDS);
    default:
      return [];
  }
}

// --- Calculation & Evaluation Logic ---

export function calculateAverage(
  m1?: number | string,
  m2?: number | string,
  m3?: number | string,
): number | null {
  const values: number[] = [];
  
  if (m1 !== undefined && m1 !== "" && m1 !== null && !isNaN(Number(m1))) values.push(Number(m1));
  if (m2 !== undefined && m2 !== "" && m2 !== null && !isNaN(Number(m2))) values.push(Number(m2));
  if (m3 !== undefined && m3 !== "" && m3 !== null && !isNaN(Number(m3))) values.push(Number(m3));

  if (values.length === 0) return null;

  const sum = values.reduce((acc, curr) => acc + curr, 0);
  return Number((sum / values.length).toFixed(2));
}

export interface EvaluationResult {
  isPass: boolean;
  score: number;
  message: string;
  calculatedValue: number; // To pass back either average or TWA
}

export function evaluateEnvironmentResult(
  averageOrTwa: number,
  standard: number,
  category: AssessmentCategory,
): EvaluationResult {
  let isPass = false;
  
  if (category === "light") {
    isPass = averageOrTwa >= standard;
  } else if (category === "noise" || category === "heat") {
    isPass = averageOrTwa <= standard;
  }

  let score = 0;
  if (category === "light") {
    score = Math.min(100, Math.round((averageOrTwa / standard) * 100));
  } else {
    score = averageOrTwa > 0 ? Math.round((standard / averageOrTwa) * 100) : 100;
    if (score > 100) score = 100;
  }

  let message = "";
  if (isPass) {
    message =
      category === "light"
        ? "ระดับแสงสว่างเหมาะสมกับการทำงาน ควรรักษาระดับแสงสว่างให้เพียงพออย่างต่อเนื่อง"
        : category === "noise"
        ? "ระดับเสียงอยู่ในเกณฑ์ปลอดภัย ควรรักษาสภาพแวดล้อมให้คงเดิม"
        : "ระดับความร้อนในพื้นที่ทำงานอยู่ในเกณฑ์ปลอดภัย";
  } else {
    message =
      category === "light"
        ? "ระดับแสงสว่างต่ำกว่ามาตรฐาน ควรเพิ่มหลอดไฟหรือจัดแสงสว่างในพื้นที่"
        : category === "noise"
        ? "ระดับเสียงเกินมาตรฐานที่กำหนด ควรจัดหาอุปกรณ์ป้องกันเสียง (PPE) ให้พนักงานหรือลดแหล่งกำเนิดเสียง"
        : "ระดับความร้อนเกินมาตรฐาน ควรจัดเวลาพักหรือเพิ่มการระบายอากาศในพื้นที่ทำงาน";
  }

  return { isPass, score, message, calculatedValue: averageOrTwa };
}
