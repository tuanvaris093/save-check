import {
  profileSchema,
  healthWorkSchema,
  healthAnswersSchema,
  noiseContextSchema,
  validateSubmission,
  PROGRAMS,
  QUESTIONNAIRE_VERSION,
  type CreateSubmissionV3,
} from "../../../shared/v3";
export type HealthCategory = "light" | "noise" | "heat";
export interface HealthDraft {
  questionnaire_version: string;
  profile: Record<string, string | number | boolean | null>;
  work: Record<string, string | number | null>;
  context: {
    hours_worked_today?: string | number;
    noise_sources?: string[];
    noise_source_other?: string;
  };
  before: Record<string, number>;
  after: Record<string, number>;
  single: Record<string, number>;
}
export const emptyHealthDraft = (): HealthDraft => ({
  questionnaire_version: QUESTIONNAIRE_VERSION,
  profile: {},
  work: {},
  context: {},
  before: {},
  after: {},
  single: {},
});
const number = (v: unknown) =>
  v === "" || v === undefined || v === null
    ? undefined
    : typeof v === "number"
      ? v
      : Number(v);
export function profileInput(d: HealthDraft) {
  return {
    ...d.profile,
    age: number(d.profile.age),
    weight: number(d.profile.weight),
    height: number(d.profile.height),
    underlying_disease_details: d.profile.has_underlying_disease
      ? d.profile.underlying_disease_details
      : null,
  };
}
export function isStudy(d: HealthDraft) {
  return (
    d.work.position_type === "student" ||
    (d.work.position_type === "other" && d.work.other_context === "study")
  );
}
export function workInput(d: HealthDraft) {
  const w = d.work;
  return {
    position_type: w.position_type,
    program_code: w.program_code,
    ...(w.position_type === "other" ? { other_context: w.other_context } : {}),
    ...(isStudy(d)
      ? { study_year: number(w.study_year) }
      : { work_experience_years: number(w.work_experience_years) }),
    working_hours_per_day: number(w.working_hours_per_day),
    working_hours_per_week: number(w.working_hours_per_week),
  };
}
export function contextInput(d: HealthDraft, category: HealthCategory) {
  return category === "light"
    ? { hours_worked_today: number(d.context.hours_worked_today) }
    : {
        noise_sources: d.context.noise_sources ?? [],
        noise_source_other: d.context.noise_sources?.includes("other")
          ? d.context.noise_source_other
          : null,
      };
}
export function buildHealthPayload(
  d: HealthDraft,
  category: HealthCategory,
  key: string,
) {
  return validateSubmission({
    schema_version: 3,
    idempotency_key: key,
    assessment_type: "health_risk",
    assessment_group: "health",
    assessment_category: category,
    profile: profileInput(d),
    workInfo: workInput(d),
    ...(category === "heat"
      ? {}
      : { healthContext: contextInput(d, category) }),
    answers:
      category === "light"
        ? { before: d.before, after: d.after }
        : { single: d.single },
  });
}
export function healthDraftFromServer(
  data: Record<string, unknown>,
): HealthDraft {
  const answers = data.answers as Record<string, Record<string, number>>;
  return {
    questionnaire_version: String(
      data.questionnaire_version ?? QUESTIONNAIRE_VERSION,
    ),
    profile: data.profile as HealthDraft["profile"],
    work: data.workInfo as HealthDraft["work"],
    context: (data.healthContext ?? {}) as HealthDraft["context"],
    before: answers?.before ?? {},
    after: answers?.after ?? {},
    single: answers?.single ?? {},
  };
}
export const healthFormSchemas = {
  profile: profileSchema,
  work: healthWorkSchema,
  answers: healthAnswersSchema,
  noise: noiseContextSchema,
};
export { PROGRAMS, QUESTIONNAIRE_VERSION };
export type HealthSubmission = Extract<
  CreateSubmissionV3,
  { assessment_type: "health_risk" }
>;
