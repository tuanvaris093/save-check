import { fixtures } from "./p8-fixtures.mjs";
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
  temp = mkdtempSync(join(tmpdir(), "safecheck-ui-restore-")),
  script = join(temp, "worker.mjs"),
  front = "http://127.0.0.1:3074",
  api = "http://127.0.0.1:3075";
esbuild.buildSync({
  entryPoints: ["worker/src/index.ts"],
  bundle: true,
  platform: "browser",
  external: ["node:*"],
  format: "esm",
  outfile: script,
  logLevel: "silent",
});
const guidanceModule = join(temp, "guidance.cjs");
esbuild.buildSync({
  entryPoints: ["src/lib/health-risk-schema.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: guidanceModule,
  logLevel: "silent",
});
const { HEALTH_RISK_RECOMMENDATIONS } = require(guidanceModule);
const mf = new Miniflare({
  host: "127.0.0.1",
  port: 3075,
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
const migrationGroups = JSON.parse(split.stdout);
const optionalLayoutIndex =
  readdirSync("worker/src/db/migrations")
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .indexOf("0005_optional_layout.sql") + 1;
const optionalLayoutMigration = migrationGroups.splice(
  optionalLayoutIndex,
  1,
)[0];
for (const statements of migrationGroups)
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
    "3074",
  ],
  {
    env: {
      ...process.env,
      SAFECHECK_TEST_DIST_DIR: ".next-test-ui-restore",
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
const field = (name) => page.locator(`[name="${name}"]`);
const input = (i, k) => field(`units.${i}.${k}`);
const key = () => crypto.randomUUID();
async function call(path, body, method = "POST") {
  const r = await fetch(api + "/api" + path, {
    method,
    headers: {
      Origin: front,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: r.status, json: await r.json() };
}
const get = async (code) =>
  (await call("/results/" + code, undefined, "GET")).json.data;
const inspection = {
  inspector_name: "ผู้ทดสอบ P5",
  position: "ผู้ตรวจ",
  inspection_location: "พื้นที่ P5",
  inspection_date: "2026-10-12",
  start_at: "2026-10-12T08:00",
  end_at: "2026-10-12T11:00",
  equipment: "P5 Meter",
  serial_number: "SN-P5",
  calibration_date: "2026-10-01",
  responsible_department: "แผนกทดสอบ",
  location_responsible_name: "ผู้รับผิดชอบ P5",
};
async function metadata(category, technique = "spot", withFile = true) {
  for (const [k, v] of Object.entries(inspection))
    await field("inspectionData." + k).fill(v);
  if (category === "light")
    await field("inspectionData.measurement_technique").selectOption(technique);
  if (withFile) {
    await field("layout").setInputFiles(
      resolve("public/standards/lighting-std-2561.pdf"),
    );
    await page.getByText("เปิดดู PDF", { exact: true }).waitFor();
  }
  await page.getByRole("button", { name: /^(ถัดไป|ทบทวนก่อนบันทึก)$/ }).click();
  await field("units.0.location_desc").waitFor();
}
async function dates(day = "13") {
  for (const [k, v] of Object.entries({
    inspection_date: `2026-10-${day}`,
    start_at: `2026-10-${day}T08:00`,
    end_at: `2026-10-${day}T11:00`,
  }))
    await field("inspectionData." + k).fill(v);
}
async function submit() {
  const response = page.waitForResponse(
    (r) =>
      r.url().startsWith(api + "/api/submissions") &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "ยืนยันบันทึกผล", exact: true })
    .click();
  const r = await response,
    j = await r.json();
  assert(j.success, JSON.stringify(j));
  await page.waitForURL(/\/result\?/);
  await page.locator("[data-environment-summary]").waitFor();
  return j.data;
}
async function review() {
  await page.getByRole("button", { name: /^(ถัดไป|ทบทวนก่อนบันทึก)$/ }).click();
  await page.locator("[data-environment-summary]").waitFor();
}
async function spot(i, lux) {
  await input(i, "location_desc").fill("จุด " + i);
  await input(i, "standard_code").selectOption("spot-office");
  await input(i, "lux").fill(String(lux));
}
async function retest(code, values, day) {
  await page.goto(front + "/result?submissionId=" + code);
  await page.getByRole("link", { name: /ตรวจซ้ำเฉพาะ/ }).click();
  await field("inspectionData.serial_number").waitFor();
  assert(await field("inspectionData.serial_number").isDisabled());
  assert.equal(await field("inspectionData.inspection_date").inputValue(), "");
  await dates(day);
  await page.getByRole("button", { name: /^(ถัดไป|ทบทวนก่อนบันทึก)$/ }).click();
  for (const [i, v] of Object.entries(values)) {
    assert.equal(await input(i, "lux").inputValue(), "");
    await input(i, "lux").fill(String(v));
  }
  await review();
  return submit();
}
const requests = [];
page.on("request", (r) => {
  if (r.method() === "POST" && r.url().startsWith(api + "/api"))
    requests.push({ url: r.url(), key: r.headers()["idempotency-key"] });
});
const xlsx = createRequire(resolve("package.json"))("xlsx");
let savedWithoutFile, withFile;
const currentCodes = [];
const obsoleteCodes = [
  "SUB-20260901-1001",
  "SUB-20260903-3003",
  "SUB-20260904-4004",
];
async function freshForm() {
  await page.goto(front + "/assessment/environment-form?category=light");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await field("inspectionData.inspector_name").waitFor();
}
async function snapshot() {
  const tables = [
    "submissions",
    "environment_revisions",
    "environment_revision_points",
    "environment_revision_samples",
    "assessment_files",
    "assessment_audit_events",
    "mutation_requests",
    "submission_payload_versions",
    "environment_metadata_supplements",
    "legacy_file_mappings",
  ];
  return Object.fromEntries(
    await Promise.all(
      tables.map(async (name) => [
        name,
        (await db.prepare(`SELECT * FROM ${name}`).all()).results.sort((a, b) =>
          JSON.stringify(a).localeCompare(JSON.stringify(b)),
        ),
      ]),
    ),
  );
}
try {
  await wait(async () => {
    try {
      return (await fetch(front)).ok;
    } catch {
      return false;
    }
  });
  await check(
    "optional-layout migration preserves populated legacy/current revisions, references, snapshots and guards",
    async () => {
      const upload = await fetch(api + "/api/files", {
        method: "POST",
        headers: {
          Origin: front,
          "Content-Type": "application/pdf",
          "X-File-Name": "before-migration.pdf",
          "Idempotency-Key": key(),
        },
        body: readFileSync("public/standards/lighting-std-2561.pdf"),
      });
      const file = (await upload.json()).data.file_id;
      const payload = fixtures(file).find(
        (c) => c.name === "environment-light",
      ).payload;
      payload.units.push({
        ...payload.units[0],
        point_id: "passed",
        lux: 1000,
      });
      const created = await call("/submissions", payload);
      assert.equal(created.status, 201, JSON.stringify(created.json));
      for (const [day, lux] of [
        ["13", 100],
        ["14", 600],
      ]) {
        const latest = await get(created.json.data.submission_code);
        const round = await call(
          `/submissions/${created.json.data.submission_code}/retests`,
          {
            schema_version: 3,
            idempotency_key: key(),
            base_revision_id: latest.revision.revision_id,
            inspection_date: `2026-10-${day}`,
            start_at: `2026-10-${day}T01:00:00Z`,
            end_at: `2026-10-${day}T04:00:00Z`,
            updates: [{ point_id: "spot", kind: "light_spot", lux }],
          },
        );
        assert.equal(round.status, 201, JSON.stringify(round.json));
      }
      const before = await snapshot();
      await db.batch(optionalLayoutMigration.map((sql) => db.prepare(sql)));
      assert.deepEqual(await snapshot(), before);
      assert.deepEqual(
        (await db.prepare("PRAGMA foreign_key_check").all()).results,
        [],
      );
      const record = await get(created.json.data.submission_code);
      await assert.rejects(
        db
          .prepare("UPDATE environment_revisions SET is_pass=0 WHERE id=?")
          .bind(record.revision.revision_id)
          .run(),
        /immutable/,
      );
    },
  );
  await check(
    "Worker accepts omitted floor plans for light/noise/heat and preserves null without a file reference",
    async () => {
      for (const category of ["light", "noise", "heat"]) {
        const payload = structuredClone(
          fixtures("unused").find(
            (c) =>
              c.payload.assessment_type === "environment" &&
              c.payload.assessment_category === category,
          ).payload,
        );
        delete payload.layout;
        const created = await call("/submissions", payload);
        assert.equal(created.status, 201, JSON.stringify(created.json));
        assert.equal(
          (await call("/submissions", payload)).json.data.submission_code,
          created.json.data.submission_code,
        );
        const result = await get(created.json.data.submission_code);
        assert.equal(result.revision.layout_file_id, null);
        assert.equal(result.has_layout, 0);
        assert.equal(result.layout, undefined);
        const malformed = await call("/submissions", {
          ...payload,
          idempotency_key: key(),
          layout: {},
        });
        assert.equal(malformed.status, 400);
      }
    },
  );
  await check(
    "GUI review saves without a plan; no upload/create occurs before final confirmation",
    async () => {
      await freshForm();
      const start = requests.length;
      await metadata("light", "spot", false);
      await spot(0, 100);
      await review();
      assert.equal(requests.length, start);
      assert.equal(
        await page
          .getByRole("link", { name: "เปิดผังพื้นที่ของรอบนี้" })
          .count(),
        0,
      );
      await page.getByText("ยังไม่แนบแผนผัง สามารถเพิ่มภายหลังได้").waitFor();
      savedWithoutFile = await submit();
      const result = await get(savedWithoutFile.submission_code);
      assert.equal(result.revision.layout_file_id, null);
      await page.getByRole("link", { name: "เพิ่มแผนผังภายหลัง" }).waitFor();
    },
  );
  await check(
    "plan-free failed round can be retested while preserving its original history",
    async () => {
      const before = await get(savedWithoutFile.submission_code);
      await retest(savedWithoutFile.submission_code, { 0: 600 }, "13");
      const after = await get(savedWithoutFile.submission_code);
      assert.equal(after.revision.is_pass, true);
      assert.equal(after.revision.layout_file_id, null);
      assert.equal(
        (
          await call(
            `/results/${savedWithoutFile.submission_code}?revision=${before.revision.revision_id}`,
            undefined,
            "GET",
          )
        ).json.data.revision.is_pass,
        false,
      );
    },
  );
  await check(
    "add a plan later through GUI review; old rounds and measurement dates/values remain unchanged",
    async () => {
      const before = await get(savedWithoutFile.submission_code);
      await page.getByRole("link", { name: "เพิ่มแผนผังภายหลัง" }).click();
      await field("inspectionData.inspector_name").waitFor();
      assert.equal(await field("reason").count(), 0);
      const start = requests.length;
      await field("layout").setInputFiles(
        resolve("public/standards/lighting-std-2561.pdf"),
      );
      await page.getByText("เปิดดู PDF", { exact: true }).waitFor();
      await page.screenshot({
        path: "docs/v3/baseline/ui-restore-form-mobile.png",
        fullPage: true,
      });
      await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
      await review();
      assert.equal(requests.length, start);
      await submit();
      const after = await get(savedWithoutFile.submission_code);
      assert(after.revision.layout_file_id);
      assert.equal(after.has_layout, 1);
      assert.deepEqual(
        after.revision.observations,
        before.revision.observations,
      );
      assert.deepEqual(after.inspectionData, before.inspectionData);
      const old = (
        await call(
          `/results/${savedWithoutFile.submission_code}?revision=${before.revision.revision_id}`,
          undefined,
          "GET",
        )
      ).json.data;
      assert.equal(old.revision.layout_file_id, null);
    },
  );
  await check(
    "local PDF/image preview, replace/remove and refresh never call upload; keyboard uploader and type validation work",
    async () => {
      await freshForm();
      const start = requests.length;
      await field("layout").setInputFiles({
        name: "bad.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from("<svg/>"),
      });
      await page
        .getByText(
          "รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WebP) หรือไฟล์ PDF เท่านั้น",
        )
        .waitFor();
      await field("layout").setInputFiles({
        name: "plan.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+cLeoAAAAASUVORK5CYII=",
          "base64",
        ),
      });
      await page.getByRole("button", { name: "ดูรูปขยาย" }).click();
      await page.getByRole("dialog").waitFor();
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "ลบ", exact: true }).click();
      await page.getByRole("button", { name: "เลือกไฟล์แผนผัง" }).waitFor();
      await metadata("light");
      await spot(0, 600);
      await review();
      await page.reload();
      await page
        .getByText("ไฟล์นี้ยังอยู่บนเครื่อง จะส่งพร้อมการยืนยันบันทึก")
        .waitFor();
      assert.equal(requests.length, start);
    },
  );
  await check(
    "failed upload prevents submission; stable upload receipt/key and draft survive retries without duplicate records",
    async () => {
      const start = requests.length;
      await page.route("**/api/files", (route) => route.abort(), { times: 1 });
      await page
        .getByRole("button", { name: "ยืนยันบันทึกผล", exact: true })
        .click();
      await page
        .getByRole("alert")
        .filter({ hasText: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" })
        .waitFor();
      assert.equal(
        requests.slice(start).filter((r) => r.url.includes("/submissions"))
          .length,
        0,
      );
      await page.route("**/api/submissions", (route) => route.abort(), {
        times: 1,
      });
      await page
        .getByRole("button", { name: "ยืนยันบันทึกผล", exact: true })
        .click();
      await page.getByRole("alert").filter({ hasText: "เชื่อมต่อ" }).waitFor();
      const uploads = requests
        .slice(start)
        .filter((r) => r.url.endsWith("/files"));
      assert.equal(uploads.length, 2);
      assert.equal(uploads[0].key, uploads[1].key);
      await page.reload();
      await page
        .getByRole("button", { name: "ยืนยันบันทึกผล", exact: true })
        .waitFor();
      withFile = await submit();
      assert.equal(
        requests.slice(start).filter((r) => r.url.endsWith("/files")).length,
        2,
      );
      assert((await get(withFile.submission_code)).revision.layout_file_id);
    },
  );
  await check(
    "current-only Dashboard API counts eight form categories, excludes legacy from lists/export and computes four satisfaction dimensions",
    async () => {
      for (const name of [
        "health-light",
        "health-noise",
        "health-heat",
        "satisfaction-environment",
        "satisfaction-health",
      ]) {
        const item = fixtures("unused").find((c) => c.name === name);
        const payload = item.payload;
        if (payload.assessment_type === "satisfaction") {
          for (let i = 0; i < 16; i++)
            payload.answers["q" + (i + 1)] =
              payload.assessment_group === "environment"
                ? Math.floor(i / 4) + 1
                : 4 - Math.floor(i / 4);
        }
        const result = await call("/submissions", payload);
        assert.equal(result.status, 201, JSON.stringify(result.json));
        currentCodes.push(result.json.data.submission_code);
      }
      const stalePayload = fixtures("unused").find(
        (c) => c.name === "satisfaction-environment",
      ).payload;
      const stale = await call("/submissions", stalePayload);
      assert.equal(stale.status, 201);
      await db
        .prepare(
          "UPDATE submissions SET questionnaire_version='outdated-questionnaire' WHERE submission_code=?",
        )
        .bind(stale.json.data.submission_code)
        .run();
      obsoleteCodes.push(stale.json.data.submission_code);
      const summary = (await call("/dashboard/summary", undefined, "GET")).json
        .data;
      const count = (
        await db
          .prepare("SELECT COUNT(*) n FROM submissions WHERE schema_version=3")
          .first()
      ).n;
      assert.equal(summary.total_submissions, count - 1);
      assert.deepEqual(
        summary.satisfaction_dimensions_by_group.environment,
        [1, 2, 3, 4],
      );
      assert.deepEqual(
        summary.satisfaction_dimensions_by_group.health,
        [4, 3, 2, 1],
      );
      assert.equal(summary.by_group.unknown, undefined);
      const list = (
        await call("/dashboard/submissions?limit=100", undefined, "GET")
      ).json.data;
      assert(
        list.items.every(
          (r) =>
            r.schema_version === 3 &&
            ["environment", "health"].includes(r.assessment_group),
        ),
      );
      const exported = (
        await call(
          "/dashboard/export-data?limit=100&revision_scope=history",
          undefined,
          "GET",
        )
      ).json.data;
      assert(exported.records.every((r) => r.schema_version === 3));
      assert.equal(
        (await call("/dashboard/submissions?group=unknown", undefined, "GET"))
          .status,
        400,
      );
    },
  );
  await check(
    "Dashboard restores row/column table and form-specific statuses with no unknown/legacy card",
    async () => {
      await page.goto(front + "/dashboard");
      await page.locator("[data-dashboard-list] > tr").first().waitFor();
      assert.equal(await page.locator("[data-dashboard-list] > li").count(), 0);
      assert.equal(
        await page
          .getByRole("columnheader", { name: "ผลการประเมิน", exact: true })
          .count(),
        1,
      );
      assert.equal(
        await page
          .getByRole("columnheader", { name: "รหัสการประเมิน", exact: true })
          .count(),
        1,
      );
      const body = await page.locator("body").innerText();
      assert(
        !/กลุ่มไม่ทราบ|ไม่ระบุกลุ่ม|รุ่นเดิม|v3|ผ่าน \/ ระดับต่ำ/.test(body),
      );
      for (const code of obsoleteCodes) assert(!body.includes(code));
      assert.equal(
        await page
          .getByRole("combobox", { name: "กลุ่ม", exact: true })
          .locator("option")
          .count(),
        3,
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      assert(
        (
          await page
            .getByText("อาการระดับสูง", { exact: true })
            .getAttribute("class")
        ).includes("text-red-600"),
      );
      await page
        .getByRole("textbox", { name: "ค้นหารายงาน" })
        .fill("no-match-ui-restore");
      await page.getByText("ไม่พบรายการตรงตัวกรอง", { exact: true }).waitFor();
      assert.equal(
        await page
          .getByRole("columnheader", { name: "รหัสการประเมิน", exact: true })
          .count(),
        1,
      );
      assert.equal(await page.locator("[data-dashboard-list] > tr").count(), 0);
      await page.getByRole("textbox", { name: "ค้นหารายงาน" }).fill("");
      await page.locator("[data-dashboard-list] > tr").first().waitFor();
      await page.screenshot({
        path: "docs/v3/baseline/ui-restore-dashboard-mobile.png",
      });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.screenshot({
        path: "docs/v3/baseline/ui-restore-dashboard-desktop.png",
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
    },
  );
  await check(
    "result headers/code are unique; current environment and satisfaction answers use tables; old links display no raw data",
    async () => {
      for (const code of [withFile.submission_code, ...currentCodes]) {
        await page.goto(front + "/result?submissionId=" + code);
        await page.locator("[data-report-version]").waitFor();
        assert.equal(await page.locator("h1").count(), 1);
        assert.equal(
          (await page.locator("body").innerText()).split(code).length - 1,
          1,
        );
        assert.equal(await page.locator(".print-report > header").count(), 1);
        assert(
          !/legacy-point|legacy_known|standard_display|inputs_json|scoring_version|Schema/.test(
            await page.locator("body").innerText(),
          ),
        );
        const record = await get(code);
        if (record.assessment_type === "environment")
          assert.equal(
            await page
              .getByRole("table", {
                name: "ค่าตรวจและเกณฑ์มาตรฐาน",
                exact: true,
              })
              .count(),
            1,
          );
        if (record.assessment_type === "satisfaction")
          assert.equal(
            await page
              .locator("[data-satisfaction-summary] table tbody tr")
              .count(),
            16,
          );
      }
      for (const code of obsoleteCodes) {
        await page.goto(front + "/result?submissionId=" + code);
        await page
          .getByRole("alert")
          .filter({ hasText: "ไม่พบรายการประเมินในข้อมูลปัจจุบัน" })
          .waitFor();
        assert.equal(await page.locator("[data-legacy-report]").count(), 0);
        assert(
          !/legacy-point|standard_display|WBGT|ค่าตรวจ/.test(
            await page.locator("body").innerText(),
          ),
        );
      }
    },
  );
  await check(
    "mobile navigation stays at viewport bottom at top/middle/end, is a body portal and never creates horizontal overflow",
    async () => {
      await page.goto(
        front + "/result?submissionId=" + withFile.submission_code,
      );
      await page.locator("[data-environment-summary]").waitFor();
      for (const fraction of [0, 0.5, 1]) {
        await page.evaluate(
          (f) =>
            window.scrollTo({
              top: (document.documentElement.scrollHeight - innerHeight) * f,
              behavior: "instant",
            }),
          fraction,
        );
        const box = await page.locator(".floating-pill-nav").boundingBox();
        assert(
          box &&
            box.x >= 11 &&
            box.x + box.width <= 379 &&
            Math.abs(box.x + box.width / 2 - 195) < 1 &&
            box.y >= 0 &&
            Math.abs(box.y + box.height - (844 - 12)) < 2,
          JSON.stringify(box),
        );
        assert(
          await page
            .locator(".floating-pill-nav")
            .evaluate(
              (e) =>
                e.parentElement === document.body &&
                getComputedStyle(e).position === "fixed",
            ),
        );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
      }
      await page.screenshot({
        path: "docs/v3/baseline/ui-restore-nav-bottom.png",
      });
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      await page.screenshot({
        path: "docs/v3/baseline/ui-restore-result-mobile.png",
      });
      assert.equal(
        await page
          .locator(".floating-pill-nav a[href='/dashboard']")
          .getAttribute("aria-current"),
        "page",
      );
      await page.setViewportSize({ width: 1440, height: 1000 });
      assert.equal(
        await page
          .locator("aside a[href='/dashboard']")
          .getAttribute("aria-current"),
        "page",
      );
      await page.screenshot({
        path: "docs/v3/baseline/ui-restore-result-desktop.png",
        fullPage: true,
      });
      await page.emulateMedia({ media: "print" });
      assert(await page.locator(".report-page-header").isVisible());
      assert.equal(
        (await page.locator(".report-page-header").innerText()).split(
          withFile.submission_code,
        ).length - 1,
        1,
      );
      assert.equal(await page.locator(".floating-pill-nav").isVisible(), false);
      await page.pdf({
        path: "docs/v3/baseline/ui-restore-environment.pdf",
        format: "A4",
        printBackground: true,
      });
      await page.emulateMedia({ media: "screen" });
      await page.setViewportSize({ width: 390, height: 844 });
    },
  );
  await check(
    "downloaded table report retains exact API snapshot and original scores",
    async () => {
      const event = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "ดาวน์โหลด Excel", exact: true })
        .click();
      const download = await event;
      const wb = xlsx.readFile(await download.path());
      const json = xlsx.utils
        .sheet_to_json(wb.Sheets["Snapshot ที่บันทึก"])
        .sort((a, b) => a["ส่วน JSON ตามลำดับ"] - b["ส่วน JSON ตามลำดับ"])
        .map((r) => r["JSON (ต่อส่วนตามลำดับ)"])
        .join("");
      assert.deepEqual(JSON.parse(json), await get(withFile.submission_code));
    },
  );
  await check(
    "all routes retain headings, menus and bounded layouts on mobile and desktop",
    async () => {
      const routes = [
        ["/", "สภาพแวดล้อมที่ปลอดภัย"],
        ["/dashboard", "Dashboard"],
        ["/assessment/environment", "ประเมินสภาพแวดล้อมในการทำงาน"],
        ["/assessment/health-risk", "ประเมินอาการทางสุขภาพ"],
        ["/assessment/satisfaction", "เลือกกลุ่มสำหรับความพึงพอใจ"],
        ["/assessment/satisfaction?group=environment", "แบบประเมินความพึงพอใจ"],
        ["/assessment/satisfaction?group=health", "แบบประเมินความพึงพอใจ"],
        [
          "/assessment/satisfaction?group=invalid",
          "เลือกกลุ่มสำหรับความพึงพอใจ",
        ],
        [
          "/assessment/environment-form?category=invalid",
          "ไม่พบหัวข้อที่เลือก",
        ],
        [
          "/assessment/health-risk-form?category=invalid",
          "ไม่พบหัวข้อที่เลือก",
        ],
        ["/result", "ไม่ระบุรหัสการประเมิน"],
        ["/result?submissionId=NONEXISTENT", "ดึงข้อมูลไม่สำเร็จ"],
        ["/complete", "ส่งข้อมูลเรียบร้อยแล้ว"],
        ["/not-a-real-route", "ไม่พบหน้านี้"],
        ...["light", "noise", "heat"].flatMap((category) => [
          [`/assessment/environment-form?category=${category}`, "สภาพแวดล้อม"],
          [
            `/assessment/health-risk-form?category=${category}`,
            "อาการทางสุขภาพ",
          ],
        ]),
      ];
      for (const viewport of [
        { width: 390, height: 844 },
        { width: 1440, height: 1000 },
      ]) {
        await page.setViewportSize(viewport);
        for (const [path, title] of routes) {
          await page.goto(front + path);
          await page
            .getByRole("heading", { level: 1, name: new RegExp(title) })
            .waitFor();
          assert.equal(await page.locator("h1").count(), 1, path);
          assert(
            await page.evaluate(
              () =>
                document.documentElement.scrollWidth <= window.innerWidth + 1,
            ),
            path,
          );
          assert.equal(
            await page
              .locator("h1")
              .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
            true,
            path,
          );
        }
        await page.goto(front + "/dashboard");
        await page
          .getByRole("heading", { name: "แยกตามประเภท", exact: true })
          .waitFor();
        assert(
          await page
            .getByRole("heading", { name: "ประวัติการประเมิน", exact: true })
            .isVisible(),
        );
        await page.goto(front + "/");
        await page.getByRole("button", { name: /ข้อมูลผู้จัดทำ/ }).click();
        await page
          .getByRole("button", { name: "ปิดหน้าต่าง", exact: true })
          .last()
          .waitFor();
        assert(
          (await page.locator("body").innerText()).includes(
            "หลักสูตรและการศึกษา",
          ),
        );
        await page
          .getByRole("button", { name: "ปิดหน้าต่าง", exact: true })
          .last()
          .click();
        for (const group of ["environment", "health"]) {
          await page.goto(
            front +
              `/assessment/${group === "health" ? "health-risk" : "environment"}`,
          );
          assert.equal(await page.locator("a.category-card").count(), 4);
          assert.equal(
            await page
              .locator(`a[href='/assessment/satisfaction?group=${group}']`)
              .count(),
            1,
          );
        }
      }
    },
  );
  await check(
    "environment headings, concise Area options, review and guidance survive every category",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const category of ["light", "noise", "heat"]) {
        await page.goto(front + "/");
        await page.evaluate(() => localStorage.clear());
        await page.goto(
          front + `/assessment/environment-form?category=${category}`,
        );
        await page
          .getByRole("heading", { name: "ข้อมูลการตรวจ", exact: true })
          .waitFor();
        assert(
          await page
            .getByRole("heading", {
              name: "แผนผังพื้นที่ (ไม่บังคับ)",
              exact: true,
            })
            .isVisible(),
        );
        await metadata(category, category === "light" ? "area" : "spot", false);
        assert(
          await page
            .getByRole("heading", { name: /แบบฟอร์มบันทึกการตรวจวัด/ })
            .isVisible(),
        );
        if (category === "light") {
          await input(0, "location_desc").fill("พื้นที่ตรวจแสงจำลอง");
          const labels = await input(0, "standard_code")
            .locator("option")
            .allTextContents();
          assert(labels.every((label) => !/Lux|เฉลี่ย|ต่ำสุด|≥/.test(label)));
          await input(0, "standard_code").selectOption("area-office");
          await input(0, "samples.0.lux").fill("350");
          await page
            .getByRole("button", { name: "ทบทวนก่อนบันทึก", exact: true })
            .click();
          await page.locator("[data-environment-summary]").waitFor();
          for (const name of [
            "ข้อมูลการตรวจวัด",
            "ผังพื้นที่ห้อง / Layout",
            "คำแนะนำ",
          ]) {
            assert(
              await page
                .getByRole("heading", { name, exact: true })
                .isVisible(),
            );
          }
          await page.screenshot({
            path: "docs/v3/baseline/ui-audit-environment-review-mobile.png",
            fullPage: true,
          });
        }
      }
      for (const code of currentCodes) {
        const data = await get(code);
        if (data.assessment_type !== "environment") continue;
        await page.goto(front + `/result?submissionId=${code}`);
        await page
          .getByRole("heading", { name: "คำแนะนำ", exact: true })
          .waitFor();
        assert(
          await page
            .getByRole("heading", {
              name: "ผังพื้นที่ห้อง / Layout",
              exact: true,
            })
            .isVisible(),
        );
        assert.equal(
          await page
            .getByRole("button", { name: "ดูเอกสารในหน้านี้", exact: true })
            .count(),
          0,
        );
        const standards = page.getByRole("region", {
          name: "เอกสารมาตรฐาน",
          exact: true,
        });
        assert.equal(
          await standards.locator("iframe, embed, object").count(),
          0,
        );
        const openDocument = standards.getByRole("link", {
          name: "เปิดเอกสารมาตรฐาน",
          exact: true,
        });
        const downloadDocument = standards.getByRole("link", {
          name: "ดาวน์โหลด PDF",
          exact: true,
        });
        assert.equal(await openDocument.getAttribute("target"), "_blank");
        assert.equal(
          await openDocument.getAttribute("href"),
          await downloadDocument.getAttribute("href"),
        );
        assert.notEqual(await downloadDocument.getAttribute("download"), null);
      }
    },
  );
  await check(
    "health restores personal/health/work sections and disease choices through review",
    async () => {
      await page.goto(front + "/");
      await page.evaluate(() => localStorage.clear());
      await page.goto(front + "/assessment/health-risk-form?category=light");
      await page
        .getByRole("heading", { name: "ข้อมูลส่วนตัว", exact: true })
        .waitFor();
      assert(
        await page
          .getByRole("heading", { name: "ข้อมูลสุขภาพ", exact: true })
          .isVisible(),
      );
      const p = fixtures("unused").find(
        (f) => f.name === "health-light",
      ).payload;
      for (const [name, value] of Object.entries(p.profile)) {
        const el = field(name);
        if (await el.evaluate((el) => el.tagName === "SELECT"))
          await el.selectOption(String(value));
        else await el.fill(String(value));
      }
      assert.equal(
        await field("has_underlying_disease")
          .locator("option[value='false']")
          .innerText(),
        "ไม่มี",
      );
      await field("has_underlying_disease").selectOption("true");
      assert(await field("underlying_disease_details").isVisible());
      await field("has_underlying_disease").selectOption("false");
      assert.equal(await field("underlying_disease_details").count(), 0);
      await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
      await page
        .getByRole("heading", {
          name: "ข้อมูลการปฏิบัติงาน / การเรียน",
          exact: true,
        })
        .waitFor();
      for (const [name, value] of Object.entries(p.workInfo)) {
        const el = field(name);
        if (await el.evaluate((el) => el.tagName === "SELECT"))
          await el.selectOption(String(value));
        else await el.fill(String(value));
      }
      await field("hours_worked_today").fill("0");
      await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
      for (let q = 1; q <= 10; q++)
        await field("q" + q)
          .nth(0)
          .check();
      await page
        .getByRole("tab", { name: "หลังปฏิบัติงาน / เรียน", exact: true })
        .click();
      for (let q = 1; q <= 10; q++)
        await field("q" + q)
          .nth(1)
          .check();
      await page.getByRole("button", { name: "ดูผลสรุป", exact: true }).click();
      await page
        .getByRole("heading", { name: "ตรวจทานก่อนส่งข้อมูล", exact: true })
        .waitFor();
      assert(
        await page
          .getByRole("heading", {
            name: "ข้อเสนอแนะ — ด้านแสงสว่าง",
            exact: true,
          })
          .isVisible(),
      );
      assert.equal(
        await page.locator("[data-health-comparison] tbody tr").count(),
        10,
      );
      await page.screenshot({
        path: "docs/v3/baseline/ui-audit-health-review-mobile.png",
        fullPage: true,
      });
    },
  );
  await check(
    "health recommendations follow current symptom levels for all three categories, light uses after score",
    async () => {
      for (const category of ["light", "noise", "heat"]) {
        for (const rating of [0, 1, 2]) {
          const p = fixtures("unused").find(
            (f) => f.name === "health-" + category,
          ).payload;
          const answers = Object.fromEntries(
            Array.from({ length: 10 }, (_, i) => ["q" + (i + 1), rating]),
          );
          p.answers =
            category === "light"
              ? {
                  before: Object.fromEntries(
                    Object.keys(answers).map((k) => [k, 2 - rating]),
                  ),
                  after: answers,
                }
              : { single: answers };
          const created = await call("/submissions", p);
          assert.equal(created.status, 201);
          const code = created.json.data.submission_code;
          const before = await get(code);
          await page.goto(front + `/result?submissionId=${code}`);
          await page.locator("[data-health-comparison]").waitFor();
          const guidance = page.getByRole("region", {
            name: "ข้อเสนอแนะด้านสุขภาพ",
          });
          assert(await guidance.isVisible());
          const list = await guidance.locator("li").allTextContents();
          assert.deepEqual(
            list,
            HEALTH_RISK_RECOMMENDATIONS[category][
              ["pass", "medium", "high"][rating]
            ],
          );
          assert.equal(await page.locator("h1").count(), 1);
          assert.equal(
            (await page.locator("body").innerText()).split(code).length - 1,
            1,
          );
          for (const name of [
            "ข้อมูลส่วนตัวและสุขภาพ",
            "ข้อมูลการปฏิบัติงาน / การเรียน",
            "สรุปผลการประเมินอาการทางสุขภาพ",
            "รายละเอียดการตอบแบบประเมินอาการทางสุขภาพ (10 ข้อ)",
          ]) {
            assert(
              await page
                .getByRole("heading", { name, exact: true })
                .isVisible(),
            );
          }
          await page.emulateMedia({ media: "print" });
          assert(await guidance.isVisible());
          assert(await page.locator(".report-page-header").isVisible());
          await page.emulateMedia({ media: "screen" });
          assert.deepEqual(await get(code), before);
        }
      }
    },
  );
  await check(
    "satisfaction keeps four summary dimensions, sixteen current questions, suggestions and both groups",
    async () => {
      for (const group of ["environment", "health"]) {
        const p = fixtures("unused").find(
          (f) => f.name === "satisfaction-" + group,
        ).payload;
        p.suggestion = "ข้อเสนอแนะจำลอง";
        const created = await call("/submissions", p);
        assert.equal(created.status, 201);
        for (const viewport of [
          { width: 390, height: 844 },
          { width: 1440, height: 1000 },
        ]) {
          await page.setViewportSize(viewport);
          await page.goto(
            front + `/result?submissionId=${created.json.data.submission_code}`,
          );
          await page.locator("[data-satisfaction-summary]").waitFor();
          assert.equal(
            await page.locator("[aria-label='สรุปคะแนนรายด้าน'] > div").count(),
            4,
          );
          assert.equal(
            await page.locator("[data-satisfaction-summary] tbody tr").count(),
            16,
          );
          assert(
            await page
              .getByRole("heading", {
                name: "รายละเอียดการตอบแบบประเมินความพึงพอใจ (16 ข้อ)",
                exact: true,
              })
              .isVisible(),
          );
          assert(
            await page
              .getByRole("heading", {
                name: "ข้อเสนอแนะเพิ่มเติม",
                exact: true,
              })
              .isVisible(),
          );
          assert.equal(
            await page
              .getByRole("heading", {
                name: "เวลาในการประเมิน (กรอกเอง)",
                exact: true,
              })
              .count(),
            group === "environment" ? 1 : 0,
          );
          await page.screenshot({
            path: `docs/v3/baseline/ui-audit-satisfaction-${group}-${viewport.width}.png`,
            fullPage: true,
          });
        }
      }
    },
  );
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(
    (await db.prepare("PRAGMA foreign_key_check").all()).results,
    [],
  );
  await page.screenshot({
    path: "docs/v3/baseline/ui-restore-mobile.png",
    fullPage: true,
  });
  writeFileSync(
    "docs/v3/baseline/ui-restore-tests.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        passed,
        checks,
        page_errors: pageErrors,
        runtime: "Chromium + isolated real local Worker/D1/R2",
        foreign_key_violations: 0,
        remote: false,
        deployed: false,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("UI restore acceptance PASS " + passed);
} catch (error) {
  console.error(logs.slice(-2500));
  throw error;
} finally {
  await browser.close();
  next.kill("SIGINT");
  await mf.dispose();
}
