const test = require("node:test"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const d = require(path.join(process.env.V3_TEST_BUILD_DIR, "shared/v3"));
const frontend = require(
  path.join(process.env.V3_TEST_BUILD_DIR, "src/lib/domain-v3"),
);
const worker = require(
  path.join(process.env.V3_TEST_BUILD_DIR, "worker/src/domain-v3"),
);
const score = (total, n = 10) =>
  Object.fromEntries(
    Array.from({ length: n }, (_, i) => [
      `q${i + 1}`,
      Math.max(0, Math.min(2, total - 2 * i)),
    ]),
  );
const spot = (id, lux = 500) => ({
  kind: "light_spot",
  point_id: id,
  location_desc: id,
  standard_code: "spot-office",
  standard_target_lux: 500,
  lux,
});
const student = {
  position_type: "student",
  program_code: "program-06",
  study_year: 6,
  working_hours_per_day: 8,
  working_hours_per_week: 40,
};
const profile = {
  full_name: "ผู้ทดสอบ จำลอง",
  gender: "other",
  age: 22,
  weight: 60,
  height: 170,
  education_level: "bachelor",
  marital_status: "single",
  has_underlying_disease: false,
};
const inspection = {
  inspector_name: "ผู้ตรวจ จำลอง",
  position: "ผู้ตรวจ",
  inspection_location: "สถานที่จำลอง",
  inspection_date: "2026-10-12",
  start_at: "2026-10-12T01:00:00Z",
  end_at: "2026-10-12T04:00:00Z",
  equipment: "meter",
  serial_number: "001",
  calibration_date: "2026-10-01",
  responsible_department: "ฝ่ายทดสอบ",
  location_responsible_name: "ผู้รับผิดชอบ",
  measurement_technique: "spot",
};
const metadata = { schema_version: 3, idempotency_key: "test-key" };
const light = {
  ...metadata,
  assessment_type: "health_risk",
  assessment_group: "health",
  assessment_category: "light",
  profile,
  workInfo: student,
  healthContext: { hours_worked_today: 0 },
  answers: { before: score(2), after: score(4) },
};
const noise = (basis = "exposure-duration") => ({
  kind: "noise",
  point_id: "N",
  location_desc: "noise",
  evaluation_basis: basis,
  min_dBA: 60,
  max_dBA: 95,
  ...(basis === "twa8"
    ? { twa_8hr: 85 }
    : { exposure_level_dBA: 88, exposure_duration_minutes: 240 }),
});
const heat = {
  kind: "heat",
  point_id: "T",
  location_desc: "heat",
  wbgt_type: "in",
  input_mode: "meter_average",
  workload: "moderate",
  start_at: "2026-10-12T01:00:00Z",
  end_at: "2026-10-12T03:00:00Z",
  wbgt_average: 32,
};
test("programs are exact official supplied labels and study year is independent", () => {
  assert.equal(d.PROGRAMS.length, 7);
  assert.equal(new Set(d.PROGRAMS.map((p) => p.code)).size, 7);
  for (const p of d.PROGRAMS)
    for (const study_year of d.STUDY_YEARS)
      assert(
        d.healthWorkSchema.safeParse({
          ...student,
          program_code: p.code,
          study_year,
        }).success,
      );
  assert(!d.healthWorkSchema.safeParse({ ...student, study_year: 7 }).success);
});
test("health boundaries, signed deltas and per-item comparison", () => {
  for (const [n, l] of [
    [0, "pass"],
    [6, "pass"],
    [7, "medium"],
    [13, "medium"],
    [14, "high_risk"],
    [20, "high_risk"],
  ])
    assert.equal(d.evaluateHealthSingle(score(n)).level, l);
  for (const [b, a, level, dir] of [
    [2, 4, "pass", "increased"],
    [6, 8, "medium", "increased"],
    [12, 14, "high_risk", "increased"],
    [8, 8, "medium", "unchanged"],
    [18, 16, "high_risk", "decreased"],
    [0, 0, "pass", "unchanged"],
  ]) {
    const r = d.evaluateHealthLight(score(b), score(a));
    assert.equal(r.delta, a - b);
    assert.equal(r.after_level, level);
    assert.equal(r.change_direction, dir);
    assert.equal(
      r.items.reduce((s, i) => s + i.delta, 0),
      a - b,
    );
  }
});
test("answers must be complete, finite and closed enums; metadata never contributes", () => {
  const q = score(0);
  delete q.q10;
  assert.throws(() => d.evaluateHealthSingle(q));
  for (const val of [3, -1, "0", "", null, NaN, Infinity])
    assert.throws(() => d.evaluateHealthSingle({ ...score(0), q1: val }));
  assert.throws(() =>
    d.evaluateHealthSingle({ ...score(0), hours_worked_today: 8 }),
  );
  assert(d.createSubmissionSchema.safeParse(light).success);
  assert.equal(d.evaluateSubmission(light).after_total, 4);
  assert(
    !d.createSubmissionSchema.safeParse({ ...light, overall_score: 0 }).success,
  );
});
test("required fields, conditional disease/year/work and missing zero distinguish", () => {
  for (const key of ["weight", "height", "gender", "has_underlying_disease"]) {
    const p = { ...profile };
    delete p[key];
    assert(!d.profileSchema.safeParse(p).success, key);
  }
  assert(
    !d.profileSchema.safeParse({ ...profile, has_underlying_disease: true })
      .success,
  );
  assert(
    d.profileSchema.safeParse({
      ...profile,
      has_underlying_disease: true,
      underlying_disease_details: "รายละเอียด",
    }).success,
  );
  assert(
    !d.healthWorkSchema.safeParse({
      ...student,
      program_code: "not_applicable",
    }).success,
  );
  assert(
    d.healthWorkSchema.safeParse({
      position_type: "staff",
      program_code: "not_applicable",
      work_experience_years: 0,
      working_hours_per_day: 8,
      working_hours_per_week: 40,
    }).success,
  );
  assert(
    !d.healthWorkSchema.safeParse({ ...student, working_hours_per_week: "" })
      .success,
  );
  assert(!d.date.safeParse("2026-02-30").success);
});
test("noise sources are unique, none exclusive, other text conditional", () => {
  assert(d.noiseContextSchema.safeParse({ noise_sources: ["none"] }).success);
  for (const noise_sources of [
    [],
    ["none", "traffic"],
    ["traffic", "traffic"],
    ["invalid"],
    ["other"],
  ])
    assert(!d.noiseContextSchema.safeParse({ noise_sources }).success);
  assert(
    d.noiseContextSchema.safeParse({
      noise_sources: ["other"],
      noise_source_other: "ระบุ",
    }).success,
  );
});
test("satisfaction complete 16 scores, notes optional, manual units normalized", () => {
  const a = Object.fromEntries(
    Array.from({ length: 16 }, (_, i) => [`q${i + 1}`, 5]),
  );
  assert.equal(d.evaluateSatisfaction(a).overall_mean, 5);
  assert.equal(d.evaluateSatisfaction({ ...a, q1: 1 }).overall_mean, 4.75);
  assert.throws(() => d.evaluateSatisfaction({ ...a, q1: 0 }));
  const missing = { ...a };
  delete missing.q16;
  assert.throws(() => d.evaluateSatisfaction(missing));
  for (const note of [undefined, null, "", "  "])
    assert.equal(d.optionalNote.parse(note), null);
  assert.equal(
    d.durationSeconds({ days: 1, hours: 2, minutes: 3, seconds: 4 }),
    93784,
  );
  assert.throws(() =>
    d.durationSeconds({ days: 0, hours: 0, minutes: 0, seconds: 0 }),
  );
  assert.throws(() =>
    d.durationSeconds({ days: 0, hours: 0, minutes: 60, seconds: 0 }),
  );
  assert(
    !d.createSubmissionSchema.safeParse({
      ...metadata,
      assessment_type: "satisfaction",
      assessment_group: "environment",
      assessment_category: "general",
      profile: { full_name: "ผู้ทดสอบ" },
      answers: a,
    }).success,
  );
});
test("light Spot target, full precision and surrounding thresholds", () => {
  assert(d.evaluateUnit(spot("L", 500)).is_pass);
  assert(!d.evaluateUnit(spot("L", 499.99)).is_pass);
  assert.throws(() =>
    d.evaluateUnit({ ...spot("L"), standard_target_lux: 600 }),
  );
  const p = {
    ...spot("L", 1500),
    standard_code: "spot-very-high-detail",
    standard_target_lux: 1500,
    surrounding_near_lux: 300,
    surrounding_outer_lux: 199,
  };
  assert(!d.evaluateUnit(p).is_pass);
  assert(d.evaluateUnit({ ...p, surrounding_outer_lux: 200 }).is_pass);
  assert.deepEqual(d.surroundingStandard(2000), { near: 300, outer: 200 });
  assert.deepEqual(d.surroundingStandard(2000.01), { near: 600, outer: 300 });
  assert.throws(() =>
    d.evaluateUnit({ ...p, surrounding_near_lux: undefined }),
  );
});
test("Area average and minimum both evaluated, zero/missing handled", () => {
  const area = (values) => ({
    kind: "light_area",
    point_id: "A",
    location_desc: "area",
    standard_code: "area-office",
    samples: values.map((lux, i) => ({ sample_id: `s${i}`, lux })),
  });
  assert(d.evaluateUnit(area([150, 300, 450])).is_pass);
  const r = d.evaluateUnit(area([100, 350, 450]));
  assert.equal(r.values.average, 300);
  assert.equal(r.values.minimum, 100);
  assert(!r.is_pass);
  assert(!d.evaluateUnit(area([150, 200, 250])).is_pass);
  assert.throws(() => d.evaluateUnit(area([])));
  assert(d.environmentUnitSchema.safeParse(area([0, 0])).success);
  assert.throws(() =>
    d.evaluateUnit({
      ...area([200, 200]),
      samples: [
        { sample_id: "same", lux: 200 },
        { sample_id: "same", lux: 200 },
      ],
    }),
  );
});
test("noise table takes precedence, formula floors limit only, TWA8 not normalized twice", () => {
  for (const [level, minutes] of d.NOISE_DURATION_TABLE)
    assert.deepEqual(d.noiseLimit(minutes), { limit: level, source: "table" });
  assert.equal(d.noiseLimit(360).limit, 86);
  assert(d.evaluateUnit(noise()).is_pass);
  assert(!d.evaluateUnit({ ...noise(), exposure_level_dBA: 88.1 }).is_pass);
  assert(!d.evaluateUnit({ ...noise("twa8"), twa_8hr: 85.1 }).is_pass);
  assert.throws(() =>
    d.evaluateUnit({ ...noise("twa8"), exposure_duration_minutes: 240 }),
  );
  assert.throws(() => d.noiseLimit(0));
});
test("WBGT formula, time weighting, source modes and equality before display rounding", () => {
  assert(d.evaluateUnit(heat).is_pass);
  assert(!d.evaluateUnit({ ...heat, wbgt_average: 32.01 }).is_pass);
  const calculated = {
    ...heat,
    input_mode: "calculated_intervals",
    wbgt_average: undefined,
    intervals: [{ wb: 28, gt: 34, minutes: 120 }],
    workload: "light",
  };
  assert(
    Math.abs(d.evaluateUnit(calculated).values.wbgt_average - 29.8) < 1e-10,
  );
  const sunny = {
    ...calculated,
    wbgt_type: "out",
    workload: "heavy",
    intervals: [{ wb: 28, gt: 40, db: 35, minutes: 120 }],
  };
  assert(!d.evaluateUnit(sunny).is_pass);
  const weighted = {
    ...calculated,
    workload: "moderate",
    intervals: [
      { wb: 30, gt: 30, minutes: 30 },
      { wb: 34, gt: 34, minutes: 90 },
    ],
  };
  assert.equal(d.evaluateUnit(weighted).values.wbgt_average, 33);
  assert(!d.evaluateUnit(weighted).is_pass);
  assert.throws(() =>
    d.evaluateUnit({ ...sunny, intervals: [{ wb: 28, gt: 40, minutes: 120 }] }),
  );
  assert.throws(() =>
    d.evaluateUnit({ ...heat, intervals: calculated.intervals }),
  );
  assert.throws(() =>
    d.evaluateUnit({
      ...calculated,
      intervals: [{ wb: 28, gt: 34, minutes: 60 }],
    }),
  );
});
function baseRevision(units) {
  return {
    revision_id: "r1",
    submission_id: 1,
    revision_no: 1,
    base_revision_id: null,
    schema_version: 3,
    scoring_version: d.SCORING_VERSION,
    inspectionData: inspection,
    layout_file_id: "file",
    archived: false,
    is_pass: false,
    observations: units.map((unit) => ({
      unit: d.environmentUnitSchema.parse(unit),
      result: d.evaluateUnit(unit),
      measured_at: inspection.start_at,
      observation_kind: "measured",
      carried_from_revision_id: null,
    })),
  };
}
function request(base, updates) {
  return {
    ...metadata,
    base_revision_id: base.revision_id,
    inspection_date: "2026-10-13",
    start_at: "2026-10-13T01:00:00Z",
    end_at: "2026-10-13T04:00:00Z",
    updates,
  };
}
test("failed-only retest preserves original measurement provenance across three rounds", () => {
  const r1 = baseRevision([spot("A", 500), spot("B", 400), spot("C", 400)]),
    snapshot = JSON.stringify(r1);
  const r2 = d.prepareRetest(
    r1,
    request(r1, [
      { kind: "light_spot", point_id: "B", lux: 500 },
      { kind: "light_spot", point_id: "C", lux: 450 },
    ]),
    "r2",
  );
  assert(!r2.is_pass);
  assert.equal(r2.observations[0].measured_at, inspection.start_at);
  assert.equal(r2.observations[0].carried_from_revision_id, "r1");
  assert.equal(JSON.stringify(r1), snapshot);
  const r3 = d.prepareRetest(
    r2,
    request(r2, [{ kind: "light_spot", point_id: "C", lux: 500 }]),
    "r3",
  );
  assert(r3.is_pass);
  assert.equal(r3.observations[0].carried_from_revision_id, "r1");
  assert.equal(r3.observations[1].carried_from_revision_id, "r2");
  assert.throws(
    () =>
      d.prepareRetest(
        r3,
        request(r3, [{ kind: "light_spot", point_id: "C", lux: 500 }]),
        "r4",
      ),
    /already passes/,
  );
  assert.throws(
    () =>
      d.prepareRetest(
        r2,
        request(r1, [{ kind: "light_spot", point_id: "C", lux: 500 }]),
        "r4",
      ),
    /stale/,
  );
  assert.throws(
    () =>
      d.prepareRetest(
        r1,
        request(r1, [{ kind: "light_spot", point_id: "B", lux: 500 }]),
        "r2",
      ),
    /exactly/,
  );
  assert.throws(() =>
    d.prepareRetest(
      r1,
      request(r1, [
        { kind: "light_spot", point_id: "B", lux: 500, standard_target_lux: 1 },
        { kind: "light_spot", point_id: "C", lux: 500 },
      ]),
      "r2",
    ),
  );
});
test("Area retest cannot omit or rename samples; archive rejects retest", () => {
  const area = {
    kind: "light_area",
    point_id: "area",
    location_desc: "area",
    standard_code: "area-office",
    samples: [
      { sample_id: "a", lux: 100 },
      { sample_id: "b", lux: 350 },
      { sample_id: "c", lux: 450 },
    ],
  };
  const base = baseRevision([area]);
  assert.throws(
    () =>
      d.prepareRetest(
        base,
        request(base, [
          {
            kind: "light_area",
            point_id: "area",
            samples: [{ sample_id: "a", lux: 300 }],
          },
        ]),
        "r2",
      ),
    /topology/,
  );
  assert.throws(
    () =>
      d.prepareRetest(
        { ...base, archived: true },
        request(base, [
          { kind: "light_area", point_id: "area", samples: area.samples },
        ]),
        "r2",
      ),
    /Archived/,
  );
});
test("legacy adapter preserves zero, old units and unknown group without invented before/after", () => {
  const raw = {
    assessment_type: "health_risk",
    assessment_category: "light",
    answers: { q1: 0 },
    workInfo: { working_days_per_week: 5 },
  };
  const r = d.adaptLegacySubmission(raw);
  assert.deepEqual(r.raw, raw);
  assert.equal(r.answer_phase, "single");
  assert(!("before" in r.raw.answers));
  r.raw.answers.q1 = 2;
  assert.equal(raw.answers.q1, 0);
  assert.equal(
    d.adaptLegacySubmission({ assessment_type: "satisfaction" })
      .assessment_group,
    "unknown",
  );
  assert.throws(() => d.adaptLegacySubmission({ schema_version: 3 }));
});
test("frontend and Worker expose matching validation and scoring results", () => {
  assert.deepEqual(
    frontend.evaluateSubmission(light),
    worker.evaluateSubmission(light),
  );
  assert.deepEqual(
    frontend.evaluateUnit(noise()),
    worker.evaluateUnit(noise()),
  );
  assert.deepEqual(
    frontend.validateSubmission({ ...light, profile: {} }),
    worker.validateSubmission({ ...light, profile: {} }),
  );
});

test("all eight entry flows parse and reject cross-group/category metadata", () => {
  const a = Object.fromEntries(
    Array.from({ length: 16 }, (_, i) => [`q${i + 1}`, 5]),
  );
  const duration = { days: 0, hours: 0, minutes: 1, seconds: 0 };
  const cases = [
    light,
    {
      ...light,
      assessment_category: "noise",
      answers: { single: score(0) },
      healthContext: { noise_sources: ["none"] },
    },
    { ...light, assessment_category: "heat", answers: { single: score(0) } },
  ];
  delete cases[2].healthContext;
  cases.push({
    ...metadata,
    assessment_type: "satisfaction",
    assessment_category: "general",
    assessment_group: "health",
    profile: { full_name: "ผู้ทดสอบ" },
    workInfo: {
      position_type: "student",
      program_code: "program-07",
      study_year: 6,
    },
    answers: a,
  });
  cases.push({
    ...metadata,
    assessment_type: "satisfaction",
    assessment_category: "general",
    assessment_group: "environment",
    profile: { full_name: "ผู้ทดสอบ" },
    answers: a,
    durations: { traditional: duration, safecheck: duration },
  });
  cases.push({
    ...metadata,
    assessment_type: "environment",
    assessment_group: "environment",
    assessment_category: "light",
    inspectionData: inspection,
    layout: { file_id: "file" },
    units: [spot("L")],
  });
  const lightEnvironment = cases.at(-1);
  cases.push({
    ...lightEnvironment,
    assessment_category: "noise",
    inspectionData: { ...inspection, measurement_technique: undefined },
    units: [noise()],
  });
  cases.push({
    ...lightEnvironment,
    assessment_category: "heat",
    inspectionData: { ...inspection, measurement_technique: undefined },
    units: [heat],
  });
  for (const c of cases) {
    assert(d.createSubmissionSchema.safeParse(c).success, JSON.stringify(c));
    assert(d.evaluateSubmission(c));
    assert(
      !d.createSubmissionSchema.safeParse({ ...c, assessment_group: "unknown" })
        .success,
    );
  }
  const env = lightEnvironment;
  assert(
    !d.createSubmissionSchema.safeParse({ ...env, units: [noise()] }).success,
  );
  assert(
    !d.createSubmissionSchema.safeParse({
      ...env,
      inspectionData: { ...inspection, calibration_date: "2026-10-13" },
    }).success,
  );
  assert(
    d.createSubmissionSchema.safeParse({ ...env, layout: undefined }).success,
  );
  assert(!d.createSubmissionSchema.safeParse({ ...env, layout: {} }).success);
});

test("server snapshots preserve program labels and phase-specific question wording", () => {
  assert.equal(
    d.programSnapshot("program-07").label,
    "หลักสูตรประกาศนียบัตรวิชาชีพชั้นสูง สาขาวิชาปฏิบัติการฉุกเฉินการแพทย์",
  );
  assert.equal(d.programSnapshot("not_applicable").label, null);
  assert.throws(() => d.programSnapshot("unknown"));
  assert(
    d
      .questionSnapshots("light", "before")
      .every((q) => q.text.startsWith("ก่อน")),
  );
  assert(
    d
      .questionSnapshots("light", "after")
      .every((q) => q.text.startsWith("หลัง")),
  );
  assert.equal(d.questionSnapshots("heat", "single").length, 10);
  assert.throws(() => d.questionSnapshots("light", "single"));
});

test("validation errors identify the relevant form field without unrelated branches", () => {
  const result = d.validateSubmission({
    ...light,
    profile: { ...profile, weight: undefined },
  });
  assert(!result.success);
  assert(
    result.error.issues.some((i) => i.path.join(".") === "profile.weight"),
  );
  assert(!result.error.issues.some((i) => i.path.includes("durations")));
});
