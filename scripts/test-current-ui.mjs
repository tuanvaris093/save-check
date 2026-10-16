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
  temp = mkdtempSync(join(tmpdir(), "safecheck-current-ui-")),
  script = join(temp, "worker.mjs"),
  front = "http://127.0.0.1:3064",
  api = "http://127.0.0.1:3065";
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
  port: 3065,
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
    "3064",
  ],
  {
    env: {
      ...process.env,
      SAFECHECK_TEST_DIST_DIR: ".next-test-current",
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
        path: "docs/v3/baseline/current-ui-form-mobile.png",
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
    "dashboard/results present one current app without schema/version filters or v3 wording; API/exports stay available",
    async () => {
      await page.goto(front + "/dashboard");
      await page.locator("[data-dashboard-list]").waitFor();
      await page.screenshot({
        path: "docs/v3/baseline/current-ui-dashboard-mobile.png",
        fullPage: true,
      });
      assert.equal(await page.locator('[name="schema_version"]').count(), 0);
      assert(
        !/v3|รุ่นเดิม|รุ่นโครงสร้างข้อมูล|ทุกรุ่น/i.test(
          await page.locator("body").innerText(),
        ),
      );
      for (const code of [
        withFile.submission_code,
        "SUB-20260901-1001",
        "SUB-20260903-3003",
        "SUB-20260904-4004",
      ]) {
        const result = await call("/results/" + code, undefined, "GET");
        if (result.status !== 200) continue;
        await page.goto(front + "/result?submissionId=" + code);
        if (result.json.data.schema_version !== 3) {
          await page
            .getByRole("alert")
            .filter({ hasText: "ไม่พบรายการประเมินในข้อมูลปัจจุบัน" })
            .waitFor();
          assert.equal(await page.locator("[data-legacy-report]").count(), 0);
          continue;
        }
        await page.locator("[data-report-version]").waitFor();
        assert(
          !/v3|รุ่นเดิม|Schema|Scoring|รุ่นคำถาม|รุ่นแบบประเมิน/i.test(
            await page.locator("body").innerText(),
          ),
        );
      }
      await page.goto(
        front + "/result?submissionId=" + withFile.submission_code,
      );
      await page.locator("[data-environment-summary]").waitFor();
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
      assert.equal(
        wb.Workbook.Sheets.find((s) => s.name === "Snapshot ที่บันทึก").Hidden,
        1,
      );
      assert(!download.suggestedFilename().includes("-v"));
    },
  );
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(
    (await db.prepare("PRAGMA foreign_key_check").all()).results,
    [],
  );
  await page.screenshot({
    path: "docs/v3/baseline/current-ui-mobile.png",
    fullPage: true,
  });
  writeFileSync(
    "docs/v3/baseline/current-ui-tests.json",
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
  console.log("Current UI acceptance PASS " + passed);
} catch (error) {
  console.error(logs.slice(-2500));
  throw error;
} finally {
  await browser.close();
  next.kill("SIGINT");
  await mf.dispose();
}
