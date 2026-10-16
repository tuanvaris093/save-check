import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const require = createRequire(resolve("worker/package.json")),
  esbuild = require("esbuild"),
  temp = mkdtempSync(join(tmpdir(), "safecheck-p7-unit-"));
for (const [entry, name] of [
  ["src/lib/v3/report-model.ts", "model"],
  ["src/lib/v3/report-export.ts", "export"],
  ["src/lib/v3/bulk-export.ts", "bulk"],
  ["worker/src/services/dashboard-service.ts", "dashboard"],
])
  esbuild.buildSync({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: join(temp, name + ".mjs"),
    logLevel: "silent",
    banner: {
      js: "import {createRequire as __createRequire} from 'node:module'; const require=__createRequire(import.meta.url);",
    },
  });
const model = await import(pathToFileURL(join(temp, "model.mjs"))),
  ex = await import(pathToFileURL(join(temp, "export.mjs"))),
  bulk = await import(pathToFileURL(join(temp, "bulk.mjs"))),
  xlsx = createRequire(resolve("package.json"))("xlsx"),
  checks = [];
async function check(name, fn) {
  await fn();
  checks.push(name);
  console.log("PASS " + checks.length + ": " + name);
}
const rows = (wb, name) => xlsx.utils.sheet_to_json(wb.Sheets[name]);
const health = {
  submission_code: "H",
  assessment_type: "health_risk",
  assessment_category: "light",
  assessment_group: "health",
  schema_version: 3,
  data_version: 2,
  is_latest: false,
  questionnaire_version: "stored-old",
  result: {
    before_total: 3,
    after_total: 5,
    delta: 2,
    after_level: "pass",
    scoring_version: "frozen",
  },
  profile: { full_name: "คนทดสอบ" },
  workInfo: { working_hours_per_week: 40 },
  answers: { before: { q1: 1 }, after: { q1: 2 } },
  resolved: {
    questions: {
      before: [{ question_id: "q1", text: "ก่อนที่บันทึก" }],
      after: [{ question_id: "q1", text: "หลังที่บันทึก" }],
    },
  },
};
const env = (n) => ({
  submission_code: "E",
  assessment_type: "environment",
  assessment_category: "light",
  assessment_group: "environment",
  schema_version: 3,
  data_version: n,
  is_latest: n === 12,
  revision: {
    revision_id: "r" + n,
    revision_no: n,
    is_pass: true,
    kind: n === 1 ? "initial" : "correction",
    scoring_version: "saved",
    inspectionData: { start_at: "2026-10-12T01:00:00Z" },
    layout_file_id: "file",
    observations: [
      {
        unit: {
          point_id: "p",
          kind: "light_area",
          location_desc: "พื้นที่",
          samples: [{ sample_id: "a", lux: 200 }],
        },
        measured_at: "2026-10-01T01:00:00Z",
        observation_kind: "carried",
        carried_from_revision_id: "r1",
        result: {
          is_pass: true,
          standard: {
            version: "frozen",
            document: "old.pdf",
            code: "old",
            thresholds: { average_min: 100 },
          },
          values: { average: 200, minimum: 200 },
        },
      },
    ],
  },
});
await check(
  "classic report opens with forms grouped by type/category, technical tables stay hidden",
  () => {
    const w = ex.buildReportWorkbook([health, env(12)]);
    const visible = w.SheetNames.filter(
      (name, index) => !w.Workbook.Sheets[index].Hidden,
    );
    assert.deepEqual(visible, [
      "ภาพรวมทั้งหมด",
      "สิ่งแวดล้อม-แสงสว่าง",
      "สุขภาพ-แสงสว่าง",
    ]);
    const overview = rows(w, "ภาพรวมทั้งหมด");
    assert.equal(overview.length, 2);
    assert.equal(overview[0]["ประเภท"], "อาการทางสุขภาพ");
    assert.equal(overview[0]["หมวดหมู่"], "แสงสว่าง");
    const h = rows(w, "สุขภาพ-แสงสว่าง")[0];
    assert.equal(h["คะแนนก่อน (เต็ม 20)"], 3);
    assert.equal(h["คะแนนหลัง (เต็ม 20)"], 5);
    assert.equal(h["ก่อน ข้อ 1 (ก่อนที่บันทึก)"], 1);
    assert.equal(h["หลัง ข้อ 1 (หลังที่บันทึก)"], 2);
    assert.equal(h["ชั่วโมงต่อสัปดาห์"], 40);
    const e = rows(w, "สิ่งแวดล้อม-แสงสว่าง")[0];
    assert.equal(e["ค่าเฉลี่ยพื้นที่ (Lux)"], 200);
    assert(!Object.hasOwn(e, "ค่าจุดย่อย (Lux)"));
    assert.equal(e["เกณฑ์เฉลี่ยพื้นที่ (Lux)"], 100);
    assert.equal(e["ที่มาค่าตรวจ"], "คงค่าจากรอบก่อน");
  },
);
await check(
  "selected immutable result/version never evaluates against current catalog",
  () => {
    const m = model.reportModel(health);
    assert.equal(m.version, 2);
    assert.equal(m.questionnaireVersion, "stored-old");
    assert.equal(m.result.after_total, 5);
    assert.equal(m.isLatest, false);
  },
);
await check(
  "health export keeps paired question IDs/phases, frozen wording, stored delta/level and weekly hours",
  () => {
    const w = ex.buildReportWorkbook([health]),
      h = rows(w, "อาการทางสุขภาพ")[0],
      a = rows(w, "คำตอบอาการ");
    assert.equal(h["ผลต่าง หลัง−ก่อน"], 2);
    assert.equal(h["คะแนนหลัง"], 5);
    assert.equal(h["ระดับจากคะแนนหลัง"], "pass");
    assert.equal(h["ชั่วโมงต่อสัปดาห์"], 40);
    assert.deepEqual(
      a.map((r) => [r.Phase, r["รหัสข้อ"], r["คำถามที่บันทึก"]]),
      [
        ["before", "q1", "ก่อนที่บันทึก"],
        ["after", "q1", "หลังที่บันทึก"],
      ],
    );
  },
);
await check(
  "legacy single health preserves recorded totals without fabricated before/after or current wording",
  () => {
    const w = ex.buildReportWorkbook([
        {
          submission_code: "OLD",
          schema_version: 1,
          assessment_type: "health_risk",
          assessment_category: "light",
          overall_score: 7,
          answers: { q1: 2 },
        },
      ]),
      r = rows(w, "อาการทางสุขภาพ")[0];
    assert.equal(r["คะแนน single หรือเดิม"], 7);
    assert.equal(r["คะแนนก่อน"], "");
    assert.equal(r["คะแนนหลัง"], "");
    assert.equal(rows(w, "คำตอบอาการ")[0].Phase, "legacy_single");
    assert.equal(rows(w, "คำตอบอาการ")[0]["คำถามที่บันทึก"], "");
  },
);
await check(
  "one row per job, separate revisions, carry source/date and area samples persist",
  () => {
    const w = ex.buildReportWorkbook([env(1), env(12)], "history");
    assert.equal(rows(w, "รายการงาน").length, 1);
    assert.equal(rows(w, "รอบตรวจ").length, 2);
    const p = rows(w, "ค่าตรวจ")[1];
    assert.equal(p["Carry จาก revision"], "r1");
    assert.equal(p["วันเวลาวัดจริง"], "2026-10-01T01:00:00Z");
    assert.equal(p["รุ่นมาตรฐาน"], "frozen");
    assert.equal(rows(w, "จุดย่อยและช่วงวัด").length, 2);
    assert.deepEqual(
      rows(w, "ภาพรวมทั้งหมด").map((r) => r["ครั้งที่บันทึก"]),
      [1, 12],
    );
    assert.deepEqual(
      rows(w, "สิ่งแวดล้อม-แสงสว่าง").map((r) => r["ครั้งที่บันทึก"]),
      [1, 12],
    );
  },
);
await check(
  "complete large snapshot is split into Excel-safe cells and reconstructs exactly",
  () => {
    const r = {
        ...health,
        suggestion: "ภาษาไทย".repeat(15000),
        profile: { full_name: "🙂".repeat(20000) },
      },
      w = ex.buildReportWorkbook([r]),
      parts = rows(w, "Snapshot ที่บันทึก").map(
        (v) => v["JSON (ต่อส่วนตามลำดับ)"],
      );
    assert(parts.length > 2);
    assert(parts.every((s) => s.length <= 30000));
    assert.deepEqual(JSON.parse(parts.join("")), r);
    const encoded = xlsx.write(w, { type: "buffer", bookType: "xlsx" }),
      decoded = xlsx.read(encoded, { type: "buffer" });
    const reconstructed = rows(decoded, "Snapshot ที่บันทึก")
      .map((v) => v["JSON (ต่อส่วนตามลำดับ)"])
      .join("");
    assert.deepEqual(JSON.parse(reconstructed), r);
    assert(rows(decoded, "ข้อมูลประกอบ")[0]["ค่า"].includes("ดูข้อมูลเต็ม"));
  },
);
function fakePage(p) {
  const start = (p.page - 1) * 10,
    items = Array.from({ length: Math.min(10, 103 - start) }, (_, i) => ({
      submission_code: "S" + (start + i),
      assessment_type: "satisfaction",
      data_version: 1,
    }));
  return {
    items,
    records: items.map((v) => ({
      ...v,
      assessment_category: "general",
      is_latest: true,
    })),
    total: 103,
    page: p.page,
    limit: 10,
    revision_pages: [],
    next_page: start + 10 < 103 ? p.page + 1 : null,
  };
}
await check(
  "bulk collector reads all 103 jobs through sequential pages with identical filters",
  async () => {
    let calls = 0;
    const out = await bulk.collectExportRecords(
      { group: "health", date_basis: "created" },
      undefined,
      async (p) => {
        assert.equal(p.group, "health");
        assert.equal(p.date_basis, "created");
        calls++;
        return fakePage(p);
      },
    );
    assert.equal(out.length, 103);
    assert.equal(calls, 11);
  },
);
await check(
  "history collector uses exact job and follows more than ten revisions without duplicates",
  async () => {
    const pages = [];
    const out = await bulk.collectExportRecords(
      { revision_scope: "history" },
      undefined,
      async (p) => {
        pages.push(p);
        const extra = p.revision_page === 2;
        return {
          items: [
            {
              submission_code: "E",
              assessment_type: "environment",
              latest_revision_id: "r12",
            },
          ],
          records: extra
            ? [env(2), env(1)]
            : Array.from({ length: 10 }, (_, i) => env(12 - i)),
          total: 1,
          page: 1,
          limit: 1,
          revision_pages: [
            {
              submission_code: "E",
              total: 12,
              page: extra ? 2 : 1,
              limit: 10,
              next_page: extra ? null : 2,
            },
          ],
          next_page: null,
        };
      },
    );
    assert.equal(out.length, 12);
    assert.equal(pages[1].submission_code, "E");
    assert.equal(pages[1].search, undefined);
  },
);
await check(
  "bulk aborts partial, duplicate, changed count/version and missing revision responses",
  async () => {
    await assert.rejects(
      () =>
        bulk.collectExportRecords({}, undefined, async (p) => ({
          ...fakePage(p),
          total: p.page === 1 ? 103 : 102,
        })),
      /จำนวนงานเปลี่ยน/,
    );
    await assert.rejects(
      () =>
        bulk.collectExportRecords({}, undefined, async (p) => ({
          ...fakePage(p),
          records: fakePage(p).records.map((r) => ({ ...r, data_version: 2 })),
        })),
      /ข้อมูลเปลี่ยน/,
    );
    await assert.rejects(
      () =>
        bulk.collectExportRecords({}, undefined, async (p) => ({
          ...fakePage(p),
          records: [],
        })),
      /ผลการประเมินไม่ครบ/,
    );
    await assert.rejects(
      () =>
        bulk.collectExportRecords({}, undefined, async () => ({
          items: [
            {
              submission_code: "E",
              assessment_type: "environment",
              latest_revision_id: "r12",
            },
          ],
          records: [env(12)],
          total: 1,
          page: 1,
          limit: 1,
          next_page: null,
          revision_pages: [
            {
              submission_code: "E",
              total: 2,
              page: 1,
              limit: 10,
              next_page: null,
            },
          ],
        })),
      /รอบตรวจส่งออกไม่ครบ/,
    );
  },
);
await check(
  "oversized export page restarts with smaller batches without partial downloads",
  async () => {
    let attempts = 0;
    const out = await bulk.collectExportRecords({}, undefined, async (p) => {
      attempts++;
      if (p.limit > 2) throw new bulk.ExportPageTooLarge("large");
      const offset = (p.page - 1) * p.limit,
        items = Array.from(
          { length: Math.min(p.limit, 7 - offset) },
          (_, i) => ({
            submission_code: "B" + (offset + i),
            assessment_type: "satisfaction",
            data_version: 1,
          }),
        );
      return {
        items,
        records: items.map((r) => ({ ...r, is_latest: true })),
        total: 7,
        page: p.page,
        limit: p.limit,
        revision_pages: [],
        next_page: offset + p.limit < 7 ? p.page + 1 : null,
      };
    });
    assert.equal(out.length, 7);
    assert.equal(attempts, 6);
  },
);

await check(
  "Worker bounds record payload bytes before accumulating a large response",
  async () => {
    const { DashboardService } = await import(
      pathToFileURL(join(temp, "dashboard.mjs"))
    );
    let loaded = 0;
    const service = new DashboardService({
      result: async (code) => {
        loaded++;
        return { submission_code: code, padding: "x".repeat(512 * 1024) };
      },
    });
    service.list = async () => ({
      items: Array.from({ length: 100 }, (_, i) => ({
        submission_code: "big" + i,
        assessment_type: "satisfaction",
      })),
      total: 100,
      page: 1,
      limit: 100,
      total_pages: 1,
    });
    await assert.rejects(
      () => service.export(new URL("http://local?limit=100")),
      (error) => error.code === "EXPORT_PAGE_TOO_LARGE",
    );
    assert(loaded <= 8, "must stop before accumulating all 100 records");
  },
);

writeFileSync(
  "docs/v3/baseline/p7-unit.json",
  JSON.stringify({ phase: "P7", passed: checks.length, checks }, null, 2),
);
console.log("P7 unit PASS " + checks.length);
