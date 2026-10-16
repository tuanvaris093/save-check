// Isolated synthetic D1 benchmark: no production bindings or personal data.
import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const require = createRequire(resolve("worker/package.json"));
const { Miniflare, Log, LogLevel } = require("miniflare");
const { buildSync } = require("esbuild");
const temp = mkdtempSync(join(tmpdir(), "dashboard-reads-"));
for (const [name, entry] of [
  ["dashboard", "worker/src/services/dashboard-service.ts"],
  ["repository", "worker/src/repositories/assessment-repository.ts"],
  ["domain", "shared/v3/index.ts"],
]) {
  buildSync({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: join(temp, name + ".mjs"),
    logLevel: "silent",
  });
}
const { DashboardService } = await import(
  pathToFileURL(join(temp, "dashboard.mjs"))
);
const { AssessmentRepository } = await import(
  pathToFileURL(join(temp, "repository.mjs"))
);
const { satisfactionQuestionnaireVersion } = await import(
  pathToFileURL(join(temp, "domain.mjs"))
);
const mf = new Miniflare({
  modules: true,
  script: "export default {}",
  d1Databases: ["DB"],
  log: new Log(LogLevel.ERROR),
});
try {
  const db = await mf.getD1Database("DB");
  const split = spawnSync(
    "python3",
    [
      "-c",
      `import sqlite3,json
from pathlib import Path
out=[]
for p in sorted(Path('worker/src/db/migrations').glob('*.sql')):
 buf=''; statements=[]
 for line in p.read_text().splitlines(True):
  buf+=line
  if sqlite3.complete_statement(buf): statements.append(buf);buf=''
 out.append([p.name,statements])
print(json.dumps(out))`,
    ],
    { encoding: "utf8" },
  );
  assert.equal(split.status, 0, split.stderr);
  const migrations = JSON.parse(split.stdout);
  for (const [name, statements] of migrations)
    if (!name.startsWith("0009"))
      await db.batch(statements.map((s) => db.prepare(s)));
  await db
    .prepare(
      `WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<10000)
  INSERT INTO submissions(submission_code,assessment_type,assessment_category,created_at,updated_at)
  SELECT 'OLD-'||x,'health_risk','light','2020-01-01','2020-01-01' FROM n`,
    )
    .run();
  const time = "2026-10-16T01:00:00Z";
  for (let i = 0; i < 120; i++) {
    const type = ["environment", "health_risk", "satisfaction"][i % 3],
      group = i % 2 ? "health" : "environment";
    const id = 10001 + i,
      code = "NEW-" + i,
      category = type === "satisfaction" ? "general" : "light";
    await db
      .prepare(
        `INSERT INTO submissions(id,submission_code,assessment_type,assessment_category,assessment_group,schema_version,questionnaire_version,overall_score,overall_level,created_at,updated_at) VALUES(?,?,?,?,?,3,?,3,'pass',?,?)`,
      )
      .bind(
        id,
        code,
        type,
        category,
        group,
        satisfactionQuestionnaireVersion(group),
        [
          "2026-10-15T16:59:59.999Z",
          "2026-10-15T17:00:00Z",
          "2026-10-16T16:59:59.999Z",
          "2026-10-16T17:00:00Z",
        ][i] ?? (i % 2 ? time : "2026-10-15T20:00:00-05:00"),
        time,
      )
      .run();
    if (type === "environment") {
      let base = null;
      for (let n = 1; n <= 3; n++) {
        const rid = `r-${i}-${n}`;
        await db
          .prepare(
            `INSERT INTO environment_revisions(id,submission_id,revision_no,base_revision_id,schema_version,kind,inspection_snapshot_json,result_json,scoring_version,standard_version,result_origin,measured_at,created_at,is_pass) VALUES(?,?,?,?,3,?, ?,?,'test','test','server-v3',?,?,1)`,
          )
          .bind(
            rid,
            id,
            n,
            base,
            n === 1 ? "initial" : "retest",
            JSON.stringify({
              inspector_name: "ผู้ตรวจ " + n,
              inspection_location: "ห้อง " + i,
            }),
            JSON.stringify({ is_pass: true, average_lux: 300 }),
            time,
            time,
          )
          .run();
        await db
          .prepare(
            `INSERT INTO environment_revision_points(submission_id,revision_id,point_key,point_order,category,location_desc,inputs_json,standard_snapshot_json,result_json,is_pass,measured_at,observation_kind) VALUES(?,?,?,1,'light','โต๊ะ',?,'{}','{}',1,?,'measured')`,
          )
          .bind(
            id,
            rid,
            "p" + i,
            JSON.stringify({
              point_id: "p" + i,
              kind: "light",
              lux: 300,
              location_desc: "โต๊ะ",
            }),
            time,
          )
          .run();
        await db
          .prepare(
            "UPDATE environment_revisions SET status='finalized' WHERE id=?",
          )
          .bind(rid)
          .run();
        await db
          .prepare("UPDATE submissions SET latest_revision_id=? WHERE id=?")
          .bind(rid, id)
          .run();
        base = rid;
      }
    } else {
      await db
        .prepare(
          `INSERT INTO submission_payload_versions(submission_id,version_no,operation,payload_json,result_json,resolved_json,created_at) VALUES(?,1,'create',?,?,?,?)`,
        )
        .bind(
          id,
          JSON.stringify({
            profile: { full_name: "ผู้ตอบ " + i },
            answers: { q1: 3 },
            workInfo: { working_hours_per_day: 8 },
          }),
          JSON.stringify({
            after_total: 3,
            after_level: "pass",
            overall_mean: 3,
            dimension_means: [2, 3, 4, null],
          }),
          JSON.stringify({ questions: [] }),
          time,
        )
        .run();
    }
  }
  let reads = 0,
    queries = 0;
  const measuredDb = {
    prepare(sql) {
      const wrap = (stmt) => ({
        bind(...args) {
          return wrap(stmt.bind(...args));
        },
        async all() {
          const r = await stmt.all();
          reads += r.meta.rows_read;
          queries++;
          return r;
        },
        async first() {
          const r = await this.all();
          return r.results[0] ?? null;
        },
      });
      return wrap(db.prepare(sql));
    },
  };
  const service = new DashboardService(new AssessmentRepository(measuredDb));
  const cases = [
    [
      "dashboard",
      async (svc) => ({
        list: await svc.list(new URL("http://test?limit=10")),
        summary: await svc.summary(new URL("http://test")),
      }),
    ],
    [
      "search",
      async (svc) => ({
        list: await svc.list(
          new URL("http://test?search=" + encodeURIComponent("ผู้ตรวจ")),
        ),
        summary: await svc.summary(
          new URL("http://test?search=" + encodeURIComponent("ผู้ตรวจ")),
        ),
      }),
    ],
    [
      "filtered-date-ascending",
      async (svc) => ({
        list: await svc.list(
          new URL(
            "http://test?group=environment&sort_order=asc&start_date=2026-10-16&end_date=2026-10-16",
          ),
        ),
        summary: await svc.summary(
          new URL(
            "http://test?group=environment&start_date=2026-10-16&end_date=2026-10-16",
          ),
        ),
      }),
    ],
    [
      "Bangkok-day-boundaries",
      async (svc) => ({
        list: await svc.list(
          new URL(
            "http://test?limit=100&start_date=2026-10-16&end_date=2026-10-16",
          ),
        ),
        secondPage: await svc.list(
          new URL(
            "http://test?limit=100&page=2&start_date=2026-10-16&end_date=2026-10-16",
          ),
        ),
        summary: await svc.summary(
          new URL("http://test?start_date=2026-10-16&end_date=2026-10-16"),
        ),
      }),
    ],
    [
      "latest-measurement-date",
      async (svc) => ({
        list: await svc.list(
          new URL(
            "http://test?date_basis=latest_measurement&start_date=2026-10-16&end_date=2026-10-16",
          ),
        ),
        summary: await svc.summary(
          new URL(
            "http://test?date_basis=latest_measurement&start_date=2026-10-16&end_date=2026-10-16",
          ),
        ),
      }),
    ],
    [
      "latest-export-all",
      async (svc) => {
        const out = [];
        for (let page = 1; page;) {
          const batch = await svc.export(
            new URL("http://test?limit=10&page=" + page),
          );
          out.push(batch);
          page = batch.next_page;
        }
        return out;
      },
    ],
    [
      "history-export",
      (svc) =>
        svc.export(
          new URL(
            "http://test?type=environment&limit=10&revision_scope=history&revision_limit=2",
          ),
        ),
    ],
    [
      "history-next-round-page",
      (svc) =>
        svc.export(
          new URL(
            "http://test?submission_code=NEW-0&revision_scope=history&revision_limit=2&revision_page=2",
          ),
        ),
    ],
  ];
  const run = async (svc) => {
    const out = {};
    for (const [name, fn] of cases) {
      reads = 0;
      queries = 0;
      const data = await fn(svc);
      out[name] = { data, reads, queries };
    }
    return out;
  };
  // Optional baseline bundles captured before this change, used only in this release audit.
  let baseline;
  if (process.env.DASHBOARD_BASELINE_DIR) {
    const { DashboardService: OldService } = await import(
      pathToFileURL(
        join(process.env.DASHBOARD_BASELINE_DIR, "old-dashboard.mjs"),
      )
    );
    const { AssessmentRepository: OldRepo } = await import(
      pathToFileURL(
        join(process.env.DASHBOARD_BASELINE_DIR, "old-repository.mjs"),
      )
    );
    baseline = await run(new OldService(new OldRepo(measuredDb)));
  }
  const before = await run(service);
  const tables = (
    await db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name",
      )
      .all()
  ).results;
  const snapshot = async () => {
    const out = {};
    for (const { name } of tables)
      out[name] = (
        await db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()
      ).results;
    return out;
  };
  const original = await snapshot();
  for (const [name, statements] of migrations)
    if (name.startsWith("0009"))
      await db.batch(statements.map((s) => db.prepare(s)));
  assert.deepEqual(
    await snapshot(),
    original,
    "index migration must preserve every field and row",
  );
  assert.equal(
    (await db.prepare("PRAGMA foreign_key_check").all()).results.length,
    0,
  );
  const after = await run(service),
    metrics = {};
  for (const [name] of cases) {
    assert.deepEqual(
      after[name].data,
      before[name].data,
      name + " differs after indexing",
    );
    if (baseline)
      assert.deepEqual(
        after[name].data,
        baseline[name].data,
        name + " differs from original behavior",
      );
    const old = baseline?.[name] ?? before[name];
    metrics[name] = {
      before_reads: old.reads,
      after_reads: after[name].reads,
      before_queries: old.queries,
      after_queries: after[name].queries,
      reduction_percent:
        Math.round((1 - after[name].reads / old.reads) * 10000) / 100,
    };
  }
  for (const [name] of cases) {
    assert(
      after[name].reads <= (baseline?.[name] ?? before[name]).reads,
      name + " must not increase reads in the regression fixture",
    );
  }
  const boundaryCodes = [
    ...after["Bangkok-day-boundaries"].data.list.items,
    ...after["Bangkok-day-boundaries"].data.secondPage.items,
  ].map((r) => r.submission_code);
  assert(!boundaryCodes.includes("NEW-0") && !boundaryCodes.includes("NEW-3"));
  assert(boundaryCodes.includes("NEW-1") && boundaryCodes.includes("NEW-2"));
  assert(
    after.dashboard.reads < (baseline?.dashboard ?? before.dashboard).reads,
    "Dashboard reads should decrease",
  );
  assert(
    after["latest-export-all"].reads <
      (baseline?.["latest-export-all"] ?? before["latest-export-all"]).reads,
    "Export reads should decrease",
  );
  writeFileSync(
    "docs/v3/baseline/dashboard-read-optimization.json",
    JSON.stringify(
      {
        synthetic: true,
        comparison: baseline
          ? "pre-optimization code before indexes vs optimized code with indexes"
          : "same optimized code before vs after indexes",
        legacy_jobs: 10000,
        current_jobs: 120,
        current_revisions: 120,
        all_responses_identical: true,
        all_rows_preserved: true,
        metrics,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify(metrics, null, 2));
  console.log(
    "PASS: exact API equality for pagination, search, date/order, latest/history exports; all tables unchanged; FK check clean",
  );
} finally {
  await mf.dispose();
}
