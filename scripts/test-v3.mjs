import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
const root = process.cwd(),
  build = mkdtempSync(join(tmpdir(), "savecheck-v3-tests-"));
const config = join(build, "tsconfig.json");
writeFileSync(
  config,
  JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "CommonJS",
      moduleResolution: "Node",
      strict: true,
      esModuleInterop: true,
      resolveJsonModule: true,
      skipLibCheck: true,
      rootDir: root,
      outDir: build,
    },
    include: [
      resolve(root, "shared/**/*.ts"),
      resolve(root, "src/lib/domain-v3.ts"),
      resolve(root, "worker/src/domain-v3.ts"),
    ],
  }),
);
function run(command, args, env = {}) {
  const r = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (r.status !== 0) throw new Error(`${command} failed (${r.status})`);
}
try {
  run(process.execPath, [
    resolve(root, "node_modules/typescript/bin/tsc"),
    "-p",
    config,
  ]);
  run(process.execPath, ["--test", "tests/v3/domain.test.cjs"], {
    V3_TEST_BUILD_DIR: build,
    NODE_PATH: resolve(root, "node_modules"),
  });
  run("python3", ["tests/v3/migrations_test.py"]);
} finally {
  rmSync(build, { recursive: true, force: true });
}
