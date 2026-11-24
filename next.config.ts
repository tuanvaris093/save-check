import { pbkdf2Sync } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { initialEnv } from "@next/env";
import type { NextConfig } from "next";
import {
  ADMIN_PASSWORD_ITERATIONS,
  ADMIN_PASSWORD_SALT,
} from "./shared/admin-authorization";

const adminPassword =
  initialEnv?.ADMIN_PASSWORD ??
  (existsSync(".env")
    ? parseEnv(readFileSync(".env", "utf8")).ADMIN_PASSWORD
    : undefined) ??
  process.env.ADMIN_PASSWORD;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_ADMIN_PASSWORD_VERIFIER: adminPassword
      ? pbkdf2Sync(
          adminPassword,
          ADMIN_PASSWORD_SALT,
          ADMIN_PASSWORD_ITERATIONS,
          32,
          "sha256",
        ).toString("hex")
      : "",
  },
  distDir: process.env.SAFECHECK_TEST_DIST_DIR ?? ".next",
  ...(process.env.NODE_ENV === "production"
    ? { output: "export" as const }
    : {}),
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
