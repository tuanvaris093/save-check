import type { EnvironmentRevisionV3 } from "../../../shared/v3";
export type StoredRecord = Record<string, unknown>;
export const object = (value: unknown): StoredRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as StoredRecord)
    : {};
export const list = (value: unknown): StoredRecord[] =>
  Array.isArray(value) ? value.map(object) : [];
export const REPORT_TYPES: Record<string, string> = {
  environment: "สภาพแวดล้อม",
  health_risk: "อาการทางสุขภาพ",
  satisfaction: "ความพึงพอใจ",
};
export const REPORT_GROUPS: Record<string, string> = {
  environment: "สภาพแวดล้อม",
  health: "อาการทางสุขภาพ",
};
export const REPORT_CATEGORIES: Record<string, string> = {
  light: "แสง",
  noise: "เสียง",
  heat: "ความร้อน",
  general: "ความพึงพอใจ",
};
/** Read immutable server snapshots; never evaluate saved records against a current catalog. */
export function reportModel(data: StoredRecord) {
  const revision = object(data.revision),
    result = object(data.result),
    resolved = object(data.resolved);
  const environment = data.assessment_type === "environment",
    v3 = data.schema_version === 3;
  const version = environment ? revision.revision_no : data.data_version;
  return {
    data,
    code: String(data.submission_code),
    type: String(data.assessment_type),
    category: String(data.assessment_category),
    title:
      REPORT_TYPES[String(data.assessment_type)] ??
      String(data.assessment_type),
    group:
      !v3 && data.assessment_type === "satisfaction"
        ? "unknown"
        : String(data.assessment_group ?? "unknown"),
    schemaVersion: data.schema_version ?? 1,
    version: version ?? 1,
    revisionId: environment
      ? String(revision.revision_id ?? revision.id ?? "")
      : null,
    isLatest: data.is_latest !== false,
    archived: !!data.archived_at,
    measuredAt: environment
      ? revision.inspectionData
        ? object(revision.inspectionData).start_at
        : revision.measured_at
      : data.completed_at,
    savedAt: environment
      ? (revision.created_at ?? data.completed_at)
      : (data.version_created_at ?? data.created_at),
    questionnaireVersion:
      data.questionnaire_version ??
      resolved.questionnaire_version ??
      "legacy-unverified",
    scoringVersion:
      revision.scoring_version ?? result.scoring_version ?? "legacy-unverified",
    result,
    revision,
    resolved,
  };
}
export function environmentRevision(
  data: StoredRecord,
): EnvironmentRevisionV3 | null {
  return data.schema_version === 3 && data.assessment_type === "environment"
    ? (data.revision as EnvironmentRevisionV3)
    : null;
}
export function reportKey(data: StoredRecord) {
  const model = reportModel(data);
  return `${model.code}:${model.revisionId ?? model.version}`;
}

/** Nullable legacy results must stay unknown rather than becoming a failure. */
export function recordedPass(value: unknown) {
  return value === true || value === 1
    ? "ผ่าน"
    : value === false || value === 0
      ? "ไม่ผ่าน"
      : "ไม่มีข้อมูล";
}
