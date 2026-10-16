import { Hono } from "hono";
import type { Env } from "../types";
import { AssessmentService } from "../services/assessment-service";
import { AssessmentRepository } from "../repositories/assessment-repository";
import { readJson, fail } from "../lib/errors";
export const submissionsRoute = new Hono<{ Bindings: Env }>();

function pagination(pageInput?: string, limitInput?: string) {
  const page = Number(pageInput ?? 1),
    limit = Number(limitInput ?? 20);
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 1000000 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    fail(400, "PAGINATION", "เลขหน้าหรือจำนวนรายการไม่ถูกต้อง");
  return { page, limit };
}
submissionsRoute.post("/", async (c) =>
  c.json(
    {
      success: true,
      data: await new AssessmentService(c.env).create(
        await readJson(c.req.raw),
      ),
    },
    201,
  ),
);
submissionsRoute.post("/:code/retests", async (c) =>
  c.json(
    {
      success: true,
      data: await new AssessmentService(c.env).retest(
        c.req.param("code"),
        await readJson(c.req.raw),
      ),
    },
    201,
  ),
);
submissionsRoute.post("/:code/corrections", async (c) =>
  c.json(
    {
      success: true,
      data: await new AssessmentService(c.env).correct(
        c.req.param("code"),
        await readJson(c.req.raw),
      ),
    },
    201,
  ),
);
submissionsRoute.post("/:code/metadata-supplement", async (c) =>
  c.json(
    {
      success: true,
      data: await new AssessmentService(c.env).supplement(
        c.req.param("code"),
        await readJson(c.req.raw),
      ),
    },
    201,
  ),
);
const archiveRetired = () =>
  fail(
    410,
    "WORKFLOW_RETIRED",
    "ระบบบันทึกข้อมูลและประวัติตามปกติแล้ว ไม่ต้องเก็บเข้าคลัง",
  );
submissionsRoute.post("/:code/archive", archiveRetired);
submissionsRoute.post("/:code/restore", archiveRetired);
submissionsRoute.delete("/:code", archiveRetired);
submissionsRoute.patch("/:code", () =>
  fail(
    409,
    "REVISION_ACTION_REQUIRED",
    "ใช้ corrections หรือ retests เพื่อรักษาประวัติ",
  ),
);
submissionsRoute.patch("/:code/layout", () =>
  fail(
    409,
    "REVISION_ACTION_REQUIRED",
    "แก้ผังผ่าน corrections เพื่อรักษาประวัติ",
  ),
);
submissionsRoute.get("/:code/revisions", async (c) => {
  const repo = new AssessmentRepository(c.env.DB),
    h = await repo.header(c.req.param("code"));
  if (h.assessment_type !== "environment")
    fail(400, "REVISION_NOT_APPLICABLE", "งานนี้ไม่มีรอบตรวจ");
  const { page, limit } = pagination(c.req.query("page"), c.req.query("limit"));
  return c.json({
    success: true,
    data: await repo.history(h, page, limit, true),
  });
});
submissionsRoute.get("/:code/versions", async (c) => {
  const repo = new AssessmentRepository(c.env.DB),
    h = await repo.header(c.req.param("code"));
  const { page, limit } = pagination(c.req.query("page"), c.req.query("limit"));
  const rows = await repo
    .sql(
      "SELECT version_no,operation,created_at FROM submission_payload_versions WHERE submission_id=? ORDER BY version_no DESC LIMIT ? OFFSET ?",
      h.id,
      limit,
      (page - 1) * limit,
    )
    .all();
  const count = await repo
    .sql(
      "SELECT COUNT(*) total FROM submission_payload_versions WHERE submission_id=?",
      h.id,
    )
    .first<{ total: number }>();
  return c.json({
    success: true,
    data: {
      items: rows.results,
      data_version: h.data_version,
      page,
      limit,
      total: count?.total ?? 0,
      next_page: page * limit < (count?.total ?? 0) ? page + 1 : null,
    },
  });
});
submissionsRoute.get("/:code/audit", async (c) => {
  const repo = new AssessmentRepository(c.env.DB),
    h = await repo.header(c.req.param("code"));
  const { page, limit } = pagination(c.req.query("page"), c.req.query("limit"));
  const rows = await repo
    .sql(
      "SELECT id,revision_id,action,reason,created_at,before_json,after_json FROM assessment_audit_events WHERE submission_id=? ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?",
      h.id,
      limit,
      (page - 1) * limit,
    )
    .all();
  const count = await repo
    .sql(
      "SELECT COUNT(*) total FROM assessment_audit_events WHERE submission_id=?",
      h.id,
    )
    .first<{ total: number }>();
  return c.json({
    success: true,
    data: rows.results,
    pagination: {
      page,
      limit,
      total: count?.total ?? 0,
      next_page: page * limit < (count?.total ?? 0) ? page + 1 : null,
    },
  });
});
