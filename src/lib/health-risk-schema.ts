import { z } from "zod";

// Schema for the Health Risk Assessment Form (Step 3)
// Enforces that all 10 questions must be answered
export const healthRiskMeasurementSchema = z.object({
  q1: z.string({ required_error: "กรุณาตอบคำถามข้อ 1" }),
  q2: z.string({ required_error: "กรุณาตอบคำถามข้อ 2" }),
  q3: z.string({ required_error: "กรุณาตอบคำถามข้อ 3" }),
  q4: z.string({ required_error: "กรุณาตอบคำถามข้อ 4" }),
  q5: z.string({ required_error: "กรุณาตอบคำถามข้อ 5" }),
  q6: z.string({ required_error: "กรุณาตอบคำถามข้อ 6" }),
  q7: z.string({ required_error: "กรุณาตอบคำถามข้อ 7" }),
  q8: z.string({ required_error: "กรุณาตอบคำถามข้อ 8" }),
  q9: z.string({ required_error: "กรุณาตอบคำถามข้อ 9" }),
  q10: z.string({ required_error: "กรุณาตอบคำถามข้อ 10" }),
});

export type HealthRiskMeasurementFormValues = z.infer<
  typeof healthRiskMeasurementSchema
>;

// Calculate total score based on values 0, 1, 2
export function calculateHealthRiskScore(values: HealthRiskMeasurementFormValues): number {
  const scores = Object.values(values).map(val => Number(val));
  return scores.reduce((sum, current) => sum + current, 0);
}

// Evaluate risk level based on total score
export type HealthRiskLevel = "pass" | "medium" | "high";

export interface HealthRiskEvaluationResult {
  score: number;
  level: HealthRiskLevel;
  levelLabel: string;
  message: string;
  colorClass: string;
}

export function evaluateHealthRiskResult(score: number): HealthRiskEvaluationResult {
  if (score <= 6) {
    return {
      score,
      level: "pass",
      levelLabel: "ระดับปกติ (ผ่าน)",
      message: "ท่านไม่มีความเสี่ยงทางสุขภาพที่เกิดจากสภาพแวดล้อมในการทำงาน ควรดูแลสุขภาพและรักษาสภาพแวดล้อมให้คงเดิม",
      colorClass: "success"
    };
  } else if (score <= 13) {
    return {
      score,
      level: "medium",
      levelLabel: "เสี่ยงปานกลาง",
      message: "ท่านเริ่มมีความเสี่ยงทางสุขภาพ ควรเฝ้าระวังอาการและพิจารณาปรับปรุงสภาพแวดล้อมหรือพฤติกรรมการทำงาน",
      colorClass: "warning"
    };
  } else {
    return {
      score,
      level: "high",
      levelLabel: "เสี่ยงสูง",
      message: "ท่านมีความเสี่ยงทางสุขภาพระดับสูง! ควรปรึกษาแพทย์หรือเจ้าหน้าที่ความปลอดภัย (จป.) เพื่อแก้ไขสภาพแวดล้อมโดยด่วน",
      colorClass: "danger"
    };
  }
}
