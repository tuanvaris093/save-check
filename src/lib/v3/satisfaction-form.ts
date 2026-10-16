import { z } from "zod";
import {
  satisfactionQuestionnaireVersion,
  satisfactionAnswersSchema,
  satisfactionWorkSchema,
  durationSchema,
  validateSubmission,
  type CreateSubmissionV3,
  type SatisfactionGroup,
} from "../../../shared/v3";
export const SATISFACTION_FORM_VERSION = "satisfaction-form-v3-p6-2026-10-14";
const value = z.union([z.string(), z.number().finite()]);
export const durationDraftSchema = z
  .object({ days: value, hours: value, minutes: value, seconds: value })
  .strict();
export const satisfactionDraftSchema = z
  .object({
    form_version: z.literal(SATISFACTION_FORM_VERSION),
    questionnaire_version: z.string(),
    full_name: z.string(),
    work: z
      .object({
        position_type: z
          .enum(["", "staff", "student", "faculty", "other"])
          .optional(),
        other_context: z.enum(["", "study", "work"]).optional(),
        program_code: z.string().optional(),
        study_year: value.optional(),
      })
      .strict(),
    answers: satisfactionAnswersSchema.partial(),
    suggestion: z.string(),
    durations: z
      .object({
        traditional: durationDraftSchema,
        safecheck: durationDraftSchema,
      })
      .strict(),
    reason: z.string(),
    expected_data_version: z.number().int().positive().optional(),
  })
  .strict();
export type SatisfactionDraft = z.infer<typeof satisfactionDraftSchema>;
export type SatisfactionSubmission = Extract<
  CreateSubmissionV3,
  { assessment_type: "satisfaction" }
>;
export const emptyDuration = () => ({
  days: "",
  hours: "",
  minutes: "",
  seconds: "",
});
export function emptySatisfactionDraft(
  group: SatisfactionGroup,
): SatisfactionDraft {
  return {
    form_version: SATISFACTION_FORM_VERSION,
    questionnaire_version: satisfactionQuestionnaireVersion(group),
    full_name: "",
    work: {},
    answers: {},
    suggestion: "",
    durations: { traditional: emptyDuration(), safecheck: emptyDuration() },
    reason: "",
  };
}
const number = (v: unknown) =>
  v === "" || v === null || v === undefined
    ? undefined
    : typeof v === "number"
      ? v
      : Number(v);
export const satisfactionIsStudy = (work: SatisfactionDraft["work"]) =>
  work.position_type === "student" ||
  (work.position_type === "other" && work.other_context === "study");
export function satisfactionWorkInput(work: SatisfactionDraft["work"]) {
  return {
    position_type: work.position_type,
    program_code: work.program_code,
    ...(work.position_type === "other"
      ? { other_context: work.other_context }
      : {}),
    ...(satisfactionIsStudy(work)
      ? { study_year: number(work.study_year) }
      : {}),
  };
}
export function durationInput(
  duration: SatisfactionDraft["durations"]["traditional"],
) {
  return Object.fromEntries(
    Object.entries(duration).map(([k, v]) => [k, number(v)]),
  );
}
export function satisfactionInput(
  d: SatisfactionDraft,
  group: SatisfactionGroup,
  key: string,
) {
  return {
    schema_version: 3,
    idempotency_key: key,
    assessment_type: "satisfaction",
    assessment_group: group,
    assessment_category: "general",
    profile: { full_name: d.full_name },
    answers: d.answers,
    suggestion: d.suggestion || null,
    ...(group === "health"
      ? { workInfo: satisfactionWorkInput(d.work) }
      : {
          durations: {
            traditional: durationInput(d.durations.traditional),
            safecheck: durationInput(d.durations.safecheck),
          },
        }),
  };
}
export function checkedSatisfaction(
  d: SatisfactionDraft,
  group: SatisfactionGroup,
  key: string,
) {
  if (d.questionnaire_version !== satisfactionQuestionnaireVersion(group))
    return {
      success: false as const,
      error: {
        code: "QUESTIONNAIRE_VERSION",
        message: "ชุดคำถามได้รับการปรับปรุง กรุณาเริ่มแบบประเมินใหม่",
      },
    };
  const parsed = validateSubmission(satisfactionInput(d, group, key));
  return parsed.success
    ? { success: true as const, data: parsed.data as SatisfactionSubmission }
    : parsed;
}
export function satisfactionFromServer(
  data: Record<string, unknown>,
  group: SatisfactionGroup,
): SatisfactionDraft {
  const d = emptySatisfactionDraft(group);
  d.full_name = (data.profile as { full_name: string }).full_name;
  d.work = (data.workInfo || {}) as SatisfactionDraft["work"];
  d.answers = satisfactionAnswersSchema.parse(data.answers);
  d.suggestion = typeof data.suggestion === "string" ? data.suggestion : "";
  if (data.durations)
    d.durations = data.durations as SatisfactionDraft["durations"];
  d.expected_data_version = Number(data.data_version);
  return d;
}
export function migrateSatisfactionDraft(
  data: { answers?: unknown; profile?: unknown; workInfo?: unknown },
  group: SatisfactionGroup,
) {
  const d = emptySatisfactionDraft(group),
    answers = data.answers as Record<string, unknown> | undefined;
  for (let i = 1; i <= 16; i++) {
    const id = "q" + i,
      score = number(answers?.[id]);
    if (
      typeof score === "number" &&
      Number.isInteger(score) &&
      score >= 1 &&
      score <= 5
    )
      d.answers[id] = score;
  }
  if (typeof answers?.suggestion === "string")
    d.suggestion = answers.suggestion;
  const profile = data.profile as { full_name?: unknown } | undefined;
  if (typeof profile?.full_name === "string") d.full_name = profile.full_name;
  return d;
}
export function checkSatisfactionRespondent(
  d: SatisfactionDraft,
  group: SatisfactionGroup,
) {
  const profile = z
    .object({ full_name: z.string().trim().min(2, "กรุณาระบุชื่อ-นามสกุล") })
    .safeParse({ full_name: d.full_name });
  if (!profile.success)
    return { success: false as const, issues: profile.error.issues };
  if (group === "health") {
    const work = satisfactionWorkSchema.safeParse(
      satisfactionWorkInput(d.work),
    );
    if (!work.success)
      return {
        success: false as const,
        issues: work.error.issues.map((i) => ({
          ...i,
          path: ["work", ...i.path],
        })),
      };
  }
  return { success: true as const };
}
export function checkSatisfactionDurations(d: SatisfactionDraft) {
  const parsed = z
    .object({ traditional: durationSchema, safecheck: durationSchema })
    .safeParse({
      traditional: durationInput(d.durations.traditional),
      safecheck: durationInput(d.durations.safecheck),
    });
  return parsed;
}
export function displayDuration(seconds: number) {
  const days = Math.floor(seconds / 86400),
    hours = Math.floor((seconds % 86400) / 3600),
    minutes = Math.floor((seconds % 3600) / 60);
  return `${days} วัน ${hours} ชั่วโมง ${minutes} นาที ${seconds % 60} วินาที`;
}
