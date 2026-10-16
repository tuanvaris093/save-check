import {
  inspectionSchema,
  environmentUnitSchema,
  validateSubmission,
  validateEffectiveEnvironment,
  unchangedHeatUnitIds,
  evaluateEnvironment,
  LIGHT_SPOT_STANDARDS,
  retestSchema,
  prepareRetest,
  type EnvironmentSubmissionV3,
  type EnvironmentUnit,
  type EnvironmentRevisionV3,
} from "../../../shared/v3";
import type { LayoutFileInfo } from "@/types";
export const ENVIRONMENT_FORM_VERSION = "environment-form-v3-p5-2026-10-12";
export type Category = "light" | "noise" | "heat";
export type Mode = "create" | "retest" | "correction" | "supplement";
type Value = string | number;
export interface UnitDraft {
  point_id: string;
  kind: EnvironmentUnit["kind"];
  location_desc: string;
  remark: string;
  standard_code?: string;
  standard_target_lux?: Value;
  lux?: Value;
  surrounding_near_lux?: Value;
  surrounding_outer_lux?: Value;
  samples?: { sample_id: string; lux: Value }[];
  average_lux?: Value;
  minimum_lux?: Value;
  evaluation_basis?: "exposure-duration" | "twa8";
  min_dBA?: Value;
  max_dBA?: Value;
  exposure_level_dBA?: Value;
  exposure_duration_minutes?: Value;
  twa_8hr?: Value;
  wbgt_type?: "in" | "out";
  input_mode?: "meter_average" | "calculated_intervals";
  workload?: "light" | "moderate" | "heavy" | "";
  start_at?: string;
  end_at?: string;
  wbgt_average?: Value;
  db_temp?: Value;
  wb_temp?: Value;
  gt_temp?: Value;
  wbgt_in?: Value;
  standard_value?: Value;
  intervals?: { wb: Value; gt: Value; db?: Value; minutes: Value }[];
}
export interface EnvironmentSource {
  submission_code: string;
  assessment_type: string;
  assessment_category: Category;
  schema_version: number;
  data_version: number;
  archived_at?: string | null;
  is_latest: boolean;
  can_retest: boolean;
  needs_legacy_upgrade?: boolean;
  revision: EnvironmentRevisionV3 & { id?: string; points?: LegacyPoint[] };
  inspectionData: Record<string, string>;
  units?: EnvironmentUnit[];
  layout?: {
    file_id: string;
    file_name?: string;
    mime_type?: string;
    byte_size?: number;
    created_at?: string;
  };
  layout_snapshot?: { has_layout: number; download_url: string } | null;
}
interface LegacyPoint {
  point_key: string;
  location_desc: string;
  remark: string | null;
  inputs_json: string;
  standard_snapshot_json: string;
}
export interface EnvironmentDraft {
  inspection: Record<string, string>;
  units: UnitDraft[];
  layout: { file_id: string; file_name?: string } | null;
  pendingLayout?: LayoutFileInfo | null;
  layoutUploadKey?: string;
  reason: string;
  source?: EnvironmentSource;
}
export function localTime(iso: string) {
  if (!iso) return "";
  return new Date(Date.parse(iso) + 7 * 3600000).toISOString().slice(0, 16);
}
export function instantFromLocal(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? `${value}:00+07:00`
    : value;
}
const number = (value: Value | undefined) =>
  value === undefined || value === "" ? undefined : Number(value);
function areaValues(u: UnitDraft) {
  const samples = u.samples?.map((s) => number(s.lux));
  const complete =
    u.average_lux === undefined &&
    u.minimum_lux === undefined &&
    samples?.length &&
    samples.every((n) => n !== undefined && Number.isFinite(n));
  return {
    average_lux:
      number(u.average_lux) ??
      (complete
        ? (samples as number[]).reduce((sum, n) => sum + n, 0) / samples.length
        : undefined),
    minimum_lux:
      number(u.minimum_lux) ??
      (complete ? Math.min(...(samples as number[])) : undefined),
  };
}
export function normalizeAreaDraft(d: EnvironmentDraft): EnvironmentDraft {
  return {
    ...d,
    units: d.units.map((u) =>
      u.kind === "noise" && !u.evaluation_basis
        ? { ...u, evaluation_basis: "exposure-duration" as const }
        : u.kind === "heat" && !u.input_mode
          ? { ...u, input_mode: "meter_average" as const }
          : u.kind === "light_area" &&
              u.average_lux === undefined &&
              u.minimum_lux === undefined
            ? {
                ...u,
                average_lux: areaValues(u).average_lux ?? "",
                minimum_lux: areaValues(u).minimum_lux ?? "",
              }
            : u,
    ),
  };
}
export function unitFromDraft(u: UnitDraft): unknown {
  const base = {
    point_id: u.point_id,
    kind: u.kind,
    location_desc: u.location_desc,
    remark: u.remark || null,
  };
  if (u.kind === "light_spot") {
    const standard = LIGHT_SPOT_STANDARDS.find(
      (s) => s.code === u.standard_code,
    );
    const savedTarget = number(u.standard_target_lux);
    const target =
      standard &&
      (savedTarget === undefined ||
        !Number.isFinite(savedTarget) ||
        savedTarget < standard.min ||
        savedTarget > (standard.max ?? standard.min))
        ? standard.min
        : savedTarget;
    return {
      ...base,
      standard_code: u.standard_code,
      standard_target_lux: target,
      lux: number(u.lux),
      ...(Number(target) >= 1000
        ? {
            surrounding_near_lux: number(u.surrounding_near_lux),
            surrounding_outer_lux: number(u.surrounding_outer_lux),
          }
        : {}),
    };
  }
  if (u.kind === "light_area")
    return {
      ...base,
      standard_code: u.standard_code,
      ...areaValues(u),
    };
  if (u.kind === "noise")
    return {
      ...base,
      evaluation_basis: u.evaluation_basis,
      min_dBA: number(u.min_dBA),
      max_dBA: number(u.max_dBA),
      ...(u.evaluation_basis === "twa8"
        ? { twa_8hr: number(u.twa_8hr) }
        : {
            exposure_level_dBA: number(u.exposure_level_dBA),
            exposure_duration_minutes: number(u.exposure_duration_minutes),
          }),
    };
  return {
    ...base,
    wbgt_type: u.wbgt_type,
    input_mode: u.input_mode,
    workload: u.workload,
    start_at: instantFromLocal(u.start_at || ""),
    end_at: instantFromLocal(u.end_at || ""),
    ...(u.input_mode === "meter_average"
      ? {
          wbgt_average: number(u.wbgt_average),
          ...Object.fromEntries(
            [
              "db_temp",
              "wb_temp",
              "gt_temp",
              "wbgt_in",
              "standard_value",
            ].flatMap((key) => {
              const value =
                key === "standard_value" && u.standard_value === ""
                  ? 0
                  : number(u[key as keyof UnitDraft] as Value | undefined);
              return value === undefined ? [] : [[key, value]];
            }),
          ),
        }
      : {
          intervals: u.intervals?.map((i) => ({
            wb: number(i.wb),
            gt: number(i.gt),
            minutes: number(i.minutes),
            ...(u.wbgt_type === "out" ? { db: number(i.db) } : {}),
          })),
        }),
  };
}
export function inspectionFromDraft(d: EnvironmentDraft) {
  return {
    ...d.inspection,
    start_at: instantFromLocal(d.inspection.start_at),
    end_at: instantFromLocal(d.inspection.end_at),
  };
}
export function newUnit(category: Category, technique = ""): UnitDraft {
  const base = { point_id: crypto.randomUUID(), location_desc: "", remark: "" };
  if (category === "light")
    return technique === "area"
      ? {
          ...base,
          kind: "light_area",
          standard_code: "",
          average_lux: "",
          minimum_lux: "",
        }
      : {
          ...base,
          kind: "light_spot",
          standard_code: "",
          standard_target_lux: "",
          lux: "",
        };
  if (category === "noise")
    return {
      ...base,
      kind: "noise",
      evaluation_basis: "exposure-duration",
      min_dBA: "",
      max_dBA: "",
      exposure_level_dBA: "",
      exposure_duration_minutes: "",
      twa_8hr: "",
    };
  return {
    ...base,
    kind: "heat",
    wbgt_type: "in",
    input_mode: "meter_average",
    workload: "",
    start_at: "",
    end_at: "",
    wbgt_average: "",
    intervals: [{ wb: "", gt: "", minutes: "", db: "" }],
  };
}
export function freshEnvironment(category: Category): EnvironmentDraft {
  return {
    inspection: {
      inspector_name: "",
      position: "",
      inspection_location: "",
      inspection_date: "",
      start_at: "",
      end_at: "",
      equipment: "",
      serial_number: "",
      calibration_date: "",
      responsible_department: "",
      location_responsible_name: "",
    },
    units: category === "light" ? [] : [newUnit(category)],
    layout: null,
    reason: "",
  };
}
export function fromEnvironmentSource(
  source: EnvironmentSource,
): EnvironmentDraft {
  const inspection = { ...source.inspectionData };
  for (const k of ["start_at", "end_at"])
    inspection[k] = localTime(inspection[k]);
  const units: UnitDraft[] = (source.units || []).map((u) => ({
    ...u,
    remark: u.remark || "",
    ...(u.kind === "light_area"
      ? {
          average_lux:
            source.revision.observations.find(
              (o) => o.unit.point_id === u.point_id,
            )?.result.values.average ??
            u.average_lux ??
            "",
          minimum_lux:
            source.revision.observations.find(
              (o) => o.unit.point_id === u.point_id,
            )?.result.values.minimum ??
            u.minimum_lux ??
            "",
        }
      : {}),
    ...(u.kind === "heat"
      ? { start_at: localTime(u.start_at), end_at: localTime(u.end_at) }
      : {}),
  }));
  return {
    inspection,
    units,
    layout: source.layout || null,
    reason: "",
    source,
  };
}
export function legacyEnvironmentDraft(
  source: EnvironmentSource,
): EnvironmentDraft {
  const d = freshEnvironment(source.assessment_category);
  for (const key of Object.keys(d.inspection)) {
    if (typeof source.inspectionData?.[key] === "string")
      d.inspection[key] = source.inspectionData[key];
  }
  // Legacy start/end are clock times; preserve them on the original inspection date.
  for (const [clock, key] of [
    ["start_time", "start_at"],
    ["end_time", "end_at"],
  ]) {
    if (source.inspectionData?.[clock])
      d.inspection[key] =
        `${d.inspection.inspection_date}T${source.inspectionData[clock]}`;
    delete d.inspection[clock];
  }

  d.units = (source.revision.points || []).map((p) => {
    const raw = JSON.parse(p.inputs_json),
      std = JSON.parse(p.standard_snapshot_json);
    const u = {
      ...newUnit(source.assessment_category),
      point_id: p.point_key,
      location_desc: p.location_desc,
      remark: p.remark || "",
    };
    if (u.kind === "light_spot")
      Object.assign(u, {
        lux: raw.measure_value ?? "",
        standard_target_lux: std.standard_value ?? "",
      });
    if (u.kind === "noise")
      Object.assign(u, {
        min_dBA: raw.min_value ?? "",
        max_dBA: raw.max_value ?? "",
        exposure_level_dBA: raw.measure_value ?? "",
        twa_8hr: raw.measure_value ?? "",
      });
    if (u.kind === "heat")
      Object.assign(u, {
        wbgt_average: raw.measure_value ?? "",
        workload: raw.workload ?? "",
        wbgt_type: raw.wbgt_type ?? "",
        input_mode: "meter_average",
      });
    return u;
  });
  d.source = source;
  return d;
}
export function environmentPayload(
  d: EnvironmentDraft,
  category: Category,
  key: string,
): unknown {
  return {
    schema_version: 3,
    idempotency_key: key,
    assessment_type: "environment",
    assessment_group: "environment",
    assessment_category: category,
    inspectionData: inspectionFromDraft(d),
    layout: d.layout ? { file_id: d.layout.file_id } : undefined,
    units: d.units.map(unitFromDraft),
  };
}
export function checkedEnvironment(
  d: EnvironmentDraft,
  category: Category,
  key: string,
) {
  const input = environmentPayload(d, category, key);
  const parsed =
    d.source?.schema_version === 3
      ? validateEffectiveEnvironment(
          input,
          unchangedHeatUnitIds(
            d.source.revision.observations.map((o) => o.unit),
            d.units.map(unitFromDraft),
          ),
        )
      : validateSubmission(input);
  if (!parsed.success) return parsed;
  return {
    success: true as const,
    data: parsed.data as EnvironmentSubmissionV3,
  };
}
export function retestRequest(d: EnvironmentDraft, key: string) {
  const source = d.source!;
  const failed = new Set(
    source.revision.observations
      .filter((o) => !o.result.is_pass)
      .map((o) => o.unit.point_id),
  );
  const updates = d.units
    .filter((u) => failed.has(u.point_id))
    .map(unitFromDraft)
    .map((raw) => {
      const u = raw as Record<string, unknown>;
      const allowed = [
        "point_id",
        "kind",
        "remark",
        "lux",
        "surrounding_near_lux",
        "surrounding_outer_lux",
        "average_lux",
        "minimum_lux",
        "min_dBA",
        "max_dBA",
        "exposure_level_dBA",
        "twa_8hr",
        "start_at",
        "end_at",
        "wbgt_average",
        "input_mode",
        "db_temp",
        "wb_temp",
        "gt_temp",
        "wbgt_in",
        "intervals",
      ];
      return Object.fromEntries(
        Object.entries(u).filter(([k]) => allowed.includes(k)),
      );
    });
  return retestSchema.parse({
    schema_version: 3,
    idempotency_key: key,
    base_revision_id: source.revision.revision_id,
    inspectionData: inspectionFromDraft(d),
    ...(d.layout
      ? { layout: { file_id: d.layout.file_id } }
      : source.revision.layout_file_id
        ? { layout: null }
        : {}),
    inspection_date: d.inspection.inspection_date,
    start_at: instantFromLocal(d.inspection.start_at),
    end_at: instantFromLocal(d.inspection.end_at),
    updates,
  });
}
export function previewRetest(d: EnvironmentDraft, key: string) {
  return prepareRetest(d.source!.revision, retestRequest(d, key), "preview");
}
export function checkInspection(d: EnvironmentDraft, category: Category) {
  const schema = inspectionSchema.superRefine((v, ctx) => {
    if (Date.parse(v.end_at) <= Date.parse(v.start_at))
      ctx.addIssue({
        code: "custom",
        path: ["end_at"],
        message: "เวลาสิ้นสุดต้องหลังเวลาเริ่ม",
      });
    if (v.calibration_date > v.inspection_date)
      ctx.addIssue({
        code: "custom",
        path: ["calibration_date"],
        message: "วันที่ปรับเทียบต้องไม่หลังวันที่ตรวจ",
      });
    if (category === "light" && !v.measurement_technique)
      ctx.addIssue({
        code: "custom",
        path: ["measurement_technique"],
        message: "กรุณาเลือกเทคนิค",
      });
  });
  return schema.safeParse(inspectionFromDraft(d));
}
export function forRetest(source: EnvironmentSource): EnvironmentDraft {
  const d = fromEnvironmentSource(source);
  d.inspection.inspection_date = "";
  d.inspection.start_at = "";
  d.inspection.end_at = "";
  const failed = new Set(
    source.revision.observations
      .filter((o) => !o.result.is_pass)
      .map((o) => o.unit.point_id),
  );
  d.units = d.units.map((u) => {
    if (!failed.has(u.point_id)) return u;
    if (u.kind === "light_spot")
      return {
        ...u,
        lux: "",
        surrounding_near_lux: "",
        surrounding_outer_lux: "",
        remark: "",
      };
    if (u.kind === "light_area")
      return {
        ...u,
        average_lux: "",
        minimum_lux: "",
        remark: "",
      };
    if (u.kind === "noise")
      return {
        ...u,
        min_dBA: "",
        max_dBA: "",
        exposure_level_dBA: "",
        twa_8hr: "",
        remark: "",
      };
    return {
      ...u,
      start_at: "",
      end_at: "",
      wbgt_average: "",
      input_mode: "meter_average",
      db_temp: "",
      wb_temp: "",
      gt_temp: "",
      wbgt_in: "",
      intervals: u.intervals?.map((i) => ({
        ...i,
        wb: "",
        gt: "",
        db: u.wbgt_type === "out" ? "" : undefined,
        minutes: "",
      })),
      remark: "",
    };
  });
  return d;
}

// A local draft may be incomplete, but it must have a safe renderable shape.
// Server snapshots stored with edit/retest drafts are checked separately.
export function safeEnvironmentDraft(
  input: unknown,
): input is EnvironmentDraft {
  if (!input || typeof input !== "object") return false;
  const d = input as EnvironmentDraft;
  const record = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v);
  if (
    !record(d.inspection) ||
    Object.values(d.inspection).some((v) => typeof v !== "string") ||
    !Array.isArray(d.units) ||
    typeof d.reason !== "string"
  )
    return false;
  if (
    d.layout !== null &&
    (!record(d.layout) || typeof d.layout.file_id !== "string")
  )
    return false;
  if (
    d.pendingLayout &&
    (!record(d.pendingLayout) ||
      typeof d.pendingLayout.fileName !== "string" ||
      !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
        String(d.pendingLayout.fileType),
      ) ||
      typeof d.pendingLayout.fileSize !== "number" ||
      d.pendingLayout.fileSize <= 0 ||
      d.pendingLayout.fileSize > 10 * 1024 * 1024 ||
      typeof d.pendingLayout.fileData !== "string" ||
      !/^data:[^;]+;base64,[A-Za-z0-9+/]+=*$/.test(d.pendingLayout.fileData) ||
      typeof d.layoutUploadKey !== "string" ||
      !d.layoutUploadKey)
  )
    return false;
  const value = (v: unknown) =>
    v === undefined ||
    typeof v === "string" ||
    (typeof v === "number" && Number.isFinite(v));
  for (const u of d.units) {
    if (
      !record(u) ||
      !["light_spot", "light_area", "noise", "heat"].includes(String(u.kind)) ||
      typeof u.point_id !== "string" ||
      typeof u.location_desc !== "string" ||
      typeof u.remark !== "string"
    )
      return false;
    if (
      [
        "standard_code",
        "evaluation_basis",
        "wbgt_type",
        "input_mode",
        "workload",
        "start_at",
        "end_at",
      ].some((k) => u[k] !== undefined && typeof u[k] !== "string")
    )
      return false;
    if (
      [
        "lux",
        "standard_target_lux",
        "surrounding_near_lux",
        "surrounding_outer_lux",
        "min_dBA",
        "max_dBA",
        "exposure_level_dBA",
        "exposure_duration_minutes",
        "twa_8hr",
        "wbgt_average",
        "db_temp",
        "wb_temp",
        "gt_temp",
        "wbgt_in",
        "standard_value",
        "average_lux",
        "minimum_lux",
      ].some((k) => !value(u[k]))
    )
      return false;
    if (
      u.kind === "light_area" &&
      u.samples !== undefined &&
      (!Array.isArray(u.samples) ||
        u.samples.some(
          (s) => !record(s) || typeof s.sample_id !== "string" || !value(s.lux),
        ))
    )
      return false;
    if (
      u.intervals !== undefined &&
      (!Array.isArray(u.intervals) ||
        u.intervals.some(
          (i) =>
            !record(i) ||
            (["wb", "gt", "db", "minutes"] as const).some((k) => !value(i[k])),
        ))
    )
      return false;
    if (u.input_mode === "calculated_intervals" && !Array.isArray(u.intervals))
      return false;
  }
  if (d.source) {
    const s = d.source;
    if (
      !record(s) ||
      s.assessment_type !== "environment" ||
      !record(s.revision) ||
      typeof s.data_version !== "number"
    )
      return false;
    if (s.schema_version === 3) {
      if (
        typeof s.revision.revision_id !== "string" ||
        !Number.isInteger(s.revision.revision_no) ||
        !Array.isArray(s.revision.observations) ||
        !inspectionSchema.safeParse(s.revision.inspectionData).success
      )
        return false;
      for (const o of s.revision.observations) {
        if (
          !record(o) ||
          !environmentUnitSchema.safeParse(o.unit).success ||
          !record(o.result) ||
          typeof o.result.is_pass !== "boolean" ||
          typeof o.measured_at !== "string"
        )
          return false;
      }
    } else if (!Array.isArray(s.revision.points)) return false;
  }
  return true;
}

export function previewEnvironment(
  d: EnvironmentDraft,
  category: Category,
  key: string,
) {
  const parsed = checkedEnvironment(d, category, key);
  if (!parsed.success) return parsed;
  const payload = parsed.data,
    result = evaluateEnvironment(payload.units);
  const source = d.source?.schema_version === 3 ? d.source.revision : undefined;
  const carried = source
    ? unchangedHeatUnitIds(
        source.observations.map((o) => o.unit),
        payload.units,
      )
    : new Set<string>();
  const revision: EnvironmentRevisionV3 = {
    revision_id: "preview",
    kind: source ? "correction" : "initial",
    submission_id: source?.submission_id || 0,
    revision_no: (source?.revision_no || 0) + 1,
    base_revision_id: source?.revision_id || null,
    schema_version: 3,
    scoring_version: result.scoring_version,
    inspectionData: payload.inspectionData,
    layout_file_id: payload.layout?.file_id ?? null,
    observations: payload.units.map((unit, i) => {
      const previous = source?.observations.find(
        (o) => o.unit.point_id === unit.point_id,
      );
      return {
        unit,
        result: result.results[i],
        measured_at: carried.has(unit.point_id)
          ? previous!.measured_at
          : unit.kind === "heat"
            ? unit.start_at
            : payload.inspectionData.start_at,
        observation_kind:
          carried.has(unit.point_id) &&
          previous!.result.is_pass &&
          previous!.unit.location_desc === unit.location_desc &&
          previous!.unit.remark === unit.remark
            ? "carried"
            : "measured",
        carried_from_revision_id:
          carried.has(unit.point_id) &&
          previous!.result.is_pass &&
          previous!.unit.location_desc === unit.location_desc &&
          previous!.unit.remark === unit.remark
            ? previous!.carried_from_revision_id || source!.revision_id
            : null,
      };
    }),
    is_pass: result.is_pass,
    archived: false,
  };
  return { success: true as const, data: revision };
}
