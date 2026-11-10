import { z } from "zod";

export const HEALTH_SUPPLEMENT_VERSION = "health-background-2026-11-10";
export const HEALTH_SUPPLEMENT_MISSING = "ไม่ได้เก็บข้อมูลในแบบประเมินรุ่นนี้";
export type HealthSupplementCategory = "light" | "heat" | "noise";
export interface SupplementQuestion {
  id: string;
  text: string;
  multiple?: boolean;
  options: { value: string; label: string }[];
  exclusive?: string[];
  when?: { id: string; value: string };
}
export interface SupplementSection {
  title: string;
  questions: SupplementQuestion[];
}
export interface HealthSupplementDraft {
  answers: Record<string, string | string[]>;
  details: Record<string, string>;
}
const options = (labels: string[]) =>
  labels.map((label, index) => ({
    value:
      label.startsWith("อื่น ๆ") ||
      label.startsWith("โรคอื่น ๆ") ||
      label.startsWith("โรคหรือความผิดปกติอื่น ๆ")
        ? "other"
        : `option-${index + 1}`,
    label,
  }));
const frequency = [
  { value: "never", label: "ไม่เคย" },
  { value: "sometimes", label: "บางครั้ง" },
  { value: "regularly", label: "เป็นประจำ" },
];

// Preserve the advisor's full wording (normalizing PDF spelling/spacing only).
// These questions are background information and never enter healthAnswersSchema.
export const HEALTH_SUPPLEMENT_SECTIONS: Record<
  HealthSupplementCategory,
  SupplementSection[]
> = {
  light: [
    {
      title: "ประวัติสุขภาพและความผิดปกติทางสายตา",
      questions: [
        {
          id: "vision_history",
          text: "ท่านมีประวัติได้รับการวินิจฉัยโรคหรือมีความผิดปกติทางสายตาหรือไม่",
          options: [
            { value: "none", label: "ไม่มี" },
            { value: "yes", label: "มี (สามารถเลือกได้มากกว่า 1 ข้อ)" },
            { value: "unknown", label: "ไม่ทราบ / ไม่เคยตรวจสายตา" },
          ],
        },
        {
          id: "vision_conditions",
          text: "มี (สามารถเลือกได้มากกว่า 1 ข้อ)",
          multiple: true,
          when: { id: "vision_history", value: "yes" },
          options: options([
            "สายตาสั้น",
            "สายตายาว",
            "สายตาเอียง",
            "สายตายาวตามวัย",
            "ตาแห้ง",
            "ต้อกระจก",
            "ต้อหิน",
            "โรคเกี่ยวกับจอประสาทตา",
            "ตาบอดสีหรือความผิดปกติในการมองเห็นสี",
            "อื่น ๆ โปรดระบุ",
          ]),
        },
        {
          id: "visual_aids",
          text: "ปัจจุบันท่านใช้อุปกรณ์ช่วยการมองเห็นหรือป้องกันแสงประเภทใด (เลือกได้มากกว่า 1 ข้อ)",
          multiple: true,
          exclusive: ["none"],
          options: [
            { value: "none", label: "ไม่ใช้" },
            ...options([
              "แว่นสายตา",
              "แว่นกรองแสงสีฟ้า",
              "แว่นกันแดด",
              "แว่นป้องกันแสงสะท้อน",
              "คอนแทคเลนส์",
              "แว่นนิรภัยหรือแว่นป้องกันแสงเฉพาะงาน",
              "อื่น ๆ โปรดระบุ",
            ]),
          ],
        },
        {
          id: "glasses_use",
          text: "ท่านสวมใส่แว่นขณะปฏิบัติงานหรือไม่",
          options: options([
            "ไม่ใช้",
            "ใช้ตลอดเวลาปฏิบัติงาน",
            "ใช้เฉพาะบางกิจกรรม",
            "ใช้เป็นครั้งคราว",
          ]),
        },
        {
          id: "migraine_history",
          text: "ท่านมีประวัติเป็นโรคไมเกรนหรือไม่",
          options: options(["ไม่มี", "มี", "ไม่ทราบ"]),
        },
      ],
    },
    {
      title: "การประเมินด้านอาชีวอนามัย",
      questions: [
        {
          id: "lighting_problems",
          text: "ท่านพบปัญหาสภาพแสงในบริเวณเรียนหรือปฏิบัติงานลักษณะใดบ้าง (เลือกได้มากกว่า 1 ข้อ)",
          multiple: true,
          exclusive: ["none"],
          options: [
            ...options([
              "แสงสว่างไม่เพียงพอ",
              "แสงสว่างมากเกินไป",
              "แสงจ้าหรือแสงสะท้อนเข้าตา",
              "แสงสะท้อนจากจอคอมพิวเตอร์",
              "แสงจากหลอดไฟกะพริบ",
              "แสงสว่างไม่สม่ำเสมอ",
            ]),
            { value: "none", label: "ไม่มีปัญหา" },
            { value: "other", label: "อื่น ๆ โปรดระบุ" },
          ],
        },
        {
          id: "vision_work_relation",
          text: "อาการผิดปกติทางสายตาของท่านเกิดขึ้นหรือรุนแรงขึ้นขณะปฏิบัติงานหรือไม่",
          options: options([
            "ไม่เกิด",
            "เกิดเฉพาะขณะปฏิบัติงาน",
            "เกิดทั้งในและนอกเวลาปฏิบัติงาน",
            "ไม่แน่ใจ",
          ]),
        },
        {
          id: "vision_rest_recovery",
          text: "อาการดังกล่าวดีขึ้นเมื่อหยุดพักหรือออกจากบริเวณที่ปฏิบัติงานหรือไม่",
          options: options(["ดีขึ้น", "ไม่ดีขึ้น", "ไม่มีอาการ", "ไม่แน่ใจ"]),
        },
      ],
    },
  ],
  heat: [
    {
      title: "ประวัติสุขภาพที่เกี่ยวข้องกับความร้อน",
      questions: [
        {
          id: "heat_conditions",
          text: "ท่านมีโรคประจำตัวที่ได้รับการวินิจฉัยจากแพทย์หรือไม่ (เลือกได้มากกว่า 1 ข้อ)",
          multiple: true,
          exclusive: ["none", "unknown"],
          options: [
            { value: "none", label: "ไม่มี" },
            ...options([
              "โรคความดันโลหิตสูง",
              "โรคหัวใจและหลอดเลือด",
              "โรคเบาหวาน",
              "โรคไต",
              "โรคต่อมไทรอยด์",
              "โรคผิวหนังที่มีผลต่อการขับเหงื่อ",
              "โรคอื่น ๆ โปรดระบุ",
            ]),
            { value: "unknown", label: "ไม่ทราบ" },
          ],
        },
        {
          id: "heat_illness_history",
          text: "ท่านเคยเจ็บป่วยเนื่องจากการสัมผัสความร้อนหรือไม่",
          multiple: true,
          exclusive: ["never", "unsure"],
          options: [
            { value: "never", label: "ไม่เคย" },
            ...options([
              "เคยมีอาการอ่อนเพลียจากความร้อน",
              "เคยเป็นตะคริวจากความร้อน",
              "เคยเป็นลมขณะอยู่ในที่ร้อน",
              "เคยได้รับการวินิจฉัยว่าเป็นโรคลมร้อน (Heat Stroke)",
            ]),
            { value: "unsure", label: "ไม่แน่ใจ" },
          ],
        },
      ],
    },
    {
      title: "พฤติกรรมการป้องกันอันตรายจากความร้อน",
      questions: [
        {
          id: "water_drinking",
          text: "ขณะปฏิบัติงานหรือเรียนในบริเวณที่มีความร้อน ท่านดื่มน้ำบ่อยเพียงใด",
          options: options([
            "ดื่มเป็นระยะอย่างสม่ำเสมอ",
            "ดื่มเมื่อรู้สึกกระหายน้ำ",
            "ดื่มน้อยมาก",
            "ไม่แน่นอน",
          ]),
        },
        {
          id: "cool_rest_access",
          text: "ท่านมีโอกาสพักในบริเวณที่เย็นหรือมีอากาศถ่ายเทระหว่างการทำงานหรือเรียนหรือไม่",
          options: options(["มีอย่างเพียงพอ", "มีแต่ไม่เพียงพอ", "ไม่มี"]),
        },
      ],
    },
  ],
  noise: [
    {
      title: "ประวัติสุขภาพของหูและการได้ยิน",
      questions: [
        {
          id: "hearing_conditions",
          text: "ท่านมีประวัติได้รับการวินิจฉัยโรคหรือความผิดปกติเกี่ยวกับหูและการได้ยินหรือไม่",
          multiple: true,
          exclusive: ["none", "unknown"],
          options: [
            { value: "none", label: "ไม่มี" },
            ...options([
              "โรคหูชั้นกลางอักเสบ",
              "โรคเยื่อแก้วหูทะลุ",
              "โรคประสาทหูเสื่อม",
              "ภาวะสูญเสียการได้ยิน",
              "โรคน้ำในหูไม่เท่ากัน",
              "โรคหรือความผิดปกติอื่น ๆ โปรดระบุ",
            ]),
            { value: "unknown", label: "ไม่ทราบ / ไม่เคยตรวจ" },
          ],
        },
        {
          id: "audiometry_history",
          text: "ท่านเคยได้รับการตรวจสมรรถภาพการได้ยิน (Audiometry) หรือไม่",
          options: options([
            "ไม่เคย",
            "เคย ผลปกติ",
            "เคย ผลพบความผิดปกติ",
            "เคย แต่จำผลไม่ได้",
          ]),
        },
      ],
    },
    {
      title: "อาการผิดปกติ",
      questions: [
        {
          id: "tinnitus",
          text: "ท่านมีอาการได้ยินเสียงดังในหู เช่น เสียงวิ้ง เสียงหึ่ง หรือเสียงหวีด ทั้งที่ไม่มีแหล่งเสียงภายนอกหรือไม่",
          options: frequency,
        },
        {
          id: "persistent_hearing_loss",
          text: "ท่านมีความรู้สึกว่าการได้ยินลดลงอย่างต่อเนื่อง หรือได้ยินไม่ชัดแม้อยู่ในบริเวณที่ไม่มีเสียงรบกวนหรือไม่",
          options: frequency,
        },
        {
          id: "noise_recovery",
          text: "เมื่อท่านออกจากบริเวณที่มีเสียงดัง อาการผิดปกติที่เกิดขึ้นลดลงหรือหายไปหรือไม่",
          options: options([
            "ไม่มีอาการ",
            "อาการดีขึ้นหรือหายไป",
            "อาการไม่ดีขึ้น",
            "ไม่แน่ใจ",
          ]),
        },
      ],
    },
    {
      title: "การสัมผัสเสียงและการป้องกัน",
      questions: [
        {
          id: "noise_exposure_duration",
          text: "โดยเฉลี่ยท่านอยู่ในบริเวณที่มีเสียงดังรบกวนนานเท่าใดต่อวัน",
          options: options([
            "น้อยกว่า 1 ชั่วโมง",
            "1–2 ชั่วโมง",
            "มากกว่า 2–4 ชั่วโมง",
            "มากกว่า 4–8 ชั่วโมง",
            "มากกว่า 8 ชั่วโมง",
            "ไม่ได้สัมผัสเสียงดังรบกวน",
          ]),
        },
      ],
    },
  ],
};

export const healthSupplementDraftSchema = z
  .object({
    answers: z.record(z.union([z.string(), z.array(z.string())])),
    details: z.record(z.string().max(2000)),
  })
  .strict();

export function supplementQuestionVisible(
  q: SupplementQuestion,
  draft: HealthSupplementDraft,
) {
  return !q.when || draft.answers[q.when.id] === q.when.value;
}

export function toggleSupplementChoice(
  q: SupplementQuestion,
  values: string[],
  value: string,
) {
  if (values.includes(value)) return values.filter((v) => v !== value);
  if (q.exclusive?.includes(value)) return [value];
  return [...values.filter((v) => !q.exclusive?.includes(v)), value];
}

export function changeSupplementAnswer(
  category: HealthSupplementCategory,
  draft: HealthSupplementDraft,
  id: string,
  value: string | string[],
): HealthSupplementDraft {
  const next = {
    answers: { ...draft.answers, [id]: value },
    details: { ...draft.details },
  };
  for (const q of HEALTH_SUPPLEMENT_SECTIONS[category].flatMap(
    (s) => s.questions,
  )) {
    if (!supplementQuestionVisible(q, next)) {
      delete next.answers[q.id];
      delete next.details[q.id];
    } else if (![next.answers[q.id]].flat().includes("other")) {
      delete next.details[q.id];
    }
  }
  return next;
}

export function healthSupplementSchema(category: HealthSupplementCategory) {
  return healthSupplementDraftSchema
    .extend({
      version: z.literal(HEALTH_SUPPLEMENT_VERSION),
      category: z.literal(category),
    })
    .strict()
    .superRefine((v, ctx) => {
      const questions = HEALTH_SUPPLEMENT_SECTIONS[category].flatMap(
        (s) => s.questions,
      );
      const known = new Set(questions.map((q) => q.id));
      for (const id of [...Object.keys(v.answers), ...Object.keys(v.details)]) {
        if (!known.has(id))
          ctx.addIssue({
            code: "custom",
            path: ["answers", id],
            message: "ไม่พบคำถามนี้ในแบบประเมิน",
          });
      }
      for (const q of questions) {
        const answer = v.answers[q.id];
        const values = answer === undefined ? [] : [answer].flat();
        const issue = (message: string) =>
          ctx.addIssue({ code: "custom", path: ["answers", q.id], message });
        if (!supplementQuestionVisible(q, v)) {
          if (answer !== undefined || v.details[q.id] !== undefined)
            issue("คำถามนี้ไม่เกี่ยวข้องกับคำตอบที่เลือก");
          continue;
        }
        if (
          !values.length ||
          (q.multiple ? !Array.isArray(answer) : typeof answer !== "string")
        ) {
          issue("กรุณาเลือกคำตอบ");
          continue;
        }
        if (
          new Set(values).size !== values.length ||
          values.some((a) => !q.options.some((o) => o.value === a))
        )
          issue("กรุณาเลือกคำตอบที่ถูกต้อง");
        if (values.length > 1 && values.some((a) => q.exclusive?.includes(a)))
          issue("คำตอบที่เลือกขัดแย้งกัน");
        if (values.includes("other")) {
          if (!v.details[q.id]?.trim())
            ctx.addIssue({
              code: "custom",
              path: ["details", q.id],
              message: "กรุณาระบุรายละเอียดอื่น ๆ",
            });
        } else if (v.details[q.id] !== undefined)
          issue("รายละเอียดอื่น ๆ ไม่เกี่ยวข้องกับคำตอบที่เลือก");
      }
    });
}

export function healthSupplementInput(
  category: HealthSupplementCategory,
  draft: HealthSupplementDraft,
) {
  return { version: HEALTH_SUPPLEMENT_VERSION, category, ...draft };
}

export function healthSupplementRows(
  category: HealthSupplementCategory,
  input: unknown,
  sections = HEALTH_SUPPLEMENT_SECTIONS[category],
) {
  const parsed = healthSupplementDraftSchema.safeParse(
    input && typeof input === "object"
      ? {
          answers: (input as Record<string, unknown>).answers,
          details: (input as Record<string, unknown>).details,
        }
      : undefined,
  );
  const draft = parsed.success ? parsed.data : undefined;
  return sections.flatMap((section) =>
    section.questions.map((q) => {
      const answer = draft?.answers[q.id];
      const values = answer === undefined ? [] : [answer].flat();
      return {
        section: section.title,
        id: q.id,
        question: q.text,
        answer: !draft
          ? HEALTH_SUPPLEMENT_MISSING
          : !supplementQuestionVisible(q, draft)
            ? "ไม่เกี่ยวข้อง"
            : !values.length
              ? "ไม่ได้ระบุ"
              : values
                  .map((v) => {
                    const label =
                      q.options.find((o) => o.value === v)?.label ?? v;
                    return v === "other" && draft.details[q.id]
                      ? `${label}: ${draft.details[q.id]}`
                      : label;
                  })
                  .join("; "),
      };
    }),
  );
}
