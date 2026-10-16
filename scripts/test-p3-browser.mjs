import { createRequire } from "node:module";
import { readdirSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import assert from "node:assert/strict";
let modulePath = process.env.PLAYWRIGHT_MODULE_PATH;
if (!modulePath) {
  try {
    modulePath = createRequire(resolve("package.json")).resolve("playwright");
  } catch {
    const cache = join(homedir(), ".npm/_npx");
    for (const dir of existsSync(cache) ? readdirSync(cache) : []) {
      const p = join(cache, dir, "node_modules/playwright/package.json");
      if (existsSync(p)) {
        modulePath = p;
        break;
      }
    }
  }
}
if (!modulePath)
  throw new Error("Install Playwright or set PLAYWRIGHT_MODULE_PATH");
const { chromium } = createRequire(modulePath)("playwright");
const browser = await chromium.launch({ headless: true }),
  base = process.env.P3_BASE_URL ?? "http://127.0.0.1:3013";
const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  }),
  page = await context.newPage();
await context.route("**/api/**", (route) =>
  route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({
      success: false,
      error: { code: "TEST_OFFLINE", message: "server จำลองไม่พร้อม" },
    }),
  }),
);
const failures = [];
page.on("pageerror", (error) => failures.push(error.message));
const checks = [];
async function check(label, fn) {
  await fn();
  checks.push(label);
  console.log("PASS " + label);
}
async function until(fn) {
  for (let i = 0; i < 100; i++) {
    if (await fn()) return;
    await page.waitForTimeout(50);
  }
  throw new Error("Condition timeout");
}
const k = (
  group,
  type,
  category,
  mode = "create",
  code = null,
  revision = null,
) =>
  "safecheck:v3:draft:" +
  JSON.stringify([
    group,
    type,
    category,
    mode,
    code,
    revision,
    ...(type === "satisfaction"
      ? [`satisfaction-${group}-v3-2026-10-12-r2`]
      : []),
  ]);
async function satisfactionDetails(group) {
  await page.locator('[name="full_name"]').fill("ทดสอบ P3 หลัง P6");
  if (group === "health") {
    await page.locator('[name="work.position_type"]').selectOption("student");
    await page.locator('[name="work.program_code"]').selectOption("program-01");
    await page.locator('[name="work.study_year"]').selectOption("6");
  }
  await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
  await page.locator('input[name="q1"]').first().waitFor();
}
const data = (key) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
try {
  await check(
    "home two groups and responsive mobile/desktop without horizontal overflow",
    async () => {
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(base);
        await page.locator(".assessment-menu-card").first().waitFor();
        assert.equal(await page.locator(".assessment-menu-card").count(), 2);
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
      }
      await page.screenshot({
        path: "/private/tmp/savecheck-p3-home-desktop.png",
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(base);
      await page.screenshot({
        path: "/private/tmp/savecheck-p3-home-mobile.png",
        fullPage: true,
      });
    },
  );
  await check(
    "each group has four routes, correct satisfaction group and back link",
    async () => {
      for (const [group, path] of [
        ["environment", "environment"],
        ["health", "health-risk"],
      ]) {
        await page.goto(base + "/assessment/" + path);
        await page.locator(".category-card").first().waitFor();
        assert.equal(await page.locator(".category-card").count(), 4);
        assert.equal(
          await page.locator(".category-card").last().getAttribute("href"),
          "/assessment/satisfaction?group=" + group,
        );
        for (const category of ["light", "noise", "heat"])
          assert(
            await page
              .locator(
                `a[href="/assessment/${path}-form?category=${category}"]`,
              )
              .count(),
          );
      }
    },
  );
  await check(
    "all eight direct entry routes render in correct group",
    async () => {
      for (const [group, path] of [
        ["environment", "environment"],
        ["health", "health-risk"],
      ]) {
        for (const category of ["light", "noise", "heat"]) {
          await page.goto(
            base + `/assessment/${path}-form?category=${category}`,
          );
          await page.locator("form").waitFor();
          assert(
            (await page.locator("h1").innerText()).includes(
              group === "health" ? "อาการทางสุขภาพ" : "สภาพแวดล้อม",
            ),
          );
        }
        await page.goto(base + "/assessment/satisfaction?group=" + group);
        await page.locator("form").waitFor();
        assert(
          (await page.locator("header").innerText()).includes(
            group === "health" ? "อาการทางสุขภาพ" : "สภาพแวดล้อม",
          ),
        );
      }
    },
  );
  await check(
    "missing/invalid satisfaction group chooses group with no draft guess",
    async () => {
      for (const query of ["", "?group=bad"]) {
        await page.goto(base + "/assessment/satisfaction" + query);
        await page
          .getByText("เลือกกลุ่มสำหรับความพึงพอใจ", { exact: true })
          .waitFor();
        assert.equal(await page.locator("form").count(), 0);
        assert.equal(
          await page
            .locator('a[href^="/assessment/satisfaction?group="]')
            .count(),
          2,
        );
      }
    },
  );
  await check(
    "autosave during typing survives immediate navigation, refresh and restores wizard step",
    async () => {
      await page.goto(base + "/assessment/health-risk-form?category=light");
      await page.locator("form").waitFor();
      await page
        .getByLabel("ชื่อ-นามสกุล", { exact: false })
        .fill("ทดสอบร่างระหว่างกรอก");
      await page.getByLabel("อายุ (ปี)", { exact: false }).fill("22");
      for (const [name, value] of Object.entries({
        weight: "60",
        height: "170",
      }))
        await page.locator(`[name="${name}"]`).fill(value);
      for (const [name, value] of Object.entries({
        gender: "other",
        education_level: "bachelor",
        marital_status: "single",
        has_underlying_disease: "false",
      }))
        await page.locator(`[name="${name}"]`).selectOption(value);
      await page.reload();
      await page.locator("form").waitFor();
      assert.equal(
        await page.getByLabel("ชื่อ-นามสกุล", { exact: false }).inputValue(),
        "ทดสอบร่างระหว่างกรอก",
      );
      await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
      await page.getByText("ขั้นตอนที่ 2 จาก 4").waitFor();
      await page.reload();
      await page.getByText("ขั้นตอนที่ 2 จาก 4").waitFor();
      await page
        .locator("form")
        .getByRole("button", { name: "ย้อนกลับ", exact: true })
        .click();
      await page.locator('input[name="full_name"]').waitFor();
      assert.equal(
        await page.locator('input[name="full_name"]').inputValue(),
        "ทดสอบร่างระหว่างกรอก",
      );
    },
  );
  await check(
    "category and satisfaction group drafts do not share answers",
    async () => {
      await page.goto(base + "/assessment/health-risk-form?category=noise");
      await page.locator("form").waitFor();
      assert.equal(
        await page.locator('input[name="full_name"]').inputValue(),
        "",
      );
      await page.goto(base + "/assessment/satisfaction?group=health");
      await page.locator("form").waitFor();
      await satisfactionDetails("health");
      await page.locator('input[name="q1"][value="5"]').locator("..").click();
      await until(async () =>
        Boolean(
          (await data(k("health", "satisfaction", "general")))?.data.answers
            ?.q1,
        ),
      );
      await page.goto(base + "/assessment/satisfaction?group=environment");
      await page.locator("form").waitFor();
      await satisfactionDetails("environment");
      assert.equal(await page.locator('input[name="q1"]:checked').count(), 0);
    },
  );
  await check(
    "bad cached envelope and invalid category show safe recovery",
    async () => {
      await page.evaluate(
        (key) => localStorage.setItem(key, "{bad"),
        k("health", "health_risk", "noise"),
      );
      await page.goto(base + "/assessment/health-risk-form?category=noise");
      await page
        .getByRole("status")
        .filter({ hasText: "ร่างที่เก็บไว้ไม่ตรงรูปแบบปัจจุบัน" })
        .waitFor();
      assert.equal(
        await page.locator('input[name="full_name"]').inputValue(),
        "",
      );
      await page.goto(base + "/assessment/environment-form?category=bad");
      await page
        .getByText("ไม่พบหัวข้อที่เลือก", { exact: true })
        .first()
        .waitFor();
      assert.equal(await page.locator("form").count(), 0);
    },
  );
  await check(
    "required validation focuses first invalid field with accessible error",
    async () => {
      await page.goto(base + "/assessment/health-risk-form?category=heat");
      await page.locator("form").waitFor();
      await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
      await until(() =>
        page.evaluate(
          () => document.activeElement?.getAttribute("name") === "full_name",
        ),
      );
      assert.equal(
        await page
          .locator('input[name="full_name"]')
          .getAttribute("aria-invalid"),
        "true",
      );
      assert(await page.getByRole("alert").count());
    },
  );
  await check(
    "submit invalid incomplete v3 form keeps draft and never shows fake server success",
    async () => {
      await page.evaluate(
        (key) => localStorage.removeItem(key),
        k("environment", "satisfaction", "general"),
      );
      await page.goto(base + "/assessment/satisfaction?group=environment");
      await page.locator("form").waitFor();
      // P6 now gates respondent data and all scores before a review can exist.
      const key = k("environment", "satisfaction", "general");
      await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
      await page.getByRole("alert").first().waitFor();
      assert(page.url().includes("/assessment/satisfaction"));
      assert(await data(key));
      await satisfactionDetails("environment");
      await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
      assert.equal(
        await page.locator("[data-satisfaction-summary]").count(),
        0,
      );
      await page.reload();
      await page.getByText("ขั้นตอนที่ 2 จาก 4").waitFor();
    },
  );
  await check(
    "failed server result/edit never uses locally fabricated cache as authority",
    async () => {
      await page.evaluate(() => {
        localStorage.setItem(
          "save_check_submissions",
          JSON.stringify([
            {
              submission_code: "FAKE",
              assessment_type: "health_risk",
              assessment_category: "light",
              overall_score: 0,
            },
          ]),
        );
        sessionStorage.setItem(
          "save_check_edit_source_FAKE",
          JSON.stringify({ submission_code: "FAKE" }),
        );
      });
      await page.goto(base + "/result?submissionId=FAKE");
      await page
        .getByText("server จำลองไม่พร้อม", { exact: false })
        .first()
        .waitFor();
      await page.goto(
        base + "/assessment/health-risk-form?category=light&edit=FAKE&base=1",
      );
      await page.getByText("server จำลองไม่พร้อม", { exact: false }).waitFor();
      assert.equal(await page.locator("form").count(), 0);
    },
  );
  await check(
    "valid v3 fixture retries API failure with same key, then uses verified server code",
    async () => {
      await page.goto(base + "/assessment/satisfaction?group=health");
      await page.locator("form").waitFor();
      const key = k("health", "satisfaction", "general");
      await page.evaluate((key) => {
        const d = JSON.parse(localStorage.getItem(key));
        d.data = {
          satisfactionV3: {
            form_version: "satisfaction-form-v3-p6-2026-10-14",
            questionnaire_version: d.identity.questionnaireVersion,
            full_name: "fixture v3",
            work: {
              position_type: "student",
              program_code: "program-01",
              study_year: 6,
            },
            answers: Object.fromEntries(
              Array.from({ length: 16 }, (_, i) => ["q" + (i + 1), 5]),
            ),
            suggestion: "",
            reason: "",
            durations: {
              traditional: { days: "", hours: "", minutes: "", seconds: "" },
              safecheck: { days: "", hours: "", minutes: "", seconds: "" },
            },
          },
        };
        d.ui.step = 3;
        localStorage.setItem(key, JSON.stringify(d));
      }, key);
      await page.reload();
      await page.getByText("ขั้นตอนที่ 3 จาก 3").waitFor();
      const before = (await data(key)).requestKey;
      await page.getByRole("button", { name: "บันทึกผล", exact: true }).click();
      await page.locator("[data-submit-error]").waitFor();
      assert(
        (await page.locator("[data-submit-error]").innerText()).includes(
          "server จำลองไม่พร้อม",
        ),
      );
      assert.equal((await data(key)).requestKey, before);
      assert(page.url().includes("/assessment/satisfaction"));
      await context.route("**/api/submissions", async (route) => {
        const payload = route.request().postDataJSON();
        assert.equal(payload.idempotency_key, before);
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              id: 77,
              submission_code: "SERVER-P3-CONFIRMED",
              data_version: 1,
            },
          }),
        });
      });
      await page.getByRole("button", { name: "บันทึกผล", exact: true }).click();
      await until(() =>
        Promise.resolve(
          page.url().includes("submissionId=SERVER-P3-CONFIRMED"),
        ),
      );
      assert.equal(await data(key), null);
    },
  );
  assert.deepEqual(failures, []);
  writeFileSync(
    "docs/v3/baseline/p3-browser-tests.json",
    JSON.stringify(
      {
        date: "2026-10-12",
        passed: checks.length,
        checks,
        viewports: [320, 390, 1440],
        page_errors: failures,
        api: "mocked unavailable; no remote mutations",
        remote: false,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("P3 browser PASS " + checks.length);
} finally {
  await browser.close();
}
