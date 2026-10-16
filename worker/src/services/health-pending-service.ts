import {
  saveHealthPendingSchema,
  healthLightPendingPayloadSchema,
  type HealthPendingRecord,
  type HealthPendingList,
} from "../../../shared/v3";
import type { Env } from "../types";
import { canonical, digest, fail } from "../lib/errors";
type Row = {
  id: string;
  version: number;
  payload_json: string;
  payload_hash: string;
  created_at: string;
  updated_at: string;
  completed_submission_code: string | null;
};
export class HealthPendingService {
  constructor(readonly env: Env) {}
  async get(id: string): Promise<HealthPendingRecord> {
    const row = await this.row(id);
    if (!row) fail(404, "PENDING_NOT_FOUND", "ไม่พบแบบประเมินที่รอทำต่อ");
    return {
      id: row.id,
      version: row.version,
      created_at: row.created_at,
      updated_at: row.updated_at,
      payload: healthLightPendingPayloadSchema.parse(
        JSON.parse(row.payload_json),
      ),
      completed_submission_code: row.completed_submission_code,
    };
  }
  row(id: string) {
    return this.env.DB.prepare(
      `SELECT d.*,s.submission_code completed_submission_code FROM health_light_drafts d LEFT JOIN health_light_draft_completions c ON c.draft_id=d.id LEFT JOIN submissions s ON s.id=c.submission_id WHERE d.id=?`,
    )
      .bind(id)
      .first<Row>();
  }
  async save(input: unknown) {
    const request = saveHealthPendingSchema.parse(input),
      now = new Date().toISOString(),
      json = canonical(request.payload),
      hash = await digest(json);
    let row = await this.row(request.id);
    if (
      !row &&
      (await this.env.DB.prepare(
        "SELECT 1 FROM mutation_requests WHERE scope='create' AND idempotency_key=?",
      )
        .bind(request.id)
        .first())
    )
      fail(
        409,
        "PENDING_COMPLETED",
        "แบบประเมินนี้บันทึกผลแล้ว กรุณาเปิดผลจาก Dashboard",
      );
    if (row?.completed_submission_code)
      fail(
        409,
        "PENDING_COMPLETED",
        "แบบประเมินนี้บันทึกผลแล้ว กรุณาเปิดจาก Dashboard",
      );
    if (
      row?.version === request.expected_version + 1 &&
      row.payload_hash === hash
    )
      return { id: row.id, version: row.version, updated_at: row.updated_at };
    if (request.expected_version === 0) {
      await this.env.DB.prepare(
        `INSERT INTO health_light_drafts(id,version,payload_json,payload_hash,created_at,updated_at) VALUES(?,1,?,?,?,?) ON CONFLICT(id) DO NOTHING`,
      )
        .bind(request.id, json, hash, now, now)
        .run();
    } else {
      await this.env.DB.prepare(
        `UPDATE health_light_drafts SET version=version+1,payload_json=?,payload_hash=?,updated_at=? WHERE id=? AND version=? AND NOT EXISTS(SELECT 1 FROM health_light_draft_completions WHERE draft_id=health_light_drafts.id)`,
      )
        .bind(json, hash, now, request.id, request.expected_version)
        .run();
    }
    row = await this.row(request.id);
    if (
      !row ||
      row.completed_submission_code ||
      row.version !== request.expected_version + 1 ||
      row.payload_hash !== hash
    )
      fail(
        409,
        "PENDING_STALE",
        "มีการแก้ไขแบบประเมินจากอีกหน้า กรุณาเปิดรายการล่าสุดจาก Dashboard คำตอบในหน้านี้ยังอยู่",
      );
    return { id: row.id, version: row.version, updated_at: row.updated_at };
  }
  async list(page: number, limit: number): Promise<HealthPendingList> {
    const where = `NOT EXISTS(SELECT 1 FROM health_light_draft_completions c WHERE c.draft_id=d.id)`;
    const total = await this.env.DB.prepare(
      `SELECT COUNT(*) n FROM health_light_drafts d WHERE ${where}`,
    ).first<{ n: number }>();
    const rows = await this.env.DB.prepare(
      `SELECT d.id,d.version,d.updated_at,json_extract(d.payload_json,'$.profile.full_name') full_name,(SELECT COUNT(*) FROM json_each(json_extract(d.payload_json,'$.answers.after'))) after_answered FROM health_light_drafts d WHERE ${where} ORDER BY d.updated_at DESC,d.id LIMIT ? OFFSET ?`,
    )
      .bind(limit, (page - 1) * limit)
      .all<HealthPendingList["items"][number]>();
    return { items: rows.results, total: total?.n ?? 0, page, limit };
  }
}
