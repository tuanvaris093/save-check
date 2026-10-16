// Read-only adapter. It deliberately does not fabricate pre/post answers, programs,
// hours/week, TWA exposure duration, or a missing questionnaire's wording.
export interface LegacySubmissionView {
  schema_version: 1;
  assessment_group: "environment" | "health" | "unknown";
  questionnaire_version: "legacy-unknown";
  scoring_version: "legacy-unverified";
  answer_phase: "single";
  raw: Record<string, unknown>;
  missing_v3_fields: string[];
}
export function adaptLegacySubmission(input: unknown): LegacySubmissionView {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Legacy record must be an object");
  const raw = JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
  if (
    raw.schema_version !== undefined &&
    raw.schema_version !== null &&
    raw.schema_version !== 1
  )
    throw new Error("Only legacy version 1 can use this adapter");
  const assessment_group =
    raw.assessment_type === "environment"
      ? "environment"
      : raw.assessment_type === "health_risk"
        ? "health"
        : "unknown";
  const missing_v3_fields =
    raw.assessment_type === "health_risk"
      ? [
          "questionnaire_version",
          "program_code",
          "study_year",
          "working_hours_per_week",
          ...(raw.assessment_category === "light"
            ? ["before_answers", "after_answers"]
            : []),
        ]
      : raw.assessment_type === "satisfaction"
        ? ["assessment_group", "respondent_metadata", "manual_durations"]
        : [
            "serial_number",
            "calibration_date",
            "responsible_department",
            "location_responsible_name",
            "validated_measurement_basis",
          ];
  return {
    schema_version: 1,
    assessment_group,
    questionnaire_version: "legacy-unknown",
    scoring_version: "legacy-unverified",
    answer_phase: "single",
    raw,
    missing_v3_fields,
  };
}
