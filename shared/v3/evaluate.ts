import {
  healthAnswersSchema,
  satisfactionAnswersSchema,
  durationSchema,
  environmentUnitSchema,
  createSubmissionSchema,
  type HealthAnswers,
  type Duration,
  type EnvironmentUnit,
  type RiskLevel,
} from "./contracts";
import {
  LIGHT_AREA_STANDARDS,
  STANDARD_VERSIONS,
  STANDARD_DOCUMENTS,
  surroundingStandard,
  NOISE_DURATION_TABLE,
  HEAT_LIMITS,
  SCORING_VERSION,
} from "./catalogs";
import type { UnitEvaluation } from "./contracts";

export function healthLevel(total: number): RiskLevel {
  if (!Number.isInteger(total) || total < 0 || total > 20)
    throw new Error("Health total must be an integer 0–20");
  return total <= 6 ? "pass" : total <= 13 ? "medium" : "high_risk";
}
export function evaluateHealthSingle(input: unknown) {
  const answers = healthAnswersSchema.parse(input);
  const total = Array.from(
    { length: 10 },
    (_, i) => answers[`q${i + 1}`],
  ).reduce((s, n) => s + n, 0);
  return { total, level: healthLevel(total), scoring_version: SCORING_VERSION };
}
export function evaluateHealthLight(beforeInput: unknown, afterInput: unknown) {
  const before = healthAnswersSchema.parse(beforeInput),
    after = healthAnswersSchema.parse(afterInput);
  const b = evaluateHealthSingle(before),
    a = evaluateHealthSingle(after),
    delta = a.total - b.total;
  return {
    before_total: b.total,
    after_total: a.total,
    delta,
    change_direction:
      delta > 0 ? "increased" : delta < 0 ? "decreased" : "unchanged",
    after_level: a.level,
    items: Array.from({ length: 10 }, (_, i) => {
      const id = `q${i + 1}`;
      return {
        question_id: id,
        before: before[id],
        after: after[id],
        delta: after[id] - before[id],
      };
    }),
    scoring_version: SCORING_VERSION,
  };
}
export function durationSeconds(input: unknown) {
  const v = durationSchema.parse(input);
  return v.days * 86400 + v.hours * 3600 + v.minutes * 60 + v.seconds;
}
export function evaluateSatisfaction(input: unknown) {
  const scores = satisfactionAnswersSchema.parse(input);
  const dimension_totals = [0, 1, 2, 3].map((d) =>
    [1, 2, 3, 4].reduce((s, n) => s + scores[`q${d * 4 + n}`], 0),
  );
  const total = dimension_totals.reduce((s, n) => s + n, 0);
  return {
    total,
    count: 16,
    dimension_means: dimension_totals.map((s) => s / 4),
    overall_mean: total / 16,
    scoring_version: SCORING_VERSION,
  };
}
export function noiseLimit(durationMinutes: number) {
  if (
    !Number.isFinite(durationMinutes) ||
    durationMinutes <= 0 ||
    durationMinutes > 1440
  )
    throw new Error("Invalid exposure duration");
  const row = NOISE_DURATION_TABLE.find((r) => r[1] === durationMinutes);
  return row
    ? { limit: row[0], source: "table" as const }
    : {
        limit: Math.floor(85 + 3 * Math.log2(480 / durationMinutes)),
        source: "formula" as const,
      };
}
export function evaluateUnit(input: unknown): UnitEvaluation {
  const u = environmentUnitSchema.parse(input);
  const base = { point_id: u.point_id, kind: u.kind };
  if (u.kind === "light_spot") {
    const surrounding = surroundingStandard(u.standard_target_lux);
    const is_pass =
      u.lux >= u.standard_target_lux &&
      (!surrounding ||
        (u.surrounding_near_lux! >= surrounding.near &&
          u.surrounding_outer_lux! >= surrounding.outer));
    const values: Record<string, number> = { lux: u.lux };
    if (surrounding) {
      values.surrounding_near_lux = u.surrounding_near_lux!;
      values.surrounding_outer_lux = u.surrounding_outer_lux!;
    }
    return {
      ...base,
      is_pass,
      values,
      standard: {
        version: STANDARD_VERSIONS.light,
        document: STANDARD_DOCUMENTS.light.file,
        code: u.standard_code,
        thresholds: {
          target: u.standard_target_lux,
          near: surrounding?.near ?? null,
          outer: surrounding?.outer ?? null,
        },
      },
    };
  }
  if (u.kind === "light_area") {
    const row = LIGHT_AREA_STANDARDS.find((r) => r.code === u.standard_code)!;
    const average = u.samples
        ? u.samples.reduce((s, p) => s + p.lux, 0) / u.samples.length
        : u.average_lux!,
      minimum = u.samples
        ? Math.min(...u.samples.map((p) => p.lux))
        : u.minimum_lux!;
    return {
      ...base,
      is_pass:
        average >= row.averageMin &&
        (row.pointMin === null || minimum >= row.pointMin),
      values: { average, minimum },
      standard: {
        version: STANDARD_VERSIONS.light,
        document: STANDARD_DOCUMENTS.light.file,
        code: u.standard_code,
        thresholds: { average_min: row.averageMin, point_min: row.pointMin },
      },
    };
  }
  if (u.kind === "noise") {
    const threshold =
      u.evaluation_basis === "twa8"
        ? { limit: 85, source: "normalized8" }
        : noiseLimit(u.exposure_duration_minutes!);
    const level =
      u.evaluation_basis === "twa8" ? u.twa_8hr! : u.exposure_level_dBA!;
    return {
      ...base,
      is_pass: level <= threshold.limit,
      values: { level, min: u.min_dBA, max: u.max_dBA },
      standard: {
        version: STANDARD_VERSIONS.noise,
        document: STANDARD_DOCUMENTS.noise.file,
        code: `${u.evaluation_basis}:${threshold.source}`,
        thresholds: {
          limit: threshold.limit,
          duration_minutes: u.exposure_duration_minutes ?? null,
        },
      },
    };
  }
  const average =
    u.input_mode === "meter_average"
      ? u.wbgt_average!
      : u.intervals!.reduce(
          (s, i) =>
            s +
            (u.wbgt_type === "in"
              ? 0.7 * i.wb + 0.3 * i.gt
              : 0.7 * i.wb + 0.2 * i.gt + 0.1 * i.db!) *
              i.minutes,
          0,
        ) / 120;
  const limit = u.standard_value ?? HEAT_LIMITS[u.workload];
  return {
    ...base,
    is_pass: average <= limit,
    values: {
      wbgt_average: average,
      ...Object.fromEntries(
        ["db_temp", "wb_temp", "gt_temp", "wbgt_in"].flatMap((key) => {
          const value = u[key as "db_temp" | "wb_temp" | "gt_temp" | "wbgt_in"];
          return value === undefined ? [] : [[key, value]];
        }),
      ),
    },
    standard: {
      version: STANDARD_VERSIONS.heat,
      document: STANDARD_DOCUMENTS.heat.file,
      code: u.workload,
      thresholds: { limit },
    },
  };
}
export function evaluateEnvironment(units: EnvironmentUnit[]) {
  if (!units.length) throw new Error("At least one unit is required");
  if (new Set(units.map((u) => u.point_id)).size !== units.length)
    throw new Error("Duplicate units");
  const results = units.map(evaluateUnit);
  return {
    is_pass: results.every((r) => r.is_pass),
    passed_units: results.filter((r) => r.is_pass).length,
    total_units: results.length,
    results,
    scoring_version: SCORING_VERSION,
  };
}
export function evaluateSubmission(input: unknown) {
  const submission = createSubmissionSchema.parse(input);
  if (submission.assessment_type === "environment")
    return evaluateEnvironment(submission.units);
  if (submission.assessment_type === "satisfaction")
    return {
      ...evaluateSatisfaction(submission.answers),
      ...(submission.assessment_group === "environment"
        ? {
            durations: {
              traditional_seconds: durationSeconds(
                submission.durations.traditional,
              ),
              safecheck_seconds: durationSeconds(
                submission.durations.safecheck,
              ),
              source: "manual",
            },
          }
        : {}),
    };
  return submission.assessment_category === "light"
    ? evaluateHealthLight(submission.answers.before, submission.answers.after)
    : evaluateHealthSingle(submission.answers.single);
}
export type { HealthAnswers, Duration };
