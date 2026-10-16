import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
const mode = process.argv[2] ?? "all";
if (!["all", "core", "browser", "acceptance", "checks"].includes(mode))
  throw new Error("Choose all/core/browser/acceptance/checks");
const groups = {
  core: [
    "test:v3",
    "test:p3",
    "test:p4",
    "test:satisfaction-questions",
    "test:p5",
    "test:p6",
    "test:p7",
    "test:p2",
  ],
  acceptance: ["test:p8:migration", "test:p8:browser"],
  browser: [
    "test:satisfaction:browser",
    "test:p5:browser",
    "test:p6:browser",
    "test:p7:browser",
  ],
  checks: ["typecheck:worker", "lint", "build", "typecheck"],
};
mkdirSync("docs/v3/baseline/p8-logs", { recursive: true });
const runs = [];
for (const script of mode === "all"
  ? Object.values(groups).flat()
  : groups[mode]) {
  console.log("START " + script);
  const started = Date.now(),
    child = spawn("npm", ["run", script], {
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
      stdio: ["ignore", "pipe", "pipe"],
    }),
    chunks = [];
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (data) => {
      chunks.push(data);
      process.stdout.write(data);
    });
  const code = await new Promise((resolve, reject) => {
    child.on("exit", resolve);
    child.on("error", reject);
  });
  const file =
    "docs/v3/baseline/p8-logs/" + script.replaceAll(":", "-") + ".log";
  writeFileSync(file, Buffer.concat(chunks));
  runs.push({
    command: "npm run " + script,
    exit_code: code,
    elapsed_seconds: (Date.now() - started) / 1000,
    log: file,
  });
  writeFileSync(
    `docs/v3/baseline/p8-regression-${mode}.json`,
    JSON.stringify(
      {
        phase: "P8",
        date: new Date().toISOString(),
        mode,
        runs,
        passed: runs.every((r) => r.exit_code === 0),
        owner_uat: "pending",
        deployed: false,
      },
      null,
      2,
    ),
  );
  if (code !== 0) throw new Error(script + " failed; see " + file);
  console.log("DONE " + script);
}
if (mode === "checks") {
  const lint = readFileSync("docs/v3/baseline/p8-logs/lint.log", "utf8");
  console.log(
    "CHECKS complete " +
      (lint.match(/\d+ problems \(\d+ errors, \d+ warnings\)/)?.[0] ??
        "lint completed"),
  );
}
console.log(
  "P8 regression " +
    mode +
    " PASS " +
    runs.length +
    " commands; UAT signoff is separate",
);
