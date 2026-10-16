import { createRequire } from "node:module";
import { readdirSync, existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir, tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const require = createRequire(resolve("worker/package.json")),
  esbuild = require("esbuild"),
  temp = mkdtempSync(join(tmpdir(), "sat-browser-"));
esbuild.buildSync({
  entryPoints: ["shared/v3/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: join(temp, "domain.mjs"),
  logLevel: "silent",
});
const m = await import(pathToFileURL(join(temp, "domain.mjs")));
let path = process.env.PLAYWRIGHT_MODULE_PATH;
for (const d of readdirSync(join(homedir(), ".npm/_npx"))) {
  const p = join(
    homedir(),
    ".npm/_npx",
    d,
    "node_modules/playwright/package.json",
  );
  if (!path && existsSync(p)) path = p;
}
const { chromium } = createRequire(path)("playwright");
const front = process.env.SAT_FRONT_URL,
  api = process.env.SAT_API_URL;
if (!front || !api)
  throw new Error("Run through test:p4:browser with SAT_QUESTION_CHECK=1");
const browser = await chromium.launch({ headless: true }),
  context = await browser.newContext({ viewport: { width: 390, height: 844 } }),
  page = await context.newPage(),
  checks = [];
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(front);
  await page.evaluate(() => {
    localStorage.setItem(
      "safecheck:v3:draft:" +
        JSON.stringify([
          "health",
          "satisfaction",
          "general",
          "create",
          null,
          null,
        ]),
      JSON.stringify({
        version: 3,
        data: { answers: { q1: "5" } },
        ui: { step: 1, tab: "single" },
        requestKey: "old",
      }),
    );
  });
  page.setDefaultNavigationTimeout(60000);
  for (const group of ["environment", "health"]) {
    await page.goto(front + "/assessment/satisfaction?group=" + group);
    await page.locator("form").waitFor();
    await page.locator('[name="full_name"]').fill("ตรวจคำถามหลัง P6");
    if (group === "health") {
      await page.locator('[name="work.position_type"]').selectOption("student");
      await page
        .locator('[name="work.program_code"]')
        .selectOption("program-01");
      await page.locator('[name="work.study_year"]').selectOption("6");
    }
    await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
    await page.locator('input[name="q1"]').first().waitFor();
    const text = await page.locator("form").innerText();
    for (const cat of m.getSatisfactionQuestions(group)) {
      assert(text.includes(cat.label));
      for (const q of cat.questions)
        assert(text.includes(q.text), group + q.id);
    }
    assert.equal(await page.locator('input[name="q1"]:checked').count(), 0);
    assert.equal(await page.locator('input[type="radio"]').count(), 80);
    checks.push(
      group + " all 16 questions/Content/rating options render correctly",
    );
    const payload = {
      schema_version: 3,
      idempotency_key: crypto.randomUUID(),
      assessment_type: "satisfaction",
      assessment_category: "general",
      assessment_group: group,
      profile: { full_name: "ทดสอบคำถามใหม่" },
      answers: Object.fromEntries(
        Array.from({ length: 16 }, (_, i) => ["q" + (i + 1), 5]),
      ),
      ...(group === "health"
        ? {
            workInfo: {
              position_type: "student",
              program_code: "program-01",
              study_year: 6,
            },
          }
        : {
            durations: {
              traditional: { days: 0, hours: 0, minutes: 5, seconds: 0 },
              safecheck: { days: 0, hours: 0, minutes: 1, seconds: 0 },
            },
          }),
    };
    const created = await (
      await fetch(api + "/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    ).json();
    assert(created.success, JSON.stringify(created));
    const read = await (
      await fetch(api + "/api/results/" + created.data.submission_code)
    ).json();
    assert.equal(
      read.data.questionnaire_version,
      m.satisfactionQuestionnaireVersion(group),
    );
    assert.deepEqual(
      read.data.resolved.questions,
      m.satisfactionQuestionSnapshots(group),
    );
    await page.goto(
      front + "/result?submissionId=" + created.data.submission_code,
    );
    await page.locator("[data-satisfaction-summary]").waitFor();
    const shown = await page.locator("body").innerText();
    for (const q of m.satisfactionQuestionSnapshots(group))
      assert(shown.includes(q.text));
    checks.push(
      group +
        " Worker stores correct version/snapshots and result renders stored 16 questions",
    );
  }
  await page.goto(front + "/result?submissionId=SAT-OLD-WORDING");
  await page
    .getByText("ไม่พบรายการประเมินในข้อมูลปัจจุบัน", { exact: true })
    .waitFor();
  assert.equal(await page.locator("[data-satisfaction-summary]").count(), 0);
  const old = await (await fetch(api + "/api/results/SAT-OLD-WORDING")).json();
  assert(
    old.data.resolved.questions.some(
      (q) => q.text === m.SATISFACTION_QUESTIONS[0].questions[0].text,
    ),
  );
  const request = {
    schema_version: 3,
    idempotency_key: crypto.randomUUID(),
    expected_data_version: 1,
    reason: "test older questionnaire",
    payload: { ...old.data, idempotency_key: crypto.randomUUID() },
  };
  request.payload = {
    schema_version: 3,
    idempotency_key: request.payload.idempotency_key,
    assessment_type: "satisfaction",
    assessment_category: "general",
    assessment_group: "health",
    profile: old.data.profile,
    workInfo: old.data.workInfo,
    answers: old.data.answers,
  };
  const corrected = await fetch(
    api + "/api/submissions/SAT-OLD-WORDING/corrections",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  assert.equal(corrected.status, 409);
  assert.equal((await corrected.json()).error.code, "NEW_ASSESSMENT_REQUIRED");
  const after = await (
    await fetch(api + "/api/results/SAT-OLD-WORDING")
  ).json();
  assert.deepEqual(after.data, old.data);
  checks.push(
    "current UI excludes old wording; stored source remains intact and correction cannot replace old questions",
  );
  assert.deepEqual(errors, []);
  writeFileSync(
    "docs/v3/baseline/satisfaction-browser-tests.json",
    JSON.stringify(
      {
        date: "2026-10-12",
        passed: checks.length,
        checks,
        page_errors: errors,
        runtime: "Chromium + local Worker/D1",
        remote: false,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("Satisfaction question browser/API PASS " + checks.length);
} finally {
  await browser.close();
}
