import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
const api = process.env.SAFECHECK_P9_API;
assert.equal(
  api,
  "https://save-check-api-p9.ameenahroya.workers.dev/api",
  "Write smoke tests must use staging only",
);
const origin = "https://p9.save-check.pages.dev";
const key = () => crypto.randomUUID();
const checks = [];
const records = [];
async function request(path, body, method = "POST") {
  const r = await fetch(api + path, {
    method,
    headers: {
      Origin: origin,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await r.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error("HTTP " + r.status + " non-JSON " + path);
  }
  assert.equal(r.status, method === "GET" ? 200 : 201, JSON.stringify(result));
  return result.data;
}
const get = (path) => request(path, undefined, "GET");
let file;
const answers = (n) =>
  Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [
      `q${i + 1}`,
      Math.max(0, Math.min(2, n - i * 2)),
    ]),
  );
const profile = {
  full_name: "P9 staging test",
  gender: "other",
  age: 22,
  weight: 60,
  height: 170,
  education_level: "bachelor",
  marital_status: "single",
  has_underlying_disease: false,
};
const workInfo = {
  position_type: "student",
  program_code: "program-07",
  study_year: 6,
  working_hours_per_day: 8,
  working_hours_per_week: 40,
};
const inspection = {
  inspector_name: "P9 first inspector",
  position: "ผู้ตรวจ",
  inspection_location: "พื้นที่ API จำลอง",
  inspection_date: "2026-10-12",
  start_at: "2026-10-12T01:00:00Z",
  end_at: "2026-10-12T04:00:00Z",
  equipment: "meter",
  serial_number: "001",
  calibration_date: "2026-10-01",
  responsible_department: "ฝ่ายทดสอบ",
  location_responsible_name: "ผู้รับผิดชอบ",
};
const environment = (units, category = "light", technique = "spot") => ({
  schema_version: 3,
  idempotency_key: key(),
  assessment_type: "environment",
  assessment_group: "environment",
  assessment_category: category,
  inspectionData: {
    ...inspection,
    ...(category === "light" ? { measurement_technique: technique } : {}),
  },
  layout: { file_id: file },
  units,
});
const spot = (id, lux) => ({
  kind: "light_spot",
  point_id: id,
  location_desc: id,
  standard_code: "spot-office",
  standard_target_lux: 500,
  lux,
});
const health = (category = "light") => ({
  schema_version: 3,
  idempotency_key: key(),
  assessment_type: "health_risk",
  assessment_group: "health",
  assessment_category: category,
  profile,
  workInfo,
  ...(category === "light"
    ? {
        healthContext: { hours_worked_today: 0 },
        answers: { before: answers(2), after: answers(4) },
      }
    : category === "noise"
      ? {
          healthContext: { noise_sources: ["none"] },
          answers: { single: answers(0) },
        }
      : { answers: { single: answers(14) } }),
});
const satisfaction = (group = "health") => ({
  schema_version: 3,
  idempotency_key: key(),
  assessment_type: "satisfaction",
  assessment_group: group,
  assessment_category: "general",
  profile: { full_name: profile.full_name },
  answers: Object.fromEntries(
    Array.from({ length: 16 }, (_, i) => [`q${i + 1}`, 5]),
  ),
  ...(group === "health"
    ? {
        workInfo: {
          position_type: "student",
          program_code: "program-06",
          study_year: 6,
        },
      }
    : {
        durations: {
          traditional: { days: 1, hours: 2, minutes: 3, seconds: 4 },
          safecheck: { days: 0, hours: 0, minutes: 1, seconds: 0 },
        },
      }),
});

const bytes = new Uint8Array(10 * 1024 * 1024);
bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
for (let i = 8; i < bytes.length; i++) bytes[i] = i % 251;
const uploadKey = key();
async function upload() {
  const r = await fetch(api + "/files", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "image/png",
      "X-File-Name": "P9-staging-10MB.png",
      "Idempotency-Key": uploadKey,
    },
    body: bytes,
  });
  const text = await r.text();
  assert.equal(r.status, 201, "upload " + text);
  return JSON.parse(text).data;
}
const [receipt, concurrentReceipt] = await Promise.all([upload(), upload()]);
assert.equal(receipt.file_id, concurrentReceipt.file_id);
file = receipt.file_id;
assert.equal((await upload()).file_id, file);
const download = await fetch(new URL(receipt.download_url, api));
assert.equal(download.status, 200);
assert.equal(
  createHash("sha256")
    .update(new Uint8Array(await download.arrayBuffer()))
    .digest("hex"),
  createHash("sha256").update(bytes).digest("hex"),
);
checks.push("Cloudflare D1-only 10MB upload, retry and exact-byte download");
console.log("PASS " + checks.at(-1));
const flows = [
  environment([spot("spot", 100)]),
  environment(
    [
      {
        kind: "light_area",
        point_id: "area",
        location_desc: "P9 area",
        standard_code: "area-office",
        average_lux: 300,
        minimum_lux: 150,
      },
    ],
    "light",
    "area",
  ),
  environment(
    [
      {
        kind: "noise",
        point_id: "noise",
        location_desc: "P9 noise",
        min_dBA: 70,
        max_dBA: 95,
        evaluation_basis: "exposure-duration",
        exposure_level_dBA: 88,
        exposure_duration_minutes: 240,
      },
    ],
    "noise",
  ),
  environment(
    [
      {
        kind: "heat",
        point_id: "heat",
        location_desc: "P9 heat",
        wbgt_type: "in",
        input_mode: "meter_average",
        workload: "moderate",
        start_at: inspection.start_at,
        end_at: "2026-10-12T03:00:00Z",
        wbgt_average: 32,
      },
    ],
    "heat",
  ),
  health("light"),
  health("noise"),
  health("heat"),
  satisfaction("environment"),
  satisfaction("health"),
];
for (const payload of flows) {
  const created = await request("/submissions", payload);
  const repeat = await request("/submissions", payload);
  assert.equal(repeat.submission_code, created.submission_code);
  const stored = await get("/results/" + created.submission_code);
  assert.equal(stored.schema_version, 3);
  assert.equal(stored.assessment_type, payload.assessment_type);
  records.push(stored);
  checks.push(
    payload.assessment_type +
      "/" +
      payload.assessment_category +
      "/" +
      (payload.inspectionData?.measurement_technique ??
        payload.assessment_group),
  );
  console.log("PASS " + checks.at(-1));
}
const original = records[0];
const round = await request(
  "/submissions/" + original.submission_code + "/retests",
  {
    schema_version: 3,
    idempotency_key: key(),
    base_revision_id: original.revision.revision_id,
    inspection_date: "2026-10-13",
    start_at: "2026-10-13T01:00:00Z",
    end_at: "2026-10-13T04:00:00Z",
    inspectionData: {
      ...inspection,
      inspection_date: "2026-10-13",
      start_at: "2026-10-13T01:00:00Z",
      end_at: "2026-10-13T04:00:00Z",
      inspector_name: "P9 second inspector",
      measurement_technique: "spot",
    },
    updates: [{ kind: "light_spot", point_id: "spot", lux: 600 }],
  },
);
const latest = await get("/results/" + original.submission_code);
assert.equal(round.revision_id, latest.revision.revision_id);
const old = await get(
  "/results/" +
    original.submission_code +
    "?revision=" +
    original.revision.revision_id,
);
assert.equal(old.units[0].lux, 100);
assert.equal(latest.units[0].lux, 600);
assert.equal(old.inspectionData.inspector_name, "P9 first inspector");
assert.equal(latest.inspectionData.inspector_name, "P9 second inspector");
assert.equal(latest.layout.file_id, file);
assert.equal(old.layout.file_id, file);
checks.push(
  "Retest retains original inspector, values, dates and attached file",
);
console.log("PASS " + checks.at(-1));
const cors = await fetch(api + "/health", {
  headers: { Origin: "https://invalid.example" },
});
assert.equal(cors.status, 403);
const preflight = await fetch(api + "/files", {
  method: "OPTIONS",
  headers: { Origin: origin, "Access-Control-Request-Method": "POST" },
});
assert.equal(preflight.status, 204);
assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), origin);
const dashboard = await get("/dashboard/submissions");
assert.ok(dashboard.total >= records.length);
checks.push("Dashboard and CORS read/preflight pass");
writeFileSync(
  "docs/v3/baseline/p9-staging-api.json",
  JSON.stringify(
    {
      date: new Date().toISOString(),
      api,
      passed: true,
      checks,
      codes: records.map((r) => r.submission_code),
    },
    null,
    2,
  ),
);
writeFileSync(
  ".wrangler/p9-backup-20261016/staging-results.json",
  JSON.stringify({ records, old, latest }),
);
console.log("P9 staging PASS " + checks.length);
