import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const require = createRequire(resolve("worker/package.json")),
  esbuild = require("esbuild"),
  temp = mkdtempSync(join(tmpdir(), "safecheck-p4-unit-"));
esbuild.buildSync({
  entryPoints: ["src/lib/v3/health-form.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: join(temp, "form.mjs"),
  logLevel: "silent",
});
const m = await import(pathToFileURL(join(temp, "form.mjs")));
let passed = 0;
const checks = [];
async function check(name, fn) {
  await fn();
  checks.push(name);
  passed++;
  console.log("PASS " + name);
}
const scores = (n) =>
  Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [
      "q" + (i + 1),
      Math.max(0, Math.min(2, n - i * 2)),
    ]),
  );
const valid = () => ({
  ...m.emptyHealthDraft(),
  profile: {
    full_name: "ผู้ทดสอบ",
    gender: "other",
    age: "22",
    weight: "60",
    height: "170",
    education_level: "bachelor",
    marital_status: "single",
    has_underlying_disease: false,
  },
  work: {
    position_type: "student",
    program_code: "program-07",
    study_year: "6",
    working_hours_per_day: "8",
    working_hours_per_week: "40",
  },
  context: { hours_worked_today: "0" },
  before: scores(2),
  after: scores(4),
  single: scores(0),
});
await check(
  "health profile requires all fields and never defaults blank numeric to zero",
  () => {
    for (const field of [
      "full_name",
      "gender",
      "age",
      "weight",
      "height",
      "education_level",
      "marital_status",
      "has_underlying_disease",
    ]) {
      const d = valid();
      delete d.profile[field];
      assert(!m.buildHealthPayload(d, "light", "key").success, field);
    }
    const d = valid();
    d.profile.weight = "";
    assert(!m.buildHealthPayload(d, "light", "key").success);
  },
);
await check(
  "disease details conditional, no-disease normalizes hidden text to null",
  () => {
    const d = valid();
    d.profile.has_underlying_disease = true;
    assert(!m.buildHealthPayload(d, "light", "key").success);
    d.profile.underlying_disease_details = "โรคที่ระบุ";
    assert(m.buildHealthPayload(d, "light", "key").success);
    d.profile.has_underlying_disease = false;
    assert.equal(
      m.buildHealthPayload(d, "light", "key").data.profile
        .underlying_disease_details,
      null,
    );
  },
);
await check(
  "all seven exact programs allow independent study years 1 through 6",
  () => {
    for (const p of m.PROGRAMS)
      for (let year = 1; year <= 6; year++) {
        const d = valid();
        d.work.program_code = p.code;
        d.work.study_year = String(year);
        assert(m.buildHealthPayload(d, "light", "key").success);
      }
    const d = valid();
    d.work.program_code = "not_applicable";
    assert(!m.buildHealthPayload(d, "light", "key").success);
  },
);
await check(
  "staff/faculty/other contexts only include applicable year or experience and weekly hours",
  () => {
    for (const type of ["staff", "faculty", "other"]) {
      const d = valid();
      d.work.position_type = type;
      d.work.other_context = "work";
      d.work.program_code = "not_applicable";
      d.work.work_experience_years = "0";
      const r = m.buildHealthPayload(d, "light", "key");
      assert(r.success);
      assert(!("study_year" in r.data.workInfo));
      assert.equal(r.data.workInfo.working_hours_per_week, 40);
    }
    const d = valid();
    d.work.position_type = "other";
    assert(!m.buildHealthPayload(d, "light", "key").success);
    d.work.other_context = "study";
    assert(m.buildHealthPayload(d, "light", "key").success);
  },
);
await check(
  "20 light answers separated, valid zero accepted, today hours required but not score",
  () => {
    const d = valid(),
      r = m.buildHealthPayload(d, "light", "key");
    assert(r.success);
    assert.equal(r.data.answers.before.q2, 0);
    assert.equal(r.data.answers.after.q2, 2);
    d.context.hours_worked_today = "";
    assert(!m.buildHealthPayload(d, "light", "key").success);
  },
);
await check(
  "noise source none/other rules and heat has no unwanted context",
  () => {
    const d = valid();
    d.context = { noise_sources: ["other"] };
    assert(!m.buildHealthPayload(d, "noise", "key").success);
    d.context.noise_source_other = "รายละเอียด";
    assert(m.buildHealthPayload(d, "noise", "key").success);
    d.context.noise_sources = ["none", "machine"];
    assert(!m.buildHealthPayload(d, "noise", "key").success);
    const r = m.buildHealthPayload(d, "heat", "key");
    assert(r.success);
    assert(!("healthContext" in r.data));
  },
);
await check(
  "server draft adapter preserves before/after zero and questionnaire version",
  () => {
    const r = m.buildHealthPayload(valid(), "light", "key");
    const d = m.healthDraftFromServer({
      ...r.data,
      questionnaire_version: m.QUESTIONNAIRE_VERSION,
    });
    assert.deepEqual(d.before, r.data.answers.before);
    assert.equal(d.questionnaire_version, m.QUESTIONNAIRE_VERSION);
  },
);
const source = readFileSync("src/components/health/health-result.tsx", "utf8");
await check(
  "saved result renders server result and resolved question/program snapshots",
  () => {
    assert(source.includes("data.result"));
    assert(source.includes("resolved.questions"));
    assert(!source.includes("evaluateSubmission"));
    assert(!source.includes("questionSnapshots"));
  },
);
writeFileSync(
  "docs/v3/baseline/p4-unit-tests.json",
  JSON.stringify(
    { date: "2026-10-12", passed, checks, remote: false },
    null,
    2,
  ) + "\n",
);
