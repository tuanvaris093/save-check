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
  temp = mkdtempSync(join(tmpdir(), "safecheck-p8-e2e-")),
  script = join(temp, "worker.mjs"),
  front = "http://127.0.0.1:3054",
  api = "http://127.0.0.1:3055";
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
  port: 3055,
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
paths=sorted(Path('worker/src/db/migrations').glob('*.sql'));paths.insert(1,Path('worker/src/db/seed.sql'));paths.insert(2,Path('tests/v3/p8-legacy-report-fixtures.sql'));scripts=[]
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
const { chromium, firefox, webkit } = createRequire(pp)("playwright");
const next = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--turbopack",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3054",
  ],
  {
    env: {
      ...process.env,
      SAFECHECK_TEST_DIST_DIR: ".next-test-p8",
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

import { fixtures, key, setPath } from "./p8-fixtures.mjs";
const xlsx = createRequire(resolve("package.json"))("xlsx"),
  checksMatrix = [],
  optionalMatrix = [],
  created = new Map(),
  acceptance = [];
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
async function get(code) {
  const r = await call("/results/" + code, undefined, "GET");
  assert.equal(r.status, 200, JSON.stringify(r.json));
  return r.json.data;
}
async function counts() {
  const tables = [
    "submissions",
    "respondent_profiles",
    "respondent_work_infos",
    "health_risk_answers",
    "satisfaction_answers",
    "assessment_results",
    "environment_revisions",
    "environment_revision_points",
    "submission_payload_versions",
    "mutation_requests",
  ];
  return Object.fromEntries(
    await Promise.all(
      tables.map(async (t) => [
        t,
        (await db.prepare(`SELECT COUNT(*) n FROM ${t}`).first()).n,
      ]),
    ),
  );
}
const engineResults = [];
try {
  await wait(async () => {
    try {
      return (await fetch(front + "/")).ok;
    } catch {
      return false;
    }
  });
  let cases;
  await check(
    "all valid applicable shapes create with zero/false/N/A and metadata; no implicit data",
    async () => {
      const upload = await fetch(api + "/api/files", {
        method: "POST",
        headers: {
          Origin: front,
          "Content-Type": "image/png",
          "X-File-Name": "p8.png",
          "Idempotency-Key": key(),
        },
        body: Uint8Array.from(
          Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3WQAAAAASUVORK5CYII=",
            "base64",
          ),
        ),
      });
      const f = await upload.json();
      assert(f.success, JSON.stringify(f));
      cases = fixtures(f.data.file_id);
      for (const c of cases) {
        const r = await call("/submissions", c.payload);
        assert.equal(r.status, 201, c.name + " " + JSON.stringify(r.json));
        created.set(c.name, await get(r.json.data.submission_code));
      }
    },
  );
  await check(
    "Worker rejects every missing required leaf for all applicable shapes with zero writes",
    async () => {
      const before = await counts();
      for (const c of cases)
        for (const path of c.required) {
          const payload = structuredClone(c.payload);
          payload.idempotency_key = key();
          setPath(payload, path, undefined, true);
          const r = await call("/submissions", payload);
          assert.equal(
            r.status,
            400,
            c.name + " " + path + " " + JSON.stringify(r.json),
          );
          checksMatrix.push({
            case: c.name,
            path,
            expected: 400,
            actual: r.status,
          });
        }
      assert.deepEqual(await counts(), before);
    },
  );
  await check(
    "all optional notes accept omitted/null/empty/whitespace while conditional disease/other text stays required",
    async () => {
      for (const c of cases)
        for (const path of c.optional)
          for (const value of [undefined, null, "", "  "]) {
            const payload = structuredClone(c.payload);
            payload.idempotency_key = key();
            setPath(payload, path, value, value === undefined);
            const r = await call("/submissions", payload);
            assert.equal(
              r.status,
              201,
              c.name + " " + path + " " + JSON.stringify(r.json),
            );
            optionalMatrix.push({
              case: c.name,
              path,
              value: value === undefined ? "omitted" : value,
              expected: 201,
              actual: r.status,
            });
          }
      for (const [name, path] of [
        ["health-disease", "profile.underlying_disease_details"],
        ["health-other-noise", "healthContext.noise_source_other"],
        ["satisfaction-other-study", "workInfo.other_context"],
      ])
        for (const value of [null, "", "  "]) {
          const payload = structuredClone(
            cases.find((c) => c.name === name).payload,
          );
          payload.idempotency_key = key();
          setPath(payload, path, value);
          assert.equal((await call("/submissions", payload)).status, 400);
        }
    },
  );
  await check(
    "eight same-key concurrent submissions replay one code; different keys create distinct jobs",
    async () => {
      const payload = structuredClone(
        cases.find((c) => c.name === "health-heat").payload,
      );
      payload.idempotency_key = key();
      const before = (await counts()).submissions,
        replies = await Promise.all(
          Array.from({ length: 8 }, () => call("/submissions", payload)),
        );
      assert(
        replies.every((r) => r.status === 201),
        JSON.stringify(replies),
      );
      assert.equal(
        new Set(replies.map((r) => r.json.data.submission_code)).size,
        1,
      );
      assert.equal((await counts()).submissions, before + 1);
      const unique = await Promise.all(
        Array.from({ length: 8 }, () =>
          call("/submissions", { ...payload, idempotency_key: key() }),
        ),
      );
      assert(unique.every((r) => r.status === 201));
      assert.equal(
        new Set(unique.map((r) => r.json.data.submission_code)).size,
        8,
      );
    },
  );
  await check(
    "fresh independent browser profiles open all eight results and download XLSX equal to API without localStorage",
    async () => {
      for (const [engine, launcher] of [
        ["chromium", chromium],
        ["firefox", firefox],
        ["webkit", webkit],
      ]) {
        let fresh;
        try {
          fresh = await launcher.launch({ headless: true });
        } catch (e) {
          if (engine === "chromium") throw e;
          engineResults.push({
            engine,
            status: "not-run",
            reason: "runtime not installed; installation permission declined",
          });
          continue;
        }
        const freshContext = await fresh.newContext({
            viewport: { width: 390, height: 844 },
          }),
          p = await freshContext.newPage();
        p.on("pageerror", (e) => pageErrors.push(engine + ": " + e.message));
        try {
          await p.goto(front + "/");
          assert.deepEqual(
            await p.evaluate(() => Object.keys(localStorage)),
            [],
          );
          for (const [name, ready, sheet] of [
            ["environment-light", "[data-environment-summary]", "ค่าตรวจ"],
            ["environment-noise", "[data-environment-summary]", "ค่าตรวจ"],
            ["environment-heat", "[data-environment-summary]", "ค่าตรวจ"],
            ["health-light", "[data-health-totals]", "คำตอบอาการ"],
            ["health-noise", "[data-health-totals]", "คำตอบอาการ"],
            ["health-heat", "[data-health-totals]", "คำตอบอาการ"],
            ["satisfaction-environment", "[data-overall-mean]", "ความพึงพอใจ"],
            ["satisfaction-health", "[data-overall-mean]", "ความพึงพอใจ"],
          ]) {
            const r = created.get(name);
            await p.goto(front + "/result?submissionId=" + r.submission_code);
            await p.locator(ready).waitFor();
            assert.equal(await p.locator("[data-report-version]").count(), 1);
            assert(
              await p.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
            );
            const download = p.waitForEvent("download");
            await p
              .getByRole("button", {
                name: "ดาวน์โหลด Excel",
                exact: true,
              })
              .click();
            const d = await download,
              w = xlsx.readFile(await d.path());
            assert(w.Sheets[sheet]);
            const snapshot = xlsx.utils
              .sheet_to_json(w.Sheets["Snapshot ที่บันทึก"])
              .map((v) => v["JSON (ต่อส่วนตามลำดับ)"])
              .join("");
            assert.deepEqual(
              JSON.parse(snapshot),
              await get(r.submission_code),
            );
            assert.deepEqual(
              await p.evaluate(() => Object.keys(localStorage)),
              [],
            );
            engineResults.push({
              engine,
              case: name,
              result: "pass",
              snapshot_equals_api: true,
              localStorage_keys: 0,
            });
          }
          for (const route of [
            "/assessment/environment-form?category=light",
            "/assessment/environment-form?category=noise",
            "/assessment/environment-form?category=heat",
            "/assessment/health-risk-form?category=light",
            "/assessment/health-risk-form?category=noise",
            "/assessment/health-risk-form?category=heat",
            "/assessment/satisfaction?group=environment",
            "/assessment/satisfaction?group=health",
          ]) {
            await p.goto(front + route);
            await p
              .getByRole("button", { name: "ถัดไป", exact: true })
              .waitFor();
            assert(
              await p.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
            );
          }
          await p.goto(front + "/dashboard");
          await p.locator("[data-dashboard-list]").waitFor();
          await p.evaluate(() => scrollTo(0, 0));
          await p.screenshot({
            path: "docs/v3/baseline/p8-" + engine + "-mobile.png",
            fullPage: true,
          });
        } finally {
          await fresh.close();
        }
      }
    },
  );
  await check(
    "failed → failed → pass keeps only failed units new and preserves original round/ownership",
    async () => {
      const payload = structuredClone(
        cases.find((c) => c.name === "environment-light").payload,
      );
      payload.idempotency_key = key();
      payload.units.push({
        ...payload.units[0],
        point_id: "carry",
        location_desc: "จุดผ่าน",
        lux: 600,
      });
      const response = await call("/submissions", payload);
      assert.equal(response.status, 201);
      const code = response.json.data.submission_code,
        r1 = await get(code);
      let current = r1;
      const rounds = [r1];
      for (const [day, lux] of [
        [13, 100],
        [14, 500],
      ]) {
        const r = await call("/submissions/" + code + "/retests", {
          schema_version: 3,
          idempotency_key: key(),
          base_revision_id: current.revision.revision_id,
          inspection_date: `2026-10-${day}`,
          start_at: `2026-10-${day}T01:00:00Z`,
          end_at: `2026-10-${day}T04:00:00Z`,
          updates: [{ kind: "light_spot", point_id: "spot", lux }],
        });
        assert.equal(r.status, 201, JSON.stringify(r.json));
        current = await get(code);
        rounds.push(current);
        const carry = current.revision.observations.find(
          (o) => o.unit.point_id === "carry",
        );
        assert.equal(carry.observation_kind, "carried");
        assert.equal(carry.measured_at, "2026-10-12T01:00:00Z");
        assert.equal(carry.carried_from_revision_id, r1.revision.revision_id);
      }
      assert.deepEqual(
        rounds.map((r) => r.revision.is_pass),
        [false, false, true],
      );
      const old = await call(
        `/results/${code}?revision=${r1.revision.revision_id}`,
        undefined,
        "GET",
      );
      assert.deepEqual(old.json.data.revision, r1.revision);
      assert.equal(old.json.data.can_retest, false);
      const foreign = await call(
        `/results/${code}?revision=${created.get("environment-noise").revision.revision_id}`,
        undefined,
        "GET",
      );
      assert.equal(foreign.status, 404);
      acceptance.push({
        id: "U09",
        expected: {
          pass: [false, false, true],
          carried_date: "2026-10-12T01:00:00Z",
          old_round_unchanged: true,
          foreign_revision_status: 404,
        },
        actual: {
          pass: rounds.map((r) => r.revision.is_pass),
          carried_date: current.revision.observations.find(
            (o) => o.unit.point_id === "carry",
          ).measured_at,
          old_round_unchanged: true,
          foreign_revision_status: foreign.status,
        },
        result: "pass",
        owner_status: "pending",
      });
    },
  );
  await check(
    "empty legacy sources stay unknown and are excluded from current UI without fabricated scores",
    async () => {
      for (const code of ["P8-LEGACY-EMPTY-ENV", "P8-LEGACY-EMPTY-HEALTH"]) {
        const r = await get(code);
        if (r.assessment_type === "environment")
          assert.equal(r.revision.is_pass, null);
        else assert.equal(r.overall_score, null);
        await page.goto(front + "/result?submissionId=" + code);
        await page
          .getByRole("alert")
          .filter({ hasText: "ไม่พบรายการประเมินในข้อมูลปัจจุบัน" })
          .waitFor();
        assert.equal(await page.locator("[data-legacy-report]").count(), 0);
        assert.equal(
          await page
            .getByRole("button", { name: "ดาวน์โหลด Excel", exact: true })
            .count(),
          0,
        );
      }
    },
  );
  await check(
    "key owner acceptance values are independently expected and actual from Worker",
    async () => {
      const health = created.get("health-light"),
        noise = created.get("environment-noise"),
        heat = created.get("environment-heat"),
        sat = created.get("satisfaction-environment");
      for (const [id, expected, actual] of [
        [
          "U01",
          { before: 0, after: 10, delta: 10, level: "medium" },
          {
            before: health.result.before_total,
            after: health.result.after_total,
            delta: health.result.delta,
            level: health.result.after_level,
          },
        ],
        [
          "U02",
          { weekly_hours: 40, year: 6 },
          {
            weekly_hours: health.workInfo.working_hours_per_week,
            year: health.workInfo.study_year,
          },
        ],
        [
          "U03",
          { duration: 240, limit: 88, is_pass: false },
          {
            duration:
              noise.revision.observations[0].result.standard.thresholds
                .duration_minutes,
            limit:
              noise.revision.observations[0].result.standard.thresholds.limit,
            is_pass: noise.revision.is_pass,
          },
        ],
        [
          "U04",
          { wbgt: 34, limit: 34, is_pass: true },
          {
            wbgt: heat.revision.observations[0].result.values.wbgt_average,
            limit:
              heat.revision.observations[0].result.standard.thresholds.limit,
            is_pass: heat.revision.is_pass,
          },
        ],
        [
          "U05",
          { mean: 5, traditional_seconds: 93784, safecheck_seconds: 1 },
          {
            mean: sat.result.overall_mean,
            traditional_seconds: sat.result.durations.traditional_seconds,
            safecheck_seconds: sat.result.durations.safecheck_seconds,
          },
        ],
      ]) {
        assert.deepEqual(actual, expected, id);
        acceptance.push({
          id,
          expected,
          actual,
          result: "pass",
          owner_status: "pending",
        });
      }
    },
  );
  await check(
    "required rejects/optional creates/concurrent runs leave no foreign-key or browser errors",
    async () => {
      assert.deepEqual(
        (await db.prepare("PRAGMA foreign_key_check").all()).results,
        [],
      );
      assert.deepEqual(pageErrors, []);
    },
  );
  writeFileSync(
    "docs/v3/baseline/p8-browser.json",
    JSON.stringify(
      {
        phase: "P8",
        date: new Date().toISOString(),
        passed,
        checks,
        required_rejections: checksMatrix,
        optional_acceptance: optionalMatrix,
        engines: engineResults,
        owner_acceptance: acceptance,
        pageErrors,
        deployed: false,
        remote_database: false,
      },
      null,
      2,
    ),
  );
  console.log(
    `P8 browser PASS ${passed}: ${checksMatrix.length} required rejects / ${optionalMatrix.length} optional creates / ${engineResults.filter((r) => r.result === "pass").length} independent browser exports`,
  );
} catch (e) {
  console.error(logs.slice(-1800));
  throw e;
} finally {
  await browser.close();
  next.kill("SIGINT");
  await mf.dispose();
}
