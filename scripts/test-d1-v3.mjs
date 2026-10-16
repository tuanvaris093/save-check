import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";
const root = process.cwd(),
  persist = mkdtempSync(join(tmpdir(), "savecheck-p1-d1-upgrade-"));
const wrangler = resolve(root, "worker/node_modules/wrangler/bin/wrangler.js");
const common = [
  "--local",
  "--persist-to",
  persist,
  "--config",
  resolve(root, "worker/wrangler.toml"),
];
function execute(options) {
  const r = spawnSync(
    process.execPath,
    [
      wrangler,
      "d1",
      "execute",
      "save-check-db",
      ...options,
      ...common,
      "--json",
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    },
  );
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  return JSON.parse(r.stdout);
}
const query = (sql) => execute(["--command", sql]);
execute(["--file", resolve(root, "worker/src/db/schema.sql")]);
execute(["--file", resolve(root, "worker/src/db/seed.sql")]);
query("UPDATE environment_measurement_points SET measure_value=0 WHERE id=1;");
const tables = [
  "submissions",
  "respondent_profiles",
  "respondent_work_infos",
  "environment_inspections",
  "environment_measurement_points",
  "health_risk_answers",
  "satisfaction_answers",
  "assessment_results",
];
const before = query(
  tables.map((t) => `SELECT * FROM ${t} ORDER BY id;`).join("\n"),
);
function migrate() {
  const r = spawnSync(
    process.execPath,
    ["scripts/d1-migrate.mjs", "--local", "--persist-to", persist],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    },
  );
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
}
migrate();
const after = query(
  tables.map((t) => `SELECT * FROM ${t} ORDER BY id;`).join("\n"),
);
for (let i = 0; i < tables.length; i++) {
  assert.equal(after[i].results.length, before[i].results.length, tables[i]);
  for (let n = 0; n < before[i].results.length; n++)
    for (const [k, v] of Object.entries(before[i].results[n]))
      assert.deepEqual(after[i].results[n][k], v, `${tables[i]}.${k}`);
}
const checks = query(
  "SELECT COUNT(*) AS n FROM environment_revisions; SELECT COUNT(*) AS n FROM environment_revision_points; SELECT COUNT(*) AS n FROM d1_migrations; PRAGMA foreign_key_check;",
);
assert.equal(checks[0].results[0].n, 2);
assert.equal(checks[1].results[0].n, 5);
assert.equal(checks[2].results[0].n, 5);
assert.equal(checks[3].results.length, 0);
migrate();
assert.equal(
  query("SELECT COUNT(*) AS n FROM environment_revisions;")[0].results[0].n,
  2,
);
const data = query(
  "SELECT inputs_json FROM environment_revision_points WHERE legacy_point_id=1;",
)[0].results[0];
assert.equal(JSON.parse(data.inputs_json).measure_value, 0);
try {
  query(
    "UPDATE environment_revision_points SET remark='should fail' WHERE revision_id='legacy-revision-1';",
  );
  throw new Error("Immutable update unexpectedly succeeded");
} catch (e) {
  assert(String(e).includes("finalized points are immutable"));
}
const catalog = JSON.parse(
  readFileSync("shared/v3/catalogs/programs.json", "utf8"),
);
assert.deepEqual(
  query("SELECT code,label FROM program_catalog ORDER BY code;")[0].results,
  catalog.programs.map((p) => ({ code: p.code, label: p.label })),
);
console.log(
  "D1 LOCAL PASS: legacy upgrade, all 8 original tables preserved, 2 immutable revisions/5 points, zero retained, 7 exact programs, clean FK check, ledger resume without duplicate snapshots.",
);
console.log(`Isolated local test database: ${persist}`);
