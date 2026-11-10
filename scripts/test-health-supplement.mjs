import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { supplementFixture } from "./health-supplement-fixtures.mjs";

const require = createRequire(resolve("worker/package.json"));
const esbuild = require("esbuild");
const temp = mkdtempSync(join(tmpdir(), "health-supplement-"));
const modules = {};
for (const [name, entry] of Object.entries({
  domain: "shared/v3/index.ts",
  form: "src/lib/v3/health-form.ts",
  draft: "src/lib/v3/draft.ts",
  excel: "src/lib/v3/report-export.ts",
  service: "worker/src/services/assessment-service.ts",
})) {
  const outfile = join(temp, name + ".mjs");
  esbuild.buildSync({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    logLevel: "silent",
    banner: {
      js: "import {createRequire as __createRequire} from 'node:module';const require=__createRequire(import.meta.url);",
    },
  });
  modules[name] = await import(pathToFileURL(outfile));
}
const { domain: d, form, draft, excel, service } = modules;
const XLSX = createRequire(resolve("package.json"))("xlsx");
let checks = 0;
function check(name, fn) {
  fn();
  checks++;
  console.log("PASS " + name);
}
const scores = (total) =>
  Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [
      "q" + (i + 1),
      Math.max(0, Math.min(2, total - i * 2)),
    ]),
  );
function healthDraft(category, total = 8) {
  return {
    ...form.emptyHealthDraft(),
    profile: {
      full_name: "ทดสอบข้อมูลประกอบ",
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
      program_code: "program-01",
      study_year: 1,
      working_hours_per_day: 8,
      working_hours_per_week: 40,
    },
    context:
      category === "light"
        ? { hours_worked_today: 0 }
        : { noise_sources: ["none"] },
    supplement: supplementFixture(d, category),
    before: scores(total),
    after: scores(total),
    single: scores(total),
  };
}
const payload = (category, total = 8) => {
  const parsed = form.buildHealthPayload(
    healthDraft(category, total),
    category,
    crypto.randomUUID(),
  );
  assert(parsed.success, JSON.stringify(parsed));
  return parsed.data;
};

check(
  "full scored wording matches requested changes, before/after mirror, noise Q4 unchanged",
  () => {
    const before = d.questionSnapshots("light", "before");
    const expected = {
      q4: "ท่านมีน้ำตาไหลผิดปกติหรือไม่",
      q6: "ท่านมีอาการดวงตาไวต่อแสงหรือไม่",
      q7: "ท่านมีอาการตาแดงหรือไม่",
      q8: "ท่านมีอาการวิงเวียนศีรษะจากแสงสว่างบริเวณที่ทำงานหรือไม่",
      q9: "ท่านมีอาการปวดศีรษะหรือไม่",
    };
    const after = d.questionSnapshots("light", "after");
    for (const [i, q] of before.entries()) {
      assert.equal(after[i].text, q.text.replace(/^ก่อน/, "หลัง"));
      if (expected[q.question_id])
        assert.equal(
          q.text,
          "ก่อนปฏิบัติงาน/เรียนในบริเวณที่มีแสง " + expected[q.question_id],
        );
    }
    assert.deepEqual(
      d
        .questionSnapshots("heat", "single")
        .slice(0, 4)
        .map((q) => q.text),
      [
        "ท่านมีอาการเหนื่อยล้ากว่าปกติหรือไม่",
        "ท่านมีอาการกระหายน้ำกว่าปกติหรือไม่",
        "ท่านมีอาการปวดศีรษะหรือไม่",
        "ท่านมีอาการวิงเวียนศีรษะ มึนงง หรือหน้ามืดหรือไม่",
      ],
    );
    assert.equal(
      d.questionSnapshots("noise", "single")[3].text,
      "ท่านมีอาการเวียนศีรษะ หรืออาการมึนงงหรือไม่",
    );
    assert.equal(
      readFileSync("docs/v3/catalogs/health-questionnaire.json", "utf8"),
      readFileSync("shared/v3/catalogs/health-questionnaire.json", "utf8"),
    );
  },
);

check(
  "supplement validates all categories, required answers, cross-category/version and unknown fields",
  () => {
    for (const category of ["light", "noise", "heat"]) {
      const p = payload(category);
      assert(d.validateSubmission(p).success);
      assert(
        !d.validateSubmission({
          ...p,
          healthSupplement: { ...p.healthSupplement, answers: {} },
        }).success,
      );
      assert(
        !d.validateSubmission({
          ...p,
          healthSupplement: { ...p.healthSupplement, category: "bad" },
        }).success,
      );
      assert(
        !d.validateSubmission({
          ...p,
          healthSupplement: { ...p.healthSupplement, version: "old" },
        }).success,
      );
      const injected = structuredClone(p);
      injected.healthSupplement.answers.q11 = "regularly";
      assert(!d.validateSubmission(injected).success);
      assert(
        !d.validateSubmission({
          ...p,
          answers: { ...p.answers, single: { ...scores(0), q11: 2 } },
        }).success,
      );
    }
  },
);

check(
  "exclusive answers, duplicates, invalid options, other details and hidden-child cleanup",
  () => {
    for (const category of ["light", "noise", "heat"]) {
      for (const q of d.HEALTH_SUPPLEMENT_SECTIONS[category]
        .flatMap((s) => s.questions)
        .filter((q) => q.exclusive?.length)) {
        const background = supplementFixture(d, category);
        const normal = q.options.find((o) => !q.exclusive.includes(o.value));
        background.answers[q.id] = [q.exclusive[0], normal.value];
        assert(
          !d
            .healthSupplementSchema(category)
            .safeParse(d.healthSupplementInput(category, background)).success,
        );
        background.answers[q.id] = [normal.value, normal.value];
        assert(
          !d
            .healthSupplementSchema(category)
            .safeParse(d.healthSupplementInput(category, background)).success,
        );
        assert.deepEqual(
          d.toggleSupplementChoice(q, [normal.value], q.exclusive[0]),
          [q.exclusive[0]],
        );
        assert.deepEqual(
          d.toggleSupplementChoice(q, [q.exclusive[0]], normal.value),
          [normal.value],
        );
        if (q.options.some((o) => o.value === "other")) {
          background.answers[q.id] = ["other"];
          assert(
            !d
              .healthSupplementSchema(category)
              .safeParse(d.healthSupplementInput(category, background)).success,
          );
          background.details[q.id] = "รายละเอียดครบถ้วน";
          assert(
            d
              .healthSupplementSchema(category)
              .safeParse(d.healthSupplementInput(category, background)).success,
          );
        }
      }
    }
    let background = supplementFixture(d, "light");
    background = d.changeSupplementAnswer(
      "light",
      background,
      "vision_history",
      "yes",
    );
    assert(
      !d
        .healthSupplementSchema("light")
        .safeParse(d.healthSupplementInput("light", background)).success,
    );
    background.answers.vision_conditions = ["other"];
    background.details.vision_conditions = "โรคตาอื่น";
    assert(
      d
        .healthSupplementSchema("light")
        .safeParse(d.healthSupplementInput("light", background)).success,
    );
    background = d.changeSupplementAnswer(
      "light",
      background,
      "vision_history",
      "none",
    );
    assert(!Object.hasOwn(background.answers, "vision_conditions"));
    assert(!Object.hasOwn(background.details, "vision_conditions"));
  },
);

check(
  "all additional answers, including both hearing symptoms, leave original score thresholds unchanged",
  () => {
    for (const category of ["light", "noise", "heat"]) {
      for (const total of [0, 6, 7, 13, 14, 20]) {
        const p = payload(category, total);
        const original = d.evaluateSubmission(p);
        const changed = structuredClone(p);
        for (const q of d.HEALTH_SUPPLEMENT_SECTIONS[category].flatMap(
          (s) => s.questions,
        )) {
          if (!d.supplementQuestionVisible(q, changed.healthSupplement))
            continue;
          // Alternate valid background responses; diagnosis status remains separate.
          if (q.id === "vision_history") continue;
          const option = [...q.options]
            .reverse()
            .find((o) => o.value !== "other");
          changed.healthSupplement.answers[q.id] = q.multiple
            ? [option.value]
            : option.value;
        }
        assert(d.validateSubmission(changed).success);
        assert.deepEqual(d.evaluateSubmission(changed), original);
        assert.equal(
          category === "light" ? original.after_total : original.total,
          total,
        );
        assert.equal(
          category === "light" ? original.after_level : original.level,
          total <= 6 ? "pass" : total <= 13 ? "medium" : "high_risk",
        );
      }
    }
  },
);

check(
  "five-step draft reload and old-version migration preserve personal data without reusing changed scores",
  () => {
    for (const category of ["light", "noise", "heat"]) {
      const identity = {
        group: "health",
        type: "health_risk",
        category,
        mode: "create",
        code: null,
        baseRevision: null,
      };
      const envelope = draft.patchDraft(
        draft.newDraft(identity),
        { healthV3: healthDraft(category) },
        { step: 5, tab: "after" },
      );
      assert.deepEqual(
        draft.readDraft(JSON.stringify(envelope), identity, 5),
        envelope,
      );
      envelope.data.healthV3.questionnaire_version =
        "health-symptoms-v3-2026-10-12";
      const migrated = draft.readDraft(JSON.stringify(envelope), identity, 5);
      assert(migrated);
      assert.deepEqual(
        migrated.data.healthV3.profile,
        envelope.data.healthV3.profile,
      );
      assert.deepEqual(
        migrated.data.healthV3.work,
        envelope.data.healthV3.work,
      );
      assert.deepEqual(migrated.data.healthV3.before, {});
      assert.equal(migrated.ui.step, 3);
      assert.notEqual(migrated.requestKey, envelope.requestKey);
    }
  },
);

check(
  "selected, history and latest Excel contain full background labels, answers and explicit legacy absence",
  () => {
    for (const category of ["light", "noise", "heat"]) {
      const p = payload(category);
      const api = new service.AssessmentService({ DB: {} });
      const resolved = api.resolved(p);
      assert.deepEqual(
        resolved.healthSupplementSections,
        d.HEALTH_SUPPLEMENT_SECTIONS[category],
      );
      const record = {
        ...p,
        submission_code: "NEW-" + category,
        schema_version: 3,
        data_version: 1,
        is_latest: true,
        resolved,
        result: d.evaluateSubmission(p),
      };
      const old = {
        ...record,
        submission_code: "OLD-" + category,
        healthSupplement: undefined,
      };
      for (const scope of ["selected", "history", "latest"]) {
        const output = excel.buildReportWorkbook([record, old], scope);
        const workbook = XLSX.read(
          XLSX.write(output, { type: "buffer", bookType: "xlsx" }),
          { type: "buffer" },
        );
        const sheetName =
          "สุขภาพ-" +
          { light: "แสงสว่าง", noise: "เสียง", heat: "ความร้อน" }[category];
        const [headers, ...rows] = XLSX.utils.sheet_to_json(
          workbook.Sheets[sheetName],
          { header: 1 },
        );
        const codeIndex = headers.indexOf("รหัสการประเมิน");
        for (const item of d.healthSupplementRows(
          category,
          p.healthSupplement,
        )) {
          const index = headers.findIndex(
            (h) =>
              String(h).replaceAll("\n", "") ===
              `ข้อมูลประกอบ (ไม่รวมคะแนน) — ${item.section} — ${item.question}`,
          );
          assert(index >= 0, item.question);
          assert.equal(
            rows.find((r) => r[codeIndex] === record.submission_code)[index],
            item.answer,
          );
          assert.equal(
            rows.find((r) => r[codeIndex] === old.submission_code)[index],
            d.HEALTH_SUPPLEMENT_MISSING,
          );
        }
      }
    }
  },
);
console.log(`Health supplement: ${checks} groups passed.`);
