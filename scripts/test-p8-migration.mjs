import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const root = process.cwd(),
  temp = mkdtempSync(join(tmpdir(), "safecheck-p8-rehearsal-")),
  persist = join(temp, "legacy"),
  restore = join(temp, "restore"),
  partial = join(temp, "partial"),
  drift = join(temp, "drift"),
  wrangler = resolve("worker/node_modules/wrangler/bin/wrangler.js");
const legacy = [
    "submissions",
    "respondent_profiles",
    "respondent_work_infos",
    "environment_inspections",
    "environment_measurement_points",
    "health_risk_answers",
    "satisfaction_answers",
    "assessment_results",
  ],
  checks = [];
function run(args, dir = persist, json = false) {
  const r = spawnSync(
    process.execPath,
    [
      wrangler,
      ...args,
      "--local",
      "--persist-to",
      dir,
      "--config",
      resolve("worker/wrangler.toml"),
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
      timeout: 120000,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  return json ? JSON.parse(r.stdout) : r.stdout;
}
const query = (sql, dir = persist) =>
  run(
    ["d1", "execute", "save-check-db", "--command", sql, "--json"],
    dir,
    true,
  );
const file = (path, dir = persist) =>
  run(
    ["d1", "execute", "save-check-db", "--file", resolve(path), "--json"],
    dir,
    true,
  );
function migrate(dir = persist, expected = true) {
  const r = spawnSync(
    process.execPath,
    ["scripts/d1-migrate.mjs", "--local", "--persist-to", dir],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
      timeout: 120000,
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  if (expected) assert.equal(r.status, 0, r.stderr || r.stdout);
  else assert.notEqual(r.status, 0);
  return r.stderr + r.stdout;
}
let columns;
function snapshot(dir = persist) {
  columns ??= query(
    legacy.map((t) => `PRAGMA table_info(${t});`).join("\n"),
    dir,
  ).map((r) => r.results.map((c) => c.name));
  return query(
    legacy
      .map(
        (t, i) =>
          `SELECT ${columns[i].join(",")},${columns[i].map((c) => `typeof(${c}) AS __type_${c}`).join(",")} FROM ${t} ORDER BY id;`,
      )
      .join("\n"),
    dir,
  ).map((r, i) => ({ table: legacy[i], rows: r.results }));
}
function check(name, fn) {
  fn();
  checks.push(name);
  console.log("PASS " + checks.length + ": " + name);
}
file("worker/src/db/schema.sql");
file("worker/src/db/seed.sql");
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3WQAAAAASUVORK5CYII=";
query(`UPDATE environment_measurement_points SET measure_value=0,remark=NULL WHERE id=1;
UPDATE submissions SET has_layout=1,layout_file_name='ผังเดิม P8.png',layout_file_type='image/png',layout_file_size=${Buffer.from(png, "base64").length},layout_file_data='${png}' WHERE id=1;
INSERT INTO submissions(id,submission_code,assessment_type,assessment_category,status,overall_score,overall_level,created_at,updated_at) VALUES
(100,'P8-LEGACY-HEAT','environment','heat','completed',NULL,'medium','2020-01-01T01:00:00Z','2020-01-01T01:00:00Z'),
(101,'P8-LEGACY-EMPTY','environment','heat','completed',NULL,NULL,'2020-01-02T01:00:00Z','2020-01-02T01:00:00Z'),
(102,'P8-LEGACY-ZERO','health_risk','noise','completed',0,'pass','2020-01-03T01:00:00Z','2020-01-03T01:00:00Z'),
(103,'P8-LEGACY-NO-ANSWERS','satisfaction','general','completed',NULL,NULL,'2020-01-04T01:00:00Z','2020-01-04T01:00:00Z');
INSERT INTO environment_inspections(submission_id,inspector_name,inspection_location,inspection_date,equipment,start_time,end_time,created_at) VALUES(100,'ผู้ตรวจ P8 legacy','พื้นที่ความร้อน','2020-01-01',NULL,NULL,NULL,'2020-01-01');
INSERT INTO environment_measurement_points(submission_id,category,point_no,location_desc,measure_value,standard_value,workload,temp_db,temp_wb,temp_gt,temp_wbgt,wbgt_type,is_pass,remark,created_at) VALUES(100,'heat',1,'จุดความร้อน',32.123456,32,'medium',35.5,24,40.2,29.08,'in',0,'ข้อความไทยเดิม','2020-01-01');
INSERT INTO respondent_work_infos(submission_id,position_type,working_hours_per_day,working_days_per_week,work_experience_years,created_at) VALUES(102,'อื่น ๆ',0,0,0,'2020-01-03');
INSERT INTO health_risk_answers(submission_id,category,question_id,question_no,score,created_at) VALUES(102,'noise','q1',1,0,'2020-01-03');`);
for (let i = 0; i < 20; i++)
  query(
    `INSERT INTO submissions(submission_code,assessment_type,assessment_category,status,overall_score,created_at,updated_at) VALUES('P8-BULK-LEGACY-${i}','health_risk','heat','completed',${i % 21},'2020-02-01','2020-02-01');`,
  );
const before = snapshot(),
  dump = join(temp, "legacy-before.sql");
// Installed Wrangler export currently has no --persist-to option. Use the same
// Miniflare export PRAGMA against the explicitly isolated local D1 persistence.
const { Miniflare } = createRequire(resolve("worker/package.json"))(
  "miniflare",
);
const exporter = new Miniflare({
  modules: true,
  script: "export default {}",
  d1Persist: join(persist, "v3", "d1"),
  d1Databases: { DB: "ba75b7dc-092d-4b52-bcf6-3d2a02a1a4d7" },
});
try {
  const exportDb = await exporter.getD1Database("DB");
  const result = await exportDb
    .prepare("PRAGMA miniflare_d1_export(?,?,?);")
    .bind(0, 0)
    .raw();
  writeFileSync(dump, result[0].join("\n"));
} finally {
  await exporter.dispose();
}
check(
  "local recovery SQL exports and restores all original columns/rows before migration",
  () => {
    file(dump, restore);
    assert.deepEqual(snapshot(restore), before);
  },
);
check(
  "real local D1 upgrade preserves every original field across all eight tables",
  () => {
    migrate();
    const after = snapshot();
    for (let i = 0; i < legacy.length; i++) {
      assert.equal(after[i].rows.length, before[i].rows.length);
      for (let j = 0; j < before[i].rows.length; j++)
        for (const [k, v] of Object.entries(before[i].rows[j]))
          assert.deepEqual(after[i].rows[j][k], v, `${legacy[i]}.${k}`);
    }
  },
);
const invariantSql = `SELECT COUNT(*) n FROM environment_revisions; SELECT COUNT(*) n FROM environment_revision_points; SELECT name FROM d1_migrations ORDER BY name; PRAGMA foreign_key_check;
SELECT s.id,s.latest_revision_id,r.submission_id,r.revision_no,r.schema_version,r.status FROM submissions s JOIN environment_revisions r ON r.id=s.latest_revision_id WHERE s.assessment_type='environment' ORDER BY s.id;
SELECT submission_id,COUNT(*) n FROM environment_revisions GROUP BY submission_id HAVING COUNT(*)<>1;
SELECT legacy_point_id,COUNT(*) n FROM environment_revision_points WHERE legacy_point_id IS NOT NULL GROUP BY legacy_point_id HAVING COUNT(*)<>1;`;
const state = query(invariantSql);
check(
  "latest pointers, ownership, revision/point identity, finalized status and all migration ledger entries are consistent",
  () => {
    assert.equal(state[0].results[0].n, 4);
    assert.equal(state[1].results[0].n, 6);
    assert.equal(
      state[2].results.length,
      readdirSync("worker/src/db/migrations").filter((name) =>
        name.endsWith(".sql"),
      ).length,
    );
    assert.deepEqual(state[3].results, []);
    assert.equal(state[4].results.length, 4);
    for (const r of state[4].results) {
      assert.equal(r.id, r.submission_id);
      assert.equal(r.revision_no, 1);
      assert.equal(r.schema_version, 1);
      assert.equal(r.status, "finalized");
    }
    assert.deepEqual(state[5].results, []);
    assert.deepEqual(state[6].results, []);
  },
);
check(
  "zero/null/old weekly-day units/legacy score/unknown group/layout bytes remain original",
  () => {
    const r = query(
      `SELECT inputs_json,standard_snapshot_json FROM environment_revision_points WHERE legacy_point_id=1; SELECT working_days_per_week,working_hours_per_week IS NULL AS hours_missing FROM respondent_work_infos WHERE submission_id=102; SELECT schema_version,phase,score FROM health_risk_answers WHERE submission_id=102; SELECT overall_score IS NULL AS score_missing,assessment_group FROM submissions WHERE id=103; SELECT file_data,file_name FROM legacy_layout_snapshots WHERE revision_id='legacy-revision-1';`,
    );
    assert.equal(JSON.parse(r[0].results[0].inputs_json).measure_value, 0);
    assert.equal(
      JSON.parse(r[0].results[0].standard_snapshot_json).standard_value,
      400,
    );
    assert.deepEqual(r[1].results[0], {
      working_days_per_week: 0,
      hours_missing: 1,
    });
    assert.deepEqual(r[2].results[0], {
      schema_version: 1,
      phase: "single",
      score: 0,
    });
    assert.deepEqual(r[3].results[0], {
      score_missing: 1,
      assessment_group: "unknown",
    });
    assert.equal(r[4].results[0].file_data, png);
  },
);
check("resume is idempotent and cannot rewrite finalized snapshots", () => {
  const old = query(
    "SELECT * FROM environment_revisions ORDER BY id; SELECT * FROM environment_revision_points ORDER BY revision_id,point_key;",
  ).map((r) => r.results);
  migrate();
  assert.deepEqual(
    query(
      "SELECT * FROM environment_revisions ORDER BY id; SELECT * FROM environment_revision_points ORDER BY revision_id,point_key;",
    ).map((r) => r.results),
    old,
  );
  assert.throws(
    () =>
      query(
        "UPDATE environment_revision_points SET remark='overwrite' WHERE legacy_point_id=1;",
      ),
    /immutable/,
  );
});
check(
  "restored legacy recovery copy independently migrates to identical revisions and pointers",
  () => {
    migrate(restore);
    assert.deepEqual(
      query(invariantSql, restore).map((r) => r.results),
      state.map((r) => r.results),
    );
  },
);
check(
  "partial legacy schema and changed original columns fail preflight before migration writes",
  () => {
    query("CREATE TABLE submissions(id INTEGER PRIMARY KEY);", partial);
    assert(migrate(partial, false).includes("Partial legacy schema"));
    assert(
      !query(
        "SELECT name FROM sqlite_master WHERE name='d1_migrations'",
        partial,
      )[0].results.length,
    );
    file("worker/src/db/schema.sql", drift);
    query(
      "ALTER TABLE respondent_profiles DROP COLUMN education_level;",
      drift,
    );
    assert(migrate(drift, false).includes("Legacy schema differs"));
    assert(
      !query(
        "SELECT name FROM sqlite_master WHERE name='d1_migrations'",
        drift,
      )[0].results.length,
    );
  },
);
const counts = before.map((t) => ({
  table: t.table,
  before: t.rows.length,
  after: t.rows.length,
  all_original_fields_preserved: true,
}));
writeFileSync(
  "docs/v3/baseline/p8-migration.json",
  JSON.stringify(
    {
      phase: "P8",
      date: new Date().toISOString(),
      fixture_only: true,
      remote: false,
      passed: checks.length,
      checks,
      counts,
      revisions: 4,
      points: 6,
      ledger: state[2].results.map((r) => r.name),
      foreign_key_violations: 0,
      duplicate_revision_mapping: 0,
      duplicate_point_mapping: 0,
      local_recovery_roundtrip: true,
      fixture_sha256: createHash("sha256")
        .update(JSON.stringify(before))
        .digest("hex"),
    },
    null,
    2,
  ),
);
console.log(
  "P8 D1 rehearsal PASS " +
    checks.length +
    "; isolated local DB, no remote operation",
);
