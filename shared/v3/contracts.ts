import { z } from "zod";
import {
  PROGRAMS,
  NOISE_SOURCES,
  SCHEMA_VERSION,
  LIGHT_AREA_STANDARDS,
  LIGHT_SPOT_STANDARDS,
  surroundingStandard,
} from "./catalogs";

export const text = z.string().trim().min(1);
export const finite = z.number().finite();
export const nonnegative = finite.min(0);
export const optionalNote = z.preprocess(
  (v) =>
    v === undefined || v === null || (typeof v === "string" && !v.trim())
      ? null
      : v,
  z.string().trim().nullable(),
);
export const instant = z.string().datetime({ offset: true });
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Invalid calendar date");
export const levelSchema = z.enum(["pass", "medium", "high_risk"]);
const scoreShape: Record<string, z.ZodNumber> = Object.fromEntries(
  Array.from({ length: 10 }, (_, i) => [
    `q${i + 1}`,
    z.number().int().min(0).max(2),
  ]),
);
export const healthAnswersSchema = z.object(scoreShape).strict();
export const satisfactionAnswersSchema = z
  .object(
    Object.fromEntries(
      Array.from({ length: 16 }, (_, i) => [
        `q${i + 1}`,
        z.number().int().min(1).max(5),
      ]),
    ),
  )
  .strict();
export const profileSchema = z
  .object({
    full_name: text.min(2),
    gender: z.enum(["male", "female", "other"]),
    age: z.number().int().min(1).max(120),
    weight: finite.positive(),
    height: finite.positive(),
    education_level: z.enum([
      "below_bachelor",
      "bachelor",
      "master",
      "doctorate",
    ]),
    marital_status: z.enum(["single", "married", "divorced", "widowed"]),
    has_underlying_disease: z.boolean(),
    underlying_disease_details: optionalNote,
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.has_underlying_disease && !v.underlying_disease_details)
      ctx.addIssue({
        code: "custom",
        path: ["underlying_disease_details"],
        message: "Specify the disease",
      });
    if (!v.has_underlying_disease && v.underlying_disease_details !== null)
      ctx.addIssue({
        code: "custom",
        path: ["underlying_disease_details"],
        message: "Not applicable without a disease",
      });
  });
const workBase = z
  .object({
    position_type: z.enum(["staff", "student", "faculty", "other"]),
    other_context: z.enum(["study", "work"]).optional(),
    program_code: text.refine(
      (v) => v === "not_applicable" || PROGRAMS.some((p) => p.code === v),
      "Unknown program",
    ),
    study_year: z.number().int().min(1).max(6).optional(),
  })
  .strict();
function workApplicability(v: z.infer<typeof workBase>, ctx: z.RefinementCtx) {
  if (v.position_type === "other" && !v.other_context)
    ctx.addIssue({
      code: "custom",
      path: ["other_context"],
      message: "Choose study or work context",
    });
  if (v.position_type !== "other" && v.other_context)
    ctx.addIssue({
      code: "custom",
      path: ["other_context"],
      message: "Only applicable to other respondents",
    });
  const study =
    v.position_type === "student" ||
    (v.position_type === "other" && v.other_context === "study");
  if (study && v.program_code === "not_applicable")
    ctx.addIssue({
      code: "custom",
      path: ["program_code"],
      message: "Students must choose a program",
    });
  if (study && v.study_year === undefined)
    ctx.addIssue({
      code: "custom",
      path: ["study_year"],
      message: "Choose study year 1–6",
    });
  if (!study && v.study_year !== undefined)
    ctx.addIssue({
      code: "custom",
      path: ["study_year"],
      message: "Study year is not applicable",
    });
}
export const satisfactionWorkSchema = workBase.superRefine(workApplicability);
export const healthWorkSchema = workBase
  .extend({
    work_experience_years: nonnegative.optional(),
    working_hours_per_day: finite.positive().max(24),
    working_hours_per_week: finite.positive().max(168),
  })
  .superRefine((v, ctx) => {
    workApplicability(v, ctx);
    const study =
      v.position_type === "student" ||
      (v.position_type === "other" && v.other_context === "study");
    if (!study && v.work_experience_years === undefined)
      ctx.addIssue({
        code: "custom",
        path: ["work_experience_years"],
        message: "Work experience is required",
      });
    if (study && v.work_experience_years !== undefined)
      ctx.addIssue({
        code: "custom",
        path: ["work_experience_years"],
        message: "Use study year instead",
      });
  });
export const noiseContextSchema = z
  .object({
    noise_sources: z.array(z.enum(NOISE_SOURCES)).min(1),
    noise_source_other: optionalNote,
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      new Set(v.noise_sources).size !== v.noise_sources.length ||
      (v.noise_sources.includes("none") && v.noise_sources.length !== 1)
    )
      ctx.addIssue({
        code: "custom",
        path: ["noise_sources"],
        message: "Duplicate or conflicting sources",
      });
    if (v.noise_sources.includes("other") && !v.noise_source_other)
      ctx.addIssue({
        code: "custom",
        path: ["noise_source_other"],
        message: "Specify the other source",
      });
    if (!v.noise_sources.includes("other") && v.noise_source_other)
      ctx.addIssue({
        code: "custom",
        path: ["noise_source_other"],
        message: "Other text is not applicable",
      });
  });
export const durationSchema = z
  .object({
    days: z.number().int().min(0).max(1000000),
    hours: z.number().int().min(0).max(23),
    minutes: z.number().int().min(0).max(59),
    seconds: z.number().int().min(0).max(59),
  })
  .strict()
  .refine(
    (v) => v.days + v.hours + v.minutes + v.seconds > 0,
    "Duration must be greater than zero",
  );
export const fileMetadataSchema = z
  .object({
    file_id: text,
    object_key: text,
    checksum_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    file_name: text,
    mime_type: z.enum([
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ]),
    byte_size: z
      .number()
      .int()
      .positive()
      .max(10 * 1024 * 1024),
    state: z.enum(["staged", "committed", "orphan"]),
    created_at: instant,
  })
  .strict();
export const inspectionSchema = z
  .object({
    inspector_name: text.min(2),
    position: text,
    inspection_location: text,
    inspection_date: date,
    start_at: instant,
    end_at: instant,
    equipment: text,
    serial_number: text,
    calibration_date: date,
    responsible_department: text,
    location_responsible_name: text,
    measurement_technique: z.enum(["spot", "area"]).optional(),
  })
  .strict();
const point = { point_id: text, location_desc: text, remark: optionalNote };
export const lightSpotSchema = z
  .object({
    ...point,
    kind: z.literal("light_spot"),
    standard_code: text,
    standard_target_lux: finite.positive(),
    lux: nonnegative,
    surrounding_near_lux: nonnegative.optional(),
    surrounding_outer_lux: nonnegative.optional(),
  })
  .strict();
export const lightAreaSchema = z
  .object({
    ...point,
    kind: z.literal("light_area"),
    standard_code: text,
    average_lux: nonnegative.optional(),
    minimum_lux: nonnegative.optional(),
    samples: z
      .array(z.object({ sample_id: text, lux: nonnegative }).strict())
      .min(1)
      .optional(),
  })
  .strict();
export const noiseUnitSchema = z
  .object({
    ...point,
    kind: z.literal("noise"),
    evaluation_basis: z.enum(["exposure-duration", "twa8"]),
    min_dBA: finite,
    max_dBA: finite,
    exposure_level_dBA: finite.optional(),
    exposure_duration_minutes: finite.positive().max(1440).optional(),
    twa_8hr: finite.optional(),
  })
  .strict();
export const heatUnitSchema = z
  .object({
    ...point,
    kind: z.literal("heat"),
    wbgt_type: z.enum(["in", "out"]),
    input_mode: z.enum(["meter_average", "calculated_intervals"]),
    workload: z.enum(["light", "moderate", "heavy"]),
    start_at: instant,
    end_at: instant,
    wbgt_average: finite.optional(),
    db_temp: finite.optional(),
    wb_temp: finite.optional(),
    gt_temp: finite.optional(),
    wbgt_in: finite.optional(),
    standard_value: finite.positive().optional(),
    intervals: z
      .array(
        z
          .object({
            wb: finite,
            gt: finite,
            db: finite.optional(),
            minutes: finite.positive(),
          })
          .strict(),
      )
      .min(1)
      .optional(),
  })
  .strict();
export const environmentUnitSchema = z
  .discriminatedUnion("kind", [
    lightSpotSchema,
    lightAreaSchema,
    noiseUnitSchema,
    heatUnitSchema,
  ])
  .superRefine((v, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    if (v.kind === "light_spot") {
      const row = LIGHT_SPOT_STANDARDS.find((r) => r.code === v.standard_code);
      if (
        !row ||
        v.standard_target_lux < row.min ||
        (row.max === null
          ? v.standard_target_lux !== row.min
          : v.standard_target_lux > row.max)
      )
        issue(
          ["standard_target_lux"],
          "Target must match selected standard row",
        );
      const surroundings = surroundingStandard(v.standard_target_lux);
      if (
        surroundings &&
        (v.surrounding_near_lux === undefined ||
          v.surrounding_outer_lux === undefined)
      )
        issue(
          ["surrounding_near_lux"],
          "Surrounding measurements are required",
        );
      if (
        !surroundings &&
        (v.surrounding_near_lux !== undefined ||
          v.surrounding_outer_lux !== undefined)
      )
        issue(
          ["surrounding_near_lux"],
          "Surrounding measurements are not applicable",
        );
    }
    if (v.kind === "light_area") {
      if (!LIGHT_AREA_STANDARDS.some((r) => r.code === v.standard_code))
        issue(["standard_code"], "Unknown area standard");
      if (
        v.samples &&
        (v.average_lux !== undefined || v.minimum_lux !== undefined)
      )
        issue(["average_lux"], "Do not mix area input formats");
      if (!v.samples) {
        if (v.average_lux === undefined)
          issue(["average_lux"], "Area average is required");
        if (v.minimum_lux === undefined)
          issue(["minimum_lux"], "Area minimum is required");
        if (
          v.average_lux !== undefined &&
          v.minimum_lux !== undefined &&
          v.minimum_lux > v.average_lux
        )
          issue(["minimum_lux"], "Minimum cannot exceed average");
      }
      if (
        v.samples &&
        new Set(v.samples.map((s) => s.sample_id)).size !== v.samples.length
      )
        issue(["samples"], "Duplicate sample IDs");
    }
    if (v.kind === "noise") {
      if (v.min_dBA > v.max_dBA) issue(["min_dBA"], "Minimum exceeds maximum");
      if (v.evaluation_basis === "exposure-duration") {
        if (
          v.exposure_level_dBA === undefined ||
          v.exposure_duration_minutes === undefined
        )
          issue(
            ["exposure_level_dBA"],
            "Exposure level and duration are required",
          );
        if (v.twa_8hr !== undefined)
          issue(["twa_8hr"], "Do not mix evaluation bases");
        if (
          v.exposure_level_dBA !== undefined &&
          (v.exposure_level_dBA < v.min_dBA || v.exposure_level_dBA > v.max_dBA)
        )
          issue(
            ["exposure_level_dBA"],
            "Exposure average must be within observed bounds",
          );
      } else {
        if (v.twa_8hr === undefined) issue(["twa_8hr"], "8-hour TWA required");
        if (
          v.exposure_level_dBA !== undefined ||
          v.exposure_duration_minutes !== undefined
        )
          issue(
            ["exposure_duration_minutes"],
            "Do not normalize TWA8 a second time",
          );
      }
    }
    if (v.kind === "heat") {
      if (Date.parse(v.end_at) <= Date.parse(v.start_at))
        issue(["end_at"], "End must follow start");
      if (
        v.input_mode === "calculated_intervals" &&
        Date.parse(v.end_at) - Date.parse(v.start_at) !== 120 * 60000
      )
        issue(["end_at"], "Representative interval must span 120 minutes");
      if (v.input_mode === "meter_average") {
        if (v.wbgt_average === undefined)
          issue(["wbgt_average"], "Meter average required");
        if (v.intervals !== undefined)
          issue(["intervals"], "Do not mix input modes");
      } else {
        if (
          !v.intervals ||
          Math.abs(v.intervals.reduce((s, i) => s + i.minutes, 0) - 120) > 1e-9
        )
          issue(["intervals"], "Intervals must total 120 minutes");
        if (v.wbgt_average !== undefined)
          issue(["wbgt_average"], "Average is computed, not input");
        v.intervals?.forEach((i, n) => {
          if (v.wbgt_type === "out" && i.db === undefined)
            issue(["intervals", n, "db"], "Dry bulb required with sunlight");
          if (v.wbgt_type === "in" && i.db !== undefined)
            issue(
              ["intervals", n, "db"],
              "Dry bulb is not applicable without sunlight",
            );
        });
      }
    }
  });
const metadata = {
  schema_version: z.literal(SCHEMA_VERSION),
  idempotency_key: text.max(128),
};
const health = {
  ...metadata,
  assessment_type: z.literal("health_risk"),
  assessment_group: z.literal("health"),
  profile: profileSchema,
  workInfo: healthWorkSchema,
};
const lightHealth = z
  .object({
    ...health,
    assessment_category: z.literal("light"),
    healthContext: z
      .object({ hours_worked_today: nonnegative.max(24) })
      .strict(),
    answers: z
      .object({ before: healthAnswersSchema, after: healthAnswersSchema })
      .strict(),
  })
  .strict();
const noiseHealth = z
  .object({
    ...health,
    assessment_category: z.literal("noise"),
    healthContext: noiseContextSchema,
    answers: z.object({ single: healthAnswersSchema }).strict(),
  })
  .strict();
const heatHealth = z
  .object({
    ...health,
    assessment_category: z.literal("heat"),
    answers: z.object({ single: healthAnswersSchema }).strict(),
  })
  .strict();
const sat = {
  ...metadata,
  assessment_type: z.literal("satisfaction"),
  assessment_category: z.literal("general"),
  profile: z.object({ full_name: text.min(2) }).strict(),
  answers: satisfactionAnswersSchema,
  suggestion: optionalNote,
};
const satHealth = z
  .object({
    ...sat,
    assessment_group: z.literal("health"),
    workInfo: satisfactionWorkSchema,
  })
  .strict();
const satEnvironment = z
  .object({
    ...sat,
    assessment_group: z.literal("environment"),
    durations: z
      .object({ traditional: durationSchema, safecheck: durationSchema })
      .strict(),
  })
  .strict();
function environmentSchema() {
  return z
    .object({
      ...metadata,
      assessment_type: z.literal("environment"),
      assessment_group: z.literal("environment"),
      assessment_category: z.enum(["light", "noise", "heat"]),
      inspectionData: inspectionSchema,
      layout: z.object({ file_id: text }).strict().optional(),
      units: z.array(environmentUnitSchema).min(1),
    })
    .strict()
    .superRefine((v, ctx) => {
      if (new Set(v.units.map((u) => u.point_id)).size !== v.units.length)
        ctx.addIssue({
          code: "custom",
          path: ["units"],
          message: "Duplicate point IDs",
        });
      const allowed =
        v.assessment_category === "light"
          ? v.inspectionData.measurement_technique === "spot"
            ? "light_spot"
            : "light_area"
          : v.assessment_category;
      if (
        v.assessment_category === "light" &&
        !v.inspectionData.measurement_technique
      )
        ctx.addIssue({
          code: "custom",
          path: ["inspectionData", "measurement_technique"],
          message: "Choose technique",
        });
      if (
        v.assessment_category !== "light" &&
        v.inspectionData.measurement_technique
      )
        ctx.addIssue({
          code: "custom",
          path: ["inspectionData", "measurement_technique"],
          message: "Only applicable to light",
        });
      v.units.forEach((u, i) => {
        if (u.kind !== allowed)
          ctx.addIssue({
            code: "custom",
            path: ["units", i, "kind"],
            message: "Unit does not match category/technique",
          });
      });
      const start = Date.parse(v.inspectionData.start_at),
        end = Date.parse(v.inspectionData.end_at);
      if (end <= start)
        ctx.addIssue({
          code: "custom",
          path: ["inspectionData", "end_at"],
          message: "End must follow start",
        });
      if (v.inspectionData.calibration_date > v.inspectionData.inspection_date)
        ctx.addIssue({
          code: "custom",
          path: ["inspectionData", "calibration_date"],
          message: "Calibration cannot follow inspection",
        });
    });
}
const environment = environmentSchema();
export const createSubmissionSchema = z.union([
  lightHealth,
  noiseHealth,
  heatHealth,
  satHealth,
  satEnvironment,
  environment,
]);
export type CreateSubmissionV3 = z.infer<typeof createSubmissionSchema>;
export type EnvironmentSubmissionV3 = z.infer<typeof environment>;
export type EnvironmentUnit = z.infer<typeof environmentUnitSchema>;
export type HealthAnswers = z.infer<typeof healthAnswersSchema>;
export type Duration = z.infer<typeof durationSchema>;
export type RiskLevel = z.infer<typeof levelSchema>;
export interface StandardSnapshot {
  version: string;
  document: string;
  code: string;
  thresholds: Record<string, number | null>;
}
export interface UnitEvaluation {
  point_id: string;
  kind: EnvironmentUnit["kind"];
  is_pass: boolean;
  values: Record<string, number>;
  standard: StandardSnapshot;
}
export interface RevisionObservation {
  unit: EnvironmentUnit;
  result: UnitEvaluation;
  measured_at: string;
  observation_kind: "measured" | "carried";
  carried_from_revision_id: string | null;
}
export interface EnvironmentRevisionV3 {
  kind?: "initial" | "retest" | "correction" | "legacy";
  revision_id: string;
  submission_id: number;
  revision_no: number;
  base_revision_id: string | null;
  schema_version: 3;
  scoring_version: string;
  inspectionData: z.infer<typeof inspectionSchema>;
  layout_file_id: string | null;
  observations: RevisionObservation[];
  is_pass: boolean;
  archived: boolean;
}
export interface ValidationIssue {
  path: (string | number)[];
  code: string;
  message: string;
}
export type DomainResponse<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: { code: string; message: string; issues?: ValidationIssue[] };
    };
export function validateSubmission(
  input: unknown,
): DomainResponse<CreateSubmissionV3> {
  const record =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const schema =
    record.assessment_type === "health_risk"
      ? record.assessment_category === "light"
        ? lightHealth
        : record.assessment_category === "noise"
          ? noiseHealth
          : record.assessment_category === "heat"
            ? heatHealth
            : createSubmissionSchema
      : record.assessment_type === "environment"
        ? environment
        : record.assessment_type === "satisfaction" &&
            record.assessment_group === "health"
          ? satHealth
          : record.assessment_type === "satisfaction" &&
              record.assessment_group === "environment"
            ? satEnvironment
            : createSubmissionSchema;
  const parsed = schema.safeParse(input);
  if (parsed.success) return { success: true, data: parsed.data };
  // Flatten union branch errors so forms can focus an actual field, not just root.
  const flatten = (issues: z.ZodIssue[]): ValidationIssue[] =>
    issues.flatMap((issue) =>
      issue.code === "invalid_union"
        ? issue.unionErrors.flatMap((error) => flatten(error.issues))
        : [{ path: issue.path, code: issue.code, message: issue.message }],
    );
  const unique = new Map<string, ValidationIssue>();
  for (const issue of flatten(parsed.error.issues))
    unique.set(JSON.stringify([issue.path, issue.code, issue.message]), issue);
  return {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Invalid assessment",
      issues: [...unique.values()],
    },
  };
}

/** Compare parsed heat inputs with a server-held base, including their actual instants. */
export function unchangedHeatUnitIds(
  baseUnits: readonly EnvironmentUnit[],
  input: unknown,
): Set<string> {
  if (!Array.isArray(input)) return new Set();
  const signature = (unit: EnvironmentUnit) =>
    unit.kind === "heat"
      ? JSON.stringify({
          kind: unit.kind,
          wbgt_type: unit.wbgt_type,
          input_mode: unit.input_mode,
          workload: unit.workload,
          start_at: Date.parse(unit.start_at),
          end_at: Date.parse(unit.end_at),
          wbgt_average: unit.wbgt_average,
          db_temp: unit.db_temp,
          wb_temp: unit.wb_temp,
          gt_temp: unit.gt_temp,
          wbgt_in: unit.wbgt_in,
          standard_value: unit.standard_value,
          intervals: unit.intervals,
        })
      : "";
  return new Set(
    input.flatMap((raw) => {
      const parsed = environmentUnitSchema.safeParse(raw);
      if (!parsed.success || parsed.data.kind !== "heat") return [];
      const previous = baseUnits.find(
        (u) => u.point_id === parsed.data.point_id,
      );
      return previous &&
        signature(environmentUnitSchema.parse(previous)) ===
          signature(parsed.data)
        ? [parsed.data.point_id]
        : [];
    }),
  );
}
/** Effective revisions use the same per-point time rules as new submissions. */
export function validateEffectiveEnvironment(
  input: unknown,
  unchangedHeatIds: ReadonlySet<string>,
): DomainResponse<EnvironmentSubmissionV3> {
  void unchangedHeatIds;
  const parsed = environmentSchema().safeParse(input);
  if (parsed.success) return { success: true, data: parsed.data };
  return {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Invalid assessment",
      issues: parsed.error.issues.map((i) => ({
        path: i.path,
        code: i.code,
        message: i.message,
      })),
    },
  };
}
