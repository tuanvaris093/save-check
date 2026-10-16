import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const require = createRequire(resolve("worker/package.json")),
  esbuild = require("esbuild"),
  temp = mkdtempSync(join(tmpdir(), "safecheck-p6-unit-"));
for (const [entry, name] of [
  ["src/lib/v3/satisfaction-form.ts", "form"],
  ["src/lib/v3/satisfaction-export.ts", "export"],
  ["shared/v3/index.ts", "domain"],
  ["src/lib/v3/draft.ts", "draft"],
])
  esbuild.buildSync({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: join(temp, name + ".mjs"),
    logLevel: "silent",
    banner: {
      js: "import {createRequire as __createRequire} from 'node:module'; const require=__createRequire(import.meta.url);",
    },
  });
const f = await import(pathToFileURL(join(temp, "form.mjs"))),
  ex = await import(pathToFileURL(join(temp, "export.mjs"))),
  domain = await import(pathToFileURL(join(temp, "domain.mjs"))),
  draft = await import(pathToFileURL(join(temp, "draft.mjs"))),
  xlsx = createRequire(resolve("package.json"))("xlsx");
const checks = [];
function check(name, fn) {
  fn();
  checks.push(name);
  console.log("PASS " + checks.length + ": " + name);
}
function complete(group) {
  const d = f.emptySatisfactionDraft(group);
  d.full_name = "ผู้ทดสอบ P6";
  d.answers = Object.fromEntries(
    Array.from({ length: 16 }, (_, i) => ["q" + (i + 1), (i % 5) + 1]),
  );
  d.work = {
    position_type: "student",
    program_code: "program-07",
    study_year: 6,
  };
  d.durations = {
    traditional: { days: 1, hours: 2, minutes: 3, seconds: 4 },
    safecheck: { days: 0, hours: 0, minutes: 0, seconds: 1 },
  };
  return d;
}
check(
  "group closed, all 16 scores required 1–5, suggestion optional and version mismatch rejected",
  () => {
    for (const g of ["health", "environment"]) {
      const d = complete(g);
      assert(f.checkedSatisfaction(d, g, "k").success);
      delete d.answers.q16;
      assert(!f.checkedSatisfaction(d, g, "k").success);
      d.answers.q16 = 0;
      assert(!f.checkedSatisfaction(d, g, "k").success);
      d.answers.q16 = 6;
      assert(!f.checkedSatisfaction(d, g, "k").success);
    }
    const d = complete("health");
    assert(
      !domain.validateSubmission({
        ...f.satisfactionInput(d, "health", "k"),
        assessment_group: undefined,
      }).success,
    );
    d.questionnaire_version = "wrong";
    assert(!f.checkedSatisfaction(d, "health", "k").success);
  },
);
check(
  "student programs and separate years 1–6; work context requires explicit N/A or program",
  () => {
    const d = complete("health");
    for (const p of domain.PROGRAMS)
      for (const year of domain.STUDY_YEARS) {
        d.work.program_code = p.code;
        d.work.study_year = year;
        assert(f.checkSatisfactionRespondent(d, "health").success);
      }
    d.work.program_code = "not_applicable";
    assert(!f.checkSatisfactionRespondent(d, "health").success);
    d.work = {
      position_type: "staff",
      program_code: "not_applicable",
      study_year: 6,
    };
    assert(f.checkSatisfactionRespondent(d, "health").success);
    assert(!("study_year" in f.satisfactionWorkInput(d.work)));
    d.work = { position_type: "other", program_code: "program-01" };
    assert(!f.checkSatisfactionRespondent(d, "health").success);
  },
);
check(
  "duration blank/zero/decimals/overflow are distinct; manual total is 93784",
  () => {
    const d = complete("environment");
    assert(f.checkSatisfactionDurations(d).success);
    assert.equal(
      domain.evaluateSubmission(
        f.checkedSatisfaction(d, "environment", "k").data,
      ).durations.traditional_seconds,
      93784,
    );
    for (const [k, v] of [
      ["days", ""],
      ["hours", 24],
      ["minutes", 60],
      ["seconds", -1],
      ["days", 0.5],
    ]) {
      const copy = structuredClone(d);
      copy.durations.traditional[k] = v;
      assert(!f.checkSatisfactionDurations(copy).success);
    }
    d.durations.safecheck = { days: 0, hours: 0, minutes: 0, seconds: 0 };
    assert(!f.checkSatisfactionDurations(d).success);
  },
);
check(
  "durations do not change ratings and differences retain negative sign; health omits durations",
  () => {
    const d = complete("environment"),
      a = domain.evaluateSubmission(
        f.checkedSatisfaction(d, "environment", "k").data,
      );
    d.durations.safecheck = { days: 2, hours: 0, minutes: 0, seconds: 0 };
    const b = domain.evaluateSubmission(
      f.checkedSatisfaction(d, "environment", "k").data,
    );
    assert.equal(a.overall_mean, b.overall_mean);
    assert(b.durations.traditional_seconds - b.durations.safecheck_seconds < 0);
    assert(
      !("durations" in f.satisfactionInput(complete("health"), "health", "k")),
    );
  },
);
check(
  "typed incomplete draft survives with zeros; groups isolated; corrupted nested shapes rejected",
  () => {
    const group = "environment",
      id = {
        group,
        type: "satisfaction",
        category: "general",
        mode: "create",
        code: null,
        baseRevision: null,
        questionnaireVersion: domain.satisfactionQuestionnaireVersion(group),
      },
      e = draft.newDraft(id);
    e.data.satisfactionV3 = f.emptySatisfactionDraft(group);
    e.data.satisfactionV3.durations.traditional.days = 0;
    assert(draft.readDraft(JSON.stringify(e), id, 4));
    assert(
      !draft.readDraft(
        JSON.stringify(e),
        {
          ...id,
          group: "health",
          questionnaireVersion:
            domain.satisfactionQuestionnaireVersion("health"),
        },
        4,
      ),
    );
    e.data.satisfactionV3.answers = { q1: 99 };
    assert(!draft.readDraft(JSON.stringify(e), id, 4));
  },
);
check(
  "same-questionnaire draft migration preserves real ratings but requires new metadata/time",
  () => {
    const d = f.migrateSatisfactionDraft(
      {
        answers: { q1: "5", q2: "0", suggestion: "เดิม" },
        profile: { full_name: "ชื่อเดิม" },
      },
      "environment",
    );
    assert.equal(d.answers.q1, 5);
    assert(!("q2" in d.answers));
    assert.equal(d.full_name, "ชื่อเดิม");
    assert.equal(d.durations.traditional.days, "");
    assert.equal(d.suggestion, "เดิม");
  },
);
check(
  "actual workbook carries group/profile/program/year/manual seconds/negative delta and stored wording; legacy unknown stays blank",
  () => {
    const d = complete("environment");
    d.durations.safecheck.days = 2;
    const p = f.checkedSatisfaction(d, "environment", "k").data;
    const h = f.checkedSatisfaction(complete("health"), "health", "k").data;
    const records = [
      {
        ...p,
        submission_code: "env",
        data_version: 1,
        questionnaire_version: d.questionnaire_version,
        result: domain.evaluateSubmission(p),
        resolved: {
          questions: domain.satisfactionQuestionSnapshots("environment"),
        },
      },
      {
        ...h,
        submission_code: "health",
        data_version: 1,
        questionnaire_version:
          domain.satisfactionQuestionnaireVersion("health"),
        result: domain.evaluateSubmission(h),
        resolved: {
          questions: domain.satisfactionQuestionSnapshots("health"),
          program: domain.programSnapshot("program-07"),
        },
      },
      {
        assessment_type: "satisfaction",
        schema_version: 1,
        submission_code: "legacy",
        assessment_group: "environment",
        answers: { q1: 5 },
        overall_score: 5,
      },
    ];
    const wb = ex.buildSatisfactionWorkbook(records),
      rows = xlsx.utils.sheet_to_json(wb.Sheets["ความพึงพอใจ"]);
    assert.equal(rows[0]["เวลาวิธีเดิม (วินาที)"], 93784);
    assert(rows[0]["ผลต่างเวลา วิธีเดิม−SafeCheck (วินาที)"] < 0);
    assert.equal(rows[1]["ชั้นปี"], 6);
    assert.equal(rows[1]["หลักสูตร / แผนก / ฝ่าย"], domain.PROGRAMS[6].label);
    assert.equal(rows[2]["กลุ่มแบบประเมิน"], "unknown");
    assert.equal(rows[2]["เวลา SafeCheck (วินาที)"], "");
    const dictionary = xlsx.utils.sheet_to_json(wb.Sheets["คำถามที่บันทึก"]);
    assert.equal(dictionary.length, 32);
    assert.equal(
      dictionary[0]["คำถาม"],
      domain.satisfactionQuestionSnapshots("environment")[0].text,
    );
  },
);
writeFileSync(
  "docs/v3/baseline/p6-unit-tests.json",
  JSON.stringify(
    { date: "2026-10-14", passed: checks.length, checks, remote: false },
    null,
    2,
  ) + "\n",
);
