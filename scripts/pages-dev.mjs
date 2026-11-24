import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const staticOutput = join(root, "out");
if (!existsSync(staticOutput)) {
  console.error("Run npm run build before starting the local Pages preview.");
  process.exitCode = 1;
} else {
  await preview();
}

async function preview() {
  const directory = mkdtempSync(join(tmpdir(), "safecheck-pages-"));
  try {
    symlinkSync(staticOutput, join(directory, "out"), "dir");
    symlinkSync(join(root, "functions"), join(directory, "functions"), "dir");

    // The installed Wrangler version reads local Pages secrets from .dev.vars.
    const envFile = [".env", ".env.local", ".dev.vars"]
      .map((file) => join(root, file))
      .find(existsSync);
    if (envFile) symlinkSync(envFile, join(directory, ".dev.vars"), "file");

    const child = spawn(
      process.execPath,
      [
        join(root, "worker/node_modules/wrangler/bin/wrangler.js"),
        "pages",
        "dev",
        "out",
        "--port",
        "8788",
        "--compatibility-date",
        "2024-09-23",
        "--d1",
        "DB=ba75b7dc-092d-4b52-bcf6-3d2a02a1a4d7",
        "--persist-to",
        join(root, "worker/.wrangler/state"),
        ...process.argv.slice(2),
      ],
      { cwd: directory, stdio: "inherit" },
    );
    const stop = (signal) => child.kill(signal);
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
    try {
      const [code, signal] = await once(child, "close");
      process.exitCode = code ?? (signal === "SIGINT" ? 130 : 143);
    } finally {
      process.off("SIGINT", stop);
      process.off("SIGTERM", stop);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
