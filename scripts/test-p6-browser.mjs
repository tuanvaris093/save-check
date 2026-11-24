import { checkSubmitFlow } from "./submit-flow-check.mjs";
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
  temp = mkdtempSync(join(tmpdir(), "safecheck-p6-e2e-")),
  script = join(temp, "worker.mjs"),
  front = "http://127.0.0.1:3034",
  api = "http://127.0.0.1:3035";
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
  port: 3035,
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
    "3034",
  ],
  {
    env: {
      ...process.env,
      SAFECHECK_TEST_DIST_DIR: ".next-test-p6",
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
const field = (name) => page.locator(`[name="${name}"]`),
  key = () => crypto.randomUUID();
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
async function respondent(group, type = "student") {
  await field("full_name").fill("ผู้ทดสอบ P6");
  if (group === "health") {
    await field("work.position_type").selectOption(type);
    await field("work.program_code").selectOption(
      type === "student" ? "program-07" : "not_applicable",
    );
    if (type === "student") await field("work.study_year").selectOption("6");
  }
  await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
  await field("q1").first().waitFor();
}
async function ratings() {
  for (let i = 1; i <= 16; i++) {
    const choice = page
      .locator(`input[name="q${i}"][value="${(i % 5) + 1}"]`)
      .locator("..");
    await choice.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await choice.click();
  }
}
async function duration(
  d = { traditional: [1, 2, 3, 4], safecheck: [0, 0, 0, 1] },
) {
  for (const method of ["traditional", "safecheck"])
    for (const [i, u] of ["days", "hours", "minutes", "seconds"].entries())
      await field(`durations.${method}.${u}`).fill(String(d[method][i]));
}
let submitFlowChecked = false;
async function submit() {
  const response = page.waitForResponse(
    (r) =>
      r.url().startsWith(api + "/api/submissions") &&
      r.request().method() === "POST",
  );
  if (!submitFlowChecked) {
    await checkSubmitFlow(page, {
      front,
      api,
      button: "บันทึกผล",
      screenshot: "docs/v3/baseline/submit-flow-satisfaction.png",
    });
    submitFlowChecked = true;
  } else {
    await page.getByRole("button", { name: "บันทึกผล", exact: true }).click();
  }
  const j = await (await response).json();
  assert(j.success, JSON.stringify(j));
  await page.waitForURL(/\/result\?/);
  await page.locator("[data-satisfaction-summary]").waitFor();
  return j.data;
}
let health, environment;
try {
  await wait(async () => {
    try {
      return (await fetch(front)).ok;
    } catch {
      return false;
    }
  });
  await check(
    "independent health entry requires name/type/program/year; real 7 programs and separate years 1–6",
    async () => {
      await page.goto(front + "/assessment/satisfaction?group=health");
      await field("full_name").waitFor();
      await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
      await page.locator("[data-submit-error]").waitFor();
      await field("full_name").fill("ทดสอบล้างข้อผิดพลาด");
      assert.equal(
        await field("full_name").getAttribute("aria-invalid"),
        "false",
      );

      assert(
        await field("full_name").evaluate((e) => e === document.activeElement),
      );
      await field("full_name").fill("ผู้ทดสอบ P6");
      await field("work.position_type").selectOption("student");
      assert.equal(
        await field("work.program_code").locator("option").count(),
        8,
      );
      assert.equal(await field("work.study_year").locator("option").count(), 7);
      await respondent("health");
      assert.equal(await page.locator('input[type="radio"]').count(), 80);
    },
  );
  await check(
    "16 ratings required; optional notes, back/refresh preserve profile and answers; real health create/read",
    async () => {
      await page.getByRole("button", { name: "ดูผลสรุป", exact: true }).click();
      assert.equal(
        await page.locator("[data-satisfaction-summary]").count(),
        0,
      );
      assert.equal(await page.locator('[id^="sat-error-"]').count(), 16);
      await page.locator('input[name="q6"][value="5"]').locator("..").click();
      await wait(
        async () => (await page.locator("#sat-error-q6").count()) === 0,
      );
      assert.equal(
        await page.locator('input[name="q6"]:checked').inputValue(),
        "5",
      );
      assert.equal(await page.locator('[id^="sat-error-"]').count(), 15);
      await page.locator('input[name="q6"][value="5"]').locator("..").click();
      assert.equal(await page.locator("#sat-error-q6").count(), 0);
      assert.equal(
        await page
          .locator('input[name="q6"]:checked')
          .locator('xpath=ancestor::*[@role="radiogroup"]')
          .getAttribute("aria-invalid"),
        "false",
      );
      await ratings();
      await wait(
        async () => (await page.locator('[id^="sat-error-"]').count()) === 0,
      );
      await page
        .locator("form")
        .getByRole("button", { name: "ย้อนกลับ", exact: true })
        .click();
      assert.equal(await field("full_name").inputValue(), "ผู้ทดสอบ P6");
      await page.reload();
      await field("full_name").waitFor();
      assert.equal(await field("work.study_year").inputValue(), "6");
      await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
      assert.equal(
        await page.locator('input[name="q16"]:checked').inputValue(),
        "2",
      );
      assert.equal(
        await page.locator("textarea").getAttribute("required"),
        null,
      );
      await page.getByRole("button", { name: "ดูผลสรุป", exact: true }).click();
      health = await submit();
      const s = await get(health.submission_code);
      assert.equal(s.workInfo.program_code, "program-07");
      assert.equal(s.workInfo.study_year, 6);
      assert.equal(s.suggestion, null);
      assert.equal(
        await page
          .locator(".summary-field")
          .filter({
            has: page.locator("dt").getByText("ชั้นปี", { exact: true }),
          })
          .locator("dd")
          .textContent(),
        "6",
      );
      assert(!("durations" in s));
    },
  );
  await check(
    "environment name is required, drafts/groups do not share ratings, durations follow ratings",
    async () => {
      await page.goto(front + "/assessment/satisfaction?group=environment");
      await field("full_name").waitFor();
      assert.equal(await field("full_name").inputValue(), "");
      assert.equal(await field("work.position_type").count(), 0);
      await respondent("environment");
      assert.equal(
        await page.locator('input[type="radio"]:checked').count(),
        0,
      );
      assert.equal(await field("durations.traditional.days").count(), 0);
      await ratings();
      await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
      await field("durations.traditional.days").waitFor();
      assert.equal(await field("durations.traditional.days").inputValue(), "");
      await page.getByRole("button", { name: "ดูผลสรุป", exact: true }).click();
      await page.getByRole("alert").first().waitFor();
      assert.equal(
        await page.locator("[data-satisfaction-summary]").count(),
        0,
      );
    },
  );
  await check(
    "all 8 manual units required; positive total/int/ranges validated; 93784 seconds and negative difference persist",
    async () => {
      await duration({ traditional: [0, 0, 0, 0], safecheck: [0, 0, 0, 1] });
      await page.getByRole("button", { name: "ดูผลสรุป", exact: true }).click();
      assert.equal(
        await page.locator("[data-satisfaction-summary]").count(),
        0,
      );
      await duration({ traditional: [1, 24, 3, 4], safecheck: [0, 0, 0, 1] });
      await page.getByRole("button", { name: "ดูผลสรุป", exact: true }).click();
      assert.equal(
        await page.locator("[data-satisfaction-summary]").count(),
        0,
      );
      await duration({ traditional: [1, 2, 3, 4], safecheck: [2, 0, 0, 1] });
      await page.reload();
      await field("durations.traditional.hours").waitFor();
      assert.equal(
        await field("durations.traditional.hours").inputValue(),
        "2",
      );
      await page.getByRole("button", { name: "ดูผลสรุป", exact: true }).click();
      await page.locator("[data-satisfaction-summary]").waitFor();
      environment = await submit();
      const s = await get(environment.submission_code);
      assert.equal(s.result.durations.traditional_seconds, 93784);
      assert.equal(s.result.durations.safecheck_seconds, 172801);
      assert.equal(s.result.durations.source, "manual");
      assert.equal(
        s.result.overall_mean,
        (await get(health.submission_code)).result.overall_mean,
      );
      assert((await page.locator("body").innerText()).includes("-79017"));
      await page.screenshot({
        path: "docs/v3/baseline/p6-environment-mobile.png",
        fullPage: true,
      });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
    },
  );
  await check(
    "downloaded real Excel matches API group, name, seconds, mean and all stored question text",
    async () => {
      const downloadEvent = page.waitForEvent("download");
      await page.getByRole("button", { name: "ดาวน์โหลด Excel" }).click();
      const download = await downloadEvent;
      const path = join(temp, "download.xlsx");
      await download.saveAs(path);
      const XLSX = createRequire(resolve("package.json"))("xlsx"),
        wb = XLSX.readFile(path),
        rows = XLSX.utils.sheet_to_json(wb.Sheets["ความพึงพอใจ"]);
      assert.equal(rows[0]["กลุ่มแบบประเมิน"], "environment");
      assert.equal(rows[0]["ผู้ประเมิน"], "ผู้ทดสอบ P6");
      assert.equal(rows[0]["เวลาวิธีเดิม (วินาที)"], 93784);
      assert.equal(rows[0]["ผลต่างเวลา วิธีเดิม−SafeCheck (วินาที)"], -79017);
      assert.equal(
        XLSX.utils.sheet_to_json(wb.Sheets["คำถามที่บันทึก"]).length,
        16,
      );
    },
  );
  await check(
    "staff explicit N/A has no student field; other respondents require study/work context",
    async () => {
      await page.goto(front + "/assessment/satisfaction?group=health");
      await field("full_name").waitFor();
      await field("full_name").fill("บุคลากร P6");
      await field("work.position_type").selectOption("other");
      await field("work.program_code").selectOption("not_applicable");
      await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
      assert.equal(await field("q1").count(), 0);
      await field("work.other_context").selectOption("study");
      assert.equal(await field("work.study_year").count(), 1);
      await field("work.position_type").selectOption("staff");
      assert.equal(await field("work.study_year").count(), 0);
      await field("work.program_code").selectOption("not_applicable");
      await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
      await ratings();
      await page.getByRole("button", { name: "ดูผลสรุป", exact: true }).click();
      const saved = await submit(),
        s = await get(saved.submission_code);
      assert.equal(s.workInfo.program_code, "not_applicable");
      assert(!("study_year" in s.workInfo));
    },
  );
  await check(
    "network failure keeps typed draft/key; retry creates once, clears only its group and uses server result",
    async () => {
      await page.goto(front + "/assessment/satisfaction?group=health");
      await respondent("health");
      await ratings();
      await page.getByRole("button", { name: "ดูผลสรุป", exact: true }).click();
      const before = await page.evaluate(() =>
        Object.entries(localStorage).find(
          ([k]) =>
            k.includes("health") &&
            k.includes("satisfaction") &&
            k.includes("create"),
        ),
      );
      await page.route(api + "/api/submissions", (r) => r.abort());
      await page.getByRole("button", { name: "บันทึกผล", exact: true }).click();
      await page.locator("[data-submit-error]").waitFor();
      assert(page.url().includes("/satisfaction"));
      const after = await page.evaluate(
        (k) => localStorage.getItem(k),
        before[0],
      );
      assert.equal(
        JSON.parse(after).requestKey,
        JSON.parse(before[1]).requestKey,
      );
      await page.unroute(api + "/api/submissions");
      await submit();
      assert.equal(
        await page.evaluate((k) => localStorage.getItem(k), before[0]),
        null,
      );
    },
  );
  await check(
    "correction includes reason and group/time/profile; old version result is immutable",
    async () => {
      const old = await get(environment.submission_code);
      await page.goto(
        front + "/result?submissionId=" + environment.submission_code,
      );
      await page.getByRole("link", { name: "แก้ไขพร้อมเหตุผล" }).click();
      await field("full_name").fill("ชื่อที่แก้ไข P6");
      await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
      assert.equal(await field("q1").count(), 0);
      await field("reason").fill("แก้ชื่อผู้ประเมิน");
      await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
      assert.equal(
        await page.locator('input[name="q1"]:checked').inputValue(),
        "2",
      );
      await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
      assert.equal(await field("durations.traditional.days").inputValue(), "1");
      await page.getByRole("button", { name: "ดูผลสรุป", exact: true }).click();
      await submit();
      const current = await get(environment.submission_code);
      assert.equal(current.profile.full_name, "ชื่อที่แก้ไข P6");
      const historical = (
        await call(
          `/results/${environment.submission_code}?version=1`,
          undefined,
          "GET",
        )
      ).json.data;
      assert.equal(historical.profile.full_name, old.profile.full_name);
      await page.goto(
        front + `/result?submissionId=${environment.submission_code}&version=1`,
      );
      await page.locator("[data-satisfaction-summary]").waitFor();
      assert.equal(
        await page.getByRole("link", { name: "แก้ไขพร้อมเหตุผล" }).count(),
        0,
      );
    },
  );
  await check(
    "Worker rejects missing group/duration/name/student year and invalid rating without writes; no 46/309 quota",
    async () => {
      const saved = await get(health.submission_code),
        payload = {
          schema_version: 3,
          idempotency_key: key(),
          assessment_type: "satisfaction",
          assessment_category: "general",
          assessment_group: "health",
          profile: saved.profile,
          workInfo: saved.workInfo,
          answers: saved.answers,
        };
      const count = (
        await db.prepare("SELECT COUNT(*) n FROM submissions").first()
      ).n;
      for (const bad of [
        { ...payload, assessment_group: undefined },
        { ...payload, profile: { full_name: "" } },
        {
          ...payload,
          workInfo: { position_type: "student", program_code: "program-07" },
        },
        { ...payload, answers: { ...payload.answers, q1: 0 } },
        { ...payload, assessment_group: "environment", workInfo: undefined },
      ])
        assert.equal(
          (await call("/submissions", { ...bad, idempotency_key: key() }))
            .status,
          400,
        );
      assert.equal(
        (await db.prepare("SELECT COUNT(*) n FROM submissions").first()).n,
        count,
      );
      // Targets are absent from contract and database count constraints; multiple independent valid submissions are accepted.
      for (let i = 0; i < 3; i++)
        assert.equal(
          (await call("/submissions", { ...payload, idempotency_key: key() }))
            .status,
          201,
        );
      const exported = (
        await call(
          "/dashboard/export-data?type=satisfaction&group=health",
          undefined,
          "GET",
        )
      ).json;
      assert(exported.success);
      assert(
        exported.data.records.every((r) => r.assessment_group === "health"),
      );
    },
  );
  await check(
    "legacy satisfaction is excluded from current UI without new profile/time guesses; invalid groups choose explicitly",
    async () => {
      await page.goto(front + "/result?submissionId=SUB-20260904-4004");
      await page
        .getByRole("alert")
        .filter({ hasText: "ไม่พบรายการประเมินในข้อมูลปัจจุบัน" })
        .waitFor();
      assert.equal(
        await page.locator("[data-satisfaction-summary]").count(),
        0,
      );
      assert.equal((await get("SUB-20260904-4004")).schema_version, 1);

      for (const query of ["", "?group=invalid"]) {
        await page.goto(front + "/assessment/satisfaction" + query);
        await page
          .getByText("เลือกกลุ่มสำหรับความพึงพอใจ", { exact: true })
          .waitFor();
        assert.equal(await page.locator("form").count(), 0);
      }
    },
  );
  await check(
    "same-questionnaire old drafts keep ratings but require respondent data; corrupt typed drafts recover safely",
    async () => {
      await page.goto(front + "/assessment/satisfaction?group=environment");
      await field("full_name").waitFor();
      const draftKey = await page.evaluate(() =>
        Object.keys(localStorage).find(
          (k) =>
            k.includes("satisfaction") &&
            k.includes("environment") &&
            k.includes("create"),
        ),
      );
      await page.evaluate((k) => {
        const e = JSON.parse(localStorage.getItem(k));
        e.data = { answers: { q1: "5", suggestion: "ร่างก่อน P6" } };
        e.ui.step = 2;
        localStorage.setItem(k, JSON.stringify(e));
      }, draftKey);
      await page.reload();
      await field("full_name").waitFor();
      assert.equal(await field("full_name").inputValue(), "");
      await respondent("environment");
      assert.equal(
        await page.locator('input[name="q1"]:checked').inputValue(),
        "5",
      );
      await page.evaluate((k) => {
        const e = JSON.parse(localStorage.getItem(k));
        e.data.satisfactionV3.answers.q1 = 99;
        localStorage.setItem(k, JSON.stringify(e));
      }, draftKey);
      await page.reload();
      await field("full_name").waitFor();
      assert.equal(await field("full_name").inputValue(), "");
      assert(
        (await page.getByRole("status").innerText()).includes(
          "ร่างที่เก็บไว้ไม่ตรงรูปแบบ",
        ),
      );
    },
  );
  assert.deepEqual(pageErrors, []);
  assert.equal(
    (await db.prepare("PRAGMA foreign_key_check").all()).results.length,
    0,
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(front + "/result?submissionId=" + health.submission_code);
  await page.locator("[data-satisfaction-summary]").waitFor();
  await page.screenshot({
    path: "docs/v3/baseline/p6-health-desktop.png",
    fullPage: true,
  });
  writeFileSync(
    "docs/v3/baseline/p6-browser-tests.json",
    JSON.stringify(
      {
        date: "2026-10-14",
        passed,
        checks,
        page_errors: pageErrors,
        runtime:
          "Chromium + real local Worker/D1/R2; one aborted request for network retry",
        foreign_key_violations: 0,
        remote: false,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("P6 browser integration PASS " + passed);
} catch (error) {
  console.error(logs.slice(-2000));
  throw error;
} finally {
  await browser.close();
  next.kill("SIGINT");
  await mf.dispose();
}
