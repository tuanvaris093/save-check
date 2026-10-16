import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
if (args.filter((a) => ["--local", "--remote"].includes(a)).length !== 1)
  throw new Error("Choose exactly one of --local/--remote");
const mode = args.includes("--remote") ? "--remote" : "--local";
const persistIndex = args.indexOf("--persist-to");
const persist =
  persistIndex >= 0
    ? ["--persist-to", resolve(args[persistIndex + 1] ?? "")]
    : [];
if (persistIndex >= 0 && !args[persistIndex + 1])
  throw new Error("Missing persist directory");
if (
  args.some(
    (a, i) =>
      !["--local", "--remote", "--persist-to"].includes(a) &&
      i !== persistIndex + 1,
  )
)
  throw new Error("Unknown migration argument");
const wrangler = resolve(root, "worker/node_modules/wrangler/bin/wrangler.js");
const common = [
  mode,
  "--config",
  resolve(root, "worker/wrangler.toml"),
  ...persist,
];
function run(command, capture = false) {
  const r = spawnSync(process.execPath, [wrangler, ...command, ...common], {
    cwd: root,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
  });
  if (r.status !== 0)
    throw new Error(
      capture ? r.stderr || r.stdout : `Wrangler exited ${r.status}`,
    );
  return capture ? JSON.parse(r.stdout) : null;
}
const master = run(
  [
    "d1",
    "execute",
    "save-check-db",
    "--command",
    "SELECT name FROM sqlite_master WHERE type='table'",
    "--json",
  ],
  true,
);
const tables = new Set(
  master.flatMap((r) => r.results ?? []).map((r) => r.name),
);
const legacy = [
  "submissions",
  "respondent_profiles",
  "respondent_work_infos",
  "environment_inspections",
  "environment_measurement_points",
  "health_risk_answers",
  "satisfaction_answers",
  "assessment_results",
];
const present = legacy.filter((t) => tables.has(t));
if (present.length !== 0 && present.length !== legacy.length)
  throw new Error("Partial legacy schema: preflight stopped before writing");
if (present.length) {
  const sql = readFileSync(
    resolve(root, "worker/src/db/migrations/0001_legacy_baseline.sql"),
    "utf8",
  );
  const expected = {};
  for (const match of sql.matchAll(
    /CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*?)\n\);/g,
  ))
    expected[match[1]] = match[2]
      .split("\n")
      .map((l) => l.trim().match(/^(\w+)\s+(INTEGER|TEXT|REAL)\b/)?.[1])
      .filter(Boolean);
  const info = run(
    [
      "d1",
      "execute",
      "save-check-db",
      "--command",
      legacy.map((t) => `PRAGMA table_info(${t});`).join("\n"),
      "--json",
    ],
    true,
  );
  for (let i = 0; i < legacy.length; i++) {
    const columns = new Set((info[i]?.results ?? []).map((r) => r.name));
    if (expected[legacy[i]].some((c) => !columns.has(c)))
      throw new Error(
        `Legacy schema differs for ${legacy[i]}: review before migration`,
      );
  }
  const evolved = info[0].results.some((r) => r.name === "schema_version");
  if (evolved) {
    if (!tables.has("d1_migrations"))
      throw new Error(
        "v3 columns without migration ledger: stop and reconcile manually",
      );
    const ledger = run(
      [
        "d1",
        "execute",
        "save-check-db",
        "--command",
        "SELECT name FROM d1_migrations",
        "--json",
      ],
      true,
    );
    if (
      !ledger
        .flatMap((r) => r.results ?? [])
        .some((r) => r.name === "0002_v3_domain.sql")
    )
      throw new Error(
        "v3 schema without recorded 0002: stop before duplicate ALTER",
      );
  }
}
console.log(`Preflight passed (${mode}); applying numbered migrations only.`);
run(["d1", "migrations", "apply", "save-check-db"]);
