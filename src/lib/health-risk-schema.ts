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

import type { AssessmentCategory } from "@/types";

// Evaluate risk level based on total score
export type HealthRiskLevel = "pass" | "medium" | "high";

export interface HealthRiskEvaluationResult {
  score: number;
  level: HealthRiskLevel;
  levelLabel: string;
  message: string;
  colorClass: string;
  recommendations: string[];
}

export const HEALTH_RISK_RECOMMENDATIONS: Record<
  "light" | "noise" | "heat",
  Record<HealthRiskLevel, string[]>
> = {
  light: {
    pass: [
      "คงมาตรการดูแลรักษาระบบไฟส่องสว่างในห้องเรียน ห้องปฏิบัติการ และสำนักงานอย่างสม่ำเสมอ เช่น ทำความสะอาดโคมไฟ เปลี่ยนหลอดไฟตามรอบ",
      "ตรวจวัดความเข้มแสงซ้ำเป็นระยะ (อย่างน้อยปีละ 1 ครั้ง) เพื่อเฝ้าระวังการเปลี่ยนแปลง",
    ],
    medium: [
      "เพิ่มจุดกำเนิดแสงเฉพาะจุด (Local/Task lighting) ในบริเวณที่ต้องใช้สายตาละเอียด เช่น โต๊ะปฏิบัติการ มุมอ่านหนังสือ",
      "ปรับตำแหน่งโต๊ะเรียน/โต๊ะทำงานให้สัมพันธ์กับทิศทางแสง ลดเงาบดบัง",
      "ให้ความรู้บุคลากรและนักศึกษาเรื่องการพักสายตาเป็นระยะ (กฎ 20-20-20) โดยเฉพาะช่วงใช้หน้าจอคอมพิวเตอร์นาน (ทุกๆ 20 นาที ให้ละสายตาออกจากหน้าจอ, มองไปไกล 20 ฟุต: มองออกไปที่วัตถุหรือจุดที่อยู่ห่างประมาณ 20 ฟุต, พักสายตามองไกลค้างไว้แบบนั้นอย่างน้อย 20 วินาที)",
    ],
    high: [
      "ดำเนินการปรับปรุงระบบไฟส่องสว่างทันที เช่น เพิ่มจำนวนดวงโคม เปลี่ยนชนิดหลอดไฟให้มีค่าความสว่างสูงขึ้น",
      "จัดหาอุปกรณ์ป้องกันแสงจ้าเกินไป เช่น ม่านกรองแสง",
      "เฝ้าระวังสุขภาพสายตาผู้ที่ปฏิบัติงาน/เรียนในพื้นที่เสี่ยงเป็นเวลานาน (ตรวจสายตาประจำปี)",
      "พิจารณาหยุดใช้พื้นที่ทำงานชั่วคราวหากกระทบต่อความปลอดภัยในการมองเห็น",
    ],
  },
  noise: {
    pass: [
      "คงการตรวจวัดระดับเสียงเป็นประจำ (อย่างน้อยปีละ 1 ครั้ง) โดยเฉพาะบริเวณที่มีเครื่องจักร",
      "ตรวจสอบสภาพอุปกรณ์ให้อยู่ในสภาพดี ลดการเกิดเสียงผิดปกติ",
    ],
    medium: [
      "จัดให้มีอุปกรณ์ป้องกันเสียง (Ear plug/Ear muff) สำหรับผู้ปฏิบัติงาน/ฝึกปฏิบัติในพื้นที่เสียงดัง",
      "ติดป้ายเตือน \"พื้นที่เสียงดัง\" บริเวณที่มีความเสี่ยง",
      "พิจารณาบำรุงรักษาเครื่องจักรเพื่อลดเสียงดัง (หล่อลื่น เปลี่ยนอะไหล่ที่สึกหรอ)",
      "จัดโปรแกรมตรวจสมรรถภาพการได้ยิน (Audiometric Test) ให้พนักงานกลุ่มเสี่ยง",
    ],
    high: [
      "บังคับใช้มาตรการสวมอุปกรณ์ป้องกันเสียงอย่างเข้มงวด พร้อมอบรมวิธีใช้ที่ถูกต้อง",
      "ดำเนินการควบคุมทางวิศวกรรม เช่น ติดตั้งฉนวนกันเสียง ผนังกั้นเสียง หรือแยกแหล่งกำเนิดเสียง",
      "จำกัดเวลาสัมผัสเสียงดัง (Job Rotation) และตรวจการได้ยินอย่างน้อยปีละ 1 ครั้งและติดตามผลต่อเนื่อง",
      "พิจารณาจัดทำโครงการอนุรักษ์การได้ยิน (Hearing Conservation Program) อย่างเป็นระบบ",
    ],
  },
  heat: {
    pass: [
      "คงการตรวจวัดอุณหภูมิ/ค่า WBGT เป็นระยะตามความเหมาะสม",
      "ดูแลระบบระบายอากาศ/เครื่องปรับอากาศให้ทำงานปกติ",
    ],
    medium: [
      "จัดให้มีน้ำดื่มสะอาดเพียงพอในพื้นที่ทำงาน และกระตุ้นให้ดื่มน้ำสม่ำเสมอ",
      "เพิ่มการระบายอากาศในพื้นที่ที่มีความร้อนสะสม",
      "จัดเวลาพักที่เหมาะสมระหว่างการเรียน ปฏิบัติงาน หรือกิจกรรมกลางแจ้ง",
    ],
    high: [
      "ดำเนินการควบคุมทางวิศวกรรมทันที เช่น ติดตั้งระบบระบายความร้อน ฉนวนกันความร้อน",
      "จัดตารางเรียน-งาน-กิจกรรมกลางแจ้งให้เหมาะสมกับสภาพอากาศ ให้มีความปลอดภัย",
      "เฝ้าระวังสุขภาพพนักงานกลุ่มเสี่ยงอย่างใกล้ชิด (ผู้มีโรคประจำตัว หญิงตั้งครรภ์ ผู้สูงอายุ) และจัดให้มีระบบเฝ้าสังเกตอาการ Heat Stress/Heat Stroke",
    ],
  },
};

export function evaluateHealthRiskResult(
  score: number,
  category?: AssessmentCategory
): HealthRiskEvaluationResult {
  let level: HealthRiskLevel = "pass";
  let levelLabel = "ระดับปกติ (ผ่านมาตรฐาน)";
  let message =
    "ท่านไม่มีความเสี่ยงทางสุขภาพที่เกิดจากสภาพแวดล้อมในการทำงาน ควรดูแลสุขภาพและรักษาสภาพแวดล้อมให้คงเดิม";
  let colorClass = "success";

  if (score <= 6) {
    level = "pass";
    levelLabel = "ระดับปกติ (ผ่านมาตรฐาน)";
    message =
      "ท่านไม่มีความเสี่ยงทางสุขภาพที่เกิดจากสภาพแวดล้อมในการทำงาน ควรดูแลสุขภาพและรักษาสภาพแวดล้อมให้คงเดิม";
    colorClass = "success";
  } else if (score <= 13) {
    level = "medium";
    levelLabel = "ระดับเสี่ยงปานกลาง";
    message =
      "ท่านเริ่มมีความเสี่ยงทางสุขภาพ ควรเฝ้าระวังอาการและพิจารณาปรับปรุงสภาพแวดล้อมหรือพฤติกรรมการทำงาน";
    colorClass = "warning";
  } else {
    level = "high";
    levelLabel = "ระดับเสี่ยงสูง";
    message =
      "ท่านมีความเสี่ยงทางสุขภาพระดับสูง! ควรปรึกษาแพทย์หรือเจ้าหน้าที่ความปลอดภัย (จป.) เพื่อแก้ไขสภาพแวดล้อมโดยด่วน";
    colorClass = "danger";
  }

  const validCategory =
    category === "light" || category === "noise" || category === "heat"
      ? category
      : null;

  const recommendations = validCategory
    ? HEALTH_RISK_RECOMMENDATIONS[validCategory][level]
    : [];

  return {
    score,
    level,
    levelLabel,
    message,
    colorClass,
    recommendations,
  };
}
