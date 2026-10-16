import { z } from "zod";
import { satisfactionDraftSchema } from "./satisfaction-form";
import { QUESTIONNAIRE_VERSION } from "../../../shared/v3";
export const draftIdentitySchema = z
  .object({
    group: z.enum(["environment", "health"]),
    type: z.enum(["environment", "health_risk", "satisfaction"]),
    category: z.enum(["light", "noise", "heat", "general"]),
    mode: z.enum(["create", "correction", "retest", "supplement"]),
    code: z.string().nullable(),
    baseRevision: z.string().nullable(),
    questionnaireVersion: z.string().optional(),
  })
  .strict()
  .refine((v) =>
    v.type === "satisfaction"
      ? v.category === "general"
      : v.type === "environment"
        ? v.group === "environment" && v.category !== "general"
        : v.group === "health" && v.category !== "general",
  );
export type DraftIdentity = z.infer<typeof draftIdentitySchema>;
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
const json: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(json),
    z.record(json),
  ]),
);
const numericDraft = z.union([z.number().finite(), z.string(), z.null()]);
const profileDraft = z
  .object({
    full_name: z.string(),
    gender: z.string(),
    age: numericDraft,
    weight: numericDraft,
    height: numericDraft,
    education_level: z.string(),
    marital_status: z.string(),
    has_underlying_disease: z.boolean(),
    underlying_disease_details: z.string(),
  })
  .partial()
  .strict();
const workDraft = z
  .object({
    position_type: z.string(),
    department: z.string(),
    position: z.string(),
    program_code: z.string(),
    study_year: numericDraft,
    other_context: z.string().nullable(),
    work_experience_years: numericDraft,
    working_hours_per_day: numericDraft,
    working_days_per_week: numericDraft,
    working_hours_per_week: numericDraft,
  })
  .partial()
  .strict();
const layoutDraft = z
  .object({
    fileName: z.string(),
    fileType: z.string(),
    fileSize: z.number().nonnegative(),
    fileData: z.string(),
    uploadedAt: z.string(),
  })
  .strict()
  .nullable();
export const draftEnvelopeSchema = z
  .object({
    version: z.literal(3),
    identity: draftIdentitySchema,
    data: z
      .object({
        satisfactionV3: satisfactionDraftSchema.optional(),
        environmentV3: z.record(json).optional(),
        healthV3: z
          .object({
            questionnaire_version: z.literal(QUESTIONNAIRE_VERSION),
            profile: z.record(
              z.union([z.string(), z.number().finite(), z.boolean(), z.null()]),
            ),
            work: z.record(
              z.union([z.string(), z.number().finite(), z.null()]),
            ),
            context: z
              .object({
                hours_worked_today: z
                  .union([z.string(), z.number().finite()])
                  .optional(),
                noise_sources: z.array(z.string()).optional(),
                noise_source_other: z.string().optional(),
              })
              .strict(),
            before: z.record(z.number().int().min(0).max(2)),
            after: z.record(z.number().int().min(0).max(2)),
            single: z.record(z.number().int().min(0).max(2)),
          })
          .strict()
          .optional(),
        profile: profileDraft.optional(),
        workInfo: workDraft.optional(),
        inspectionData: z.record(z.string()).optional(),
        answers: z.record(json).optional(),
        answersBefore: z.record(json).optional(),
        answersAfter: z.record(json).optional(),
        measuredValues: z.record(json).optional(),
        layoutFile: layoutDraft.optional(),
        editingSubmission: z
          .object({
            id: z.number().optional(),
            submission_code: z.string(),
            started_at: z.string().optional(),
            created_at: z.string().optional(),
          })
          .strict()
          .optional(),
        lastSavedAt: z.string().optional(),
      })
      .strict(),
    ui: z
      .object({
        step: z.number().int().positive(),
        tab: z.enum(["before", "after", "single"]),
      })
      .strict(),
    requestKey: z.string().min(1),
    savedAt: z.string(),
  })
  .strict();
export type DraftEnvelope = z.infer<typeof draftEnvelopeSchema>;
export function draftKey(identity: DraftIdentity) {
  const i = draftIdentitySchema.parse(identity);
  return (
    "safecheck:v3:draft:" +
    JSON.stringify([
      i.group,
      i.type,
      i.category,
      i.mode,
      i.code,
      i.baseRevision,
      ...(i.questionnaireVersion ? [i.questionnaireVersion] : []),
    ])
  );
}
export function readDraft(
  raw: string | null,
  identity: DraftIdentity,
  totalSteps: number,
): DraftEnvelope | null {
  if (!raw || raw.length > 15 * 1024 * 1024) return null;
  try {
    const parsed = draftEnvelopeSchema.safeParse(JSON.parse(raw));
    if (
      !parsed.success ||
      draftKey(parsed.data.identity) !== draftKey(identity) ||
      parsed.data.ui.step > totalSteps
    )
      return null;
    return parsed.data;
  } catch {
    return null;
  }
}
export function newDraft(identity: DraftIdentity): DraftEnvelope {
  return {
    version: 3,
    identity,
    data: {},
    ui: { step: 1, tab: "single" },
    requestKey: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };
}
export function patchDraft(
  draft: DraftEnvelope,
  data: Partial<DraftEnvelope["data"]>,
  ui: Partial<DraftEnvelope["ui"]> = {},
) {
  return {
    ...draft,
    data: { ...draft.data, ...data, lastSavedAt: new Date().toISOString() },
    ui: { ...draft.ui, ...ui },
    savedAt: new Date().toISOString(),
  };
}
