import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const require = createRequire(resolve("worker/package.json")),
  esbuild = require("esbuild"),
  temp = mkdtempSync(join(tmpdir(), "safecheck-p5-unit-"));
for (const [entry, name] of [
  ["src/lib/v3/environment-form.ts", "form"],
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
  });
const f = await import(pathToFileURL(join(temp, "form.mjs"))),
  domain = await import(pathToFileURL(join(temp, "domain.mjs"))),
  draft = await import(pathToFileURL(join(temp, "draft.mjs")));
const checks = [];
function check(name, fn) {
  fn();
  checks.push(name);
  console.log("PASS " + checks.length + ": " + name);
}
check(
  "Area direct values validate without samples; legacy sources remain immutable and empty retests stay empty",
  () => {
    const base = {
      kind: "light_area",
      point_id: "direct",
      location_desc: "พื้นที่",
      remark: null,
      standard_code: "area-office",
      average_lux: 300,
      minimum_lux: 150,
    };
    assert(domain.environmentUnitSchema.safeParse(base).success);
    assert.equal(domain.evaluateUnit(base).is_pass, true);
    assert.equal(
      domain.evaluateUnit({ ...base, minimum_lux: 149 }).is_pass,
      false,
    );
    assert(
      !domain.environmentUnitSchema.safeParse({ ...base, minimum_lux: 301 })
        .success,
    );
    assert(
      !domain.environmentUnitSchema.safeParse({
        ...base,
        minimum_lux: undefined,
      }).success,
    );
    assert(
      !domain.environmentUnitSchema.safeParse({
        ...base,
        samples: [{ sample_id: "x", lux: 300 }],
      }).success,
    );
    const old = {
      kind: "light_area",
      point_id: "old",
      location_desc: "พื้นที่เดิม",
      remark: "",
      standard_code: "area-office",
      samples: [
        { sample_id: "a", lux: 100 },
        { sample_id: "b", lux: 500 },
      ],
    };
    const snapshot = JSON.stringify(old);
    const converted = f.normalizeAreaDraft({
      inspection: {},
      units: [old],
      layout: null,
      reason: "",
    });
    assert.equal(converted.units[0].average_lux, 300);
    assert.equal(converted.units[0].minimum_lux, 100);
    assert.equal(JSON.stringify(old), snapshot);
    assert.equal(
      f.unitFromDraft({
        ...converted.units[0],
        average_lux: "",
        minimum_lux: "",
      }).average_lux,
      undefined,
    );
    assert(
      !domain.environmentUnitSchema.safeParse(
        f.unitFromDraft({
          ...converted.units[0],
          average_lux: "",
          minimum_lux: "",
        }),
      ).success,
    );
  },
);
const inspection = {
  inspector_name: "ผู้ทดสอบ",
  position: "ผู้ตรวจ",
  inspection_location: "พื้นที่ทดสอบ",
  equipment: "Meter",
  serial_number: "SN-P5",
  calibration_date: "2026-10-01",
  responsible_department: "ฝ่ายทดสอบ",
  location_responsible_name: "ผู้รับผิดชอบ",
  inspection_date: "2026-10-12",
  start_at: "2026-10-12T08:00",
  end_at: "2026-10-12T11:00",
};
const spot = {
  point_id: "a",
  kind: "light_spot",
  location_desc: "A",
  standard_code: "spot-office",
  standard_target_lux: 400,
  lux: 399,
  remark: "",
};
function d(category = "light") {
  return {
    ...f.freshEnvironment(category),
    inspection: {
      ...inspection,
      ...(category === "light" ? { measurement_technique: "spot" } : {}),
    },
    layout: { file_id: "file" },
    units: [{ ...spot }],
  };
}
check(
  "empty numeric inputs are not coerced to zero; actual zero is valid",
  () => {
    const v = d();
    v.units[0].lux = "";
    assert(!f.checkedEnvironment(v, "light", "k").success);
    v.units[0].lux = "0";
    assert(f.checkedEnvironment(v, "light", "k").success);
  },
);
check(
  "metadata/technique required, optional layout and real calendar dates rejected",
  () => {
    for (const key of [
      "serial_number",
      "calibration_date",
      "responsible_department",
      "location_responsible_name",
      "measurement_technique",
    ]) {
      const v = d();
      delete v.inspection[key];
      assert(!f.checkedEnvironment(v, "light", "k").success, key);
    }
    const noLayout = d();
    noLayout.layout = null;
    assert(f.checkedEnvironment(noLayout, "light", "k").success);
    assert.equal(
      f.previewEnvironment(noLayout, "light", "k").data.layout_file_id,
      null,
    );
    const v = d();
    v.inspection.calibration_date = "2026-02-30";
    assert(!f.checkInspection(v, "light").success);
    v.inspection = {
      ...inspection,
      measurement_technique: "spot",
      end_at: inspection.start_at,
    };
    assert(!f.checkInspection(v, "light").success);
  },
);
check(
  "Thai local datetime converts explicitly to UTC+7 including midnight crossing",
  () => {
    assert.equal(
      f.instantFromLocal("2026-10-12T23:30"),
      "2026-10-12T23:30:00+07:00",
    );
    assert.equal(f.localTime("2026-10-12T16:30:00Z"), "2026-10-12T23:30");
    const v = d();
    v.inspection.start_at = "2026-10-12T23:30";
    v.inspection.end_at = "2026-10-13T00:30";
    assert(f.checkInspection(v, "light").success);
  },
);
check(
  "Spot surrounding and Area aggregate use same domain validation as Worker",
  () => {
    assert.equal(
      f.unitFromDraft({ ...spot, standard_target_lux: "" }).standard_target_lux,
      400,
    );
    assert.equal(
      f.unitFromDraft({ ...spot, standard_target_lux: 500 })
        .standard_target_lux,
      500,
    );
    const v = d();
    v.units = [
      {
        ...spot,
        standard_code: "spot-textile-detail",
        standard_target_lux: 1200,
        lux: 1200,
      },
    ];
    assert(!f.checkedEnvironment(v, "light", "k").success);
    Object.assign(v.units[0], {
      surrounding_near_lux: 300,
      surrounding_outer_lux: 200,
    });
    assert(f.checkedEnvironment(v, "light", "k").success);
    v.inspection.measurement_technique = "area";
    v.units = [
      {
        kind: "light_area",
        point_id: "area",
        location_desc: "area",
        remark: "",
        standard_code: "area-office",
        samples: [
          { sample_id: "s1", lux: 149 },
          { sample_id: "s2", lux: 451 },
        ],
      },
    ];
    const parsed = f.checkedEnvironment(v, "light", "k");
    assert(parsed.success);
    const result = domain.evaluateEnvironment(parsed.data.units);
    assert.equal(result.results[0].values.average, 300);
    assert.equal(result.is_pass, false);
  },
);
check(
  "noise basis does not mix duration and normalized TWA8; blank duration invalid",
  () => {
    const v = d("noise");
    v.units = [
      {
        kind: "noise",
        point_id: "n",
        location_desc: "N",
        remark: "",
        evaluation_basis: "exposure-duration",
        min_dBA: 80,
        max_dBA: 90,
        exposure_duration_minutes: 360,
        exposure_level_dBA: 86,
        twa_8hr: 999,
      },
    ];
    let p = f.checkedEnvironment(v, "noise", "k");
    assert(p.success);
    assert(!("twa_8hr" in p.data.units[0]));
    assert(domain.evaluateEnvironment(p.data.units).is_pass);
    v.units[0].evaluation_basis = "twa8";
    v.units[0].twa_8hr = 85.1;
    p = f.checkedEnvironment(v, "noise", "k");
    assert(p.success);
    assert(!("exposure_duration_minutes" in p.data.units[0]));
    assert(!domain.evaluateEnvironment(p.data.units).is_pass);
  },
);
check(
  "heat modes omit inapplicable values and enforce 120 minute weighted average",
  () => {
    const v = d("heat");
    v.units = [
      {
        kind: "heat",
        point_id: "h",
        location_desc: "H",
        remark: "",
        wbgt_type: "out",
        input_mode: "calculated_intervals",
        workload: "heavy",
        start_at: "2026-10-12T08:00",
        end_at: "2026-10-12T10:00",
        wbgt_average: 999,
        intervals: [{ wb: 28, gt: 40, db: 35, minutes: 120 }],
      },
    ];
    let p = f.checkedEnvironment(v, "heat", "k");
    assert(p.success);
    assert(!("wbgt_average" in p.data.units[0]));
    assert(
      Math.abs(
        domain.evaluateEnvironment(p.data.units).results[0].values
          .wbgt_average - 31.1,
      ) < 1e-9,
    );
    v.units[0].intervals[0].minutes = 119;
    assert(!f.checkedEnvironment(v, "heat", "k").success);
  },
);
check(
  "retest resets failed values, preserves carry provenance and records inspection metadata per round",
  () => {
    const units = [
      { ...spot, lux: 400 },
      { ...spot, point_id: "b", location_desc: "B", lux: 300 },
    ].map((u) => domain.environmentUnitSchema.parse(u));
    const results = domain.evaluateEnvironment(units);
    const source = {
      submission_code: "job",
      schema_version: 3,
      assessment_type: "environment",
      assessment_category: "light",
      data_version: 1,
      can_retest: true,
      is_latest: true,
      units,
      inspectionData: {
        ...inspection,
        measurement_technique: "spot",
        start_at: f.instantFromLocal(inspection.start_at),
        end_at: f.instantFromLocal(inspection.end_at),
      },
      layout: { file_id: "f" },
      revision: {
        revision_id: "r1",
        submission_id: 1,
        revision_no: 1,
        base_revision_id: null,
        schema_version: 3,
        scoring_version: results.scoring_version,
        inspectionData: {
          ...inspection,
          measurement_technique: "spot",
          start_at: f.instantFromLocal(inspection.start_at),
          end_at: f.instantFromLocal(inspection.end_at),
        },
        layout_file_id: "f",
        observations: units.map((u, i) => ({
          unit: u,
          result: results.results[i],
          measured_at: "2026-10-12T08:00:00+07:00",
          observation_kind: "measured",
          carried_from_revision_id: null,
        })),
        is_pass: false,
        archived: false,
      },
    };
    const v = f.forRetest(source);
    assert.equal(v.units[0].lux, 400);
    assert.equal(v.units[1].lux, "");
    assert.equal(v.inspection.start_at, "");
    Object.assign(v.inspection, {
      inspection_date: "2026-10-13",
      start_at: "2026-10-13T08:00",
      end_at: "2026-10-13T10:00",
    });
    v.units[1].lux = 400;
    v.inspection.inspector_name = "ผู้ตรวจคนที่สอง";
    v.inspection.serial_number = "เครื่องรอบใหม่";
    const r = f.retestRequest(v, "key");
    assert.equal(r.updates.length, 1);
    assert.equal(r.updates[0].point_id, "b");
    assert.equal(r.inspectionData.inspector_name, "ผู้ตรวจคนที่สอง");
    assert.equal(r.inspectionData.serial_number, "เครื่องรอบใหม่");
    assert(!("standard_code" in r.updates[0]));
    const p = f.previewRetest(v, "key");
    assert(p.is_pass);
    assert.equal(p.inspectionData.inspector_name, "ผู้ตรวจคนที่สอง");
    assert.equal(source.revision.inspectionData.inspector_name, "ผู้ทดสอบ");
    assert.throws(() =>
      domain.prepareRetest(
        source.revision,
        {
          ...r,
          inspectionData: {
            ...r.inspectionData,
            measurement_technique: "area",
          },
        },
        "bad-technique",
      ),
    );
    assert.equal(p.observations[0].carried_from_revision_id, "r1");
    assert.equal(
      p.observations[0].measured_at,
      source.revision.observations[0].measured_at,
    );
    v.layout = null;
    assert.equal(f.retestRequest(v, "remove-layout").layout, null);
    assert.equal(f.previewRetest(v, "remove-layout").layout_file_id, null);
    assert.equal(source.revision.layout_file_id, "f");
  },
);
check(
  "environment drafts separated by mode/base/form version; stable IDs survive roundtrip",
  () => {
    const id = {
      group: "environment",
      type: "environment",
      category: "light",
      mode: "retest",
      code: "job",
      baseRevision: "r1",
      questionnaireVersion: f.ENVIRONMENT_FORM_VERSION,
    };
    const e = draft.newDraft(id);
    e.data.environmentV3 = d();
    const restored = draft.readDraft(JSON.stringify(e), id, 3);
    assert(restored);
    assert.equal(restored.data.environmentV3.units[0].point_id, "a");
    assert(
      !draft.readDraft(JSON.stringify(e), { ...id, baseRevision: "r2" }, 3),
    );
    assert.notEqual(
      draft.draftKey(id),
      draft.draftKey({ ...id, mode: "correction" }),
    );
  },
);
check(
  "heat times are independent of inspection times for create/correction; invalid point order still fails",
  () => {
    const unit = {
      kind: "heat",
      point_id: "h",
      location_desc: "heat",
      remark: null,
      wbgt_type: "in",
      input_mode: "meter_average",
      workload: "moderate",
      start_at: "2026-10-12T08:00:00+07:00",
      end_at: "2026-10-12T10:00:00+07:00",
      wbgt_average: 32,
    };
    const base = [domain.environmentUnitSchema.parse(unit)],
      v = d("heat");
    v.inspection = {
      ...inspection,
      inspection_date: "2026-10-13",
      start_at: "2026-10-13T08:00",
      end_at: "2026-10-13T11:00",
    };
    v.units = [
      {
        ...unit,
        remark: "แก้หมายเหตุ",
        location_desc: "แก้ชื่อพื้นที่",
        start_at: "2026-10-12T08:00",
        end_at: "2026-10-12T10:00",
      },
    ];
    let input = f.environmentPayload(v, "heat", "k");
    assert(domain.validateSubmission(input).success);
    let ids = domain.unchangedHeatUnitIds(base, input.units);
    assert(ids.has("h"));
    assert(domain.validateEffectiveEnvironment(input, ids).success);
    v.units[0].wbgt_average = 33;
    input = f.environmentPayload(v, "heat", "k");
    ids = domain.unchangedHeatUnitIds(base, input.units);
    assert(!ids.has("h"));
    assert(domain.validateEffectiveEnvironment(input, ids).success);
    const invalidTime = structuredClone(input);
    invalidTime.units[0].end_at = invalidTime.units[0].start_at;
    assert(!domain.validateSubmission(invalidTime).success);
    assert(
      !domain.validateSubmission({ ...input, unchanged_heat_ids: ["h"] })
        .success,
    );
  },
);
check(
  "corrupt environment draft is rejected safely without rendering nested bad shapes",
  () => {
    assert(f.safeEnvironmentDraft(d()));
    assert(
      !f.safeEnvironmentDraft({ units: null, inspection: {}, reason: "" }),
    );
    assert(
      !f.safeEnvironmentDraft({
        ...d(),
        units: [{ ...spot, kind: "light_area", samples: null }],
      }),
    );
    assert(
      !f.safeEnvironmentDraft({
        ...d(),
        source: { schema_version: 3, revision: null },
      }),
    );
  },
);
check(
  "all public standard PDFs are byte-identical to supplied source assets",
  () => {
    for (const [from, to] of [
      ["lighting-std-2561.pdf", "lighting-std-2561.pdf"],
      ["sound-standard-2560.pdf", "sound-standard-2560.pdf"],
      ["มาตรฐานความร้อน.pdf", "heat-standard-2559.pdf"],
    ])
      assert.deepEqual(
        readFileSync("docs/v3/" + from),
        readFileSync("public/standards/" + to),
      );
  },
);
writeFileSync(
  "docs/v3/baseline/p5-unit-tests.json",
  JSON.stringify(
    { date: "2026-10-12", passed: checks.length, checks, remote: false },
    null,
    2,
  ) + "\n",
);
