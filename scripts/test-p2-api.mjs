import { createRequire } from "node:module";
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const require = createRequire(resolve("worker/package.json"));
const { Miniflare, Log, LogLevel } = require("miniflare");
const esbuild = require("esbuild");
const temp = mkdtempSync(join(tmpdir(), "savecheck-p2-api-")),
  script = join(temp, "worker.mjs");
esbuild.buildSync({
  entryPoints: ["worker/src/index.ts"],
  bundle: true,
  platform: "browser",
  external: ["node:*"],
  format: "esm",
  outfile: script,
  logLevel: "silent",
});
const mf = new Miniflare({
  modulesRoot: temp,
  modules: [
    { type: "ESModule", path: script, contents: readFileSync(script, "utf8") },
  ],
  compatibilityDate: "2024-09-23",
  compatibilityFlags: ["nodejs_compat"],
  d1Databases: ["DB", "EMPTY_DB"],
  bindings: {
    ENVIRONMENT: "test",
    FRONTEND_URL: "http://localhost:3000",
    MAINTENANCE_TOKEN: "test-maintenance-only",
  },
  log: new Log(LogLevel.ERROR),
});
const db = await mf.getD1Database("DB");
const split = spawnSync(
  "python3",
  [
    "-c",
    `import sqlite3,json,sys
from pathlib import Path
scripts=[]
paths=sorted(Path('worker/src/db/migrations').glob('*.sql')); paths.insert(1,Path('worker/src/db/seed.sql'))
for p in paths:
 script=[]; buf=''
 for line in p.read_text().splitlines(True):
  buf+=line
  if sqlite3.complete_statement(buf):script.append(buf);buf=''
 if buf.strip() and not buf.strip().startswith('--'):raise ValueError(buf)
 scripts.append(script)
print(json.dumps(scripts))`,
  ],
  { encoding: "utf8" },
);
if (split.status !== 0) throw new Error(split.stderr);
for (const [index, statements] of JSON.parse(split.stdout).entries()) {
  await db.batch(statements.map((sql) => db.prepare(sql)));
  if (index === 1)
    await db
      .prepare(
        "UPDATE submissions SET has_layout=1,layout_file_name='legacy.png',layout_file_type='image/png',layout_file_size=12,layout_file_data=? WHERE id=2",
      )
      .bind("data:image/png;base64,iVBORw0KGgoAAAAA")
      .run();
}
let count = 0;
const checks = [];
async function check(label, fn) {
  await fn();
  count++;
  checks.push(label);
  console.log(`PASS ${count}: ${label}`);
}
async function call(path, body, method = "POST", extra = {}) {
  const res = await mf.dispatchFetch("http://local/api" + path, {
    method,
    headers: {
      Origin: "http://localhost:3000",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...extra,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Non-JSON ${res.status}: ${text}`);
  }
  return { status: res.status, json, headers: res.headers };
}
const get = (path) => call(path, undefined, "GET");
const key = () => crypto.randomUUID();
const answers = (n) =>
  Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [
      `q${i + 1}`,
      Math.max(0, Math.min(2, n - i * 2)),
    ]),
  );
const profile = {
  full_name: "ผู้ทดสอบ API จำลอง",
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
  inspector_name: "ผู้ตรวจ API จำลอง",
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
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
async function upload(uploadKey = key(), bytes = png, type = "image/png") {
  const res = await mf.dispatchFetch("http://local/api/files", {
    method: "POST",
    headers: {
      Origin: "http://localhost:3000",
      "Content-Type": type,
      "X-File-Name": encodeURIComponent("ผังทดสอบ.png"),
      "Idempotency-Key": uploadKey,
    },
    body: bytes,
  });
  return { status: res.status, json: await res.json() };
}
let file, environmentCode, revisionId, healthCode;
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
try {
  await check(
    "upload validates MIME, preserves staged file and retries by hash",
    async () => {
      const id = key(),
        r = await upload(id);
      assert.equal(r.status, 201, JSON.stringify(r.json));
      file = r.json.data.file_id;
      const retry = await upload(id);
      assert.equal(retry.json.data.file_id, file);
      assert.equal((await upload(id, new Uint8Array([...png, 1]))).status, 409);
      assert.equal((await upload(key(), png, "text/html")).status, 415);
    },
  );
  await check(
    "health before/after saved with server score, profile, program and all 20 answers",
    async () => {
      const r = await call("/submissions", health());
      assert.equal(r.status, 201, JSON.stringify(r.json));
      healthCode = r.json.data.submission_code;
      assert.equal(r.json.data.result.after_total, 4);
      assert.equal(r.json.data.result.delta, 2);
      const result = await get("/results/" + healthCode);
      assert.equal(result.json.data.workInfo.study_year, 6);
      assert.equal(result.json.data.resolved.program.code, "program-07");
      const total = await db
        .prepare(
          "SELECT COUNT(*) n FROM health_risk_answers WHERE submission_id=?",
        )
        .bind(r.json.data.id)
        .first();
      assert.equal(total.n, 20);
    },
  );
  await check(
    "invalid fields, fake overall score, malformed JSON and old payload rejected without writes",
    async () => {
      const before = await db
        .prepare("SELECT COUNT(*) n FROM submissions")
        .first();
      const fake = { ...health(), overall_score: 0 };
      assert.equal((await call("/submissions", fake)).status, 400);
      assert.equal(
        (
          await call("/submissions", {
            ...health(),
            profile: { ...profile, weight: "" },
          })
        ).status,
        400,
      );
      const malformed = await mf.dispatchFetch("http://local/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{bad",
      });
      assert.equal(malformed.status, 400);
      assert.equal(
        (
          await call("/submissions", {
            assessment_type: "health_risk",
            assessment_category: "light",
          })
        ).status,
        400,
      );
      const after = await db
        .prepare("SELECT COUNT(*) n FROM submissions")
        .first();
      assert.equal(before.n, after.n);
    },
  );
  await check(
    "satisfaction both groups, optional notes and manual duration persist",
    async () => {
      for (const group of ["health", "environment"]) {
        const r = await call("/submissions", satisfaction(group));
        assert.equal(r.status, 201, JSON.stringify(r.json));

        const result = (await get("/results/" + r.json.data.submission_code))
          .json.data;
        assert.equal(result.assessment_group, group);
        assert.equal(result.suggestion, null);
        if (group === "environment")
          assert.equal(result.result.durations.traditional_seconds, 93784);
      }
    },
  );
  await check(
    "noise/heat health, Area, noise exposure/TWA8 and WBGT environment all create/read",
    async () => {
      const area = {
        kind: "light_area",
        point_id: "area",
        location_desc: "Area",
        standard_code: "area-office",
        samples: [
          { sample_id: "a", lux: 100 },
          { sample_id: "b", lux: 350 },
          { sample_id: "c", lux: 450 },
        ],
      };
      const noise = {
        kind: "noise",
        point_id: "noise",
        location_desc: "noise",
        min_dBA: 70,
        max_dBA: 95,
        evaluation_basis: "exposure-duration",
        exposure_level_dBA: 88,
        exposure_duration_minutes: 240,
      };
      const heat = {
        kind: "heat",
        point_id: "heat",
        location_desc: "heat",
        wbgt_type: "in",
        input_mode: "meter_average",
        workload: "moderate",
        start_at: inspection.start_at,
        end_at: "2026-10-12T03:00:00Z",
        wbgt_average: 32,
      };
      for (const p of [
        health("noise"),
        health("heat"),
        environment([area], "light", "area"),
        environment([noise], "noise"),
        environment(
          [
            {
              ...noise,
              evaluation_basis: "twa8",
              exposure_level_dBA: undefined,
              exposure_duration_minutes: undefined,
              twa_8hr: 85.1,
            },
          ],
          "noise",
        ),
        environment([heat], "heat"),
      ]) {
        const r = await call("/submissions", p);
        assert.equal(r.status, 201, JSON.stringify(r.json));
        assert.equal(
          (await get("/results/" + r.json.data.submission_code)).status,
          200,
        );
      }
    },
  );
  await check(
    "environment atomic create and idempotent retry, file committed with revision snapshot",
    async () => {
      const p = environment([spot("A", 500), spot("B", 400), spot("C", 400)]),
        r = await call("/submissions", p);
      assert.equal(r.status, 201, JSON.stringify(r.json));
      environmentCode = r.json.data.submission_code;
      revisionId = r.json.data.revision_id;
      const again = await call("/submissions", p);
      assert.equal(again.json.data.id, r.json.data.id);
      assert.equal(
        (await call("/submissions", { ...p, units: [spot("A", 1)] })).status,
        409,
      );
      const row = await db
        .prepare("SELECT state FROM assessment_files WHERE id=?")
        .bind(file)
        .first();
      assert.equal(row.state, "committed");
    },
  );
  const retest = (base, updates) => ({
    schema_version: 3,
    idempotency_key: key(),
    base_revision_id: base,
    inspection_date: "2026-10-13",
    start_at: "2026-10-13T01:00:00Z",
    end_at: "2026-10-13T04:00:00Z",
    updates,
  });
  await check(
    "locked fields, omitted failed points and foreign revisions cannot retest",
    async () => {
      for (const p of [
        retest(revisionId, [{ kind: "light_spot", point_id: "B", lux: 500 }]),
        retest(revisionId, [
          {
            kind: "light_spot",
            point_id: "B",
            lux: 500,
            standard_target_lux: 100,
          },
          { kind: "light_spot", point_id: "C", lux: 500 },
        ]),
        retest("other-job-revision", [
          { kind: "light_spot", point_id: "B", lux: 500 },
          { kind: "light_spot", point_id: "C", lux: 500 },
        ]),
      ])
        assert(
          [400, 409].includes(
            (await call(`/submissions/${environmentCode}/retests`, p)).status,
          ),
        );
    },
  );
  await check(
    "failed-only retest produces latest r2 then r3 and preserves r1/per-point dates",
    async () => {
      const p = retest(revisionId, [
        { kind: "light_spot", point_id: "B", lux: 500 },
        { kind: "light_spot", point_id: "C", lux: 450 },
      ]);
      const r2 = await call(`/submissions/${environmentCode}/retests`, p);
      assert.equal(r2.status, 201, JSON.stringify(r2.json));
      assert.equal(
        (await call(`/submissions/${environmentCode}/retests`, p)).json.data
          .revision_id,
        r2.json.data.revision_id,
      );
      const latest = (await get("/results/" + environmentCode)).json.data;
      assert.equal(
        latest.revision.observations[0].carried_from_revision_id,
        revisionId,
      );
      assert.equal(
        latest.revision.observations[0].measured_at,
        inspection.start_at,
      );
      const r3 = await call(
        `/submissions/${environmentCode}/retests`,
        retest(r2.json.data.revision_id, [
          { kind: "light_spot", point_id: "C", lux: 500 },
        ]),
      );
      assert.equal(r3.status, 201, JSON.stringify(r3.json));
      assert(r3.json.data.result.is_pass);
      const old = (
        await get(`/results/${environmentCode}?revision=${revisionId}`)
      ).json.data;
      assert.equal(old.units[1].lux, 400);
      assert.equal(
        (
          await call(
            `/submissions/${environmentCode}/retests`,
            retest(r3.json.data.revision_id, [
              { kind: "light_spot", point_id: "C", lux: 500 },
            ]),
          )
        ).status,
        409,
      );
    },
  );
  await check(
    "concurrent writers from one base allow exactly one revision and retries do not branch",
    async () => {
      const made = await call("/submissions", environment([spot("race", 400)])),
        code = made.json.data.submission_code,
        base = made.json.data.revision_id;
      const [a, b] = await Promise.all([
        call(
          `/submissions/${code}/retests`,
          retest(base, [{ kind: "light_spot", point_id: "race", lux: 450 }]),
        ),
        call(
          `/submissions/${code}/retests`,
          retest(base, [{ kind: "light_spot", point_id: "race", lux: 460 }]),
        ),
      ]);
      assert.deepEqual(
        [a.status, b.status].sort(),
        [201, 409],
        JSON.stringify([a, b]),
      );
      const h = (await get(`/submissions/${code}/revisions`)).json.data;
      assert.equal(h.total, 2);
    },
  );
  await check(
    "failure inside batch leaves no header/children/payload/idempotency residue",
    async () => {
      await db
        .prepare(
          "CREATE TRIGGER test_fail BEFORE INSERT ON health_risk_answers WHEN NEW.score=2 BEGIN SELECT RAISE(ABORT,'test failure'); END",
        )
        .run();
      const before = await db
        .prepare("SELECT COUNT(*) n FROM submissions")
        .first();
      const request = health("heat");
      const r = await call("/submissions", request);
      assert.equal(r.status, 500);
      assert.equal(
        (await db.prepare("SELECT COUNT(*) n FROM submissions").first()).n,
        before.n,
      );
      assert.equal(
        (
          await db
            .prepare(
              "SELECT COUNT(*) n FROM mutation_requests WHERE idempotency_key=?",
            )
            .bind(request.idempotency_key)
            .first()
        ).n,
        0,
      );
      await db.prepare("DROP TRIGGER test_fail").run();
    },
  );
  await check(
    "generic overwrite/layout routes rejected and corrections keep immutable data versions",
    async () => {
      assert.equal(
        (await call("/submissions/" + healthCode, health(), "PATCH")).status,
        409,
      );
      assert.equal(
        (await call("/submissions/" + environmentCode + "/layout", {}, "PATCH"))
          .status,
        409,
      );
      const request = {
        schema_version: 3,
        idempotency_key: key(),
        expected_data_version: 1,
        reason: "แก้ชื่อที่กรอกผิด",
        payload: {
          ...health(),
          profile: { ...profile, full_name: "ชื่อแก้ไข จำลอง" },
        },
      };
      const corrected = await call(
        `/submissions/${healthCode}/corrections`,
        request,
      );
      assert.equal(corrected.status, 201, JSON.stringify(corrected.json));
      assert.equal(
        (await get(`/results/${healthCode}?version=1`)).json.data.profile
          .full_name,
        profile.full_name,
      );
      assert.equal(
        (await get("/results/" + healthCode)).json.data.profile.full_name,
        "ชื่อแก้ไข จำลอง",
      );
      assert.equal(
        (
          await call(`/submissions/${healthCode}/corrections`, {
            ...request,
            idempotency_key: key(),
          })
        ).status,
        409,
      );
    },
  );
  await check(
    "archive/restore/delete retired without changing saved revisions",
    async () => {
      const before = (await get("/results/" + environmentCode)).json.data;
      for (const [method, suffix] of [
        ["DELETE", ""],
        ["POST", "/archive"],
        ["POST", "/restore"],
      ]) {
        assert.equal(
          (await call(`/submissions/${environmentCode}${suffix}`, {}, method))
            .status,
          410,
        );
      }
      assert.deepEqual(
        (await get("/results/" + environmentCode)).json.data,
        before,
      );
      assert(
        (await get("/dashboard/submissions?limit=100")).json.data.items.some(
          (x) => x.submission_code === environmentCode,
        ),
      );
    },
  );
  await check(
    "dashboard and export distinguish latest jobs, revisions, groups and filter validation",
    async () => {
      const list = (
        await get("/dashboard/submissions?group=environment&limit=100")
      ).json.data;
      assert(list.items.every((x) => x.assessment_group === "environment"));
      const summary = (await get("/dashboard/summary")).json.data;
      assert(summary.total_environment_revisions > summary.by_type.environment);
      assert.equal(summary.satisfaction_avg_by_group.environment, 5);
      const exported = (
        await get(
          "/dashboard/export-data?group=health&revision_scope=latest&limit=100",
        )
      ).json.data;
      assert(exported.records.every((x) => x.assessment_group === "health"));
      assert.equal((await get("/dashboard/submissions?limit=-1")).status, 400);
      assert.equal(
        (await get("/dashboard/submissions?start_date=2026-02-30")).status,
        400,
      );
      assert.equal(
        (await get(`/results/${environmentCode}?revision=foreign`)).status,
        404,
      );
    },
  );
  await check(
    "CORS exact allowlist rejects arbitrary Pages/localhost substrings",
    async () => {
      const yes = await get("/health");
      assert.equal(
        yes.headers.get("Access-Control-Allow-Origin"),
        "http://localhost:3000",
      );
      for (const origin of [
        "https://evil.pages.dev",
        "https://localhost.attacker.example",
        "https://attacker.example",
      ]) {
        const r = await call("/health", undefined, "GET", { Origin: origin });
        assert.equal(r.status, 403);
        assert(!r.headers.get("Access-Control-Allow-Origin"));
      }
      const preflight = await call("/submissions", undefined, "OPTIONS", {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      });
      assert.equal(preflight.status, 204);
    },
  );
  await check(
    "files download, committed metadata lock and orphan cleanup never remove referenced object",
    async () => {
      const download = await mf.dispatchFetch("http://local/api/files/" + file);
      assert.equal(download.status, 200);
      assert.equal(download.headers.get("X-Content-Type-Options"), "nosniff");
      const orphan = await upload();
      const f = orphan.json.data.file_id;
      await db
        .prepare(
          "UPDATE assessment_files SET created_at='2020-01-01T00:00:00Z' WHERE id=?",
        )
        .bind(f)
        .run();
      assert.equal((await call("/files/cleanup", {})).status, 401);
      const cleaned = await call("/files/cleanup", {}, "POST", {
        Authorization: "Bearer test-maintenance-only",
      });
      assert.equal(cleaned.status, 200);
      assert.equal(cleaned.json.data.cleaned, 1);
      assert.equal(
        (await mf.dispatchFetch("http://local/api/files/" + f)).status,
        404,
      );
      assert.equal(
        (await mf.dispatchFetch("http://local/api/files/" + file)).status,
        200,
      );
    },
  );
  await check(
    "legacy questionnaires remain readable with zero answers and unknown satisfaction group",
    async () => {
      const h = (await get("/results/SUB-20260903-3003")).json.data;
      assert.equal(h.schema_version, 1);
      assert.equal(h.answers.q5, 0);
      assert.equal(h.legacy.answer_phase, "single");
      assert(!h.answers.before);
      const sat = (await get("/results/SUB-20260904-4004")).json.data;
      assert.equal(sat.assessment_group, "unknown");
      assert.equal(
        Object.keys(sat.answers).filter((k) => k.startsWith("q")).length,
        8,
      );
      const env = (await get("/results/SUB-20260901-1001")).json.data;
      assert.equal(env.answers.light_areas[0].measure, 540);
      assert(env.needs_legacy_upgrade);
    },
  );
  await check(
    "legacy supplement records adoption once, preserves old revision and enables failed-only retest",
    async () => {
      const code = "SUB-20260902-2002",
        old = (await get("/results/" + code)).json.data,
        source = old.revision.id;
      const units = old.revision.points.map((p) => {
        const input = JSON.parse(p.inputs_json);
        return {
          kind: "noise",
          point_id: p.point_key,
          location_desc: p.location_desc,
          evaluation_basis: "twa8",
          min_dBA: input.min_value,
          max_dBA: input.max_value,
          twa_8hr: input.measure_value,
        };
      });
      const data = old.inspectionData;
      const req = {
        schema_version: 3,
        idempotency_key: key(),
        reason: "ตรวจเอกสารเครื่องมือและยืนยันว่าเป็น TWA 8 ชั่วโมงเดิม",
        base_revision_id: source,
        inspectionData: {
          inspector_name: data.inspector_name,
          position: data.position,
          inspection_location: data.inspection_location,
          inspection_date: data.inspection_date,
          equipment: data.equipment,
          serial_number: "LEGACY-001",
          calibration_date: "2026-09-01",
          responsible_department: "ฝ่ายเดิม",
          location_responsible_name: "ผู้รับผิดชอบเดิม",
          start_at: "2026-09-02T06:30:00Z",
          end_at: "2026-09-02T07:15:00Z",
        },
        units,
      };
      const upgraded = await call(
        `/submissions/${code}/metadata-supplement`,
        req,
      );
      assert.equal(upgraded.status, 201, JSON.stringify(upgraded.json));
      assert.equal(
        (await call(`/submissions/${code}/metadata-supplement`, req)).json.data
          .revision_id,
        upgraded.json.data.revision_id,
      );
      assert.equal(
        (
          await call(`/submissions/${code}/metadata-supplement`, {
            ...req,
            idempotency_key: key(),
          })
        ).status,
        409,
      );
      const latest = (await get("/results/" + code)).json.data;
      assert.equal(latest.schema_version, 3);
      assert(latest.can_retest);
      assert.equal(latest.revision.observations[1].observation_kind, "carried");
      const oldAgain = (await get(`/results/${code}?revision=${source}`)).json
        .data;
      assert.equal(oldAgain.schema_version, 1);
      assert.equal(oldAgain.answers.noise_areas[0].avg_dBA, 89.5);
      assert(!oldAgain.needs_legacy_upgrade);
      const updated = await call(
        `/submissions/${code}/retests`,
        retest(upgraded.json.data.revision_id, [
          {
            kind: "noise",
            point_id: units[0].point_id,
            min_dBA: 70,
            max_dBA: 90,
            twa_8hr: 84,
          },
        ]),
      );
      assert.equal(updated.status, 201, JSON.stringify(updated.json));
      assert(updated.json.data.result.is_pass);
      assert.equal(
        (await get(`/submissions/${code}/audit`)).json.data.filter(
          (a) => a.action === "supplement",
        ).length,
        1,
      );
    },
  );
  await check(
    "environment correction creates audit revision and keeps previous result snapshot intact",
    async () => {
      const latest = (await get("/results/" + environmentCode)).json.data;
      const req = {
        schema_version: 3,
        idempotency_key: key(),
        reason: "แก้ชื่อผู้รับผิดชอบที่พิมพ์ผิด",
        expected_data_version: latest.data_version,
        base_revision_id: latest.revision.revision_id,
        payload: environment(latest.units),
      };
      req.payload.inspectionData = {
        ...latest.inspectionData,
        location_responsible_name: "ชื่อแก้ไข จำลอง",
      };
      const r = await call(`/submissions/${environmentCode}/corrections`, req);
      assert.equal(r.status, 201, JSON.stringify(r.json));
      const previous = (
        await get(
          `/results/${environmentCode}?revision=${latest.revision.revision_id}`,
        )
      ).json.data;
      assert.equal(
        previous.inspectionData.location_responsible_name,
        inspection.location_responsible_name,
      );
      const after = (await get("/results/" + environmentCode)).json.data;
      assert.equal(
        after.inspectionData.location_responsible_name,
        "ชื่อแก้ไข จำลอง",
      );
      const illegal = {
        ...req,
        idempotency_key: key(),
        expected_data_version: after.data_version,
        base_revision_id: after.revision.revision_id,
        payload: {
          ...req.payload,
          units: req.payload.units.map((u) => ({
            ...u,
            standard_target_lux: 400,
          })),
        },
      };
      assert.equal(
        (await call(`/submissions/${environmentCode}/corrections`, illegal))
          .status,
        400,
      );
    },
  );
  await check(
    "D1-only uploads work without R2; unapplied schema returns actionable 503",
    async () => {
      const app = (await import(pathToFileURL(script).href)).default;
      const before = (
        await db.prepare("SELECT COUNT(*) n FROM assessment_files").first()
      ).n;
      const noFiles = await app.fetch(
        new Request("http://local/api/files", {
          method: "POST",
          headers: {
            "Content-Type": "image/png",
            "X-File-Name": "layout.png",
            "Idempotency-Key": key(),
          },
          body: png,
        }),
        { DB: db, FRONTEND_URL: "http://localhost:3000" },
      );
      assert.equal(noFiles.status, 201);
      assert.equal(
        (await db.prepare("SELECT COUNT(*) n FROM assessment_files").first()).n,
        before + 1,
      );
      const empty = await mf.getD1Database("EMPTY_DB");
      const request = new Request("http://local/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(health()),
      });
      const response = await app.fetch(request, { DB: empty });
      assert.equal(response.status, 503);
      assert.equal((await response.json()).error.code, "SCHEMA_NOT_READY");
    },
  );
  await check(
    "D1 chunks preserve 10 MB files, concurrent retries and immutable bytes",
    async () => {
      const bytes = new Uint8Array(10 * 1024 * 1024);
      bytes.set(png);
      for (let i = png.length; i < bytes.length; i++) bytes[i] = i % 251;
      const id = key();
      // Exercise full-size transport separately from concurrent small requests;
      // Miniflare's Node HTTP bridge intermittently closes a second 10 MB body.
      // Cloudflare concurrency at the full limit is checked by test-p9-staging.
      const a = await upload(id, bytes);
      const b = await upload(id, bytes);
      assert.equal(a.status, 201);
      assert.equal(b.status, 201);
      assert.equal(a.json.data.file_id, b.json.data.file_id);
      const concurrentKey = key();
      const [c, d] = await Promise.all([
        upload(concurrentKey),
        upload(concurrentKey),
      ]);
      assert.equal(c.status, 201);
      assert.equal(d.status, 201);
      assert.equal(c.json.data.file_id, d.json.data.file_id);
      const response = await mf.dispatchFetch(
        `http://local${a.json.data.download_url}`,
      );
      assert.equal(response.status, 200);
      assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
      const row = await db
        .prepare("SELECT object_key FROM assessment_files WHERE id=?")
        .bind(a.json.data.file_id)
        .first();
      const chunks = await db
        .prepare(
          "SELECT COUNT(*) n, MAX(length(bytes)) largest FROM assessment_file_chunks WHERE object_key=?",
        )
        .bind(row.object_key)
        .first();
      assert.equal(chunks.n, 20);
      assert.equal(chunks.largest, 512 * 1024);
      await assert.rejects(
        db
          .prepare(
            "UPDATE assessment_file_chunks SET bytes=x'00' WHERE object_key=?",
          )
          .bind(row.object_key)
          .run(),
      );
      await assert.rejects(
        db
          .prepare("DELETE FROM assessment_file_chunks WHERE object_key=?")
          .bind(row.object_key)
          .run(),
      );
    },
  );
  await check(
    "interrupted D1 upload stays unavailable and retries repair missing chunks",
    async () => {
      const app = (await import(pathToFileURL(script).href)).default;
      const bytes = new Uint8Array(1536 * 1024);
      bytes.set(png);
      const uploadKey = key();
      let batches = 0;
      const faulty = new Proxy(db, {
        get(target, name) {
          if (name === "batch")
            return async (statements) => {
              if (++batches === 2)
                throw new Error("Injected upload interruption");
              return target.batch(statements);
            };
          const value = Reflect.get(target, name);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
      const failed = await app.fetch(
        new Request("http://local/api/files", {
          method: "POST",
          headers: {
            "Content-Type": "image/png",
            "X-File-Name": encodeURIComponent("ผังทดสอบ.png"),
            "Idempotency-Key": uploadKey,
          },
          body: bytes,
        }),
        { DB: faulty },
      );
      assert.equal(failed.status, 500);
      const staged = await db
        .prepare(
          "SELECT id,object_key FROM assessment_files WHERE upload_idempotency_key=?",
        )
        .bind(uploadKey)
        .first();
      assert.equal(
        (
          await db
            .prepare(
              "SELECT COUNT(*) n FROM assessment_file_chunks WHERE object_key=?",
            )
            .bind(staged.object_key)
            .first()
        ).n,
        2,
      );
      const unavailable = await mf.dispatchFetch(
        "http://local/api/files/" + staged.id,
      );
      assert.equal(unavailable.status, 503);
      const repaired = await upload(uploadKey, bytes);
      assert.equal(repaired.status, 201);
      assert.equal(repaired.json.data.file_id, staged.id);
      const complete = await mf.dispatchFetch(
        "http://local/api/files/" + staged.id,
      );
      assert.deepEqual(new Uint8Array(await complete.arrayBuffer()), bytes);
    },
  );
  await check(
    "release maintenance blocks reads and writes before touching D1",
    async () => {
      const app = (await import(pathToFileURL(script).href)).default;
      for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
        const response = await app.fetch(
          new Request("http://local/api/submissions", { method }),
          {
            RELEASE_MAINTENANCE: "1",
          },
        );
        assert.equal(response.status, 503);
        assert.equal(response.headers.get("Retry-After"), "120");
        assert.equal((await response.json()).error.code, "RELEASE_MAINTENANCE");
      }
    },
  );
  await check(
    "same-key concurrent create replays one job and rejects changed payload",
    async () => {
      const p = health("noise");
      const [a, b] = await Promise.all([
        call("/submissions", p),
        call("/submissions", p),
      ]);
      assert.equal(a.status, 201);
      assert.equal(b.status, 201);
      assert.equal(a.json.data.submission_code, b.json.data.submission_code);
      assert.equal(
        (
          await db
            .prepare(
              "SELECT COUNT(*) n FROM mutation_requests WHERE scope='create' AND idempotency_key=?",
            )
            .bind(p.idempotency_key)
            .first()
        ).n,
        1,
      );
      assert.equal(
        (
          await call("/submissions", {
            ...p,
            profile: { ...p.profile, full_name: "changed" },
          })
        ).status,
        409,
      );
    },
  );
  await check(
    "history export has explicit revision pagination without dropping older rounds",
    async () => {
      const url =
        "/dashboard/export-data?search=" +
        environmentCode +
        "&revision_scope=history&revision_limit=1";
      const first = (await get(url)).json.data;
      assert.equal(first.records.length, 1);
      assert.equal(first.revision_pages[0].next_page, 2);
      const second = (await get(url + "&revision_page=2")).json.data;
      assert.equal(second.records.length, 1);
      assert.notEqual(
        first.records[0].revision.revision_id,
        second.records[0].revision.revision_id,
      );
      assert.equal((await get(url + "&revision_page=0")).status, 400);
    },
  );
  await check(
    "legacy layout returns original bytes before and after upgrade without rewriting snapshot",
    async () => {
      const old = await get(
        "/results/SUB-20260902-2002?revision=legacy-revision-2",
      );
      const download = await mf.dispatchFetch(
        "http://local" + old.json.data.layout_snapshot.download_url,
      );
      assert.equal(download.status, 200);
      assert.equal(
        download.headers.get("Content-Type"),
        "application/octet-stream",
      );
      assert.deepEqual(new Uint8Array(await download.arrayBuffer()), png);
      assert.equal(
        (await mf.dispatchFetch("http://local/api/files/legacy/missing"))
          .status,
        404,
      );
    },
  );
  await check(
    "oversized JSON and layout streams fail before persistence",
    async () => {
      const before = (
        await db.prepare("SELECT COUNT(*) n FROM assessment_files").first()
      ).n;
      assert.equal(
        (await upload(key(), new Uint8Array(10 * 1024 * 1024 + 1))).status,
        413,
      );
      assert.equal(
        (await db.prepare("SELECT COUNT(*) n FROM assessment_files").first()).n,
        before,
      );
      const r = await mf.dispatchFetch("http://local/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "x".repeat(512 * 1024) }),
      });
      assert.equal(r.status, 413);
    },
  );
  assert.equal(
    (await db.prepare("PRAGMA foreign_key_check").all()).results.length,
    0,
  );
  assert.equal(
    (await db.prepare("SELECT COUNT(*) n FROM mutation_preconditions").first())
      .n,
    0,
  );
  writeFileSync(
    "docs/v3/baseline/p2-api-tests.json",
    JSON.stringify(
      {
        date: "2026-10-12",
        runtime: "Miniflare/workerd local D1 + R2",
        passed: count,
        checks,
        foreign_key_violations: 0,
        remote: false,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `P2 API integration PASS: ${count} scenarios; isolated runtime ${temp}`,
  );
} finally {
  await mf.dispose();
}
