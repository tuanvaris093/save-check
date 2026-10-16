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
import { pathToFileURL } from "node:url";
const require = createRequire(resolve("worker/package.json")),
  esbuild = require("esbuild"),
  { Miniflare, Log, LogLevel } = require("miniflare"),
  temp = mkdtempSync(join(tmpdir(), "safecheck-p4-e2e-")),
  script = join(temp, "worker.mjs"),
  front = "http://127.0.0.1:3014",
  api = "http://127.0.0.1:3015";
esbuild.buildSync({
  entryPoints: ["worker/src/index.ts"],
  bundle: true,
  platform: "browser",
  external: ["node:*"],
  format: "esm",
  outfile: script,
  logLevel: "silent",
});
for (const [entry, name] of [
  ["src/lib/v3/health-form.ts", "health-form.mjs"],
  ["shared/v3/index.ts", "index.mjs"],
])
  esbuild.buildSync({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: join(temp, name),
    logLevel: "silent",
  });
const domain = await import(pathToFileURL(join(temp, "index.mjs"))),
  form = await import(pathToFileURL(join(temp, "health-form.mjs")));
const mf = new Miniflare({
  host: "127.0.0.1",
  port: 3015,
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
    "3014",
  ],
  {
    env: {
      ...process.env,
      SAFECHECK_TEST_DIST_DIR: ".next-test-p4",
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
async function profile() {
  for (const [name, value] of Object.entries({
    full_name: "ผู้ทดสอบ P4",
    age: "22",
    weight: "60",
    height: "170",
  }))
    await field(name).fill(value);
  for (const [name, value] of Object.entries({
    gender: "other",
    education_level: "bachelor",
    marital_status: "single",
    has_underlying_disease: "false",
  }))
    await field(name).selectOption(value);
  await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
  await page.getByText("ขั้นตอนที่ 2 จาก 4").waitFor();
}
async function work(type = "student") {
  await field("position_type").selectOption(type);
  await field("program_code").selectOption(
    type === "student" ? "program-07" : "not_applicable",
  );
  if (type === "student") await field("study_year").selectOption("6");
  else await field("work_experience_years").fill("0");
  await field("working_hours_per_day").fill("8");
  await field("working_hours_per_week").fill("40");
  if (await field("hours_worked_today").count()) {
    await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
    await page.getByText("ขั้นตอนที่ 2 จาก 4").waitFor();
    await field("hours_worked_today").fill("25");
    await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
    await page.getByText("ขั้นตอนที่ 2 จาก 4").waitFor();
    await field("hours_worked_today").fill("0");
  }
  await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
  await page.getByText("ขั้นตอนที่ 3 จาก 4").waitFor();
}
async function answer(total) {
  for (let i = 1; i <= 10; i++) {
    const score = Math.max(0, Math.min(2, total - (i - 1) * 2));
    await field("q" + i)
      .nth(score)
      .check();
  }
}
async function checkQuestionLayout(phase) {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page
      .getByRole("tab", {
        name:
          phase === "before"
            ? "ก่อนปฏิบัติงาน / เรียน"
            : "หลังปฏิบัติงาน / เรียน",
        exact: true,
      })
      .waitFor();
    const bounds = await page
      .locator("[data-health-question]")
      .evaluateAll((cards) =>
        cards.map((card) => {
          const outer = card.getBoundingClientRect(),
            title = card.querySelector("legend").getBoundingClientRect();
          return {
            inside:
              title.top >= outer.top + 8 &&
              title.bottom <= outer.bottom - 8 &&
              title.left >= outer.left + 8 &&
              title.right <= outer.right - 8,
            choicesInside: [...card.querySelectorAll("label")].every(
              (label) => {
                const b = label.getBoundingClientRect();
                return (
                  b.left >= outer.left &&
                  b.right <= outer.right + 1 &&
                  b.bottom <= outer.bottom
                );
              },
            ),
          };
        }),
      );
    assert.equal(bounds.length, 10);
    assert(
      bounds.every((b) => b.inside && b.choicesInside),
      JSON.stringify({ phase, width, bounds }),
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    const colors = await page.getByRole("tab").evaluateAll((tabs) =>
      tabs.map((tab) => ({
        selected: tab.getAttribute("aria-selected"),
        bg: getComputedStyle(tab).backgroundColor,
        fg: getComputedStyle(tab).color,
      })),
    );
    assert.equal(colors.filter((t) => t.selected === "true").length, 1);
    const active = colors.find((t) => t.selected === "true"),
      inactive = colors.find((t) => t.selected === "false");
    assert.notEqual(active.bg, inactive.bg);
    assert.equal(active.fg, "rgb(255, 255, 255)");
    assert.equal(
      await page.locator("#health-questions").getAttribute("aria-labelledby"),
      "health-tab-" + phase,
    );
    if (width < 768) {
      for (const fraction of [0, 0.5, 1]) {
        await page.evaluate(
          (f) =>
            window.scrollTo({
              top: (document.documentElement.scrollHeight - innerHeight) * f,
              behavior: "instant",
            }),
          fraction,
        );
        const nav = await page.locator(".floating-pill-nav").boundingBox();
        assert(
          nav &&
            nav.x >= 11 &&
            nav.x + nav.width <= width - 11 &&
            Math.abs(nav.x + nav.width / 2 - width / 2) < 1 &&
            Math.abs(nav.y + nav.height - 888) < 2,
          JSON.stringify({ width, fraction, nav }),
        );
      }
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: `docs/v3/baseline/health-tabs-${phase}-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
}
async function start(category) {
  await page.goto(front + "/assessment/health-risk-form?category=" + category);
  await field("full_name").waitFor();
}
const scores = (n) =>
  Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [
      "q" + (i + 1),
      Math.max(0, Math.min(2, n - i * 2)),
    ]),
  );
const draft = () => ({
  ...form.emptyHealthDraft(),
  profile: {
    full_name: "ตัวอย่าง compare P4",
    gender: "other",
    age: 22,
    weight: 60,
    height: 170,
    education_level: "bachelor",
    marital_status: "single",
    has_underlying_disease: false,
  },
  work: {
    position_type: "student",
    program_code: "program-07",
    study_year: 6,
    working_hours_per_day: 8,
    working_hours_per_week: 40,
  },
  context: { hours_worked_today: 0 },
});
let lightCode;
try {
  await wait(async () => {
    try {
      return (await fetch(front)).ok;
    } catch {
      return false;
    }
  });
  await check(
    "retired pending workflow rejects all old APIs and Dashboard has no resume list",
    async () => {
      const draftId = "00000000-0000-4000-8000-000000000001";
      for (const [method, path] of [
        ["GET", "/api/health-light-drafts"],
        ["POST", "/api/health-light-drafts"],
        ["GET", "/api/health-light-drafts/" + draftId],
        ["POST", "/api/health-light-drafts/" + draftId + "/complete"],
      ]) {
        const response = await fetch(api + path, { method });
        assert.equal(response.status, 410);
        assert.equal((await response.json()).error.code, "WORKFLOW_RETIRED");
      }
      await page.goto(front + "/dashboard");
      assert.equal(
        await page.getByText(/แบบประเมินที่รอทำต่อ|รอประเมินหลัง/).count(),
        0,
      );
      await page.goto(
        front +
          "/assessment/health-risk-form?category=light&pending=" +
          draftId +
          "&pendingVersion=1",
      );
      await page
        .getByText(
          "กรุณาเริ่มแบบประเมินใหม่และตอบส่วนก่อนกับส่วนหลังให้ครบก่อนบันทึกผล",
          { exact: true },
        )
        .waitFor();
      assert.equal(await field("q1").count(), 0);
    },
  );
  await check(
    "all health profile fields required, no implicit gender/disease answer; conditional details",
    async () => {
      await start("light");
      assert.equal(await field("gender").inputValue(), "");
      assert.equal(await field("has_underlying_disease").inputValue(), "");
      await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
      assert(await page.getByRole("alert").count());
      await field("has_underlying_disease").selectOption("true");
      await field("underlying_disease_details").waitFor();
      await field("underlying_disease_details").fill("ข้อมูลโรคจำลอง");
      await field("has_underlying_disease").selectOption("false");
      assert.equal(await field("underlying_disease_details").count(), 0);
      await profile();
    },
  );
  await check(
    "select exact seven programs and separate years 1–6 including higher vocational year 6",
    async () => {
      const options = await field("position_type").count();
      assert.equal(options, 1);
      await field("position_type").selectOption("student");
      const labels = await field("program_code")
        .locator("option")
        .allTextContents();
      for (const p of domain.PROGRAMS) assert(labels.includes(p.label));
      assert.equal(await field("study_year").locator("option").count(), 7);
      await work();
    },
  );
  await check(
    "before gate, zero hours/answers valid, after retained while editing before and refresh",
    async () => {
      await checkQuestionLayout("before");
      assert.equal(
        await page
          .getByRole("button", { name: "ข้ามและบันทึก", exact: true })
          .count(),
        0,
      );
      assert.equal(
        await page
          .getByRole("button", { name: "ดูผลสรุป", exact: true })
          .count(),
        0,
      );

      await page
        .getByRole("tab", { name: "หลังปฏิบัติงาน / เรียน", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("tab", { name: "ก่อนปฏิบัติงาน / เรียน", exact: true })
          .getAttribute("aria-selected"),
        "true",
      );
      assert.equal(
        await page.getByText("กรุณาตอบข้อนี้", { exact: true }).count(),
        10,
      );
      await field("q1").nth(1).check();
      assert.equal(
        await page.getByText("กรุณาตอบข้อนี้", { exact: true }).count(),
        9,
      );
      await answer(2);
      assert.equal(
        await page.getByText("กรุณาตอบข้อนี้", { exact: true }).count(),
        0,
      );
      await page
        .getByRole("button", {
          name: "ประเมินหลังปฏิบัติงาน/เรียน",
          exact: true,
        })
        .click();
      await page.getByRole("button", { name: "ดูผลสรุป", exact: true }).click();
      assert.equal(
        await page.getByText("กรุณาตอบข้อนี้", { exact: true }).count(),
        10,
      );
      assert.equal(
        await page
          .getByRole("button", { name: "ยืนยันบันทึกผล", exact: true })
          .count(),
        0,
      );
      await answer(4);
      await checkQuestionLayout("after");
      await page
        .getByRole("tab", { name: "ก่อนปฏิบัติงาน / เรียน", exact: true })
        .click();
      await field("q1").nth(0).check();
      await page
        .getByRole("tab", { name: "หลังปฏิบัติงาน / เรียน", exact: true })
        .click();
      assert(await field("q2").nth(2).isChecked());
      await page
        .getByRole("tab", { name: "ก่อนปฏิบัติงาน / เรียน", exact: true })
        .click();
      assert(await field("q1").nth(0).isChecked());
      await field("q1").nth(2).check();
      await page
        .getByRole("tab", { name: "หลังปฏิบัติงาน / เรียน", exact: true })
        .click();
      await page.reload();
      await page
        .getByRole("tab", { name: "หลังปฏิบัติงาน / เรียน", exact: true })
        .waitFor();
      assert.equal(
        await page
          .getByRole("tab", { name: "หลังปฏิบัติงาน / เรียน", exact: true })
          .getAttribute("aria-selected"),
        "true",
      );
      assert(await field("q2").nth(2).isChecked());
      await page.getByRole("button", { name: "ดูผลสรุป", exact: true }).click();
      await page.getByText("ขั้นตอนที่ 4 จาก 4").waitFor();
      assert(
        (await page.locator("[data-health-totals]").innerText()).includes(
          "ผลต่าง (หลัง−ก่อน): +2",
        ),
      );
      assert.equal(
        await page.locator("[data-health-comparison] tbody tr").count(),
        10,
      );
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      await page.waitForTimeout(150);
      await page.screenshot({
        path: "docs/v3/baseline/p4-light-review-mobile.png",
        fullPage: true,
      });
    },
  );
  await check(
    "API failure preserves full 20 answers/draft/key; retry persists real Worker result and D1 snapshots",
    async () => {
      const key =
        "safecheck:v3:draft:" +
        JSON.stringify([
          "health",
          "health_risk",
          "light",
          "create",
          null,
          null,
        ]);
      const before = await page.evaluate(
        (k) => JSON.parse(localStorage.getItem(k)),
        key,
      );
      await page.route(api + "/api/submissions", (route) =>
        route.fulfill({
          status: 409,
          headers: { "Access-Control-Allow-Origin": front },
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: { code: "CONFLICT", message: "ขัดแย้งจำลอง" },
          }),
        }),
      );
      await page.getByRole("button", { name: "บันทึกผล", exact: true }).click();
      await page.locator("[data-submit-error]").waitFor();
      assert.equal(
        (await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key))
          .requestKey,
        before.requestKey,
      );
      await page.unroute(api + "/api/submissions");
      await checkSubmitFlow(page, {
        front,
        api,
        button: "บันทึกผล",
        screenshot: "docs/v3/baseline/submit-flow-health.png",
      });
      await wait(() =>
        Promise.resolve(page.url().includes("/result?submissionId=")),
      );
      lightCode = new URL(page.url()).searchParams.get("submissionId");
      await page.locator("[data-health-totals]").waitFor();
      assert(
        (await page.locator("[data-health-totals]").innerText()).includes(
          "ผลต่าง (หลัง−ก่อน): +2",
        ),
      );
      assert.equal(
        await page.evaluate((k) => localStorage.getItem(k), key),
        null,
      );
      const read = await (
        await fetch(api + "/api/results/" + lightCode)
      ).json();
      assert.equal(read.data.answers.before.q2, 0);
      assert.equal(read.data.answers.after.q2, 2);
      assert.equal(read.data.healthContext.hours_worked_today, 0);
      assert.equal(
        (
          await db
            .prepare(
              "SELECT COUNT(*) n FROM health_risk_answers WHERE submission_id=?",
            )
            .bind(read.data.id)
            .first()
        ).n,
        20,
      );
    },
  );
  await check(
    "staff N/A, zero experience, noise multiple/none/other conditional and new ten questions",
    async () => {
      await start("noise");
      await profile();
      await work("staff");
      for (const q of domain.questionSnapshots("noise", "single"))
        assert(
          (await page.locator("#health-questions").innerText()).includes(
            q.text,
          ),
        );
      await page.getByRole("button", { name: "ดูผลสรุป", exact: true }).click();
      assert(await page.getByRole("alert").count());
      await page
        .getByRole("button", { name: "เสียงประกาศตามสาย/ลำโพง", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: "ไม่ได้สัมผัสเสียงดังจากแหล่งข้างต้น",
          exact: true,
        })
        .click();
      assert.equal(
        await page
          .getByRole("button", { name: "เสียงประกาศตามสาย/ลำโพง", exact: true })
          .getAttribute("aria-pressed"),
        "false",
      );
      await page
        .getByRole("button", { name: "เสียงอื่น ๆ โปรดระบุ", exact: true })
        .click();
      await field("noise_source_other").fill("แหล่งเสียงจำลอง");
      await answer(8);
      await page.getByRole("button", { name: "ดูผลสรุป", exact: true }).click();
      await page.getByText("ขั้นตอนที่ 4 จาก 4").waitFor();
      await page.getByRole("button", { name: "บันทึกผล", exact: true }).click();
      await wait(() =>
        Promise.resolve(page.url().includes("/result?submissionId=")),
      );
      await page.locator("[data-health-totals]").waitFor();
      assert(
        (await page.locator("[data-health-totals]").innerText()).includes(
          "คะแนนรวม: 8/20",
        ),
      );
      assert(
        (await page.locator("main").last().innerText()).includes(
          "ไม่เกี่ยวข้อง",
        ),
      );
    },
  );
  await check(
    "heat ten new questions and all zero answers save as zero total",
    async () => {
      await start("heat");
      await profile();
      await work();
      for (const q of domain.questionSnapshots("heat", "single"))
        assert(
          (await page.locator("#health-questions").innerText()).includes(
            q.text,
          ),
        );
      await answer(0);
      await page.getByRole("button", { name: "ดูผลสรุป", exact: true }).click();
      await page.getByRole("button", { name: "บันทึกผล", exact: true }).click();
      await wait(() =>
        Promise.resolve(page.url().includes("/result?submissionId=")),
      );
      await page.locator("[data-health-totals]").waitFor();
      assert(
        (await page.locator("[data-health-totals]").innerText()).includes(
          "คะแนนรวม: 0/20",
        ),
      );
    },
  );
  await check(
    "six official compare examples agree in browser result and Worker API, including decreased-but-high",
    async () => {
      for (const [before, after, delta, level] of [
        [2, 4, 2, "pass"],
        [6, 8, 2, "medium"],
        [12, 14, 2, "high_risk"],
        [8, 8, 0, "medium"],
        [18, 16, -2, "high_risk"],
        [0, 0, 0, "pass"],
      ]) {
        const d = { ...draft(), before: scores(before), after: scores(after) },
          p = form.buildHealthPayload(d, "light", crypto.randomUUID());
        const r = await (
          await fetch(api + "/api/submissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(p.data),
          })
        ).json();
        assert(r.success, JSON.stringify(r));
        assert.equal(r.data.result.delta, delta);
        assert.equal(r.data.result.after_level, level);
        await page.goto(
          front + "/result?submissionId=" + r.data.submission_code,
        );
        await page.locator("[data-health-totals]").waitFor();
        const text = await page.locator("[data-health-totals]").innerText();
        assert.equal(
          await page.locator("[data-health-before]").innerText(),
          String(before),
        );
        assert.equal(
          await page.locator("[data-health-after]").innerText(),
          String(after),
        );
        assert(
          text.includes(
            {
              pass: "ระดับต่ำ (0–6)",
              medium: "ระดับปานกลาง (7–13)",
              high_risk: "ระดับสูง (14–20)",
            }[level],
          ),
        );
        for (let i = 0; i < 10; i++) {
          const cells = page
            .locator("[data-health-comparison] tbody tr")
            .nth(i)
            .locator("td");
          assert.equal(
            await cells.nth(1).innerText(),
            String(scores(before)["q" + (i + 1)]),
          );
          assert.equal(
            await cells.nth(2).innerText(),
            String(scores(after)["q" + (i + 1)]),
          );
        }
        assert(
          text.includes(
            "ผลต่าง (หลัง−ก่อน): " + (delta > 0 ? "+" : "") + delta,
          ),
        );
      }
    },
  );
  await check(
    "legacy light is excluded from current UI without rewriting original answers",
    async () => {
      await page.goto(front + "/result?submissionId=SUB-20260903-3003");
      await page
        .getByRole("alert")
        .filter({ hasText: "ไม่พบรายการประเมินในข้อมูลปัจจุบัน" })
        .waitFor();
      assert.equal(await page.locator("[data-health-comparison]").count(), 0);
      const r = await (
        await fetch(api + "/api/results/SUB-20260903-3003")
      ).json();
      assert.equal(r.data.answers.q5, 0);
      assert.equal(r.data.schema_version, 1);
    },
  );
  await check(
    "desktop result fits layout and server version/snapshot wording displayed",
    async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(front + "/result?submissionId=" + lightCode);
      await page.locator("[data-health-totals]").waitFor();
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      await page.waitForTimeout(150);
      await page.screenshot({
        path: "docs/v3/baseline/p4-light-result-desktop.png",
        fullPage: true,
      });
    },
  );
  if (process.env.SAT_QUESTION_CHECK === "1") {
    const answers = Object.fromEntries(
      Array.from({ length: 16 }, (_, i) => ["q" + (i + 1), 5]),
    );
    const payload = {
      schema_version: 3,
      idempotency_key: "old-fixture",
      assessment_type: "satisfaction",
      assessment_category: "general",
      assessment_group: "health",
      profile: { full_name: "ข้อมูลเดิม" },
      workInfo: {
        position_type: "student",
        program_code: "program-01",
        study_year: 6,
      },
      answers,
      suggestion: null,
    };
    const resolved = {
      questionnaire_version: domain.SATISFACTION_QUESTIONNAIRE_VERSION,
      questions: domain.SATISFACTION_QUESTIONS.flatMap((cat) =>
        cat.questions.map((q) => ({
          ...q,
          category: cat.key,
          version: domain.SATISFACTION_QUESTIONNAIRE_VERSION,
        })),
      ),
    };
    await db.batch([
      db
        .prepare(
          "INSERT INTO submissions(submission_code,assessment_type,assessment_category,assessment_group,schema_version,questionnaire_version,status,overall_score,overall_level,created_at,updated_at) VALUES('SAT-OLD-WORDING','satisfaction','general','health',3,?,'completed',5,'pass',?,?)",
        )
        .bind(
          domain.SATISFACTION_QUESTIONNAIRE_VERSION,
          new Date().toISOString(),
          new Date().toISOString(),
        ),
      db
        .prepare(
          "INSERT INTO submission_payload_versions(submission_id,version_no,operation,payload_json,result_json,resolved_json,created_at) VALUES((SELECT id FROM submissions WHERE submission_code='SAT-OLD-WORDING'),1,'create',?,?,?,?)",
        )
        .bind(
          JSON.stringify(payload),
          JSON.stringify(domain.evaluateSatisfaction(answers)),
          JSON.stringify(resolved),
          new Date().toISOString(),
        ),
    ]);
    const survey = spawn(
      process.execPath,
      ["scripts/test-satisfaction-browser.mjs"],
      {
        env: { ...process.env, SAT_FRONT_URL: front, SAT_API_URL: api },
        stdio: "inherit",
      },
    );
    const status = await new Promise((resolve, reject) => {
      survey.on("exit", resolve);
      survey.on("error", reject);
    });
    assert.equal(status, 0, "satisfaction browser");
  }
  const regression = spawn(process.execPath, ["scripts/test-p3-browser.mjs"], {
    env: { ...process.env, P3_BASE_URL: front },
    stdio: "inherit",
  });
  const regressionStatus = await new Promise((resolve, reject) => {
    regression.on("exit", resolve);
    regression.on("error", reject);
  });
  assert.equal(regressionStatus, 0, "P3 browser regression");
  assert.deepEqual(pageErrors, []);
  assert.equal(
    (await db.prepare("PRAGMA foreign_key_check").all()).results.length,
    0,
  );
  writeFileSync(
    "docs/v3/baseline/p4-browser-tests.json",
    JSON.stringify(
      {
        date: "2026-10-12",
        passed,
        checks,
        page_errors: pageErrors,
        runtime: "Chromium + actual local Worker workerd/D1/R2; one mocked 409",
        foreign_key_violations: 0,
        remote: false,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("P4 browser integration PASS " + passed);
} catch (error) {
  console.error(logs.slice(-2500));
  throw error;
} finally {
  await browser.close();
  next.kill("SIGINT");
  await mf.dispose();
}
