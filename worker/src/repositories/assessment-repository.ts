import type {
  CreateSubmissionV3,
  EnvironmentRevisionV3,
  RevisionObservation,
} from "../../../shared/v3";
import { adaptLegacySubmission } from "../../../shared/v3";
import { fail } from "../lib/errors";
export interface Header {
  questionnaire_version: string | null;
  id: number;
  submission_code: string;
  assessment_type: "environment" | "health_risk" | "satisfaction";
  assessment_category: "light" | "noise" | "heat" | "general";
  assessment_group: string;
  schema_version: 1 | 3;
  data_version: number;
  latest_revision_id: string | null;
  archived_at: string | null;
  created_at: string;
  completed_at: string | null;
  overall_score: number | null;
  overall_level: string | null;
}
export interface RevisionRow {
  kind: "initial" | "retest" | "correction" | "legacy";
  id: string;
  submission_id: number;
  revision_no: number;
  schema_version: 1 | 3;
  base_revision_id: string | null;
  inspection_snapshot_json: string;
  result_json: string | null;
  layout_file_id: string | null;
  measured_at: string | null;
  created_at: string;
  is_pass: number | null;
  scoring_version: string;
  standard_version: string;
}
export interface PayloadVersion {
  version_no: number;
  payload_json: string;
  result_json: string;
  resolved_json: string;
  created_at: string;
  operation: string;
}
export class AssessmentRepository {
  constructor(readonly db: D1Database) {}
  sql(query: string, ...values: unknown[]) {
    return this.db
      .prepare(query)
      .bind(...values.map((v) => (v === undefined ? null : v)));
  }
  async header(code: string): Promise<Header> {
    const h = await this.sql(
      "SELECT * FROM submissions WHERE submission_code=?",
      code,
    ).first<Header>();
    return h ?? fail(404, "NOT_FOUND", "ไม่พบรายการประเมิน");
  }
  async version(h: Header, version = h.data_version) {
    return this.sql(
      "SELECT * FROM submission_payload_versions WHERE submission_id=? AND version_no=?",
      h.id,
      version,
    ).first<PayloadVersion>();
  }
  async revisionRow(h: Header, id = h.latest_revision_id) {
    if (!id)
      fail(
        409,
        "LEGACY_UPGRADE_REQUIRED",
        "งานนี้ยังไม่มีรอบตรวจที่อ่านย้อนหลังได้",
      );
    const r = await this.sql(
      "SELECT * FROM environment_revisions WHERE submission_id=? AND id=? AND status='finalized'",
      h.id,
      id,
    ).first<RevisionRow>();
    return r ?? fail(404, "REVISION_NOT_FOUND", "ไม่พบรอบตรวจของงานนี้");
  }
  async revision(
    h: Header,
    id = h.latest_revision_id,
  ): Promise<EnvironmentRevisionV3> {
    const r = await this.revisionRow(h, id);
    if (r.schema_version !== 3)
      fail(
        409,
        "LEGACY_UPGRADE_REQUIRED",
        "กรุณายืนยันข้อมูลเดิมและวิธีวัดก่อนตรวจซ้ำ",
      );
    const points = await this.sql(
      "SELECT * FROM environment_revision_points WHERE revision_id=? ORDER BY point_order",
      r.id,
    ).all<{
      inputs_json: string;
      result_json: string;
      measured_at: string;
      observation_kind: "measured" | "carried";
      carried_from_revision_id: string | null;
    }>();
    return {
      revision_id: r.id,
      kind: r.kind,
      submission_id: h.id,
      revision_no: r.revision_no,
      base_revision_id: r.base_revision_id,
      schema_version: 3,
      scoring_version: r.scoring_version,
      inspectionData: JSON.parse(r.inspection_snapshot_json),
      layout_file_id: r.layout_file_id,
      observations: points.results.map((p) => ({
        unit: JSON.parse(p.inputs_json),
        result: JSON.parse(p.result_json),
        measured_at: p.measured_at,
        observation_kind: p.observation_kind,
        carried_from_revision_id: p.carried_from_revision_id,
      })),
      is_pass: r.is_pass === 1,
      archived: false, // Archive flags are historical only after retirement.
    };
  }
  async result(code: string, revisionId?: string, dataVersion?: number) {
    const h = await this.header(code);
    if (h.assessment_type === "environment" && dataVersion !== undefined)
      fail(400, "VERSION_NOT_APPLICABLE", "งานสภาพแวดล้อมใช้ revision");
    if (h.assessment_type === "environment" && h.latest_revision_id) {
      const row = await this.revisionRow(h, revisionId);
      if (row.schema_version === 3) {
        const revision = await this.revision(h, row.id);
        const layout = revision.layout_file_id
          ? await this.sql(
              "SELECT id AS file_id,file_name,mime_type,byte_size,created_at FROM assessment_files WHERE id=?",
              revision.layout_file_id,
            ).first()
          : null;
        return {
          ...h,
          overall_score: null,
          overall_level: row.is_pass === 1 ? "pass" : "high_risk",
          completed_at: row.created_at,
          schema_version: 3,
          data_version: row.revision_no,
          revision: {
            ...revision,
            measured_at: row.measured_at,
            created_at: row.created_at,
          },
          inspectionData: revision.inspectionData,
          units: revision.observations.map((o) => o.unit),
          result: JSON.parse(row.result_json!),
          ...(layout ? { layout } : {}),
          can_retest: row.id === h.latest_revision_id && !revision.is_pass,
          is_latest: row.id === h.latest_revision_id,
        };
      }
      const points = (
        await this.sql(
          "SELECT * FROM environment_revision_points WHERE revision_id=? ORDER BY point_order",
          row.id,
        ).all<{
          point_key: string;
          inputs_json: string;
          standard_snapshot_json: string;
          location_desc: string;
          remark: string | null;
        }>()
      ).results;
      const values = points.map((p) => ({
        ...JSON.parse(p.inputs_json),
        location_desc: p.location_desc,
        remark: p.remark,
        standard_value: JSON.parse(p.standard_snapshot_json).standard_value,
      }));
      const answers =
        h.assessment_category === "light"
          ? {
              light_areas: values.map((p) => ({
                ...p,
                measure: p.measure_value,
              })),
            }
          : h.assessment_category === "noise"
            ? {
                standard_value: values[0]?.standard_value,
                noise_areas: values.map((p) => ({
                  ...p,
                  min_dBA: p.min_value,
                  max_dBA: p.max_value,
                  avg_dBA: p.measure_value,
                })),
              }
            : {
                heat_areas: values.map((p) => ({
                  ...p,
                  wbgt_avg: p.measure_value,
                  db_temp: p.temp_db,
                  wb_temp: p.temp_wb,
                  gt_temp: p.temp_gt,
                  wbgt_in: p.temp_wbgt,
                })),
              };
      const layout = await this.sql(
        "SELECT file_name,file_type,file_size,has_layout FROM legacy_layout_snapshots WHERE revision_id=?",
        row.id,
      ).first();
      return {
        ...h,
        schema_version: 1,
        legacy: adaptLegacySubmission({ ...h, schema_version: 1 }),
        inspectionData:
          JSON.parse(row.inspection_snapshot_json).legacy_inspections?.[0] ??
          null,
        answers,
        revision: {
          ...row,
          inspection_snapshot: JSON.parse(row.inspection_snapshot_json),
          points,
        },
        layout_snapshot: layout
          ? {
              ...layout,
              download_url: `/api/files/legacy/${encodeURIComponent(row.id)}`,
            }
          : null,
        can_retest: false,
        needs_legacy_upgrade:
          row.id === h.latest_revision_id && h.schema_version === 1,
        is_latest: row.id === h.latest_revision_id,
      };
    }
    if (revisionId)
      fail(
        400,
        "REVISION_NOT_APPLICABLE",
        "รอบตรวจใช้กับงานสภาพแวดล้อมเท่านั้น",
      );
    const version = await this.version(h, dataVersion);
    if (version) {
      const payload = JSON.parse(version.payload_json),
        result = JSON.parse(version.result_json);
      return {
        ...h,
        ...payload,
        id: h.id,
        submission_code: h.submission_code,
        data_version: version.version_no,
        overall_score:
          h.assessment_type === "satisfaction"
            ? result.overall_mean
            : h.assessment_category === "light"
              ? result.after_total
              : result.total,
        overall_level:
          h.assessment_type === "satisfaction"
            ? "pass"
            : h.assessment_category === "light"
              ? result.after_level
              : result.level,
        result,
        resolved: JSON.parse(version.resolved_json),
        version_created_at: version.created_at,
        is_latest: version.version_no === h.data_version,
      };
    }
    if (dataVersion !== undefined)
      fail(404, "VERSION_NOT_FOUND", "ไม่พบข้อมูลที่เลือก");
    const profile = await this.sql(
      "SELECT * FROM respondent_profiles WHERE submission_id=?",
      h.id,
    ).first();
    const workInfo = await this.sql(
      "SELECT * FROM respondent_work_infos WHERE submission_id=?",
      h.id,
    ).first();
    const answers = (
      await this.sql(
        `SELECT * FROM ${h.assessment_type === "health_risk" ? "health_risk_answers" : "satisfaction_answers"} WHERE submission_id=? ORDER BY id`,
        h.id,
      ).all()
    ).results;
    const raw = { ...h, profile, workInfo, answers };
    const mapped = Object.fromEntries(
      answers
        .filter((a) => typeof a.question_id === "string")
        .map((a) => [
          String(a.question_id),
          h.assessment_type === "health_risk" ? a.score : a.rating,
        ]),
    );
    const suggestion = answers.find(
      (a) => a.suggestion !== null && a.suggestion !== undefined,
    )?.suggestion;
    return {
      ...h,
      profile,
      workInfo,
      answers: {
        ...mapped,
        ...(suggestion !== undefined ? { suggestion } : {}),
      },
      legacy: adaptLegacySubmission(raw),
      can_retest: false,
    };
  }
  async replay(scope: string, key: string, hash: string) {
    const row = await this.sql(
      "SELECT request_hash,response_json FROM mutation_requests WHERE scope=? AND idempotency_key=?",
      scope,
      key,
    ).first<{ request_hash: string; response_json: string }>();
    if (!row) return null;
    if (row.request_hash !== hash)
      fail(409, "IDEMPOTENCY_CONFLICT", "รหัสคำขอเดิมมีข้อมูลต่างกัน");
    return JSON.parse(row.response_json) as Record<string, unknown>;
  }
  precondition(token: string, query: string, ...args: unknown[]) {
    return this.sql(
      `INSERT INTO mutation_preconditions(token,valid) VALUES(?,CASE WHEN (${query}) THEN 1 ELSE 0 END)`,
      token,
      ...args,
    );
  }
  finishCondition(token: string) {
    return this.sql("DELETE FROM mutation_preconditions WHERE token=?", token);
  }
  ledger(
    scope: string,
    key: string,
    hash: string,
    code: string,
    response: Record<string, unknown>,
    now: string,
    revisionId: string | null,
  ) {
    return this.sql(
      `INSERT INTO mutation_requests(scope,idempotency_key,request_hash,submission_id,revision_id,response_json,created_at) VALUES(?,?,?,(SELECT id FROM submissions WHERE submission_code=?),?,json_set(json(?),'$.id',(SELECT id FROM submissions WHERE submission_code=?)),?)`,
      scope,
      key,
      hash,
      code,
      revisionId,
      JSON.stringify(response),
      code,
      now,
    );
  }
  async commit(
    statements: D1PreparedStatement[],
    scope: string,
    key: string,
    hash: string,
  ) {
    try {
      await this.db.batch(statements);
    } catch (error) {
      const replay = await this.replay(scope, key, hash);
      if (replay) return replay;
      throw error;
    }
    return (await this.replay(scope, key, hash))!;
  }
  async history(h: Header, page: number, limit: number, currentOnly = false) {
    const current = currentOnly ? " AND schema_version=3" : "";
    const rows = await this.sql(
      `SELECT id,revision_no,base_revision_id,kind,schema_version,measured_at,created_at,is_pass,json_extract(inspection_snapshot_json,'$.inspector_name') AS inspector_name FROM environment_revisions WHERE submission_id=? AND status='finalized'${current} ORDER BY revision_no DESC LIMIT ? OFFSET ?`,
      h.id,
      limit,
      (page - 1) * limit,
    ).all();
    const count = await this.sql(
      `SELECT COUNT(*) total FROM environment_revisions WHERE submission_id=? AND status='finalized'${current}`,
      h.id,
    ).first<{ total: number }>();
    return {
      items: rows.results,
      total: count?.total ?? 0,
      page,
      limit,
      latest_revision_id: h.latest_revision_id,
    };
  }
}
export type { CreateSubmissionV3, RevisionObservation };
