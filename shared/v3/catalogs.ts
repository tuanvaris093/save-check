import programs from "./catalogs/programs.json";
import questionnaire from "./catalogs/health-questionnaire.json";

export const SCHEMA_VERSION = 3 as const;
export const SCORING_VERSION = "safecheck-v3-2026-10-12";
export const QUESTIONNAIRE_VERSION = questionnaire.version;
export const PROGRAM_VERSION = programs.version;
export const PROGRAMS = programs.programs;
export const STUDY_YEARS = [1, 2, 3, 4, 5, 6] as const;
export const HEALTH_QUESTIONS = questionnaire;
export const NOISE_SOURCES = [
  "announcement",
  "college_activity",
  "air_conditioner",
  "laboratory",
  "machine",
  "traffic",
  "construction",
  "other",
  "none",
] as const;
export const STANDARD_VERSIONS = {
  light: "lighting-2561-v1",
  noise: "sound-2560-v1",
  heat: "heat-2559-v1",
} as const;

// Table 1: threshold pair belongs to one area, never to a global average.
export const LIGHT_AREA_STANDARDS = [
  {
    code: "area-emergency",
    label: "ทางสัญจรฉุกเฉิน",
    averageMin: 10,
    pointMin: null,
  },
  {
    code: "area-outdoor-circulation",
    label: "ลานจอดรถ/ทางเดิน/บันไดภายนอก",
    averageMin: 50,
    pointMin: 25,
  },
  {
    code: "area-main-entrance",
    label: "ประตูทางเข้าใหญ่",
    averageMin: 50,
    pointMin: null,
  },
  {
    code: "area-indoor-circulation",
    label: "ทางเดิน/บันได/ทางเข้าห้องโถงภายใน",
    averageMin: 100,
    pointMin: 50,
  },
  { code: "area-lift", label: "ลิฟท์", averageMin: 100, pointMin: null },
  {
    code: "area-rest",
    label: "ห้องพักฟื้น/ห้องพักผ่อน",
    averageMin: 50,
    pointMin: 25,
  },
  { code: "area-guard", label: "ป้อมยาม", averageMin: 100, pointMin: null },
  {
    code: "area-amenities",
    label: "ห้องสุขา/อาบน้ำ/เปลี่ยนเสื้อผ้า/ต้อนรับ/เก็บของ",
    averageMin: 100,
    pointMin: 50,
  },
  {
    code: "area-food-clinic",
    label: "โรงอาหาร/ห้องปรุงอาหาร/ห้องตรวจรักษา",
    averageMin: 300,
    pointMin: 150,
  },
  {
    code: "area-office",
    label:
      "สำนักงาน/ฝึกอบรม/บรรยาย/สืบค้นเอกสาร/ถ่ายเอกสาร/คอมพิวเตอร์/ประชุม/ประชาสัมพันธ์/ออกแบบเขียนแบบ",
    averageMin: 300,
    pointMin: 150,
  },
  {
    code: "area-storage-laundry",
    label: "เก็บวัตถุดิบ/ห้องอบโรงซักรีด",
    averageMin: 100,
    pointMin: 50,
  },
  {
    code: "area-loading-control",
    label: "ขนถ่ายสินค้า/คลังสินค้า/โกดัง/หม้อน้ำ/ห้องควบคุม/ห้องสวิตซ์",
    averageMin: 200,
    pointMin: 100,
  },
  {
    code: "area-production",
    label: "เตรียมการผลิต/บรรจุภัณฑ์/เครื่องจักร/ก่อสร้าง/ขุดเจาะ/ทาสี",
    averageMin: 300,
    pointMin: 150,
  },
] as const;
// Table 2: code distinguishes work description as well as threshold range.
export const LIGHT_SPOT_STANDARDS = [
  {
    code: "spot-coarse",
    label: "งานหยาบ ชิ้นงานใหญ่กว่า 750 ไมโครเมตร/ซักรีด/งานตีเชื่อม",
    min: 200,
    max: 300,
  },
  {
    code: "spot-slight-detail",
    label:
      "งานละเอียดเล็กน้อย รับจ่ายเสื้อผ้า/บันทึกคัดลอกข้อมูล/เตรียมปรุงอาหาร",
    min: 300,
    max: 400,
  },
  {
    code: "spot-office",
    label:
      "งานสำนักงาน/ออกแบบเขียนแบบด้วยคอมพิวเตอร์/ชิ้นงานตั้งแต่ 125 ไมโครเมตร",
    min: 400,
    max: 500,
  },
  {
    code: "spot-medium-detail",
    label: "งานละเอียดปานกลาง ระบายพ่นสี/พิสูจน์อักษร/ตรวจสอบขั้นสุดท้าย",
    min: 500,
    max: 600,
  },
  {
    code: "spot-manual-design",
    label: "ออกแบบเขียนแบบไม่ใช้คอมพิวเตอร์/ตรวจสอบอาหาร/คัดเกรดน้ำตาล",
    min: 600,
    max: 700,
  },
  {
    code: "spot-high-detail",
    label: "งานละเอียดสูง ชิ้นงานตั้งแต่ 25 ไมโครเมตร/ปรับเทียบอุปกรณ์/ย้อมสี",
    min: 700,
    max: 800,
  },
  {
    code: "spot-textile-detail",
    label: "ตรวจตัดเย็บเสื้อผ้าด้วยมือ/เทียบสี/ทอผ้าสีเข้ม",
    min: 800,
    max: 1200,
  },
  {
    code: "spot-very-high-detail",
    label:
      "งานละเอียดสูงมาก ชิ้นงานเล็กกว่า 25 ไมโครเมตร/ซ่อมแซมตรวจตกแต่งสิ่งทอ",
    min: 1200,
    max: 1600,
  },
  {
    code: "spot-special-detail",
    label: "งานละเอียดสูงมากเป็นพิเศษ/เจียระไน/นาฬิกา/ทันตกรรม/ห้องผ่าตัด",
    min: 2400,
    max: null,
  },
] as const;
export function surroundingStandard(targetLux: number) {
  if (targetLux < 1000) return null;
  if (targetLux <= 2000) return { near: 300, outer: 200 };
  if (targetLux <= 5000) return { near: 600, outer: 300 };
  if (targetLux <= 10000) return { near: 1000, outer: 400 };
  return { near: 2000, outer: 600 };
}
export const NOISE_DURATION_TABLE = [
  [82, 960],
  [83, 762],
  [84, 605],
  [85, 480],
  [86, 381],
  [87, 302],
  [88, 240],
  [89, 191],
  [90, 151],
  [91, 120],
  [92, 95],
  [93, 76],
  [94, 60],
  [95, 48],
  [96, 38],
  [97, 30],
  [98, 24],
  [99, 19],
  [100, 15],
  [101, 12],
  [102, 9],
  [103, 7.5],
  [104, 6],
  [105, 5],
  [106, 4],
  [107, 3],
  [108, 2.5],
  [109, 2],
  [110, 1.5],
  [111, 1],
] as const;
export const HEAT_LIMITS = { light: 34, moderate: 32, heavy: 30 } as const;
export const STANDARD_DOCUMENTS = {
  light: {
    file: "lighting-std-2561.pdf",
    public_file: "lighting-std-2561.pdf",
    title: "มาตรฐานความเข้มของแสงสว่าง",
    tables: [1, 2, 3],
  },
  noise: {
    file: "sound-standard-2560.pdf",
    public_file: "sound-standard-2560.pdf",
    title: "มาตรฐานระดับเสียง",
    table: "ตารางแนบท้าย",
  },
  heat: {
    file: "มาตรฐานความร้อน.pdf",
    public_file: "heat-standard-2559.pdf",
    title: "มาตรฐานความร้อน",
    clauses: [1, 2],
  },
} as const;

/** Resolve immutable labels on the server; never accept a submitted label as truth. */
export function programSnapshot(code: string) {
  if (code === "not_applicable")
    return { code, label: null, qualification: null, version: PROGRAM_VERSION };
  const program = PROGRAMS.find((p) => p.code === code);
  if (!program) throw new Error("Unknown program code");
  return { ...program, version: PROGRAM_VERSION };
}
export function questionSnapshots(
  category: "light" | "noise" | "heat",
  phase: "before" | "after" | "single",
) {
  if (category === "light") {
    if (phase === "single")
      throw new Error("แบบประเมินแสงต้องมีคำตอบก่อนและหลัง");
    return HEALTH_QUESTIONS.light.map((q) => ({
      question_id: q.id,
      text: phase === "before" ? q.beforeText : q.afterText,
      phase,
      version: QUESTIONNAIRE_VERSION,
    }));
  }
  if (phase !== "single") throw new Error("Noise/heat use single phase");
  return HEALTH_QUESTIONS[category].map((q) => ({
    question_id: q.id,
    text: q.text,
    phase,
    version: QUESTIONNAIRE_VERSION,
  }));
}
