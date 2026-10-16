// Synthetic acceptance fixtures; independent explicit required-field expectations.
export const key = () => crypto.randomUUID();
export const scores = (n, count = 10) =>
  Object.fromEntries(
    Array.from({ length: count }, (_, i) => ["q" + (i + 1), n]),
  );
export const inspection = {
  inspector_name: "ผู้ตรวจ P8 จำลอง",
  position: "ผู้ตรวจ",
  inspection_location: "ห้องทดสอบ P8",
  inspection_date: "2026-10-12",
  start_at: "2026-10-12T01:00:00Z",
  end_at: "2026-10-12T04:00:00Z",
  equipment: "เครื่องทดสอบ",
  serial_number: "P8-0001",
  calibration_date: "2026-10-01",
  responsible_department: "ฝ่ายทดสอบ",
  location_responsible_name: "ผู้รับผิดชอบจำลอง",
};
const profile = {
  full_name: "ผู้ตอบ P8 จำลอง",
  gender: "other",
  age: 22,
  weight: 60,
  height: 170,
  education_level: "bachelor",
  marital_status: "single",
  has_underlying_disease: false,
};
const work = {
  position_type: "student",
  program_code: "program-07",
  study_year: 6,
  working_hours_per_day: 8,
  working_hours_per_week: 40,
};
const common = [
  "schema_version",
  "idempotency_key",
  "assessment_type",
  "assessment_group",
  "assessment_category",
];
const profilePaths = Object.keys(profile).map((k) => "profile." + k),
  workPaths = Object.keys(work).map((k) => "workInfo." + k);
const answerPaths = (phase, count = 10) =>
  Array.from(
    { length: count },
    (_, i) => `answers.${phase ? phase + "." : ""}q${i + 1}`,
  );
export function fixtures(file) {
  const health = (category, extra = {}) => ({
    schema_version: 3,
    idempotency_key: key(),
    assessment_type: "health_risk",
    assessment_group: "health",
    assessment_category: category,
    profile: { ...profile },
    workInfo: { ...work },
    ...(category === "light"
      ? {
          healthContext: { hours_worked_today: 0 },
          answers: { before: scores(0), after: scores(1) },
        }
      : category === "noise"
        ? {
            healthContext: { noise_sources: ["none"] },
            answers: { single: scores(1) },
          }
        : { answers: { single: scores(2) } }),
    ...extra,
  });
  const env = (category, unit, technique) => ({
    schema_version: 3,
    idempotency_key: key(),
    assessment_type: "environment",
    assessment_group: "environment",
    assessment_category: category,
    inspectionData: {
      ...inspection,
      ...(technique ? { measurement_technique: technique } : {}),
    },
    layout: { file_id: file },
    units: [unit],
  });
  const result = [];
  const pushHealth = (name, p, additional = [], specialWork = workPaths) =>
    result.push({
      name,
      payload: p,
      required: [
        ...common,
        ...profilePaths,
        ...specialWork,
        ...(p.assessment_category === "light"
          ? [
              ...answerPaths("before"),
              ...answerPaths("after"),
              "healthContext.hours_worked_today",
            ]
          : answerPaths("single")),
        ...(p.assessment_category === "noise"
          ? ["healthContext.noise_sources"]
          : []),
        ...additional,
      ],
      optional: [
        "profile.underlying_disease_details",
        ...(p.assessment_category === "noise"
          ? ["healthContext.noise_source_other"]
          : []),
      ],
    });
  for (const c of ["light", "noise", "heat"])
    pushHealth("health-" + c, health(c));
  pushHealth(
    "health-staff-na",
    health("heat", {
      workInfo: {
        position_type: "staff",
        program_code: "not_applicable",
        work_experience_years: 0,
        working_hours_per_day: 8,
        working_hours_per_week: 40,
      },
    }),
    [],
    [
      "workInfo.position_type",
      "workInfo.program_code",
      "workInfo.work_experience_years",
      "workInfo.working_hours_per_day",
      "workInfo.working_hours_per_week",
    ],
  );
  const disease = health("light");
  disease.profile.has_underlying_disease = true;
  disease.profile.underlying_disease_details = "โรคจำลอง";
  pushHealth("health-disease", disease, ["profile.underlying_disease_details"]);
  result.at(-1).optional = [];
  const other = health("noise");
  other.healthContext = {
    noise_sources: ["other"],
    noise_source_other: "แหล่งเสียงจำลอง",
  };
  pushHealth("health-other-noise", other, ["healthContext.noise_source_other"]);
  result.at(-1).optional = ["profile.underlying_disease_details"];
  for (const [name, p] of [
    [
      "environment-light",
      env(
        "light",
        {
          kind: "light_spot",
          point_id: "spot",
          location_desc: "โต๊ะ",
          standard_code: "spot-office",
          standard_target_lux: 500,
          lux: 0,
        },
        "spot",
      ),
    ],
    [
      "environment-surrounding",
      env(
        "light",
        {
          kind: "light_spot",
          point_id: "detail",
          location_desc: "งานละเอียด",
          standard_code: "spot-textile-detail",
          standard_target_lux: 1000,
          lux: 1000,
          surrounding_near_lux: 500,
          surrounding_outer_lux: 300,
        },
        "spot",
      ),
    ],
    [
      "environment-area",
      env(
        "light",
        {
          kind: "light_area",
          point_id: "area",
          location_desc: "พื้นที่",
          standard_code: "area-office",
          samples: [
            { sample_id: "a", lux: 0 },
            { sample_id: "b", lux: 600 },
          ],
        },
        "area",
      ),
    ],
    [
      "environment-noise",
      env("noise", {
        kind: "noise",
        point_id: "noise",
        location_desc: "เสียง",
        evaluation_basis: "exposure-duration",
        min_dBA: 70,
        max_dBA: 100,
        exposure_level_dBA: 89,
        exposure_duration_minutes: 240,
      }),
    ],
    [
      "environment-twa8",
      env("noise", {
        kind: "noise",
        point_id: "twa",
        location_desc: "TWA",
        evaluation_basis: "twa8",
        min_dBA: 70,
        max_dBA: 100,
        twa_8hr: 85,
      }),
    ],
    [
      "environment-heat",
      env("heat", {
        kind: "heat",
        point_id: "heat",
        location_desc: "ความร้อน",
        wbgt_type: "in",
        input_mode: "meter_average",
        workload: "light",
        start_at: inspection.start_at,
        end_at: "2026-10-12T03:00:00Z",
        wbgt_average: 34,
      }),
    ],
    [
      "environment-intervals",
      env("heat", {
        kind: "heat",
        point_id: "intervals",
        location_desc: "ช่วงวัด",
        wbgt_type: "out",
        input_mode: "calculated_intervals",
        workload: "heavy",
        start_at: inspection.start_at,
        end_at: "2026-10-12T03:00:00Z",
        intervals: [{ wb: 25, gt: 30, db: 28, minutes: 120 }],
      }),
    ],
  ]) {
    const leaf = (v, path) =>
      Object.entries(v).flatMap(([k, value]) =>
        value && typeof value === "object"
          ? leaf(value, path + "." + k)
          : [path + "." + k],
      );
    result.push({
      name,
      payload: p,
      required: [
        ...common,
        ...Object.keys(p.inspectionData).map((k) => "inspectionData." + k),
        "layout.file_id",
        ...leaf(p.units[0], "units.0"),
      ],
      optional: ["units.0.remark"],
    });
  }
  for (const group of ["environment", "health"]) {
    const p = {
      schema_version: 3,
      idempotency_key: key(),
      assessment_type: "satisfaction",
      assessment_group: group,
      assessment_category: "general",
      profile: { full_name: "ผู้ตอบความพึงพอใจ P8" },
      answers: scores(5, 16),
      ...(group === "health"
        ? {
            workInfo: {
              position_type: "student",
              program_code: "program-07",
              study_year: 6,
            },
          }
        : {
            durations: {
              traditional: { days: 1, hours: 2, minutes: 3, seconds: 4 },
              safecheck: { days: 0, hours: 0, minutes: 0, seconds: 1 },
            },
          }),
    };
    result.push({
      name: "satisfaction-" + group,
      payload: p,
      required: [
        ...common,
        "profile.full_name",
        ...answerPaths("", 16),
        ...(group === "health"
          ? [
              "workInfo.position_type",
              "workInfo.program_code",
              "workInfo.study_year",
            ]
          : ["traditional", "safecheck"].flatMap((m) =>
              ["days", "hours", "minutes", "seconds"].map(
                (u) => "durations." + m + "." + u,
              ),
            )),
      ],
      optional: ["suggestion"],
    });
  }
  const otherSat = structuredClone(result.at(-1));
  otherSat.name = "satisfaction-other-study";
  otherSat.payload.idempotency_key = key();
  otherSat.payload.workInfo = {
    position_type: "other",
    other_context: "study",
    program_code: "program-01",
    study_year: 1,
  };
  otherSat.required.push("workInfo.other_context");
  result.push(otherSat);
  return result;
}
export function setPath(obj, path, value, remove = false) {
  const keys = path.split("."),
    last = keys.pop(),
    parent = keys.reduce((v, k) => v[k], obj);
  if (remove) delete parent[last];
  else parent[last] = value;
}
