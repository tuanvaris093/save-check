import { createRequire } from "node:module";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  existsSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir, homedir } from "node:os";
import { spawn, spawnSync } from "node:child_process";
import assert from "node:assert/strict";
const require = createRequire(resolve("worker/package.json")),
  esbuild = require("esbuild"),
  { Miniflare, Log, LogLevel } = require("miniflare"),
  temp = mkdtempSync(join(tmpdir(), "safecheck-p7-e2e-")),
  script = join(temp, "worker.mjs"),
  front = "http://127.0.0.1:3044",
  api = "http://127.0.0.1:3045";
esbuild.buildSync({
  entryPoints: ["worker/src/index.ts"],
  bundle: true,
  platform: "browser",
  external: ["node:*"],
  format: "esm",
  outfile: script,
  logLevel: "silent",
});
const mf = new Miniflare({
  host: "127.0.0.1",
  port: 3045,
  modulesRoot: temp,
  modules: [
    { type: "ESModule", path: script, contents: readFileSync(script, "utf8") },
  ],
  compatibilityDate: "2024-09-23",
  compatibilityFlags: ["nodejs_compat"],
  d1Databases: ["DB"],
  r2Buckets: ["FILES"],
  bindings: { FRONTEND_URL: front, ENVIRONMENT: "test" },
  log: new Log(LogLevel.ERROR),
});
const db = await mf.getD1Database("DB");
const split = spawnSync(
  "python3",
  [
    "-c",
    `import sqlite3,json
from pathlib import Path
paths=sorted(Path('worker/src/db/migrations').glob('*.sql'));paths.insert(1,Path('worker/src/db/seed.sql'));scripts=[]
for p in paths:
 statements=[];buf=''
 for line in p.read_text().splitlines(True):
  buf+=line
  if sqlite3.complete_statement(buf):statements.append(buf);buf=''
 scripts.append(statements)
print(json.dumps(scripts))`,
  ],
  { encoding: "utf8" },
);
if (split.status) throw new Error(split.stderr);
for (const statements of JSON.parse(split.stdout))
  await db.batch(statements.map((sql) => db.prepare(sql)));
await mf.ready;
let pp = process.env.PLAYWRIGHT_MODULE_PATH;
for (const dir of readdirSync(join(homedir(), ".npm/_npx"))) {
  const p = join(
    homedir(),
    ".npm/_npx",
    dir,
    "node_modules/playwright/package.json",
  );
  if (!pp && existsSync(p)) pp = p;
}
if (!pp) throw new Error("Playwright missing");
const { chromium } = createRequire(pp)("playwright");
const next = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--turbopack",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3044",
  ],
  {
    env: {
      ...process.env,
      SAFECHECK_TEST_DIST_DIR: ".next-test-p7",
      NEXT_PUBLIC_API_BASE_URL: api + "/api",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
next.stdout.on("data", (d) => (logs += d));
next.stderr.on("data", (d) => (logs += d));
const browser = await chromium.launch({ headless: true }),
  context = await browser.newContext({ viewport: { width: 390, height: 844 } }),
  page = await context.newPage(),
  pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
let passed = 0;
const checks = [];
async function check(name, fn) {
  await fn();
  passed++;
  checks.push(name);
  console.log("PASS " + passed + ": " + name);
}
async function wait(fn) {
  for (let i = 0; i < 160; i++) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("condition timeout");
}
const key = () => crypto.randomUUID(),
  xlsx = createRequire(resolve("package.json"))("xlsx");
const rows = (w, name) => xlsx.utils.sheet_to_json(w.Sheets[name]);
async function call(path, body, method = "POST") {
  const r = await fetch(api + "/api" + path, {
    method,
    headers: {
      Origin: front,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const json = await r.json();
  return { status: r.status, json };
}
async function get(path) {
  const r = await call(path, undefined, "GET");
  assert.equal(r.status, 200, JSON.stringify(r.json));
  return r.json.data;
}
async function create(body) {
  const r = await call("/submissions", body);
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return get("/results/" + r.json.data.submission_code);
}
const answers = (n) =>
  Object.fromEntries(Array.from({ length: 10 }, (_, i) => ["q" + (i + 1), n]));
const inspection = {
  inspector_name: "ผู้ตรวจ P7",
  position: "ผู้ตรวจ",
  inspection_location: "อาคาร P7",
  inspection_date: "2026-10-12",
  start_at: "2026-10-12T01:00:00Z",
  end_at: "2026-10-12T04:00:00Z",
  equipment: "เครื่องวัด P7",
  serial_number: "P7-001",
  calibration_date: "2026-10-01",
  responsible_department: "ฝ่ายทดสอบ",
  location_responsible_name: "ผู้รับผิดชอบ P7",
};
const spot = (id, lux) => ({
  kind: "light_spot",
  point_id: id,
  location_desc: "จุด " + id,
  standard_code: "spot-office",
  standard_target_lux: 500,
  lux,
});
const profile = {
  full_name: "ผู้ตอบ P7",
  gender: "other",
  age: 22,
  weight: 60,
  height: 170,
  education_level: "bachelor",
  marital_status: "single",
  has_underlying_disease: false,
};
const workInfo = {
  position_type: "student",
  program_code: "program-07",
  study_year: 6,
  working_hours_per_day: 8,
  working_hours_per_week: 40,
};
const healthPayload = (category) => ({
  schema_version: 3,
  idempotency_key: key(),
  assessment_type: "health_risk",
  assessment_group: "health",
  assessment_category: category,
  profile,
  workInfo,
  ...(category === "light"
    ? {
        healthContext: { hours_worked_today: 8 },
        answers: { before: answers(0), after: answers(1) },
      }
    : category === "noise"
      ? {
          healthContext: { noise_sources: ["none"] },
          answers: { single: answers(1) },
        }
      : { answers: { single: answers(2) } }),
});
const satPayload = (group) => ({
  schema_version: 3,
  idempotency_key: key(),
  assessment_type: "satisfaction",
  assessment_category: "general",
  assessment_group: group,
  profile: { full_name: "ผู้ตอบ P7 " + group },
  answers: Object.fromEntries(
    Array.from({ length: 16 }, (_, i) => [
      "q" + (i + 1),
      group === "health" ? 4 : 5,
    ]),
  ),
  ...(group === "health"
    ? {
        workInfo: {
          position_type: "student",
          program_code: "program-07",
          study_year: 6,
        },
      }
    : {
        durations: {
          traditional: { days: 1, hours: 2, minutes: 3, seconds: 4 },
          safecheck: { days: 0, hours: 0, minutes: 0, seconds: 1 },
        },
      }),
});
let file, spotJob, retested, health, sat, area, noise, heat;
const summaryRecords = [];
async function environment(units, category = "light", technique = "spot") {
  return create({
    schema_version: 3,
    idempotency_key: key(),
    assessment_type: "environment",
    assessment_group: "environment",
    assessment_category: category,
    inspectionData: {
      ...inspection,
      ...(category === "light" ? { measurement_technique: technique } : {}),
    },
    layout: { file_id: file },
    units,
  });
}
async function openResult(r, query = "") {
  await page.goto(front + "/result?submissionId=" + r.submission_code + query);
  await page.locator("[data-report-version]").waitFor();
}
async function download(button = "ดาวน์โหลด Excel") {
  const p = page.waitForEvent("download");
  await page.getByRole("button", { name: button, exact: true }).click();
  const d = await p;
  return {
    name: d.suggestedFilename(),
    wb: xlsx.readFile(await d.path(), { cellStyles: true }),
  };
}
try {
  await wait(async () => {
    try {
      return (await fetch(front + "/")).ok;
    } catch {
      return false;
    }
  });
  await check(
    "actual local fixtures cover Spot/Area/noise/WBGT, all health and both satisfaction groups",
    async () => {
      const uploaded = await fetch(api + "/api/files", {
        method: "POST",
        headers: {
          Origin: front,
          "Content-Type": "image/png",
          "X-File-Name": encodeURIComponent("ผัง P7.png"),
          "Idempotency-Key": key(),
        },
        body: Uint8Array.from(
          Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3WQAAAAASUVORK5CYII=",
            "base64",
          ),
        ),
      });
      const up = await uploaded.json();
      assert.equal(up.success, true, JSON.stringify(up));
      file = up.data.file_id;
      spotJob = await environment([spot("ผ่าน", 600), spot("ไม่ผ่าน", 100)]);
      const rr = await call(
        "/submissions/" + spotJob.submission_code + "/retests",
        {
          schema_version: 3,
          idempotency_key: key(),
          base_revision_id: spotJob.revision.revision_id,
          inspection_date: "2026-10-13",
          start_at: "2026-10-13T01:00:00Z",
          end_at: "2026-10-13T04:00:00Z",
          updates: [{ kind: "light_spot", point_id: "ไม่ผ่าน", lux: 600 }],
        },
      );
      assert.equal(rr.status, 201, JSON.stringify(rr.json));
      retested = await get("/results/" + spotJob.submission_code);
      area = await environment(
        [
          {
            kind: "light_area",
            point_id: "area",
            location_desc: "พื้นที่ Area",
            standard_code: "area-office",
            samples: [
              { sample_id: "a1", lux: 100 },
              { sample_id: "a2", lux: 600 },
            ],
          },
        ],
        "light",
        "area",
      );
      noise = await environment(
        [
          {
            kind: "noise",
            point_id: "n1",
            location_desc: "เสียง 1",
            evaluation_basis: "exposure-duration",
            exposure_duration_minutes: 240,
            exposure_level_dBA: 89,
            min_dBA: 70,
            max_dBA: 100,
          },
          {
            kind: "noise",
            point_id: "n2",
            location_desc: "เสียง 2",
            evaluation_basis: "twa8",
            twa_8hr: 80,
            min_dBA: 70,
            max_dBA: 90,
          },
        ],
        "noise",
      );
      heat = await environment(
        [
          {
            kind: "heat",
            point_id: "h1",
            location_desc: "ความร้อน",
            wbgt_type: "out",
            input_mode: "calculated_intervals",
            workload: "heavy",
            start_at: inspection.start_at,
            end_at: "2026-10-12T03:00:00Z",
            intervals: [
              { wb: 30, gt: 40, db: 35, minutes: 60 },
              { wb: 28, gt: 35, db: 33, minutes: 60 },
            ],
          },
        ],
        "heat",
      );
      health = await create(healthPayload("light"));
      summaryRecords.push(await create(healthPayload("noise")));
      summaryRecords.push(await create(healthPayload("heat")));
      sat = await create(satPayload("environment"));
      summaryRecords.push(await create(satPayload("health")));
      summaryRecords.push(spotJob, area, noise, heat, health, sat);
    },
  );
  await check(
    "one global spinner stays centered until parallel dashboard loads both finish",
    async () => {
      let releaseRows, releaseSummary;
      const rowsGate = new Promise((r) => {
        releaseRows = r;
      });
      const summaryGate = new Promise((r) => {
        releaseSummary = r;
      });
      const seen = new Set();
      const pattern = api + "/api/dashboard/**";
      const handler = async (route) => {
        if (route.request().url().includes("/submissions")) {
          seen.add("rows");
          await rowsGate;
        }
        if (route.request().url().includes("/summary")) {
          seen.add("summary");
          await summaryGate;
        }
        await route.continue();
      };
      await page.route(pattern, handler);
      try {
        await page.goto(front + "/dashboard");
        await wait(async () => seen.size === 2);
        const overlay = page.locator("[data-global-loading]");
        assert.equal(await overlay.count(), 1);
        assert.equal(
          await overlay.getByText("กำลังโหลด", { exact: true }).count(),
          1,
        );
        const box = await overlay.getByRole("dialog").boundingBox(),
          viewport = page.viewportSize();
        assert(Math.abs(box.x + box.width / 2 - viewport.width / 2) < 2);
        assert(Math.abs(box.y + box.height / 2 - viewport.height / 2) < 2);
        assert.equal(await overlay.locator("svg.animate-spin").count(), 1);
        assert.deepEqual(
          await overlay.getByRole("dialog").evaluate((el) => {
            const style = getComputedStyle(el);
            return {
              background: style.backgroundColor,
              shadow: style.boxShadow,
              border: style.borderTopWidth,
            };
          }),
          { background: "rgba(0, 0, 0, 0)", shadow: "none", border: "0px" },
        );
        await page.screenshot({
          path: "docs/v3/baseline/global-loading-mobile.png",
        });
        const rowResponse = page.waitForResponse((r) =>
          r.url().includes("/dashboard/submissions"),
        );
        releaseRows();
        await rowResponse;
        assert(await overlay.isVisible());
        releaseSummary();
        await overlay.waitFor({ state: "hidden" });
        await page.locator("[data-dashboard-list]").waitFor();
      } finally {
        releaseRows();
        releaseSummary();
        await page.unroute(pattern, handler);
      }
    },
  );
  await check(
    "dashboard shows created_at and sorts by actual creation time in both directions, including timezone offsets",
    async () => {
      // Isolated test fixtures: lexical ordering of these two timestamps differs from actual chronology.
      await db
        .prepare("UPDATE submissions SET created_at=? WHERE submission_code=?")
        .bind("2026-10-16T08:05:00+07:00", area.submission_code)
        .run();
      await db
        .prepare("UPDATE submissions SET created_at=? WHERE submission_code=?")
        .bind("2026-10-16T01:30:00Z", spotJob.submission_code)
        .run();
      for (const order of ["asc", "desc"]) {
        const result = await get(
          "/dashboard/submissions?limit=100&sort_order=" + order,
        );
        for (let i = 1; i < result.items.length; i++) {
          const before = Date.parse(result.items[i - 1].created_at),
            after = Date.parse(result.items[i].created_at);
          assert(order === "asc" ? before <= after : before >= after);
        }
        const codes = result.items.map((r) => r.submission_code);
        assert(
          order === "asc"
            ? codes.indexOf(area.submission_code) <
                codes.indexOf(spotJob.submission_code)
            : codes.indexOf(spotJob.submission_code) <
                codes.indexOf(area.submission_code),
        );
      }
      await page.goto(front + "/dashboard");
      await page.locator("[data-dashboard-list]").waitFor();
      assert.equal(
        await page
          .getByLabel("กรองช่วงวันที่ตาม", { exact: true })
          .inputValue(),
        "created",
      );
      for (const order of ["asc", "desc"]) {
        const response = page.waitForResponse(
          (r) =>
            r.url().includes("/dashboard/submissions?") &&
            r.url().includes("sort_order=" + order),
        );
        await page
          .getByLabel("เรียงวันที่", { exact: true })
          .selectOption(order);
        const result = (await (await response).json()).data;
        await page.locator("[data-dashboard-list]").waitFor();
        await page
          .locator("[data-global-loading]")
          .waitFor({ state: "hidden" });
        const rows = page.locator("[data-dashboard-list] > tr");
        for (let i = 0; i < result.items.length; i++) {
          const item = result.items[i];
          assert.equal(
            await rows.nth(i).locator("td").nth(0).innerText(),
            new Date(item.created_at).toLocaleDateString("th-TH", {
              timeZone: "Asia/Bangkok",
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          );
          assert.equal(
            await rows.nth(i).locator("td").nth(1).innerText(),
            item.submission_code,
          );
        }
      }
      await page.screenshot({
        path: "docs/v3/baseline/dashboard-created-order.png",
        fullPage: true,
      });
    },
  );
  await check(
    "health paired result and selected Excel totals/wording/metadata exactly match stored API",
    async () => {
      await openResult(health);
      await page.locator("[data-health-totals]").waitFor();
      assert(
        (await page.locator("[data-health-totals]").innerText()).includes(
          "ผลต่าง (หลัง−ก่อน): +10",
        ),
      );
      assert.equal(
        await page.locator("[data-health-comparison] tbody tr").count(),
        10,
      );
      const d = await download(),
        r = rows(d.wb, "อาการทางสุขภาพ")[0];
      assert.equal(r["คะแนนก่อน"], health.result.before_total);
      assert.equal(r["คะแนนหลัง"], health.result.after_total);
      assert.equal(r["ระดับจากคะแนนหลัง"], health.result.after_level);
      assert.equal(r["ชั่วโมงต่อสัปดาห์"], 40);
      assert.equal(rows(d.wb, "คำตอบอาการ").length, 20);
      const form = rows(d.wb, "สุขภาพ-แสงสว่าง")[0];
      assert.equal(form["คะแนนก่อน (เต็ม 20)"], health.result.before_total);
      assert.equal(form["คะแนนหลัง (เต็ม 20)"], health.result.after_total);
      assert.equal(
        Object.keys(form).filter((key) => /^(ก่อน|หลัง) ข้อ /.test(key)).length,
        20,
      );
      assert.equal(form["ชื่อและนามสกุล"], health.profile.full_name);
      assert.equal(d.wb.SheetNames[0], "ภาพรวมทั้งหมด");
      assert.equal(d.name, `safecheck-${health.submission_code}.xlsx`);
    },
  );
  await check(
    "environment selected history retains old failure, date/thresholds; only current failed jobs expose retest",
    async () => {
      await openResult(spotJob, "&revision=" + spotJob.revision.revision_id);
      await page.locator("[data-environment-summary]").waitFor();
      assert.equal(
        await page
          .getByRole("link", { name: "ประเมินวัดซ้ำ", exact: true })
          .count(),
        0,
      );
      assert.equal(
        await page
          .getByRole("link", { name: "ประเมินวัดซ้ำ", exact: true })
          .count(),
        0,
      );
      assert(
        (await page.locator("[data-report-version]").innerText()).includes(
          "ย้อนหลัง",
        ),
      );
      const d = await download();
      assert(d.name.includes("-round-1"));
      assert.equal(rows(d.wb, "รอบตรวจ")[0]["ผ่านเกณฑ์"], false);
      assert.equal(
        rows(d.wb, "ค่าตรวจ")[0]["วันเวลาวัดจริง"],
        "2026-10-12T01:00:00Z",
      );
      await openResult(retested);
      assert.equal(
        await page
          .getByRole("link", { name: "ประเมินวัดซ้ำ", exact: true })
          .count(),
        0,
      );
      assert.equal(
        await page
          .getByRole("link", { name: "ประเมินวัดซ้ำ", exact: true })
          .count(),
        0,
      );
      const latest = await download(),
        p = rows(latest.wb, "ค่าตรวจ").find(
          (p) => p["ที่มาค่าตรวจ"] === "carried",
        );
      assert.equal(p["Carry จาก revision"], spotJob.revision.revision_id);
      assert.equal(p["วันเวลาวัดจริง"], "2026-10-12T01:00:00Z");
      assert(
        rows(latest.wb, "สิ่งแวดล้อม-แสงสว่าง").some(
          (row) => row["ที่มาค่าตรวจ"] === "คงค่าจากรอบก่อน",
        ),
      );
      await openResult(noise);
      await page
        .getByRole("link", { name: "ประเมินวัดซ้ำ", exact: true })
        .waitFor();
      await page
        .getByRole("link", { name: "ประเมินวัดซ้ำ", exact: true })
        .waitFor();
    },
  );
  await check(
    "Area samples, noise duration thresholds and WBGT intervals are exported from snapshots",
    async () => {
      for (const r of [area, noise, heat]) {
        await openResult(r);
        await page.locator("[data-environment-summary]").waitFor();
        const d = await download(),
          units = rows(d.wb, "ค่าตรวจ");
        assert.equal(units.length, r.revision.observations.length);
        for (let i = 0; i < units.length; i++) {
          assert.deepEqual(
            JSON.parse(units[i]["เกณฑ์ JSON"]),
            r.revision.observations[i].result.standard.thresholds,
          );
          assert.deepEqual(
            JSON.parse(units[i]["ผลค่าตรวจ JSON"]),
            r.revision.observations[i].result.values,
          );
        }
        if (r === area) assert.equal(rows(d.wb, "จุดย่อยและช่วงวัด").length, 2);
        if (r === area) {
          const form = rows(d.wb, "สิ่งแวดล้อม-แสงสว่าง");
          assert.equal(form.length, 1);
          assert.equal(form[0]["ค่าเฉลี่ยพื้นที่ (Lux)"], 350);
          assert.equal(form[0]["ค่าต่ำสุดพื้นที่ (Lux)"], 100);
          assert(!Object.hasOwn(form[0], "ค่าจุดย่อย (Lux)"));
          assert.equal(
            form[0]["เกณฑ์เฉลี่ยพื้นที่ (Lux)"],
            r.revision.observations[0].result.standard.thresholds.average_min,
          );
        }
        if (r === noise)
          assert.equal(
            rows(d.wb, "สิ่งแวดล้อม-เสียง")[0]["ระยะเวลาสัมผัส (นาที)"],
            r.revision.observations[0].unit.exposure_duration_minutes,
          );
        if (r === heat)
          assert.equal(
            rows(d.wb, "สิ่งแวดล้อม-ความร้อน")[0]["ระยะเวลาช่วงวัด (นาที)"],
            60,
          );
        if (r === heat)
          assert.equal(rows(d.wb, "จุดย่อยและช่วงวัด")[0]["ระยะเวลา"], 60);
      }
    },
  );
  await check(
    "satisfaction version correction and history selector keep selected wording, mean and manual duration",
    async () => {
      const payload = satPayload("environment");
      payload.answers.q1 = 1;
      const response = await call(
        "/submissions/" + sat.submission_code + "/corrections",
        {
          schema_version: 3,
          idempotency_key: key(),
          reason: "แก้คะแนนที่กรอกผิด",
          expected_data_version: 1,
          payload,
        },
      );
      assert.equal(response.status, 201, JSON.stringify(response.json));
      await openResult(sat);
      assert.equal(
        await page.getByText("ประวัติรุ่นข้อมูล", { exact: false }).count(),
        0,
      );
      await openResult(sat, "&version=1");
      await page
        .locator("[data-report-version]")
        .filter({ hasText: "ย้อนหลัง" })
        .waitFor();
      assert.equal(
        await page.getByRole("link", { name: "แก้ไขพร้อมเหตุผล" }).count(),
        0,
      );
      const d = await download(),
        r = rows(d.wb, "ความพึงพอใจ")[0];
      assert.equal(r["คะแนนเฉลี่ยรวม (เต็ม 5)"], 5);
      assert.equal(r["เวลาวิธีเดิม (วินาที)"], 93784);
      assert.equal(r["ผลต่างเวลา วิธีเดิม−SafeCheck (วินาที)"], 93783);
      assert.equal(d.name, `safecheck-${sat.submission_code}.xlsx`);
      assert.equal(rows(d.wb, "คำถามที่บันทึก").length, 16);
    },
  );
  await check(
    "legacy data is excluded from current UI while its stored source remains intact",
    async () => {
      for (const code of [
        "SUB-20260903-3003",
        "SUB-20260902-2002",
        "SUB-20260904-4004",
      ]) {
        const before = await get("/results/" + code);
        await page.goto(front + "/result?submissionId=" + code);
        await page
          .getByRole("alert")
          .filter({ hasText: "ไม่พบรายการประเมินในข้อมูลปัจจุบัน" })
          .waitFor();
        assert.equal(
          await page
            .getByRole("button", { name: "ดาวน์โหลด Excel", exact: true })
            .count(),
          0,
        );
        assert.equal(await page.locator("[data-legacy-report]").count(), 0);
        assert.deepEqual(await get("/results/" + code), before);
      }
    },
  );
  await check(
    "API date basis/filter validation, one job per code, SQL grouped satisfaction averages",
    async () => {
      const q = "type=environment&submission_code=" + spotJob.submission_code;
      assert.equal(
        (
          await get(
            "/dashboard/submissions?" +
              q +
              "&date_basis=latest_measurement&start_date=2026-10-13&end_date=2026-10-13",
          )
        ).total,
        1,
      );
      assert.equal(
        (
          await get(
            "/dashboard/submissions?" +
              q +
              "&date_basis=created&start_date=2026-10-13&end_date=2026-10-13",
          )
        ).total,
        0,
      );
      for (const filter of [
        "date_basis=bad",
        "start_date=2026-02-30",
        "start_date=2026-10-15&end_date=2026-10-01",
        "revision_scope=bad",
      ])
        assert.equal(
          (
            await call(
              "/dashboard/" +
                (filter.includes("revision_scope")
                  ? "export-data"
                  : "submissions") +
                "?" +
                filter,
              undefined,
              "GET",
            )
          ).status,
          400,
        );
      const summary = await get("/dashboard/summary?type=environment");
      assert.equal(summary.by_type.environment, 4);
      assert.equal(summary.total_environment_revisions, 5);
      assert.equal(
        (await get("/dashboard/summary?type=satisfaction&group=health"))
          .satisfaction_avg_by_group.health,
        4,
      );
    },
  );
  await check(
    "dashboard filters apply identically to cards/list/XLSX with mobile without overflow",
    async () => {
      await page.goto(front + "/dashboard");
      await page.locator("[data-dashboard-list]").waitFor();
      const allForms = await download("ส่งออก Excel ทุกงานตามตัวกรอง");
      const visibleForms = allForms.wb.SheetNames.filter(
        (name, index) => !allForms.wb.Workbook?.Sheets?.[index]?.Hidden,
      );
      assert.deepEqual(visibleForms, [
        "ภาพรวมทั้งหมด",
        "สิ่งแวดล้อม-แสงสว่าง",
        "สิ่งแวดล้อม-เสียง",
        "สิ่งแวดล้อม-ความร้อน",
        "สุขภาพ-แสงสว่าง",
        "สุขภาพ-เสียง",
        "สุขภาพ-ความร้อน",
        "ความพึงพอใจ-สภาพแวดล้อม",
        "ความพึงพอใจ-อาการทางสุขภาพ",
      ]);
      assert.deepEqual(allForms.wb.SheetNames, visibleForms);
      for (const name of visibleForms) {
        const headers = xlsx.utils.sheet_to_json(allForms.wb.Sheets[name], {
          header: 1,
        })[0];
        assert.deepEqual(headers.slice(0, 3), [
          "ลำดับ",
          "รหัสการประเมิน",
          "วันที่และเวลา",
        ]);
        assert(
          !headers.some((h) =>
            /รหัสไฟล์|รหัสรอบ|รหัสจุด|รหัสเกณฑ์|รุ่น|JSON|Schema|ค่าเป้าหมายที่เลือก/.test(
              h,
            ),
          ),
        );
      }
      // Compare every populated form field with the saved API record, including optional zero values.
      for (const overview of rows(allForms.wb, "ภาพรวมทั้งหมด")) {
        const saved = await get("/results/" + overview["รหัสการประเมิน"]);
        const dateValue = (v) =>
          25569 +
          (Date.parse(v) + (/^\d{4}-\d{2}-\d{2}$/.test(v) ? 0 : 25200000)) /
            86400000;
        assert(
          Math.abs(overview["วันที่และเวลา"] - dateValue(saved.created_at)) <
            1e-8,
        );
        const category = {
          light: "แสงสว่าง",
          noise: "เสียง",
          heat: "ความร้อน",
        }[saved.assessment_category];
        const name =
          saved.assessment_type === "environment"
            ? `สิ่งแวดล้อม-${category}`
            : saved.assessment_type === "health_risk"
              ? `สุขภาพ-${category}`
              : saved.assessment_group === "health"
                ? "ความพึงพอใจ-อาการทางสุขภาพ"
                : "ความพึงพอใจ-สภาพแวดล้อม";
        const exported = rows(allForms.wb, name).filter(
          (r) => r["รหัสการประเมิน"] === saved.submission_code,
        );
        const matches = (row, data, mapping) => {
          for (const [field, column] of Object.entries(mapping))
            if (data?.[field] != null)
              assert.equal(row[column], data[field], `${name}: ${field}`);
        };
        if (saved.assessment_type === "environment") {
          if (saved.layout?.file_id) {
            const expected = `${api}/api/files/${encodeURIComponent(saved.layout.file_id)}`;
            for (const sheetName of ["ภาพรวมทั้งหมด", name]) {
              assert.ok(
                Object.values(allForms.wb.Sheets[sheetName]).some(
                  (cell) =>
                    cell?.v === saved.layout.file_name &&
                    cell?.l?.Target === expected,
                ),
                `${sheetName}: filename must link to its saved attachment`,
              );
            }
            const linked = await fetch(expected);
            assert.equal(linked.status, 200);
            assert.equal(
              (await linked.arrayBuffer()).byteLength,
              saved.layout.byte_size,
            );
          }
          for (const row of exported) {
            matches(row, saved.inspectionData, {
              inspector_name: "ผู้ตรวจวัด",
              position: "ตำแหน่งผู้ตรวจ",
              inspection_location: "สถานที่ตรวจวัด",
              equipment: "อุปกรณ์ที่ใช้",
              serial_number: "หมายเลขเครื่อง",
              responsible_department: "แผนกที่รับผิดชอบ",
              location_responsible_name: "ผู้รับผิดชอบอาคารหรือสถานที่",
            });
            assert.equal(
              row["ชื่อไฟล์ผังพื้นที่"] ?? "",
              saved.layout?.file_name ?? "",
            );
            for (const [field, column] of Object.entries({
              inspection_date: "วันที่ตรวจวัด",
              start_at: "เริ่มตรวจวัด",
              end_at: "สิ้นสุดตรวจวัด",
              calibration_date: "วันที่สอบเทียบ",
            }))
              assert(
                Math.abs(row[column] - dateValue(saved.inspectionData[field])) <
                  1e-8,
              );
            const observation =
              saved.revision.observations[row["จุดตรวจที่"] - 1];
            matches(row, observation.unit, {
              location_desc: "รายละเอียดจุดตรวจวัด",
              remark: "หมายเหตุ",
              lux: "ค่าความสว่างจุดตรวจ (Lux)",
              average_lux: "ค่าเฉลี่ยพื้นที่ (Lux)",
              minimum_lux: "ค่าต่ำสุดพื้นที่ (Lux)",
              surrounding_near_lux: "ค่าบริเวณใกล้ (Lux)",
              surrounding_outer_lux: "ค่าบริเวณถัดออกไป (Lux)",
              min_dBA: "เสียงต่ำสุด (dBA)",
              max_dBA: "เสียงสูงสุด (dBA)",
              exposure_level_dBA: "เสียงตามเวลาสัมผัส (dBA)",
              exposure_duration_minutes: "ระยะเวลาสัมผัส (นาที)",
              twa_8hr: "TWA8 (dBA)",
              db_temp: "DB (°C)",
              wb_temp: "WB (°C)",
              gt_temp: "GT (°C)",
              wbgt_in: "WBGT จากเครื่องวัด (°C)",
              wbgt_average: "WBGT เฉลี่ยที่บันทึก (°C)",
              standard_value: "เกณฑ์ WBGT (°C)",
            });
          }
        } else {
          const row = exported[0];
          matches(
            row,
            saved.profile,
            saved.assessment_type === "health_risk"
              ? {
                  full_name: "ชื่อและนามสกุล",
                  age: "อายุ (ปี)",
                  weight: "น้ำหนัก (กก.)",
                  height: "ส่วนสูง (ซม.)",
                  underlying_disease_details: "รายละเอียดโรคประจำตัว",
                }
              : { full_name: "ผู้ประเมิน" },
          );
          matches(row, saved.workInfo, {
            study_year: "ชั้นปี",
            work_experience_years: "อายุงาน (ปี)",
            working_hours_per_day: "ชั่วโมงต่อวัน",
            working_hours_per_week: "ชั่วโมงต่อสัปดาห์",
          });
          matches(row, saved.healthContext, {
            hours_worked_today: "ชั่วโมงปฏิบัติงานหรือเรียนวันนี้",
            noise_source_other: "แหล่งเสียงอื่น",
          });
          const phases =
            saved.assessment_type === "health_risk"
              ? saved.answers
              : { "": saved.answers };
          for (const [phase, answers] of Object.entries(phases))
            for (const [id, score] of Object.entries(answers)) {
              if (!/^q\d+$/.test(id)) continue;
              const prefix =
                ({ before: "ก่อน ", after: "หลัง ", single: "อาการ " }[phase] ??
                  "") + `ข้อ ${id.slice(1)} (`;
              const header = Object.keys(row).find((h) =>
                h.replaceAll("\n", "").startsWith(prefix),
              );
              assert.equal(row[header], score, `${name}: ${phase}.${id}`);
            }
          if (saved.assessment_type === "satisfaction") {
            assert.equal(
              row["ข้อเสนอแนะเพิ่มเติม"] ?? "",
              saved.suggestion ?? "",
            );
            for (const [method, time] of Object.entries(saved.durations ?? {}))
              for (const [unit, v] of Object.entries(time))
                assert.equal(
                  row[
                    `เวลาวิธี${method === "traditional" ? "เดิม" : " SafeCheck"} (${{ days: "วัน", hours: "ชั่วโมง", minutes: "นาที", seconds: "วินาที" }[unit]})`
                  ],
                  v,
                );
          }
        }
      }
      for (const [group, name] of [
        ["environment", "ความพึงพอใจ-สภาพแวดล้อม"],
        ["health", "ความพึงพอใจ-อาการทางสุขภาพ"],
      ]) {
        const form = rows(allForms.wb, name)[0];
        assert.equal(
          form["ประเภท"],
          group === "environment" ? "สภาพแวดล้อม" : "อาการทางสุขภาพ",
        );
        assert.equal(form["หมวดหมู่"], "ความพึงพอใจ");
        assert.equal(
          Object.keys(form).filter((key) => /^ข้อ \d+/.test(key)).length,
          16,
        );
        assert.equal(
          form["คะแนนเฉลี่ยรวม (เต็ม 5)"],
          group === "environment" ? 4.75 : 4,
        );
        assert(!Object.hasOwn(form, "อายุ (ปี)"));
        if (group === "health") {
          assert.equal(form["ชั้นปี"], 6);
          assert(
            !Object.keys(form).some((key) => key.includes("เวลาวิธีเดิม")),
          );
        } else {
          assert(!Object.hasOwn(form, "ประเภทผู้ตอบ"));
          assert.equal(form["เวลาวิธีเดิมรวม (วินาที)"], 93784);
        }
      }
      xlsx.writeFile(
        allForms.wb,
        "docs/v3/baseline/classic-export-all-forms.xlsx",
      );
      assert.deepEqual(
        await page
          .getByLabel("ประเภท", { exact: true })
          .locator("option")
          .evaluateAll((options) => options.map((o) => o.value)),
        ["all", "environment", "health"],
      );
      assert.equal(await page.getByLabel("กลุ่ม", { exact: true }).count(), 0);
      for (const group of ["environment", "health"]) {
        const expected = await get(`/dashboard/submissions?group=${group}`);
        assert(
          expected.items.some(
            (item) => item.assessment_type === "satisfaction",
          ),
        );
        assert(
          expected.items.some(
            (item) => item.assessment_type !== "satisfaction",
          ),
        );
        assert(expected.items.every((item) => item.assessment_group === group));
        await page.getByLabel("ประเภท", { exact: true }).selectOption(group);
        await wait(
          async () =>
            (await page.locator("[data-dashboard-list] > tr").count()) ===
            expected.total,
        );
        assert.equal(
          await page
            .locator("[data-dashboard-kpis] > div")
            .first()
            .locator("p")
            .innerText(),
          String(expected.total),
        );
        const exported = await download("ส่งออก Excel ทุกงานตามตัวกรอง");
        assert.equal(rows(exported.wb, "ภาพรวมทั้งหมด").length, expected.total);
        assert(
          rows(exported.wb, "ภาพรวมทั้งหมด").every(
            (row) =>
              row["ประเภท"] ===
              (group === "environment" ? "สภาพแวดล้อม" : "อาการทางสุขภาพ"),
          ),
        );
        assert(
          (
            await page.locator("[data-dashboard-list] > tr").allTextContents()
          ).every((row) =>
            row.includes(
              group === "environment" ? "สภาพแวดล้อม" : "อาการทางสุขภาพ",
            ),
          ),
        );
      }
      await page.getByLabel("ประเภท", { exact: true }).selectOption("health");
      await page.getByLabel("หมวด", { exact: true }).selectOption("general");
      await wait(
        async () =>
          (await page.locator("[data-dashboard-list] > tr").count()) === 1,
      );
      await page
        .getByRole("button", { name: "ส่งออก Excel ทุกงานตามตัวกรอง" })
        .waitFor();
      const d = await download("ส่งออก Excel ทุกงานตามตัวกรอง");
      assert.equal(rows(d.wb, "ภาพรวมทั้งหมด").length, 1);
      assert.equal(
        rows(d.wb, "ความพึงพอใจ-อาการทางสุขภาพ")[0]["ประเภท"],
        "อาการทางสุขภาพ",
      );
      assert(
        (await page.locator("[data-dashboard-summary]").innerText()).includes(
          "4.00 / 5",
        ),
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      );
      assert.equal(
        await page.locator("[data-dashboard-kpis] > div").count(),
        4,
      );
      assert.equal(
        await page.locator("[data-dashboard-form-count]").count(),
        8,
      );
      assert.equal(
        await page
          .locator("[data-dashboard-kpis] > div")
          .first()
          .locator("p")
          .innerText(),
        "1",
      );
      assert(
        (await page.locator("[data-dashboard-kpis]").innerText()).includes(
          "4.00 / 5",
        ),
      );
      const headings = await page.locator("h1, h2, h3, h4").allTextContents();
      assert(headings.every((heading) => !/[—–]| - /.test(heading)));
      await page.getByRole("button", { name: "วันนี้", exact: true }).click();
      assert.equal(
        await page.getByLabel("วันที่เริ่ม", { exact: true }).inputValue(),
        await page.getByLabel("วันที่สิ้นสุด", { exact: true }).inputValue(),
      );
      assert.match(
        await page.getByLabel("วันที่เริ่ม", { exact: true }).inputValue(),
        /^\d{4}-\d{2}-\d{2}$/,
      );
      await page.getByRole("button", { name: "ทั้งหมด", exact: true }).click();
      assert.equal(
        await page.getByLabel("วันที่เริ่ม", { exact: true }).inputValue(),
        "",
      );
      assert.equal(
        await page.getByLabel("ประเภท", { exact: true }).inputValue(),
        "health",
      );
      await wait(
        async () =>
          (await page.locator("[data-dashboard-list] > tr").count()) === 1,
      );
      assert.equal(
        await page
          .getByRole("table", { name: "รายการประเมิน" })
          .locator("th")
          .count(),
        8,
      );
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const reset = await page
          .getByRole("button", { name: "ล้างตัวกรอง", exact: true })
          .boundingBox();
        assert(
          reset && reset.height <= 32 && reset.width < 140,
          JSON.stringify(reset),
        );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        for (const name of ["ก่อนหน้า", "ถัดไป"]) {
          const box = await page
            .getByRole("button", { name, exact: true })
            .boundingBox();
          assert(box && box.height <= 32, JSON.stringify(box));
        }
        const range = await page
          .locator(".dashboard-date-range input")
          .evaluateAll((inputs) =>
            inputs.map((el) => {
              const r = el.getBoundingClientRect();
              return { y: r.y, right: r.right, left: r.left, height: r.height };
            }),
          );
        assert.equal(range.length, 2);
        assert(Math.abs(range[0].y - range[1].y) < 1, JSON.stringify(range));
        assert(
          range.every((r) => r.left >= 0 && r.right <= width),
          JSON.stringify(range),
        );

        if (width < 1440) {
          const nav = await page.locator(".floating-pill-nav").boundingBox();
          assert(
            nav &&
              nav.width <= 280 &&
              nav.height <= 54 &&
              nav.x >= 15 &&
              nav.x + nav.width <= width - 15,
            JSON.stringify(nav),
          );
          for (const link of await page
            .locator(".floating-pill-nav-link")
            .all()) {
            const box = await link.boundingBox();
            assert(
              box && box.height >= 44 && box.height <= 50,
              JSON.stringify(box),
            );
          }
        }
        await page.screenshot({
          path: `docs/v3/baseline/original-summary-ui-${width}.png`,
        });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: "docs/v3/baseline/p7-dashboard-mobile.png",
        fullPage: true,
      });
    },
  );
  await check(
    "bulk export reads more than 100 real jobs through all pages with no lost codes",
    async () => {
      for (let i = 0; i < 103; i++) {
        const p = satPayload("health");
        p.profile.full_name = "Bulk P7 " + i;
        await create(p);
      }
      await page.getByRole("button", { name: "ล้างตัวกรอง" }).click();
      await page.getByLabel("ประเภท", { exact: true }).selectOption("health");
      await page.getByLabel("หมวด", { exact: true }).selectOption("general");
      await wait(
        async () =>
          (await page
            .getByText("รายการงาน (104) · แสดงผลล่าสุดต่อรหัส", { exact: true })
            .count()) > 0,
      );
      await page
        .getByRole("button", { name: "หน้าสุดท้าย", exact: true })
        .click();
      await wait(
        async () =>
          (await page.locator("[data-dashboard-list] > tr").count()) === 4,
      );
      await page
        .getByRole("button", { name: "หน้าแรกของตาราง", exact: true })
        .click();
      await wait(
        async () =>
          (await page.locator("[data-dashboard-list] > tr").count()) === 10,
      );
      const d = await download("ส่งออก Excel ทุกงานตามตัวกรอง");
      assert.equal(rows(d.wb, "ภาพรวมทั้งหมด").length, 104);
      assert.equal(rows(d.wb, "ความพึงพอใจ-อาการทางสุขภาพ").length, 104);
      assert.equal(
        new Set(rows(d.wb, "ภาพรวมทั้งหมด").map((r) => r["รหัสการประเมิน"]))
          .size,
        104,
      );
    },
  );
  await check(
    "dashboard exports latest only after 13 real revisions; previous stored result remains frozen",
    async () => {
      for (let i = 0; i < 11; i++) {
        const current = await get("/results/" + spotJob.submission_code);
        const response = await call(
          "/submissions/" + spotJob.submission_code + "/corrections",
          {
            schema_version: 3,
            idempotency_key: key(),
            reason: "ปรับชื่อผู้ตรวจครั้ง " + i,
            expected_data_version: current.data_version,
            base_revision_id: current.revision.revision_id,
            payload: {
              schema_version: 3,
              idempotency_key: key(),
              assessment_type: "environment",
              assessment_category: "light",
              assessment_group: "environment",
              inspectionData: {
                ...current.inspectionData,
                inspector_name: "ผู้ตรวจแก้ " + i,
              },
              layout: current.layout
                ? { file_id: current.layout.file_id }
                : undefined,
              units: current.units,
            },
          },
        );
        assert.equal(response.status, 201, JSON.stringify(response.json));
      }
      const bounded = await get(
        "/dashboard/export-data?type=environment&revision_scope=history&limit=100&revision_limit=100",
      );
      assert.equal(bounded.limit, 1);
      assert(bounded.records.length <= 100);
      await page.getByRole("button", { name: "ล้างตัวกรอง" }).click();
      await page
        .getByLabel("ประเภท", { exact: true })
        .selectOption("environment");
      await page.getByLabel("ค้นหารายงาน").fill(spotJob.submission_code);
      await wait(
        async () =>
          (await page
            .getByText("รายการงาน (1) · แสดงผลล่าสุดต่อรหัส", { exact: true })
            .count()) > 0,
      );
      assert.equal(await page.getByLabel("ขอบเขต Excel").count(), 0);
      const d = await download("ส่งออก Excel ทุกงานตามตัวกรอง");
      assert.equal(rows(d.wb, "ภาพรวมทั้งหมด").length, 1);
      assert.equal(rows(d.wb, "ภาพรวมทั้งหมด")[0]["ครั้งที่บันทึก"], 13);
      assert.equal(
        new Set(
          rows(d.wb, "สิ่งแวดล้อม-แสงสว่าง").map((r) => r["ครั้งที่บันทึก"]),
        ).size,
        1,
      );
      assert.equal(
        (
          await get(
            "/results/" +
              spotJob.submission_code +
              "?revision=" +
              spotJob.revision.revision_id,
          )
        ).revision.is_pass,
        false,
      );
      await openResult(await get("/results/" + spotJob.submission_code));
      await page.locator("details summary").click();
      const historyExport = await download("ดาวน์โหลดประวัติทุกรอบ Excel");
      assert.equal(
        historyExport.name,
        `safecheck-${spotJob.submission_code}-history.xlsx`,
      );
      const overview = rows(historyExport.wb, "ภาพรวมทั้งหมด");
      assert.equal(overview.length, 13);
      assert.deepEqual(
        overview.map((row) => row["ครั้งที่บันทึก"]),
        Array.from({ length: 13 }, (_, i) => i + 1),
      );
      assert(
        overview.every(
          (row) => row["รหัสการประเมิน"] === spotJob.submission_code,
        ),
      );
      assert.equal(
        overview.filter((row) => row["สถานะผล"] === "ล่าสุด").length,
        1,
      );
      const form = rows(historyExport.wb, "สิ่งแวดล้อม-แสงสว่าง");
      assert.equal(new Set(form.map((row) => row["ครั้งที่บันทึก"])).size, 13);
      assert.equal(
        form.find(
          (row) =>
            row["ครั้งที่บันทึก"] === 1 && row["รหัสจุดตรวจ"] === "ไม่ผ่าน",
        )["ค่าความสว่างจุดตรวจ (Lux)"],
        100,
      );
      xlsx.writeFile(
        historyExport.wb,
        "docs/v3/baseline/classic-job-history.xlsx",
      );
      await page.screenshot({
        path: "docs/v3/baseline/history-export.png",
        fullPage: true,
      });
    },
  );
  await check(
    "old Area sample history opens without subpoints and retests with direct values without rewriting the original",
    async () => {
      await openResult(area);
      assert.equal(
        await page
          .getByRole("heading", { name: "จุดย่อยในพื้นที่ตรวจแสง" })
          .count(),
        0,
      );
      await page
        .getByRole("link", { name: "ประเมินวัดซ้ำ", exact: true })
        .click();
      for (const [name, value] of Object.entries({
        inspection_date: "2026-10-16",
        start_at: "2026-10-16T08:00",
        end_at: "2026-10-16T11:00",
      }))
        await page.locator(`[name="inspectionData.${name}"]`).fill(value);
      await page
        .getByRole("button", { name: /^(ถัดไป|ทบทวนก่อนบันทึก)$/ })
        .click();
      const average = page.locator('[name="units.0.average_lux"]'),
        minimum = page.locator('[name="units.0.minimum_lux"]');
      assert.equal(await average.inputValue(), "");
      assert.equal(await minimum.inputValue(), "");
      assert.equal(
        await page
          .getByRole("button", { name: "เพิ่มจุดย่อย", exact: true })
          .count(),
        0,
      );
      await average.fill("300");
      await minimum.fill("150");
      await page
        .getByRole("button", { name: /^(ถัดไป|ทบทวนก่อนบันทึก)$/ })
        .click();
      await page.locator("[data-environment-summary]").waitFor();
      const response = page.waitForResponse(
        (r) => r.url().includes("/retests") && r.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "ยืนยันบันทึกผล", exact: true })
        .click();
      assert.equal((await response).status(), 201);
      await page.waitForURL(/\/result\?/);
      const saved = await get("/results/" + area.submission_code);
      assert.equal(saved.revision.revision_no, 2);
      assert.equal(saved.units[0].average_lux, 300);
      assert.equal(saved.units[0].minimum_lux, 150);
      assert.equal(saved.units[0].samples, undefined);
      assert.equal(saved.result.is_pass, true);
      const old = await get(
        "/results/" +
          area.submission_code +
          "?revision=" +
          area.revision.revision_id,
      );
      assert.deepEqual(old.units, area.units);
      assert.deepEqual(old.result, area.result);
    },
  );
  await check(
    "archive is retired; stored historical flags do not hide results or block retesting",
    async () => {
      const current = await get("/results/" + noise.submission_code);
      await db
        .prepare("UPDATE submissions SET archived_at=? WHERE submission_code=?")
        .bind("2026-10-14T00:00:00Z", noise.submission_code)
        .run();
      await openResult(await get("/results/" + noise.submission_code));
      assert.equal(
        await page
          .getByRole("button", { name: /เก็บรายการเข้าคลัง|คืนรายการจากคลัง/ })
          .count(),
        0,
      );
      await page
        .getByRole("link", { name: "ประเมินวัดซ้ำ", exact: true })
        .click();
      await page.locator('[name="inspectionData.start_at"]').waitFor();
      assert.equal(
        await page
          .getByText("รายการอยู่ในคลัง กรุณาคืนรายการก่อน", { exact: true })
          .count(),
        0,
      );
      for (const [method, suffix] of [
        ["POST", "/archive"],
        ["POST", "/restore"],
        ["DELETE", ""],
      ]) {
        const response = await call(
          "/submissions/" + noise.submission_code + suffix,
          {},
          method,
        );
        assert.equal(response.status, 410);
      }
      const list = await get(
        "/dashboard/submissions?limit=100&search=" + noise.submission_code,
      );
      assert(
        list.items.some((x) => x.submission_code === noise.submission_code),
      );
      assert.deepEqual(
        (await get("/results/" + noise.submission_code)).revision.observations,
        current.revision.observations,
      );
      const repeated = await call(
        "/submissions/" + noise.submission_code + "/retests",
        {
          schema_version: 3,
          idempotency_key: key(),
          base_revision_id: current.revision.revision_id,
          inspection_date: "2026-10-15",
          start_at: "2026-10-15T01:00:00Z",
          end_at: "2026-10-15T04:00:00Z",
          updates: [
            {
              kind: "noise",
              point_id: "n1",
              exposure_level_dBA: 70,
              min_dBA: 60,
              max_dBA: 80,
            },
          ],
        },
      );
      assert.equal(repeated.status, 201, JSON.stringify(repeated.json));
      const newest = await get("/results/" + noise.submission_code);
      assert.equal(
        newest.revision.revision_no,
        current.revision.revision_no + 1,
      );
      assert.deepEqual(
        (
          await get(
            "/results/" +
              noise.submission_code +
              "?revision=" +
              current.revision.revision_id,
          )
        ).revision.observations,
        current.revision.observations,
      );
      await page.goto(front + "/dashboard");
      assert.equal(
        await page.getByLabel("สถานะรายการ", { exact: true }).count(),
        0,
      );
    },
  );
  await check(
    "API failure/invalid selection surfaces errors and retry without stale report",
    async () => {
      await page.route("**/api/dashboard/**", (route) =>
        route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: { code: "TEST", message: "ระบบทดสอบขัดข้อง" },
          }),
        }),
      );
      await page.goto(front + "/dashboard");
      await page
        .getByRole("alert")
        .filter({ hasText: "ระบบทดสอบขัดข้อง" })
        .waitFor();
      await page.locator("[data-global-loading]").waitFor({ state: "hidden" });
      assert.equal(await page.locator("[data-dashboard-list] > tr").count(), 0);
      await page.unroute("**/api/dashboard/**");
      await page.getByRole("button", { name: "ลองใหม่" }).click();
      await page.locator("[data-dashboard-list]").waitFor();
      await page.goto(
        front +
          "/result?submissionId=" +
          health.submission_code +
          "&version=999",
      );
      await page
        .getByRole("alert")
        .filter({ hasText: "ไม่พบข้อมูลที่เลือก" })
        .waitFor();
      assert.equal(await page.locator("[data-report-version]").count(), 0);
    },
  );
  await check(
    "A4 print/PDF chosen version retains Thai questions/thresholds and hides controls/embedded standard PDF",
    async () => {
      await page.setViewportSize({ width: 1280, height: 900 });
      for (const [name, r, q, ready] of [
        ["health", health, "", "[data-health-comparison]"],
        [
          "environment",
          spotJob,
          "&revision=" + spotJob.revision.revision_id,
          "[data-environment-summary]",
        ],
        ["satisfaction", sat, "&version=1", "[data-satisfaction-summary]"],
      ]) {
        await openResult(r, q);
        if (name === "satisfaction")
          await page
            .getByRole("heading", { name: /ผลความพึงพอใจ/ })
            .first()
            .waitFor();
        else await page.locator(ready).waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.emulateMedia({ media: "print" });
        assert.equal(
          await page
            .getByRole("button", { name: "พิมพ์ผล / บันทึก PDF" })
            .isVisible(),
          false,
        );
        assert.equal(
          await page
            .getByText("ประวัติรุ่นข้อมูล (2)", { exact: true })
            .isVisible()
            .catch(() => false),
          false,
        );
        assert.equal(await page.locator("iframe:visible").count(), 0);
        await page.pdf({
          path: "docs/v3/baseline/p7-" + name + ".pdf",
          format: "A4",
          printBackground: true,
        });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: "docs/v3/baseline/p7-" + name + "-print.png",
          fullPage: true,
        });
        await page.emulateMedia({ media: "screen" });
      }
    },
  );
  await check(
    "mobile/tablet shell stretches below 1440; desktop sidebar only on large screens",
    async () => {
      for (const width of [390, 820, 1024, 1366, 1439, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const path of [
          "/",
          "/assessment/environment",
          "/assessment/health-risk",
          "/dashboard",
        ]) {
          await page.goto(front + path);
          if (path === "/dashboard")
            await page.locator("[data-dashboard-list]").waitFor();
          await page
            .locator(".floating-pill-nav")
            .waitFor({ state: "attached" });
          await page.locator(".app-mobile-shell").waitFor({ state: "visible" });
          await page
            .locator("[data-global-loading]")
            .waitFor({ state: "hidden" });
          assert.equal(
            await page.locator(".app-sidebar").isVisible(),
            width >= 1440,
            `${path} ${width} sidebar`,
          );
          assert.equal(
            await page.locator(".floating-pill-nav").isVisible(),
            width < 1440,
            `${path} ${width} bottom nav`,
          );
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${path} ${width} overflow`,
          );
          if (width < 1440) {
            const shell = await page.locator(".app-mobile-shell").boundingBox();
            assert(
              shell && Math.abs(shell.width - width) < 2,
              `${path} ${width} shell ${JSON.stringify(shell)}`,
            );
          }
          if (path.startsWith("/assessment/")) {
            const columns = await page
              .locator(".assessment-topic-grid")
              .evaluate(
                (el) =>
                  getComputedStyle(el).gridTemplateColumns.split(" ").length,
              );
            assert.equal(
              columns,
              width < 1440 ? 1 : 2,
              `${path} ${width} columns`,
            );
            const cards = await page
              .locator("a.category-card")
              .evaluateAll((elements) =>
                elements.map((el) => {
                  const style = getComputedStyle(el),
                    inner = el.firstElementChild;
                  return {
                    height: el.getBoundingClientRect().height,
                    content: inner.getBoundingClientRect().height,
                    padding:
                      parseFloat(style.paddingTop) +
                      parseFloat(style.paddingBottom) +
                      parseFloat(style.borderTopWidth) +
                      parseFloat(style.borderBottomWidth),
                  };
                }),
              );
            assert.equal(cards.length, 4);
            assert(
              cards.every(
                (card) =>
                  Math.abs(card.height - card.content - card.padding) < 2,
              ),
              `${path} ${width} excess space ${JSON.stringify(cards)}`,
            );
            if (
              path === "/assessment/environment" &&
              [390, 1024, 1440].includes(width)
            )
              await page.screenshot({
                path: `docs/v3/baseline/content-cards-${width}.png`,
                fullPage: true,
              });
          }
        }
        if ([1024, 1366, 1440].includes(width))
          await page.screenshot({
            path: `docs/v3/baseline/responsive-shell-${width}.png`,
            fullPage: true,
          });
      }
    },
  );
  await check(
    "every form summary uses readable shared label/value styles on mobile and desktop",
    async () => {
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const record of summaryRecords) {
          await openResult(record);
          const details = page.locator(".summary-details").first();
          await details.waitFor();
          const styles = await details.evaluate((el) => {
            const dt = getComputedStyle(el.querySelector("dt"));
            const dd = getComputedStyle(el.querySelector("dd"));
            return {
              labelColor: dt.color,
              valueColor: dd.color,
              labelWeight: dt.fontWeight,
              valueWeight: dd.fontWeight,
              labelSize: dt.fontSize,
              valueSize: dd.fontSize,
            };
          });
          assert.equal(styles.labelColor, "rgb(30, 41, 59)");
          assert.equal(styles.valueColor, "rgb(71, 85, 105)");
          assert(Number(styles.labelWeight) > Number(styles.valueWeight));
          assert.equal(styles.labelSize, "13px");
          assert.equal(styles.valueSize, "14px");
          assert((await page.locator(".summary-heading svg").count()) > 0);
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
          );
          if (
            (record.assessment_category === "light" &&
              record.assessment_type !== "satisfaction") ||
            record.assessment_type === "satisfaction"
          ) {
            await page
              .locator(".summary-view")
              .first()
              .evaluate((el) => el.scrollIntoView({ block: "start" }));
            await page.screenshot({
              path: `docs/v3/baseline/summary-style-${record.assessment_type}-${record.assessment_group}-${width}.png`,
            });
          }
        }
      }
    },
  );
  await check(
    "Done returns saved results to their form entry page and stays out of print",
    async () => {
      for (const record of [spotJob, health, sat]) {
        await page.goto(
          `${front}/result?submissionId=${record.submission_code}`,
        );
        await page.locator(".summary-view").first().waitFor();
        assert.equal(
          await page
            .getByRole("button", { name: "เสร็จสิ้น", exact: true })
            .count(),
          0,
          "Viewing an existing result must not show the form completion button",
        );
      }
      for (const [record, destination] of [
        [spotJob, "/assessment/environment"],
        [health, "/assessment/health-risk"],
        [sat, "/assessment/environment"],
        [sat, "/assessment/satisfaction"],
        [spotJob, `/result?submissionId=${spotJob.submission_code}`],
        [health, "/dashboard"],
      ]) {
        const query = new URLSearchParams({
          submissionId: record.submission_code,
          saved: "1",
          returnTo: destination,
        });
        await page.goto(`${front}/result?${query}`);
        const done = page.getByRole("button", {
          name: "เสร็จสิ้น",
          exact: true,
        });
        await done.waitFor();
        await page.emulateMedia({ media: "print" });
        assert.equal(await done.isVisible(), false);
        await page.emulateMedia({ media: "screen" });
        await done.click();
        await page.waitForURL(front + destination);
      }
      await page.goto(
        `${front}/result?submissionId=${health.submission_code}&saved=1&returnTo=https://example.com`,
      );
      await page
        .getByRole("button", { name: "เสร็จสิ้น", exact: true })
        .click();
      await page.waitForURL(front + "/assessment/health-risk");
    },
  );
  await check(
    "no browser runtime errors or SQLite foreign-key violations",
    async () => {
      assert.deepEqual(pageErrors, []);
      assert.deepEqual(
        (await db.prepare("PRAGMA foreign_key_check").all()).results,
        [],
      );
    },
  );
  await page.goto(front + "/dashboard");
  await page.locator("[data-dashboard-list]").waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "docs/v3/baseline/p7-dashboard-desktop.png",
    fullPage: true,
  });
  writeFileSync(
    "docs/v3/baseline/p7-browser.json",
    JSON.stringify(
      {
        phase: "P7",
        passed,
        checks,
        browser: "Chromium",
        viewport: "390x844 / 1280x900",
        backend: "actual isolated Miniflare Worker + D1 + R2",
        pageErrors,
        deployed: false,
      },
      null,
      2,
    ),
  );
  console.log("P7 browser PASS " + passed);
} catch (e) {
  console.error(logs.slice(-2500));
  throw e;
} finally {
  await browser.close();
  next.kill("SIGINT");
  await mf.dispose();
}
