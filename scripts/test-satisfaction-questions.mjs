import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const require = createRequire(resolve("worker/package.json")),
  esbuild = require("esbuild"),
  temp = mkdtempSync(join(tmpdir(), "safecheck-satisfaction-"));
for (const [entry, name] of [
  ["shared/v3/index.ts", "domain.mjs"],
  ["src/lib/v3/draft.ts", "draft.mjs"],
])
  esbuild.buildSync({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: join(temp, name),
    logLevel: "silent",
  });
const m = await import(pathToFileURL(join(temp, "domain.mjs"))),
  draft = await import(pathToFileURL(join(temp, "draft.mjs"))),
  source = JSON.parse(
    readFileSync("docs/v3/catalogs/satisfaction-source-docx.json", "utf8"),
  );
let passed = 0;
const checks = [];
function check(name, fn) {
  fn();
  passed++;
  checks.push(name);
  console.log("PASS " + name);
}
const norm = (text) => text.normalize("NFC").replace(/\s/g, "");
check(
  "all 32 question texts match source DOCX after documented whitespace/typo normalization",
  () => {
    for (const group of ["environment", "health"]) {
      const qs = m.getSatisfactionQuestions(group).flatMap((c) => c.questions);
      assert.equal(qs.length, 16);
      for (let i = 0; i < 16; i++) {
        let raw = source.raw_questions[group][i];
        if (group === "health" && i === 11 && raw.endsWith("ชัดเจ")) raw += "น";
        assert.equal(norm(qs[i].text), norm(raw), `${group} q${i + 1}`);
      }
    }
  },
);
check(
  "4 dimensions / 4 questions each, stable q1–q16 IDs, Content title, rating scale unchanged",
  () => {
    for (const group of ["environment", "health"]) {
      const categories = m.getSatisfactionQuestions(group);
      assert(categories[0].label.includes("(Content)"));
      assert.deepEqual(
        categories.map((c) => c.questions.length),
        [4, 4, 4, 4],
      );
      assert.equal(
        new Set(categories.flatMap((c) => c.questions.map((q) => q.id))).size,
        16,
      );
    }
    assert.deepEqual(
      m.SATISFACTION_OPTIONS.map((o) => o.value),
      ["5", "4", "3", "2", "1"],
    );
    assert.equal(
      m.evaluateSatisfaction(
        Object.fromEntries(
          Array.from({ length: 16 }, (_, i) => ["q" + (i + 1), 5]),
        ),
      ).overall_mean,
      5,
    );
  },
);
check(
  "environment and health differ, use their own versions and immutable question snapshots",
  () => {
    assert.notEqual(
      m.getSatisfactionQuestions("environment")[0].questions[0].text,
      m.getSatisfactionQuestions("health")[0].questions[0].text,
    );
    assert.notEqual(
      m.satisfactionQuestionnaireVersion("environment"),
      m.satisfactionQuestionnaireVersion("health"),
    );
    const qs = m.satisfactionQuestionSnapshots("health");
    assert.equal(qs[6].category, "design");
    assert(qs[6].category_label.includes("Design"));
    assert(qs.every((q) => q.version === m.SATISFACTION_VERSIONS.health));
  },
);
check(
  "old results preserve legacy wording; v3 results use stored wording even if catalog differs",
  () => {
    assert.equal(
      m.satisfactionQuestionsForResult({ schema_version: 1 }),
      m.SATISFACTION_QUESTIONS,
    );
    const saved = {
      schema_version: 3,
      resolved: {
        questions: m
          .satisfactionQuestionSnapshots("health")
          .map((q) => ({ ...q, text: "immutable:" + q.text })),
      },
    };
    assert(
      m
        .satisfactionQuestionsForResult(saved)[0]
        .questions[0].text.startsWith("immutable:"),
    );
    assert.deepEqual(
      m.satisfactionQuestionsForResult({ schema_version: 3 }),
      [],
    );
  },
);
check(
  "draft key changes with questionnaire version; old scores cannot restore into new wording",
  () => {
    const identity = {
      group: "health",
      type: "satisfaction",
      category: "general",
      mode: "create",
      code: null,
      baseRevision: null,
    };
    const current = {
      ...identity,
      questionnaireVersion: m.SATISFACTION_VERSIONS.health,
    };
    assert.notEqual(draft.draftKey(identity), draft.draftKey(current));
    const old = draft.patchDraft(draft.newDraft(identity), {
      answers: { q1: 5 },
    });
    assert.equal(draft.readDraft(JSON.stringify(old), current, 2), null);
  },
);
const shim = join(temp, "xlsx-shim.mjs");
writeFileSync(
  shim,
  `import {createRequire} from 'node:module';const xlsx=createRequire(${JSON.stringify(resolve("package.json"))})('xlsx');export const utils=xlsx.utils;export function writeFile(wb){globalThis.satisfactionWorkbook=wb;}`,
);
await esbuild.build({
  entryPoints: ["src/lib/excel-export.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: join(temp, "excel.mjs"),
  logLevel: "silent",
  plugins: [
    {
      name: "capture-workbook",
      setup(build) {
        build.onResolve({ filter: /^xlsx$/ }, () => ({ path: shim }));
      },
    },
  ],
});
const excel = await import(pathToFileURL(join(temp, "excel.mjs"))),
  xlsx = createRequire(resolve("package.json"))("xlsx");
check(
  "Excel uses generic score headers, group/version columns and versioned question dictionary",
  () => {
    const answers = Object.fromEntries(
      Array.from({ length: 16 }, (_, i) => ["q" + (i + 1), 5]),
    );
    excel.generateMultiSheetExcel({
      submissions: ["environment", "health"].map((group, i) => ({
        id: i + 1,
        submission_code: "fixture-" + group,
        assessment_type: "satisfaction",
        assessment_category: "general",
        assessment_group: group,
        questionnaire_version: m.satisfactionQuestionnaireVersion(group),
        created_at: "2026-10-12T00:00:00Z",
        overall_score: 5,
        answers,
      })),
    });
    const rows = xlsx.utils.sheet_to_json(
      globalThis.satisfactionWorkbook.Sheets["ความพึงพอใจ"],
      { header: 1 },
    );
    assert(rows[0].includes("กลุ่มแบบประเมิน"));
    assert(rows[0].includes("รุ่นคำถาม"));
    assert(rows[0].includes("ข้อ 12 (คะแนน)"));
    assert.equal(rows[1][rows[0].indexOf("กลุ่มแบบประเมิน")], "environment");
    assert.equal(
      rows[2][rows[0].indexOf("รุ่นคำถาม")],
      m.SATISFACTION_VERSIONS.health,
    );
    const dictionary = xlsx.utils.sheet_to_json(
      globalThis.satisfactionWorkbook.Sheets["ชุดคำถามความพึงพอใจ"],
      { header: 1 },
    );
    assert.equal(dictionary.length, 49);
    assert(
      dictionary.some(
        (r) =>
          r[0] === "health" &&
          r[4] === m.getSatisfactionQuestions("health")[0].questions[0].text,
      ),
    );
  },
);
writeFileSync(
  "docs/v3/baseline/satisfaction-question-update-tests.json",
  JSON.stringify(
    {
      date: "2026-10-12",
      passed,
      checks,
      source_sha256: source.sha256,
      remote: false,
    },
    null,
    2,
  ) + "\n",
);
