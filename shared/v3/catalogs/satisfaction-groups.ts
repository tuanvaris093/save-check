import {
  SATISFACTION_QUESTIONS,
  type SatisfactionCategoryData,
} from "./satisfaction-data";
export type SatisfactionGroup = "environment" | "health";
export const SATISFACTION_VERSIONS = {
  environment: "satisfaction-environment-v3-2026-10-12-r2",
  health: "satisfaction-health-v3-2026-10-12-r2",
} as const;
const headings = [
  { key: "accuracy", label: "ด้านเนื้อหาของแอปพลิเคชัน (Content)" },
  { key: "design", label: "ด้านการออกแบบของแอปพลิเคชัน (Design)" },
  { key: "usability", label: "ด้านการใช้งานของแอปพลิเคชัน (Usability)" },
  { key: "usefulness", label: "ด้านประโยชน์ของแอปพลิเคชัน (Usefulness)" },
] as const;
const texts: Record<SatisfactionGroup, string[]> = {
  environment: [
    "เนื้อหาเกี่ยวกับการประเมินสภาพแวดล้อมในการทำงานด้านกายภาพในแอปพลิเคชันมีความถูกต้อง ครบถ้วน",
    "เนื้อหาของแบบประเมินมีความน่าเชื่อถือและครอบคลุมสภาพแวดล้อมในการทำงานด้านกายภาพที่ต้องการประเมิน ได้แก่ แสงสว่าง เสียง และความร้อน",
    "การใช้ภาษาและถ้อยคำในการสื่อสารมีความชัดเจนและเข้าใจง่าย",
    "เกณฑ์การประเมินและการแปลผลมีความชัดเจนและเหมาะสม",
    "การจัดวางองค์ประกอบเมนูและปุ่มต่างๆ มีความเป็นระเบียบและเหมาะสม",
    "การจัดรูปแบบตัวอักษร ขนาด และสีของหน้าจอของแอปพลิเคชันมีความชัดเจน อ่านได้ง่าย",
    "แอปพลิเคชันสามารถแสดงผลและตอบสนองการใช้งานได้อย่างรวดเร็ว",
    "แอปพลิเคชันมีการออกแบบที่สวยงามและเหมาะกับกลุ่มผู้ใช้งาน",
    "แอปพลิเคชันมีการจัดลำดับขั้นตอนการใช้งานที่ต่อเนื่อง เข้าใจง่ายและไม่ซับซ้อน",
    "การประมวลผลและการเข้าถึงข้อมูลภายในแอปพลิเคชันมีความรวดเร็ว",
    "สามารถใช้งานได้ดีทั้งในโทรศัพท์มือถือและอุปกรณ์อิเล็กทรอนิกส์อื่น ๆ",
    "แอปพลิเคชันสามารถแสดงผลการประเมินได้อย่างถูกต้องและชัดเจน",
    "แอปพลิเคชันช่วยให้การประเมินสภาพแวดล้อมในการทำงานด้านกายภาพสะดวกมากขึ้น",
    "แอปพลิเคชันช่วยลดระยะเวลาในการเก็บข้อมูลและประเมินสภาพแวดล้อมในการทำงานด้านกายภาพ",
    "แอปพลิเคชันช่วยให้สามารถทราบผลการประเมินได้อย่างรวดเร็ว",
    "แอปพลิเคชันสามารถนำไปใช้เป็นเครื่องมือในการประเมินสภาพแวดล้อมในการทำงานด้านกายภาพได้",
  ],
  health: [
    "เนื้อหาเกี่ยวกับการประเมินอาการทางสุขภาพด้านกายภาพในแอปพลิเคชันมีความถูกต้องและเหมาะสม",
    "เนื้อหาของแบบประเมินครอบคลุมอาการทางสุขภาพที่เกี่ยวข้องกับแสงสว่าง เสียง และความร้อน",
    "การใช้ภาษาและถ้อยคำในการสื่อสารเกี่ยวกับอาการทางสุขภาพมีความชัดเจนและเข้าใจง่าย",
    "เกณฑ์การประเมินและการแปลผลมีความชัดเจนและเหมาะสม",
    "การจัดวางองค์ประกอบเมนูและปุ่มต่างๆ มีความเป็นระเบียบและเหมาะสม",
    "การจัดรูปแบบตัวอักษร ขนาด และสีของหน้าจอของแอปพลิเคชันมีความชัดเจน อ่านง่าย",
    "การนำเสนอคำถามอาการทางสุขภาพและผลการประเมินมีรูปแบบที่เหมาะสม",
    "แอปพลิเคชันมีการออกแบบที่สวยงามและเหมาะกับกลุ่มผู้ใช้งาน",
    "แอปพลิเคชันมีการจัดลำดับขั้นตอนการใช้งานที่ต่อเนื่อง เข้าใจง่ายและไม่ซับซ้อน",
    "แอปพลิเคชันสามารถประมวลผลข้อมูลและแสดงผลได้อย่างรวดเร็ว",
    "แอปพลิเคชันสามารถใช้งานบนโทรศัพท์มือถือและอุปกรณ์อิเล็กทรอนิกส์อื่น ๆ ได้เป็นอย่างดี",
    "แอปพลิเคชันสามารถแสดงผลการประเมินได้อย่างถูกต้องและชัดเจน",
    "แอปพลิเคชันช่วยให้ผู้ใช้งานสามารถประเมินอาการทางสุขภาพของตนเองได้สะดวก",
    "แอปพลิเคชันช่วยลดระยะเวลาในการประเมินอาการทางสุขภาพ",
    "แอปพลิเคชันช่วยให้ผู้ใช้งานทราบผลการประเมินอาการทางสุขภาพด้านกายภาพเบื้องต้นของตนเองได้",
    "แอปพลิเคชันสามารถนำไปใช้ในการประเมินอาการทางสุขภาพด้านกายภาพได้",
  ],
};
export const SATISFACTION_QUESTIONS_BY_GROUP: Record<
  SatisfactionGroup,
  SatisfactionCategoryData[]
> = Object.fromEntries(
  (["environment", "health"] as const).map((group) => [
    group,
    headings.map((heading, i) => ({
      ...heading,
      questions: texts[group]
        .slice(i * 4, i * 4 + 4)
        .map((text, j) => ({ id: `q${i * 4 + j + 1}`, text })),
    })),
  ]),
) as Record<SatisfactionGroup, SatisfactionCategoryData[]>;
export function getSatisfactionQuestions(group: SatisfactionGroup) {
  return SATISFACTION_QUESTIONS_BY_GROUP[group];
}
export function satisfactionQuestionnaireVersion(group: SatisfactionGroup) {
  return SATISFACTION_VERSIONS[group];
}
export function satisfactionQuestionSnapshots(group: SatisfactionGroup) {
  return getSatisfactionQuestions(group).flatMap((category) =>
    category.questions.map((q) => ({
      ...q,
      category: category.key,
      category_label: category.label,
      version: satisfactionQuestionnaireVersion(group),
    })),
  );
}
export function satisfactionQuestionsForResult(data: {
  schema_version?: unknown;
  resolved?: unknown;
}): SatisfactionCategoryData[] {
  if (data.schema_version !== 3) return SATISFACTION_QUESTIONS;
  const resolved = data.resolved as
    | {
        questions?: {
          id: string;
          text: string;
          category: string;
          category_label?: string;
        }[];
      }
    | undefined;
  if (!Array.isArray(resolved?.questions)) return [];
  return SATISFACTION_QUESTIONS.map((category) => ({
    key: category.key,
    label:
      resolved.questions!.find((q) => q.category === category.key)
        ?.category_label ?? category.label,
    questions: resolved
      .questions!.filter((q) => q.category === category.key)
      .map((q) => ({ id: q.id, text: q.text })),
  }));
}
