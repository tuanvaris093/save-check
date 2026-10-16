import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const require = createRequire(resolve("worker/package.json")),
  esbuild = require("esbuild"),
  temp = mkdtempSync(join(tmpdir(), "savecheck-p3-"));
for (const file of ["draft", "submit", "form-errors", "choices"])
  esbuild.buildSync({
    entryPoints: [`src/lib/v3/${file}.ts`],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: join(temp, file + ".mjs"),
    logLevel: "silent",
  });
const draft = await import(pathToFileURL(join(temp, "draft.mjs"))),
  submit = await import(pathToFileURL(join(temp, "submit.mjs"))),
  errors = await import(pathToFileURL(join(temp, "form-errors.mjs")));
let count = 0;
const checks = [];
async function check(label, fn) {
  await fn();
  count++;
  checks.push(label);
  console.log("PASS " + label);
}
const identity = {
  group: "health",
  type: "health_risk",
  category: "light",
  mode: "create",
  code: null,
  baseRevision: null,
};
await check(
  "draft identity separates all eight entries and correction/retest bases",
  () => {
    const identities = [
      ...["environment", "health"].flatMap((group) =>
        ["light", "noise", "heat", "general"].map((category) => ({
          ...identity,
          group,
          type:
            category === "general"
              ? "satisfaction"
              : group === "health"
                ? "health_risk"
                : "environment",
          category,
        })),
      ),
      ...["correction", "retest"].flatMap((mode) =>
        ["r1", "r2"].map((baseRevision) => ({
          ...identity,
          mode,
          code: "same",
          baseRevision,
        })),
      ),
    ];
    assert.equal(new Set(identities.map(draft.draftKey)).size, 12);
  },
);
await check(
  "draft incomplete fields, zeros, before/after and step/tab survive roundtrip",
  () => {
    const d = draft.patchDraft(
      draft.newDraft(identity),
      {
        profile: { full_name: "ยังกรอกไม่ครบ", age: "" },
        answersBefore: { q1: 0 },
        answersAfter: { q1: 2 },
      },
      { step: 3, tab: "after" },
    );
    assert.deepEqual(draft.readDraft(JSON.stringify(d), identity, 4), d);
    assert.equal(d.ui.tab, "after");
  },
);
await check(
  "bad JSON, v1 envelope, mismatched context, impossible UI and invalid field shapes rejected",
  () => {
    const d = draft.newDraft(identity);
    for (const value of [
      "{bad",
      JSON.stringify({ ...d, version: 1 }),
      JSON.stringify({ ...d, identity: { ...identity, category: "noise" } }),
      JSON.stringify({ ...d, ui: { step: 9, tab: "before" } }),
      JSON.stringify({ ...d, data: { profile: [] } }),
    ])
      assert.equal(draft.readDraft(value, identity, 4), null);
  },
);
await check("patch preserves separate periods and persistent retry key", () => {
  const d = draft.patchDraft(draft.newDraft(identity), {
    answersBefore: { q1: 0 },
    answersAfter: { q1: 2 },
  });
  const next = draft.patchDraft(
    d,
    { answersBefore: { q1: 1 } },
    { tab: "after", step: 3 },
  );
  assert.equal(next.data.answersAfter.q1, 2);
  assert.equal(next.requestKey, d.requestKey);
});
const fixture = {
  schema_version: 3,
  idempotency_key: "p3-test-key",
  assessment_type: "satisfaction",
  assessment_group: "health",
  assessment_category: "general",
  profile: { full_name: "ทดสอบ" },
  workInfo: {
    position_type: "student",
    program_code: "program-01",
    study_year: 6,
  },
  answers: Object.fromEntries(
    Array.from({ length: 16 }, (_, i) => ["q" + (i + 1), 5]),
  ),
};
await check(
  "invalid payload has field paths and never calls transport",
  async () => {
    let called = false;
    const r = await submit.submitAssessment(
      { ...fixture, profile: {} },
      async () => {
        called = true;
      },
    );
    assert(!r.success);
    assert(!called);
    assert(r.error.issues.some((i) => i.path.includes("full_name")));
  },
);
await check(
  "400/409/network/timeout stay failures rather than local success",
  async () => {
    for (const code of [
      "VALIDATION_ERROR",
      "CONFLICT",
      "NETWORK_ERROR",
      "TIMEOUT_ERROR",
    ]) {
      const r = await submit.submitAssessment(fixture, async () => ({
        success: false,
        error: { code, message: "failed" },
      }));
      assert(!r.success);
      assert.equal(r.error.code, code);
    }
    assert(
      !(
        await submit.submitAssessment(fixture, async () => {
          throw new Error("network");
        })
      ).success,
    );
  },
);
await check("server receipt must contain actual ID/code/version", async () => {
  assert(
    !(
      await submit.submitAssessment(fixture, async () => ({
        success: true,
        data: { id: 1, submission_code: "pretend" },
      }))
    ).success,
  );
  const r = await submit.submitAssessment(fixture, async (payload) => {
    assert.equal(payload.idempotency_key, "p3-test-key");
    return {
      success: true,
      data: { id: 7, submission_code: "SERVER-CODE", data_version: 1 },
    };
  });
  assert(r.success);
  assert.equal(r.data.submission_code, "SERVER-CODE");
});
await check("nested form error maps to the actual field name for focus", () => {
  assert.equal(
    errors.firstErrorPath({
      noise_areas: [{ avg_dBA: { message: "required" } }],
    }),
    "noise_areas.0.avg_dBA",
  );
});
await check(
  "field validation messages use Thai labels without internal property names",
  () => {
    const message = submit.submissionErrorMessage({
      message: "กรุณาตรวจข้อมูล",
      issues: [{ path: ["profile", "full_name"], message: "Required" }],
    });
    assert(message.includes("ชื่อ-นามสกุล"));
    assert(!message.includes("full_name"));
    assert(!message.includes("Required"));
  },
);
const choices = await import(pathToFileURL(join(temp, "choices.mjs")));
await check(
  "explicit none excludes other choices while N/A remains a real select value",
  () => {
    assert.deepEqual(choices.toggleExclusiveChoice(["machine"], "none"), [
      "none",
    ]);
    assert.deepEqual(choices.toggleExclusiveChoice(["none"], "machine"), [
      "machine",
    ]);
    assert.deepEqual(choices.toggleExclusiveChoice(["machine"], "machine"), []);
    assert.equal(choices.NOT_APPLICABLE_OPTION.value, "not_applicable");
  },
);
const pages = ["health-risk-form", "environment-form", "satisfaction"].map(
  (x) => readFileSync(`src/app/assessment/${x}/page.tsx`, "utf8"),
);
await check(
  "all form submits use central service and never fabricate local saved records",
  () => {
    // P5 keeps the environment route thin and delegates transport to its hook.
    assert(pages[1].includes("EnvironmentWizard"));
    assert(
      readFileSync(
        "src/components/environment/environment-wizard.tsx",
        "utf8",
      ).includes("useEnvironmentForm"),
    );
    assert(pages[2].includes("SatisfactionWizard"));
    const submitSources = [
      pages[0],
      readFileSync("src/hooks/use-environment-form.ts", "utf8"),
      readFileSync(
        "src/components/satisfaction/satisfaction-wizard.tsx",
        "utf8",
      ),
    ];
    for (const p of submitSources) {
      assert(p.includes("submitAssessment("));
      assert(!p.includes("save_check_submissions"));
      assert(!p.includes("NETWORK_ERROR"));
      assert(!p.includes("Date.now()"));
    }
  },
);
writeFileSync(
  "docs/v3/baseline/p3-unit-tests.json",
  JSON.stringify(
    { date: "2026-10-12", passed: count, checks, remote: false },
    null,
    2,
  ) + "\n",
);
